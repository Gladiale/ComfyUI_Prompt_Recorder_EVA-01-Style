/**
 * ファクトリ関数
 * グループ、ワード、初期状態の生成
 */

import type { Group, RootState, Word } from "@/types";
import { ROOT_VERSION } from "@/types";
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

// ---- サンプルデータ（初回起動時のガイド用） ----
export function createDefaultState(): RootState {
  const character = createGroup("CHARACTER");
  const upperBody = createGroup("Upper Body");
  upperBody.words = [
    createWord("long silver hair", "銀髪ロング。綾波系。"),
    createWord("red eyes", "深紅の瞳。"),
  ];
  const accessories = createGroup("Accessories");
  accessories.words = [
    createWord("hair ornament", "髪飾り。"),
    createWord("choker", "首元の装飾。"),
  ];
  character.groups = [upperBody, accessories];
  character.words = [createWord("pale skin", "白磁の肌。")];

  const background = createGroup("BACKGROUND");
  background.words = [
    createWord("ruins", "廃墟。"),
    createWord("sunset sky", "夕暮れの空。"),
  ];

  const light = createGroup("LIGHT");
  light.words = [
    createWord("rim lighting", "輪郭光。"),
    createWord("dramatic shadows", "劇的な陰影。"),
  ];

  return {
    version: ROOT_VERSION,
    rootGroups: [character, background, light],
  };
}
