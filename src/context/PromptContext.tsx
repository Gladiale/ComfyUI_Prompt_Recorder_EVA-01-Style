// ============================================================
// PromptContext — グローバル状態 + chrome.storage 永続化
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Group, PresetFormData, RootState, Word } from "@/types";
import {
  addGroup as treeAddGroup,
  addWord as treeAddWord,
  applyPreset as treeApplyPreset,
  analyzePresetApply as treeAnalyzePresetApply,
  collectSelected,
  createDefaultState,
  deleteGroup as treeDeleteGroup,
  expandGroupPath as treeExpandGroupPath,
  deletePreset as treeDeletePreset,
  deleteWord as treeDeleteWord,
  diffPresetEntries as treeDiffPresetEntries,
  moveGroup as treeMoveGroup,
  normalizeImportedState,
  reorderWords as treeReorderWords,
  renameGroup as treeRenameGroup,
  renamePreset as treeRenamePreset,
  reorderPresets as treeReorderPresets,
  savePreset as treeSavePreset,
  setCollapsed as treeSetCollapsed,
  toggleCollapse as treeToggleCollapse,
  toggleWord as treeToggleWord,
  setWordSelected as treeSetWordSelected,
  setWordStrength as treeSetWordStrength,
  updatePresetEntries as treeUpdatePresetEntries,
  updatePresetMeta as treeUpdatePresetMeta,
  updateWord as treeUpdateWord,
  type GroupDropTarget,
  type PresetApplyReport,
  type PresetUpdateDiff,
} from "@/lib/tree";
import {
  debounce,
  loadSnapshot,
  loadState,
  saveSnapshot,
  saveState,
} from "@/lib/storage";
import { normalizeText } from "@/lib/normalize";
import { clampStrength, formatWordWithStrength } from "@/lib/strength";
import {
  computeDiff,
  makeSnapshot,
  type PromptDiff,
  type SelectedRef,
  type Snapshot,
} from "@/lib/diff";

type Separator = "comma" | "newline";

interface PromptContextValue extends PromptActions {
  state: RootState;
  ready: boolean;
  separator: Separator;
  setSeparator: (s: Separator) => void;
  // 派生：重複排除済み最終プロンプト（出現順維持）
  synthesis: string;
  // 派生：選択ワード参照（右下一覧用）
  selectedRefs: SelectedRef[];
  // 選択一覧へのフォーカス要求（同一ワードの連続クリックでも再発火させるため nonce を併用）
  focusWordId: string | null;
  focusNonce: number;
  focusSelectedWord: (wordId: string) => void;
  // コピー基準：最後にコピーした瞬間のスナップショット
  lastSnapshot: Snapshot | null;
  // 派生：現在のプロンプトと lastSnapshot の差分
  diff: PromptDiff;
  // 現在の選択ワードでスナップショット基準を更新する（コピー時に呼ぶ）
  captureSnapshot: () => void;
  // プリセット還元前の分析（id欠落・text変更）
  analyzePresetApply: (presetId: string) => PresetApplyReport | null;
  // プリセット更新前の差分
  diffPresetEntries: (presetId: string) => PresetUpdateDiff | null;
}

export interface PromptActions {
  addGroup: (parentId: string | null) => void;
  renameGroup: (id: string, name: string) => void;
  toggleCollapse: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
  /** 指定グループとその全祖先を展開（時計ロードマップのジャンプ先展開用）。 */
  expandGroupPath: (id: string) => void;
  deleteGroup: (id: string) => void;
  addWord: (
    groupId: string,
    data?: { text?: string; note?: string; image?: string },
  ) => void;
  updateWord: (
    groupId: string,
    wordId: string,
    patch: Partial<Pick<Word, "text" | "note" | "image">>,
  ) => void;
  toggleWord: (groupId: string, wordId: string) => void;
  deselectWord: (groupId: string, wordId: string) => void;
  setWordStrength: (groupId: string, wordId: string, strength: number) => void;
  deleteWord: (groupId: string, wordId: string) => void;
  reorderWords: (groupId: string, newWords: Word[]) => void;
  moveGroup: (draggedId: string, target: GroupDropTarget) => void;
  /** フォーム情報 + 現在の選択ワードでプリセット保存（同名は上書き）。 */
  savePreset: (form: PresetFormData) => void;
  applyPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  renamePreset: (presetId: string, name: string) => void;
  reorderPresets: (newIds: string[]) => void;
  /** メタ情報のみ編集（entries は維持）。 */
  updatePresetMeta: (presetId: string, form: PresetFormData) => void;
  /** ワード情報のみ現在の選択で更新。 */
  updatePresetEntries: (presetId: string) => void;
  replaceState: (raw: unknown) => void;
  exportState: () => RootState;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RootState>(() => createDefaultState());
  const [ready, setReady] = useState(false);
  const [separator, setSeparator] = useState<Separator>("comma");

  // 選択一覧へのフォーカス要求：ワードIDと発火用 nonce
  const [focusWordId, setFocusWordId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const focusSelectedWord = (wordId: string) => {
    setFocusWordId(wordId);
    setFocusNonce((n) => n + 1);
  };

  // コピー基準：最後にコピーした瞬間のスナップショット（セッション内で保持）
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null);

