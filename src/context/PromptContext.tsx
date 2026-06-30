// ============================================================
// PromptContext — グローバル状態 + chrome.storage 永続化
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Group, RootState, Word } from '@/types'
import {
  addGroup as treeAddGroup,
  addWord as treeAddWord,
  collectSelected,
  createDefaultState,
  deleteGroup as treeDeleteGroup,
  deleteWord as treeDeleteWord,
  moveGroup as treeMoveGroup,
  normalizeImportedState,
  reorderWords as treeReorderWords,
  renameGroup as treeRenameGroup,
  setCollapsed as treeSetCollapsed,
  toggleCollapse as treeToggleCollapse,
  toggleWord as treeToggleWord,
  setWordSelected as treeSetWordSelected,
  updateWord as treeUpdateWord,
  type GroupDropTarget,
} from '@/lib/tree'
import { debounce, loadState, saveState } from '@/lib/storage'
import { normalizeText } from '@/lib/normalize'

type Separator = 'comma' | 'newline'

interface PromptContextValue extends PromptActions {
  state: RootState
  ready: boolean
  separator: Separator
  setSeparator: (s: Separator) => void
  // 派生：重複排除済み最終プロンプト（出現順維持）
  synthesis: string
  // 派生：選択ワード参照（右下一覧用）
  selectedRefs: { word: Word; groupId: string; groupPath: string[] }[]
}

export interface PromptActions {
  addGroup: (parentId: string | null) => void
  renameGroup: (id: string, name: string) => void
  toggleCollapse: (id: string) => void
  setCollapsed: (id: string, collapsed: boolean) => void
  deleteGroup: (id: string) => void
  addWord: (groupId: string, text?: string) => void
  updateWord: (groupId: string, wordId: string, patch: Partial<Pick<Word, 'text' | 'note'>>) => void
  toggleWord: (groupId: string, wordId: string) => void
  deselectWord: (groupId: string, wordId: string) => void
  deleteWord: (groupId: string, wordId: string) => void
  reorderWords: (groupId: string, newWords: Word[]) => void
  moveGroup: (draggedId: string, target: GroupDropTarget) => void
  replaceState: (raw: unknown) => void
  exportState: () => RootState
}

const PromptContext = createContext<PromptContextValue | null>(null)

export function PromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RootState>(() => createDefaultState())
  const [ready, setReady] = useState(false)
  const [separator, setSeparator] = useState<Separator>('comma')

  // 初回マウント：ストレージから復元
  useEffect(() => {
    let cancelled = false
    loadState().then((loaded) => {
      if (cancelled) return
      // ルート直下にグループがあるかだけ検査して、空ならデフォルトを維持
      if (loaded && loaded.rootGroups) {
        setState(loaded)
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 永続化：state 変更を debounce して保存（ready後のみ）
  const persist = useMemo(
    () => debounce((s: RootState) => void saveState(s), 220),
    [],
  )
  const readyRef = useRef(ready)
  readyRef.current = ready
  useEffect(() => {
    if (!readyRef.current) return
    persist(state)
  }, [state, persist])

  // ---- Actions（全て immutable 更新） ----
  const actions: PromptActions = {
    addGroup: (parentId) => setState((s) => treeAddGroup(s, parentId)),
    renameGroup: (id, name) => setState((s) => treeRenameGroup(s, id, name)),
    toggleCollapse: (id) => setState((s) => treeToggleCollapse(s, id)),
    setCollapsed: (id, collapsed) => setState((s) => treeSetCollapsed(s, id, collapsed)),
    deleteGroup: (id) => setState((s) => treeDeleteGroup(s, id)),
    addWord: (groupId, text) => setState((s) => treeAddWord(s, groupId, text)),
    updateWord: (groupId, wordId, patch) =>
      setState((s) => treeUpdateWord(s, groupId, wordId, patch)),
    toggleWord: (groupId, wordId) => setState((s) => treeToggleWord(s, groupId, wordId)),
    deselectWord: (groupId, wordId) =>
      setState((s) => treeSetWordSelected(s, groupId, wordId, false)),
    deleteWord: (groupId, wordId) => setState((s) => treeDeleteWord(s, groupId, wordId)),
    reorderWords: (groupId, newWords) => setState((s) => treeReorderWords(s, groupId, newWords)),
    moveGroup: (draggedId, target) => setState((s) => treeMoveGroup(s, draggedId, target)),
    replaceState: (raw) => setState(() => normalizeImportedState(raw)),
    exportState: () => state,
  }

  // ---- 派生値 ----
  const selectedRefs = useMemo(() => collectSelected(state), [state])

  const synthesis = useMemo(() => {
    // 出現順を維持しつつ、正規化テキストで重複排除
    const seen = new Set<string>()
    const out: string[] = []
    for (const ref of selectedRefs) {
      const key = normalizeText(ref.word.text)
      if (!ref.word.text.trim()) continue
      if (seen.has(key)) continue
      seen.add(key)
      out.push(ref.word.text.trim())
    }
    return separator === 'comma' ? out.join(', ') : out.join('\n')
  }, [selectedRefs, separator])

  const value: PromptContextValue = {
    state,
    ready,
    separator,
    setSeparator,
    synthesis,
    selectedRefs,
    ...actions,
  }

  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>
}

export function usePrompt(): PromptContextValue {
  const ctx = useContext(PromptContext)
  if (!ctx) throw new Error('usePrompt must be used within PromptProvider')
  return ctx
}

// Tree 型の再エクスポート便宜
export type { Group, RootState, Word }
