// ============================================================
// ツリー操作 / Tree Operations
// 再帰的な木構造に対する純粋関数群（immutable 更新）。
// ============================================================

import type { Group, PresetEntry, PromptPreset, RootState, Word } from '@/types'
import { ROOT_VERSION } from '@/types'

// ---- ID 生成 ----
let _seq = 0
function rand(): string {
  // Date.now / Math.random は使わず、カウンタベースで一意性を確保。
  // （永続化された既存 ID との衝突回避のため、十分な桁数）
  _seq = (_seq + 1) % 1_000_000
  return `${Date.now().toString(36)}-${_seq.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function genId(prefix: string): string {
  return `${prefix}_${rand()}`
}

export function createWord(text = '', note = '', selected = false, strength = 0): Word {
  return { id: genId('w'), text, note, selected, strength }
}

export function createGroup(name = 'NEW GROUP'): Group {
  return { id: genId('grp'), name, collapsed: false, groups: [], words: [] }
}

// ---- サンプルデータ（初回起動時のガイド用） ----
export function createDefaultState(): RootState {
  const character = createGroup('CHARACTER')
  const upperBody = createGroup('Upper Body')
  upperBody.words = [
    createWord('long silver hair', '銀髪ロング。綾波系。'),
    createWord('red eyes', '深紅の瞳。'),
  ]
  const accessories = createGroup('Accessories')
  accessories.words = [createWord('hair ornament', '髪飾り。'), createWord('choker', '首元の装飾。')]
  character.groups = [upperBody, accessories]
  character.words = [createWord('pale skin', '白磁の肌。')]

  const background = createGroup('BACKGROUND')
  background.words = [
    createWord('ruins', '廃墟。'),
    createWord('sunset sky', '夕暮れの空。'),
  ]

  const light = createGroup('LIGHT')
  light.words = [createWord('rim lighting', '輪郭光。'), createWord('dramatic shadows', '劇的な陰影。')]

  return {
    version: ROOT_VERSION,
    rootGroups: [character, background, light],
  }
}

// ============================================================
// 探索ヘルパ
// ============================================================

export function findGroup(root: RootState, id: string): Group | undefined {
  for (const g of root.rootGroups) {
    const found = findGroupInGroup(g, id)
    if (found) return found
  }
  return undefined
}

function findGroupInGroup(g: Group, id: string): Group | undefined {
  if (g.id === id) return g
  for (const child of g.groups) {
    const found = findGroupInGroup(child, id)
    if (found) return found
  }
  return undefined
}

/** 指定グループが指定IDの子孫か（移動先の循環防止用）。 */
export function isDescendant(root: RootState, ancestorId: string, maybeDescendantId: string): boolean {
  const ancestor = findGroup(root, ancestorId)
  if (!ancestor) return false
  return groupsContains(ancestor, maybeDescendantId)
}

function groupsContains(g: Group, id: string): boolean {
  for (const child of g.groups) {
    if (child.id === id) return true
    if (groupsContains(child, id)) return true
  }
  return false
}

// ============================================================
// immutable 更新ヘルパ（structuredClone ベース）
// ============================================================

function clone(root: RootState): RootState {
  return structuredClone(root)
}

/** グループを id で見つけ、updater で書き換える。 */
function mutateGroup(root: RootState, id: string, updater: (g: Group) => void): RootState {
  const next = clone(root)
  const target = findGroup(next, id)
  if (target) updater(target)
  return next
}

// ---- グループ操作 ----

export function addGroup(root: RootState, parentId: string | null): RootState {
  const newGroup = createGroup('NEW GROUP')
  const next = clone(root)
  if (parentId === null) {
    next.rootGroups.push(newGroup)
  } else {
    const parent = findGroup(next, parentId)
    if (parent) {
      parent.groups.push(newGroup)
      parent.collapsed = false // 子を追加したら展開
    }
  }
  return next
}

export function renameGroup(root: RootState, id: string, name: string): RootState {
  return mutateGroup(root, id, (g) => {
    g.name = name
  })
}

export function toggleCollapse(root: RootState, id: string): RootState {
  return mutateGroup(root, id, (g) => {
    g.collapsed = !g.collapsed
  })
}

export function setCollapsed(root: RootState, id: string, collapsed: boolean): RootState {
  return mutateGroup(root, id, (g) => {
    g.collapsed = collapsed
  })
}

export function deleteGroup(root: RootState, id: string): RootState {
  const next = clone(root)
  // ルート直下か、親グループ配下かを再帰で探索して除去
  next.rootGroups = removeFromList(next.rootGroups, id)
  return next
}

function removeFromList(list: Group[], id: string): Group[] {
  const filtered = list.filter((g) => g.id !== id)
  return filtered.map((g) => ({
    ...g,
    groups: removeFromList(g.groups, id),
  }))
}

// ---- ワード操作 ----

export function addWord(root: RootState, groupId: string, text = ''): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words.push(createWord(text, '', false))
    g.collapsed = false
  })
}

export function updateWord(
  root: RootState,
  groupId: string,
  wordId: string,
  patch: Partial<Pick<Word, 'text' | 'note'>>,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId)
    if (w) Object.assign(w, patch)
  })
}

export function toggleWord(root: RootState, groupId: string, wordId: string): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId)
    if (w) w.selected = !w.selected
  })
}

export function setWordSelected(
  root: RootState,
  groupId: string,
  wordId: string,
  selected: boolean,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId)
    if (w) w.selected = selected
  })
}

/** 選択ワードの出力強度（0..10）を設定する。 */
export function setWordStrength(
  root: RootState,
  groupId: string,
  wordId: string,
  strength: number,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId)
    if (w) w.strength = strength
  })
}

export function deleteWord(root: RootState, groupId: string, wordId: string): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words = g.words.filter((w) => w.id !== wordId)
  })
}

/** 同一グループ内でのワード並び替え（Motion Reorder の結果を受ける）。
 *  Motion は value の参照でアイテムを追跡するため、クローンせず同一参照を保つ。 */
export function reorderWords(root: RootState, groupId: string, newWords: Word[]): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words = newWords
  })
}

// ============================================================
// グループ移動（並び替え + 他グループ内へのネスト）
// アンカーID基準で安全に挿入位置を決定（除去によるindexズレを吸収）。
// ============================================================

/** 移動先スペック */
export type GroupDropTarget =
  | { kind: 'into'; parentId: string } // 指定グループの子として末尾にネスト
  | { kind: 'before'; anchorId: string } // アンカーグループの直前（兄弟）
  | { kind: 'after'; anchorId: string } // アンカーグループの直後（兄弟）
  | { kind: 'root' } // ルート直下の末尾

interface ParentLoc {
  list: Group[] // そのグループが属する配列（参照）
  index: number
}

/** 指定IDのグループが属する配列とindexを見つける。 */
function locateGroup(root: RootState, id: string): ParentLoc | null {
  const idx = root.rootGroups.findIndex((g) => g.id === id)
  if (idx >= 0) return { list: root.rootGroups, index: idx }
  for (const g of root.rootGroups) {
    const found = locateGroupInGroup(g, id)
    if (found) return found
  }
  return null
}

function locateGroupInGroup(g: Group, id: string): ParentLoc | null {
  const idx = g.groups.findIndex((c) => c.id === id)
  if (idx >= 0) return { list: g.groups, index: idx }
  for (const child of g.groups) {
    const found = locateGroupInGroup(child, id)
    if (found) return found
  }
  return null
}

/** ツリー全体から該当idの配列位置を物理削除し、実体を返す。 */
function pluckGroup(root: RootState, id: string): Group | null {
  const loc = locateGroup(root, id)
  if (!loc) return null
  return loc.list.splice(loc.index, 1)[0]
}

/** 自身や子孫への移動（循環）を禁止。 */
function wouldCycle(root: RootState, draggedId: string, targetParentId: string | null): boolean {
  if (targetParentId === null) return false
  if (draggedId === targetParentId) return true
  return isDescendant(root, draggedId, targetParentId)
}

export function moveGroup(root: RootState, draggedId: string, target: GroupDropTarget): RootState {
  // 循環判定（into のみ意味を持つが、before/after でも安全側に倒す）
  if (target.kind === 'into' && wouldCycle(root, draggedId, target.parentId)) return root
  // 自身を自身の前後に置くのは無意味
  if ((target.kind === 'before' || target.kind === 'after') && target.anchorId === draggedId)
    return root

  const next = clone(root)
  const removed = pluckGroup(next, draggedId)
  if (!removed) return root

  if (target.kind === 'root') {
    next.rootGroups.push(removed)
    return next
  }

  if (target.kind === 'into') {
    // 親がドラッグ中に除去されている可能性 → 再検索
    const parent = findGroup(next, target.parentId)
    if (parent) {
      parent.groups.push(removed)
      parent.collapsed = false
    } else {
      next.rootGroups.push(removed)
    }
    return next
  }

  // before / after : アンカー位置を「除去後のツリーで」再計算して挿入
  const anchorLoc = locateGroup(next, target.anchorId)
  if (!anchorLoc) {
    next.rootGroups.push(removed)
    return next
  }
  const insertAt = target.kind === 'before' ? anchorLoc.index : anchorLoc.index + 1
  anchorLoc.list.splice(insertAt, 0, removed)
  return next
}

// ============================================================
// 集約（Synthesis 用）
// ============================================================

export interface SelectedWordRef {
  word: Word
  groupId: string
  groupPath: string[] // 表示用のグループ名階層
}

/**
 * 選択されたワードを「左ツリーの出現順（深さ優先・出現順序維持）」で収集。
 */
export function collectSelected(root: RootState): SelectedWordRef[] {
  const out: SelectedWordRef[] = []
  for (const g of root.rootGroups) {
    collectSelectedInGroup(g, [], out)
  }
  return out
}

function collectSelectedInGroup(g: Group, path: string[], out: SelectedWordRef[]): void {
  const curPath = [...path, g.name]
  for (const w of g.words) {
    if (w.selected) {
      out.push({ word: w, groupId: g.id, groupPath: curPath })
    }
  }
  for (const child of g.groups) {
    collectSelectedInGroup(child, curPath, out)
  }
}

/** グループ階層内に選択ワードが存在するか（折り畳み徽章用）。 */
export function groupHasSelection(g: Group): boolean {
  if (g.words.some((w) => w.selected)) return true
  return g.groups.some((child) => groupHasSelection(child))
}

/** グループ階層内の選択ワード数を再帰的に集計（徽章の件数表示用）。 */
export function countSelectedWords(g: Group): number {
  let n = g.words.filter((w) => w.selected).length
  for (const child of g.groups) n += countSelectedWords(child)
  return n
}

// ============================================================
// プリセット（選択状態の組み合わせ）操作
// ============================================================

/** ツリー内の全ワードを「出現順（深さ優先）」で走査する。 */
function forEachWord(root: RootState, cb: (w: Word) => void): void {
  const visit = (g: Group): void => {
    for (const w of g.words) cb(w)
    for (const child of g.groups) visit(child)
  }
  for (const g of root.rootGroups) visit(g)
}

/**
 * 現在の選択ワード（selected == true）をプリセットとして保存する。
 * 同名のプリセットが既にあれば上書き（id/createdAt は継承）、
 * 無ければ新規追加する。entries は出現順。
 */
export function savePreset(root: RootState, name: string): RootState {
  const trimmed = name.trim()
  const entries: PresetEntry[] = []
  // SELECTED欄の定義（collectSelected と同じ w.selected == true）に揃える：
  // pt数が SELECTED欄と一致するように strength≠0 だけのワードは含めない。
  forEachWord(root, (w) => {
    if (w.selected) {
      entries.push({
        wordId: w.id,
        selected: true,
        strength: w.strength ?? 0,
      })
    }
  })
  const next = clone(root)
  const existing = (next.presets ?? []).find(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) {
    // 同名上書き：id・createdAt・順序は維持し、内容だけ更新
    next.presets = (next.presets ?? []).map((p) =>
      p.id === existing.id ? { ...p, entries } : p,
    )
  } else {
    const preset: PromptPreset = {
      id: genId('preset'),
      name: trimmed || `PRESET ${(next.presets?.length ?? 0) + 1}`,
      entries,
      createdAt: Date.now(),
    }
    next.presets = [...(next.presets ?? []), preset]
  }
  return next
}

/**
 * プリセットを復元（完全置換）：
 * 一旦全ワードを未選択・強度0にリセットし、
 * プリセットの entries に一致する wordId があれば selected/strength を当てはめる。
 */
export function applyPreset(root: RootState, presetId: string): RootState {
  const preset = (root.presets ?? []).find((p) => p.id === presetId)
  if (!preset) return root
  const map = new Map<string, PresetEntry>()
  for (const e of preset.entries) map.set(e.wordId, e)
  const next = clone(root)
  forEachWord(next, (w) => {
    const e = map.get(w.id)
    if (e) {
      w.selected = e.selected
      w.strength = e.strength
    } else {
      w.selected = false
      w.strength = 0
    }
  })
  return next
}

export function deletePreset(root: RootState, presetId: string): RootState {
  const next = clone(root)
  next.presets = (next.presets ?? []).filter((p) => p.id !== presetId)
  return next
}

export function renamePreset(root: RootState, presetId: string, name: string): RootState {
  const next = clone(root)
  next.presets = (next.presets ?? []).map((p) =>
    p.id === presetId ? { ...p, name: name.trim() || p.name } : p,
  )
  return next
}

/**
 * プリセットの並び順を入替える。newIds は全プリセットの id を新順序で並べたもの。
 */
export function reorderPresets(root: RootState, newIds: string[]): RootState {
  const next = clone(root)
  const byId = new Map((next.presets ?? []).map((p) => [p.id, p]))
  const reordered: PromptPreset[] = []
  for (const id of newIds) {
    const p = byId.get(id)
    if (p) reordered.push(p)
  }
  // newIds に含まれないプリセットがあれば末尾に維持（安全網）
  for (const p of next.presets ?? []) {
    if (!newIds.includes(p.id)) reordered.push(p)
  }
  next.presets = reordered
  return next
}

// ============================================================
// Import / Export
// ============================================================

/** 未知のデータを RootState へ検証付きで正規化する。 */
export function normalizeImportedState(raw: unknown): RootState {
  if (!raw || typeof raw !== 'object') return createDefaultState()
  const obj = raw as Record<string, unknown>
  const rootGroups = Array.isArray(obj.rootGroups)
    ? obj.rootGroups.map(normalizeGroup).filter(Boolean) as Group[]
    : []
  const presets = Array.isArray(obj.presets)
    ? obj.presets.map(normalizePreset).filter(Boolean) as PromptPreset[]
    : []
  return { version: ROOT_VERSION, rootGroups, presets }
}

function normalizePreset(raw: unknown): PromptPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const entries = Array.isArray(obj.entries)
    ? obj.entries.map(normalizePresetEntry).filter(Boolean) as PresetEntry[]
    : []
  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : genId('preset'),
    name: typeof obj.name === 'string' ? obj.name : 'PRESET',
    entries,
    createdAt: typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt) ? obj.createdAt : 0,
  }
}

function normalizePresetEntry(raw: unknown): PresetEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const strength =
    typeof obj.strength === 'number' && Number.isFinite(obj.strength)
      ? Math.max(0, Math.min(10, Math.round(obj.strength)))
      : 0
  return {
    wordId: typeof obj.wordId === 'string' && obj.wordId ? obj.wordId : '',
    selected: typeof obj.selected === 'boolean' ? obj.selected : true,
    strength,
  }
}

function normalizeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const groups = Array.isArray(obj.groups)
    ? obj.groups.map(normalizeGroup).filter(Boolean) as Group[]
    : []
  const words = Array.isArray(obj.words) ? obj.words.map(normalizeWord).filter(Boolean) as Word[] : []
  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : genId('grp'),
    name: typeof obj.name === 'string' ? obj.name : 'GROUP',
    collapsed: typeof obj.collapsed === 'boolean' ? obj.collapsed : false,
    groups,
    words,
  }
}

function normalizeWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const strength =
    typeof obj.strength === 'number' && Number.isFinite(obj.strength)
      ? Math.max(0, Math.min(10, Math.round(obj.strength)))
      : 0
  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : genId('w'),
    text: typeof obj.text === 'string' ? obj.text : '',
    note: typeof obj.note === 'string' ? obj.note : '',
    selected: typeof obj.selected === 'boolean' ? obj.selected : false,
    strength,
  }
}
