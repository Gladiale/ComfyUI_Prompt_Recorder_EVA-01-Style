/**
 * 選択ワード収集ユーティリティ
 * ツリー全体から選択されたワードを深さ優先で収集
 */

import type { Group, RootState, Word } from "@/types";

// ============================================================
// 集約（Synthesis 用）
// ============================================================

export interface SelectedWordRef {
  word: Word;
  groupId: string;
  groupPath: string[]; // 表示用のグループ名階層
}

/**
 * 選択されたワードを「左ツリーの出現順（深さ優先・出現順序維持）」で収集。
 */
export function collectSelected(root: RootState): SelectedWordRef[] {
  const out: SelectedWordRef[] = [];
  for (const g of root.rootGroups) {
    collectSelectedInGroup(g, [], out);
  }
  return out;
}

function collectSelectedInGroup(g: Group, path: string[], out: SelectedWordRef[]): void {
  const curPath = [...path, g.name];
  for (const w of g.words) {
    if (w.selected) {
      out.push({ word: w, groupId: g.id, groupPath: curPath });
    }
  }
  for (const child of g.groups) {
    collectSelectedInGroup(child, curPath, out);
  }
}

/** グループ階層内に選択ワードが存在するか（折り畳み徽章用）。 */
export function groupHasSelection(g: Group): boolean {
  if (g.words.some((w) => w.selected)) return true;
  return g.groups.some((child) => groupHasSelection(child));
}

/** グループ階層内の選択ワード数を再帰的に集計（徽章の件数表示用）。 */
export function countSelectedWords(g: Group): number {
  let n = g.words.filter((w) => w.selected).length;
  for (const child of g.groups) n += countSelectedWords(child);
  return n;
}

/** 該当グループのみの選択ワード数（サブグループを含まない）。 */
export function countSelectedWordsInGroup(g: Group): number {
  return g.words.filter((w) => w.selected).length;
}
