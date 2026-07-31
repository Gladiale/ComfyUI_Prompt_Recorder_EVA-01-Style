// ============================================================
// プロンプト差分検知 / Diff
// ============================================================
//
// コピーボタンを押した瞬間の「変換後」テキストをスナップショット（基準）
// として記録し、現在の変換後テキストと比較して変化を抽出する。
//
// 変化の種別：
//   added    : 基準後に新たに選択されたワード
//   removed  : 基準時に存在したが現在は選択されていないワード
//   strength : 同一ワードで強度が変化したもの
//   text     : 同一ワードで変換後テキストが変化したもの
//
// 差分用エントリは重複排除しない（元ワード単位で全件保持）。
// 変換後が空でも保持し、空文字化は「削除」ではなく「テキスト変更」。
//
// 表示用の重複排除は transform.buildDisplayEntries 側で行う。

import {
  buildTransformedEntries,
  type TransformedEntry,
  type TransformSelectedRef,
} from "@/lib/transform";
import type { PromptTransformRule } from "@/types";

export type Separator = "comma" | "newline";

/** 選択ワードの参照（PromptContext.selectedRefs と同一形状） */
export type SelectedRef = TransformSelectedRef;

/**
 * スナップショット内の1エントリ（元ワード単位・重複排除なし）。
 * text / formatted はコピー時点の「変換後」テキスト。
 */
export interface SnapshotEntry {
  wordId: string;
  /** 変換後本文（trim 済み。空文字可） */
  text: string;
  strength: number;
  /** 強度付き変換後文字列。text が空なら空文字。 */
  formatted: string;
  groupId: string;
  groupPath: string[];
}

/** コピー時のプロンプト基準 */
export interface Snapshot {
  /** 新形式識別子。旧形式（このフィールドなし）は破棄する。 */
  formatVersion: 2;
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

function toSnapshotEntry(e: TransformedEntry): SnapshotEntry {
  return {
    wordId: e.wordId,
    text: e.text,
    strength: e.strength,
    formatted: e.formatted,
    groupId: e.groupId,
    groupPath: e.groupPath,
  };
}

/**
 * 選択ワード参照から、差分用エントリ列を構築する。
 * - 変換ルールを適用したテキストを保存
 * - 重複排除しない（元ワード単位で全件）
 * - 元本文が空のワードのみ除外
 * - 変換後が空でも保持
 */
export function buildSnapshotEntries(
  refs: SelectedRef[],
  rules: readonly PromptTransformRule[] = [],
): SnapshotEntry[] {
  return buildTransformedEntries(refs, rules).map(toSnapshotEntry);
}

/** 現在の選択ワードからスナップショットを生成する。 */
export function makeSnapshot(
  refs: SelectedRef[],
  separator: Separator,
  rules: readonly PromptTransformRule[] = [],
): Snapshot {
  const entries = buildSnapshotEntries(refs, rules);
  // count は表示用ポイント数（変換後が非空のもの）
  const count = entries.filter((e) => e.text).length;
  return {
    formatVersion: 2,
    entries,
    separator,
    takenAt: Date.now(),
    count,
  };
}

/**
 * 旧形式スナップショットを破棄する。
 * formatVersion === 2 かつ entries 配列があるものだけ有効。
 */
export function isValidSnapshot(raw: unknown): raw is Snapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  if (obj.formatVersion !== 2) return false;
  if (!Array.isArray(obj.entries)) return false;
  return true;
}

/**
 * 現在の選択ワードとスナップショットを比較し、変化を抽出する。
 * ワードID単位で突き合わせる。
 * テキスト比較は完全一致（大小・空白差も検出）。
 */
export function computeDiff(
  currentRefs: SelectedRef[],
  snapshot: Snapshot | null,
  rules: readonly PromptTransformRule[] = [],
): PromptDiff {
  const empty: PromptDiff = {
    items: [],
    added: [],
    removed: [],
    modified: [],
    hasChanges: false,
  };
  if (!snapshot) return empty;

  const current = buildSnapshotEntries(currentRefs, rules);
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
    // 完全一致で比較（normalize しない）
    const textChanged = prev.text !== e.text;
    if (strengthChanged || textChanged) {
      modified.push({
        kind: strengthChanged ? "strength" : "text",
        wordId: e.wordId,
        text: e.text,
        groupId: e.groupId,
        groupPath: e.groupPath,
        before: {
          text: prev.text,
          strength: prev.strength,
          formatted: prev.formatted,
        },
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
        before: {
          text: e.text,
          strength: e.strength,
          formatted: e.formatted,
        },
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
