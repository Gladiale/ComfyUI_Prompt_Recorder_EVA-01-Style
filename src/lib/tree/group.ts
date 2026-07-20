/**
 * グループ操作ユーティリティ
 * グループの追加・更新・削除・移動を担当
 */

import type { Group, RootState } from "@/types";
import { createGroup } from "./factory";
import { findGroup, isDescendant } from "./search";
import { clone, mutateGroup } from "./immutable";

// ---- グループ操作 ----

export function addGroup(root: RootState, parentId: string | null): RootState {
  const newGroup = createGroup("NEW GROUP");
  const next = clone(root);
  if (parentId === null) {
    next.rootGroups.push(newGroup);
  } else {
    const parent = findGroup(next, parentId);
    if (parent) {
      parent.groups.push(newGroup);
      parent.collapsed = false; // 子を追加したら展開
    }
  }
  return next;
}

export function renameGroup(root: RootState, id: string, name: string): RootState {
  return mutateGroup(root, id, (g) => {
    g.name = name;
  });
}

export function toggleCollapse(root: RootState, id: string): RootState {
  return mutateGroup(root, id, (g) => {
    g.collapsed = !g.collapsed;
  });
}

export function setCollapsed(root: RootState, id: string, collapsed: boolean): RootState {
  return mutateGroup(root, id, (g) => {
    g.collapsed = collapsed;
  });
}

export function deleteGroup(root: RootState, id: string): RootState {
  const next = clone(root);
  // ルート直下か、親グループ配下かを再帰で探索して除去
  next.rootGroups = removeFromList(next.rootGroups, id);
  return next;
}

function removeFromList(list: Group[], id: string): Group[] {
  const filtered = list.filter((g) => g.id !== id);
  return filtered.map((g) => ({
    ...g,
    groups: removeFromList(g.groups, id),
  }));
}

// ============================================================
// グループ移動（並び替え + 他グループ内へのネスト）
// アンカーID基準で安全に挿入位置を決定（除去によるindexズレを吸収）。
// ============================================================

/** 移動先スペック */
export type GroupDropTarget =
  | { kind: "into"; parentId: string } // 指定グループの子として末尾にネスト
  | { kind: "before"; anchorId: string } // アンカーグループの直前（兄弟）
  | { kind: "after"; anchorId: string } // アンカーグループの直後（兄弟）
  | { kind: "root" }; // ルート直下の末尾

interface ParentLoc {
  list: Group[]; // そのグループが属する配列（参照）
  index: number;
}

/** 指定IDのグループが属する配列とindexを見つける。 */
function locateGroup(root: RootState, id: string): ParentLoc | null {
  const idx = root.rootGroups.findIndex((g) => g.id === id);
  if (idx >= 0) return { list: root.rootGroups, index: idx };
  for (const g of root.rootGroups) {
    const found = locateGroupInGroup(g, id);
    if (found) return found;
  }
  return null;
}

function locateGroupInGroup(g: Group, id: string): ParentLoc | null {
  const idx = g.groups.findIndex((c) => c.id === id);
  if (idx >= 0) return { list: g.groups, index: idx };
  for (const child of g.groups) {
    const found = locateGroupInGroup(child, id);
    if (found) return found;
  }
  return null;
}

/** ツリー全体から該当idの配列位置を物理削除し、実体を返す。 */
function pluckGroup(root: RootState, id: string): Group | null {
  const loc = locateGroup(root, id);
  if (!loc) return null;
  return loc.list.splice(loc.index, 1)[0];
}

/** 自身や子孫への移動（循環）を禁止。 */
function wouldCycle(
  root: RootState,
  draggedId: string,
  targetParentId: string | null,
): boolean {
  if (targetParentId === null) return false;
  if (draggedId === targetParentId) return true;
  return isDescendant(root, draggedId, targetParentId);
}

export function moveGroup(
  root: RootState,
  draggedId: string,
  target: GroupDropTarget,
): RootState {
  // 循環判定（into のみ意味を持つが、before/after でも安全側に倒す）
  if (target.kind === "into" && wouldCycle(root, draggedId, target.parentId)) return root;
  // 自身を自身の前後に置くのは無意味
  if (
    (target.kind === "before" || target.kind === "after") &&
    target.anchorId === draggedId
  )
    return root;

  const next = clone(root);
  const removed = pluckGroup(next, draggedId);
  if (!removed) return root;

  if (target.kind === "root") {
    next.rootGroups.push(removed);
    return next;
  }

  if (target.kind === "into") {
    // 親がドラッグ中に除去されている可能性 → 再検索
    const parent = findGroup(next, target.parentId);
    if (parent) {
      parent.groups.push(removed);
      parent.collapsed = false;
    } else {
      next.rootGroups.push(removed);
    }
    return next;
  }

  // before / after : アンカー位置を「除去後のツリーで」再計算して挿入
  const anchorLoc = locateGroup(next, target.anchorId);
  if (!anchorLoc) {
    next.rootGroups.push(removed);
    return next;
  }
  const insertAt = target.kind === "before" ? anchorLoc.index : anchorLoc.index + 1;
  anchorLoc.list.splice(insertAt, 0, removed);
  return next;
}
