/**
 * immutable更新ヘルパ
 * structuredCloneベースの安全な状態更新
 */

import type { Group, RootState } from "@/types";
import { findGroup } from "./search";

function clone(root: RootState): RootState {
  return structuredClone(root);
}

/** グループを id で見つけ、updater で書き換える。 */
export function mutateGroup(
  root: RootState,
  id: string,
  updater: (g: Group) => void,
): RootState {
  const next = clone(root);
  const target = findGroup(next, id);
  if (target) updater(target);
  return next;
}

export { clone };
