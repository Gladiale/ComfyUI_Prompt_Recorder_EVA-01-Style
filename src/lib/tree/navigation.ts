/**
 * グループ列挙・展開ユーティリティ
 * 時計ロードマップ用のグループ平坦化と展開操作
 */

import type { Group, RootState } from "@/types";
import { findGroup } from "./search";
import { clone } from "./immutable";

// ============================================================
// グループ列挙・展開（時計ロードマップ用）
// ============================================================

/** 時計ロードマップ等で使う、グループ1件の平坦化参照。 */
export interface GroupRef {
  id: string;
  name: string;
  depth: number; // 0=ルート / 1..=子
  path: string[]; // ルートからのグループ名階層
}

/**
 * ツリー内の全グループを「出現順（深さ優先）」で平坦化して返す。
 * collectSelected のグループ版。ダイヤルのインデックス順序として使用。
 */
export function collectAllGroups(root: RootState): GroupRef[] {
  const out: GroupRef[] = [];
  for (const g of root.rootGroups) {
    collectGroupsInGroup(g, [], 0, out);
  }
  return out;
}

function collectGroupsInGroup(
  g: Group,
  path: string[],
  depth: number,
  out: GroupRef[],
): void {
  const curPath = [...path, g.name];
  out.push({ id: g.id, name: g.name, depth, path: curPath });
  for (const child of g.groups) {
    collectGroupsInGroup(child, curPath, depth + 1, out);
  }
}

/**
 * 指定グループとその全祖先を展開（collapsed=false）する immutable 更新。
 * ジャンプ先が閉じている場合、DOMに出現させるために使用。
 */
export function expandGroupPath(root: RootState, id: string): RootState {
  const next = clone(root);
  const chain: string[] = [];
  // 祖先チェーンを収集（root → ... → target）
  const findChain = (list: Group[], parents: string[]): boolean => {
    for (const g of list) {
      if (g.id === id) {
        chain.push(...parents, g.id);
        return true;
      }
      if (findChain(g.groups, [...parents, g.id])) return true;
    }
    return false;
  };
  findChain(next.rootGroups, []);
  for (const gid of chain) {
    const target = findGroup(next, gid);
    if (target) target.collapsed = false;
  }
  return next;
}
