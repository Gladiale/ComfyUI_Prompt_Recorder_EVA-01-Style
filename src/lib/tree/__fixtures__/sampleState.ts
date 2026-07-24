/**
 * ツリー操作テスト用の固定 ID フィクスチャ。
 * genId に依存せず、アサーションしやすい ID を手書きする。
 */

import type { Group, RootState, Word } from "@/types";
import { ROOT_VERSION } from "@/types";

export function word(
  id: string,
  text: string,
  opts: Partial<Pick<Word, "note" | "selected" | "strength" | "image">> = {},
): Word {
  return {
    id,
    text,
    note: opts.note ?? "",
    selected: opts.selected ?? false,
    strength: opts.strength ?? 0,
    ...(opts.image !== undefined ? { image: opts.image } : {}),
  };
}

export function group(
  id: string,
  name: string,
  opts: {
    collapsed?: boolean;
    groups?: Group[];
    words?: Word[];
  } = {},
): Group {
  return {
    id,
    name,
    collapsed: opts.collapsed ?? false,
    groups: opts.groups ?? [],
    words: opts.words ?? [],
  };
}

/**
 * ネスト例:
 * root
 *   A (grp-a)
 *     words: w-a1 (selected), w-a2
 *     B (grp-b, collapsed)
 *       words: w-b1 (selected, strength 2)
 *       C (grp-c)
 *         words: w-c1
 *   D (grp-d)
 *     words: w-d1 (selected)
 */
export function makeSampleRoot(): RootState {
  return {
    version: ROOT_VERSION,
    rootGroups: [
      group("grp-a", "Group A", {
        words: [
          word("w-a1", "alpha", { selected: true }),
          word("w-a2", "alpha_dup", { note: "note-a2" }),
        ],
        groups: [
          group("grp-b", "Group B", {
            collapsed: true,
            words: [word("w-b1", "beta", { selected: true, strength: 2 })],
            groups: [
              group("grp-c", "Group C", {
                words: [word("w-c1", "gamma")],
              }),
            ],
          }),
        ],
      }),
      group("grp-d", "Group D", {
        words: [word("w-d1", "delta", { selected: true })],
      }),
    ],
  };
}

/** 空のルート状態。 */
export function makeEmptyRoot(): RootState {
  return { version: ROOT_VERSION, rootGroups: [] };
}
