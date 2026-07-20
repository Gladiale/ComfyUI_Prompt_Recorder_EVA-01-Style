/**
 * ツリー検索ユーティリティ
 * グループやワードの検索、親子関係の特定を担当
 */

import type { Group, RootState } from "@/types";

export function findGroup(root: RootState, id: string): Group | undefined {
  for (const g of root.rootGroups) {
    const found = findGroupInGroup(g, id);
    if (found) return found;
  }
  return undefined;
}

function findGroupInGroup(g: Group, id: string): Group | undefined {
  if (g.id === id) return g;
  for (const child of g.groups) {
    const found = findGroupInGroup(child, id);
    if (found) return found;
  }
  return undefined;
}

/** 指定グループが指定IDの子孫か（移動先の循環防止用）。 */
export function isDescendant(
  root: RootState,
  ancestorId: string,
  maybeDescendantId: string,
): boolean {
  const ancestor = findGroup(root, ancestorId);
  if (!ancestor) return false;
  return groupsContains(ancestor, maybeDescendantId);
}

function groupsContains(g: Group, id: string): boolean {
  for (const child of g.groups) {
    if (child.id === id) return true;
    if (groupsContains(child, id)) return true;
  }
  return false;
}
