/**
 * ファクトリ関数
 * グループ、ワードの生成
 */

import type { Group, Word } from "@/types";
import { genId } from "./id";

export function createWord(
  text = "",
  note = "",
  selected = false,
  strength = 0,
  image?: string,
): Word {
  const w: Word = { id: genId("w"), text, note, selected, strength };
  if (image) w.image = image;
  return w;
}

export function createGroup(name = "NEW GROUP"): Group {
  return { id: genId("grp"), name, collapsed: false, groups: [], words: [] };
}