  // 初回マウント：ストレージから復元（旧プリセット形式も正規化）
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadState(), loadSnapshot()]).then(([loaded, snap]) => {
      if (cancelled) return;
      // ルート直下にグループがあるかだけ検査して、空ならデフォルトを維持
      if (loaded && loaded.rootGroups) {
        setState(normalizeImportedState(loaded));
      }
      if (snap) setLastSnapshot(snap);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 永続化：state 変更を debounce して保存（ready後のみ）
  const persist = useMemo(() => debounce((s: RootState) => void saveState(s), 220), []);
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    if (!readyRef.current) return;
    persist(state);
  }, [state, persist]);

  // 永続化：スナップショット（コピー基準）変更を debounce して保存
  const persistSnapshot = useMemo(
    () =>
      debounce(
        (s: Snapshot | null) => void (s ? saveSnapshot(s) : Promise.resolve()),
        220,
      ),
    [],
  );
  useEffect(() => {
    if (!readyRef.current) return;
    persistSnapshot(lastSnapshot);
  }, [lastSnapshot, persistSnapshot]);

  // ---- Actions（全て immutable 更新） ----
  const actions: PromptActions = {
    addGroup: (parentId) => setState((s) => treeAddGroup(s, parentId)),
    renameGroup: (id, name) => setState((s) => treeRenameGroup(s, id, name)),
    toggleCollapse: (id) => setState((s) => treeToggleCollapse(s, id)),
    setCollapsed: (id, collapsed) => setState((s) => treeSetCollapsed(s, id, collapsed)),
    expandGroupPath: (id) => setState((s) => treeExpandGroupPath(s, id)),
    deleteGroup: (id) => setState((s) => treeDeleteGroup(s, id)),
    addWord: (groupId, data) => setState((s) => treeAddWord(s, groupId, data)),
    updateWord: (groupId, wordId, patch) =>
      setState((s) => treeUpdateWord(s, groupId, wordId, patch)),
    toggleWord: (groupId, wordId) => setState((s) => treeToggleWord(s, groupId, wordId)),
    deselectWord: (groupId, wordId) =>
      setState((s) => treeSetWordSelected(s, groupId, wordId, false)),
    setWordStrength: (groupId, wordId, strength) =>
      setState((s) => treeSetWordStrength(s, groupId, wordId, clampStrength(strength))),
    deleteWord: (groupId, wordId) => setState((s) => treeDeleteWord(s, groupId, wordId)),
    reorderWords: (groupId, newWords) =>
      setState((s) => treeReorderWords(s, groupId, newWords)),
    moveGroup: (draggedId, target) =>
      setState((s) => treeMoveGroup(s, draggedId, target)),
    savePreset: (form) => setState((s) => treeSavePreset(s, form)),
    applyPreset: (presetId) => setState((s) => treeApplyPreset(s, presetId)),
    deletePreset: (presetId) => setState((s) => treeDeletePreset(s, presetId)),
    renamePreset: (presetId, name) =>
      setState((s) => treeRenamePreset(s, presetId, name)),
    reorderPresets: (newIds) => setState((s) => treeReorderPresets(s, newIds)),
    updatePresetMeta: (presetId, form) =>
      setState((s) => treeUpdatePresetMeta(s, presetId, form)),
    updatePresetEntries: (presetId) =>
      setState((s) => treeUpdatePresetEntries(s, presetId)),
    replaceState: (raw) => setState(() => normalizeImportedState(raw)),
    exportState: () => state,
  };

  // ---- 派生値 ----
  const selectedRefs = useMemo(() => collectSelected(state), [state]);

  // コピー基準の更新：現在の選択ワードでスナップショットを撮る
  const captureSnapshot = useCallback(() => {
    setLastSnapshot(makeSnapshot(selectedRefs, separator));
  }, [selectedRefs, separator]);

  // 現在のプロンプトと基準の差分
  const diff = useMemo(
    () => computeDiff(selectedRefs, lastSnapshot),
    [selectedRefs, lastSnapshot],
  );

  const analyzePresetApply = useCallback(
    (presetId: string) => treeAnalyzePresetApply(state, presetId),
    [state],
  );

  const diffPresetEntries = useCallback(
    (presetId: string) => treeDiffPresetEntries(state, presetId),
    [state],
  );

  const synthesis = useMemo(() => {
    // 出現順を維持しつつ、整形後テキストで重複排除
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ref of selectedRefs) {
      if (!ref.word.text.trim()) continue;
      const formatted = formatWordWithStrength(ref.word.text, ref.word.strength ?? 0);
      const key = normalizeText(formatted);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(formatted);
    }
    return separator === "comma" ? out.join(", ") : out.join("\n");
  }, [selectedRefs, separator]);

  const value: PromptContextValue = {
    state,
    ready,
    separator,
    setSeparator,
    synthesis,
    selectedRefs,
    focusWordId,
    focusNonce,
    focusSelectedWord,
    lastSnapshot,
    diff,
    captureSnapshot,
    analyzePresetApply,
    diffPresetEntries,
    ...actions,
  };

  return <PromptContext value={value}>{children}</PromptContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrompt(): PromptContextValue {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within PromptProvider");
  return ctx;
}

// Tree 型の再エクスポート便宜
export type { Group, RootState, Word };
