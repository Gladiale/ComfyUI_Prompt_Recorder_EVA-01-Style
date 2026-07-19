// ============================================================
// プロンプト差分検知 / Diff
// ============================================================
//
// コピーボタンを押した瞬間の選択ワード群を「スナップショット（基準）」として
// 記録し、現在の選択ワード群と比較して変化を抽出する。
//
// 変化の種別：
//   added    : 基準後に新たに選択されたワード
//   removed  : 基準時に存在したが現在は選択されていないワード
//   strength : 同一ワードで強度が変化したもの
//   text     : 同一ワードでテキストが編集されたもの
//
// 重複排除ルールは synthesis（総括欄）の構築と同一：整形後テキストを
// normalizeText で正規化したキーで最初の出現のみ残す。

import { normalizeText } from "@/lib/normalize";
import { clampStrength, formatWordWithStrength } from "@/lib/strength";
import type { Word } from "@/types";

export type Separator = "comma" | "newline";

/** 選択ワードの参照（PromptContext.selectedRefs と同一形状） */
export interface SelectedRef {
  word: Word;
  groupId: string;
  groupPath: string[];
}

/** スナップショット内の1エントリ（重複排除済み） */
export interface SnapshotEntry {
  wordId: string;
  text: string;
  strength: number;
  formatted: string;
  groupId: string;
  groupPath: string[];
}

/** コピー時のプロンプト基準 */
export interface Snapshot {
  entries: SnapshotEntry[];
  separator: Separator;
  takenAt: number;
  count: number;
}

export type DiffKind = "added" | "removed" | "strength" | "text";

export interface DiffSide {
  text: string;
  strength: number;
  formatted: string;
}

export interface DiffItem {
  kind: DiffKind;
  wordId: string;
  text: string;
  groupId: string;
  groupPath: string[];
  before?: DiffSide;
  after?: DiffSide;
}

export interface PromptDiff {
  items: DiffItem[];
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffItem[];
  hasChanges: boolean;
}

/**
 * 選択ワード参照から、synthesis と同じ重複排除ルールでエントリ列を構築する。
 * 出現順を維持し、整形後テキストの正規化キーで重複を除外する。
 */
export function buildSnapshotEntries(refs: SelectedRef[]): SnapshotEntry[] {
  const seen = new Set<string>();
  const out: SnapshotEntry[] = [];
  for (const ref of refs) {
    const text = ref.word.text.trim();
    if (!text) continue;
    const strength = clampStrength(ref.word.strength ?? 0);
    const formatted = formatWordWithStrength(ref.word.text, ref.word.strength ?? 0);
    const key = normalizeText(formatted);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      wordId: ref.word.id,
      text,
      strength,
      formatted,
      groupId: ref.groupId,
      groupPath: ref.groupPath,
    });
  }
  return out;
}

/** 現在の選択ワードからスナップショットを生成する。 */
export function makeSnapshot(refs: SelectedRef[], separator: Separator): Snapshot {
  const entries = buildSnapshotEntries(refs);
  return {
    entries,
    separator,
    takenAt: Date.now(),
    count: entries.length,
  };
}

/**
 * 現在の選択ワードとスナップショットを比較し、変化を抽出する。
 * ワードID単位で突き合わせる（ユーザー操作の追加/削除/強度変更と一致）。
 */
export function computeDiff(
  currentRefs: SelectedRef[],
  snapshot: Snapshot | null,
): PromptDiff {
  const empty: PromptDiff = {
    items: [],
    added: [],
    removed: [],
    modified: [],
    hasChanges: false,
  };
  if (!snapshot) return empty;

  const current = buildSnapshotEntries(currentRefs);
  const snapById = new Map(snapshot.entries.map((e) => [e.wordId, e]));
  const curById = new Map(current.map((e) => [e.wordId, e]));

  const added: DiffItem[] = [];
  const removed: DiffItem[] = [];
  const modified: DiffItem[] = [];

  // 追加 / 変更の検出
  for (const e of current) {
    const prev = snapById.get(e.wordId);
    if (!prev) {
      added.push({
        kind: "added",
        wordId: e.wordId,
        text: e.text,
        groupId: e.groupId,
        groupPath: e.groupPath,
        after: { text: e.text, strength: e.strength, formatted: e.formatted },
      });
      continue;
    }
    const strengthChanged = prev.strength !== e.strength;
    const textChanged = normalizeText(prev.text) !== normalizeText(e.text);
    if (strengthChanged || textChanged) {
      modified.push({
        kind: strengthChanged ? "strength" : "text",
        wordId: e.wordId,
        text: e.text,
        groupId: e.groupId,
        groupPath: e.groupPath,
        before: { text: prev.text, strength: prev.strength, formatted: prev.formatted },
        after: { text: e.text, strength: e.strength, formatted: e.formatted },
      });
    }
  }

  // 削除の検出
  for (const e of snapshot.entries) {
    if (!curById.has(e.wordId)) {
      removed.push({
        kind: "removed",
        wordId: e.wordId,
        text: e.text,
        groupId: e.groupId,
        groupPath: e.groupPath,
        before: { text: e.text, strength: e.strength, formatted: e.formatted },
      });
    }
  }

  const items = [...added, ...removed, ...modified];
  return {
    items,
    added,
    removed,
    modified,
    hasChanges: items.length > 0,
  };
}
