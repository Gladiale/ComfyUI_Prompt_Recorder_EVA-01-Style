/**
 * ワード操作ユーティリティ
 * ワードの追加・更新・削除・並替を担当
 */

import type { RootState, Word } from "@/types";
import { createWord } from "./factory";
import { mutateGroup } from "./immutable";

// ---- ワード操作 ----

export function addWord(
  root: RootState,
  groupId: string,
  data: { text?: string; note?: string; image?: string } = {},
): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words.push(createWord(data.text ?? "", data.note ?? "", false, 0, data.image));
    g.collapsed = false;
  });
}

export function updateWord(
  root: RootState,
  groupId: string,
  wordId: string,
  patch: Partial<Pick<Word, "text" | "note" | "image">>,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId);
    if (w) {
      Object.assign(w, patch);
      // 空文字列は画像削除とみなして undefined に正規化
      if (patch.image === "") w.image = undefined;
    }
  });
}

export function toggleWord(root: RootState, groupId: string, wordId: string): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId);
    if (w) w.selected = !w.selected;
  });
}

export function setWordSelected(
  root: RootState,
  groupId: string,
  wordId: string,
  selected: boolean,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId);
    if (w) w.selected = selected;
  });
}

/** 選択ワードの出力強度（0..10）を設定する。 */
export function setWordStrength(
  root: RootState,
  groupId: string,
  wordId: string,
  strength: number,
): RootState {
  return mutateGroup(root, groupId, (g) => {
    const w = g.words.find((x) => x.id === wordId);
    if (w) w.strength = strength;
  });
}

export function deleteWord(root: RootState, groupId: string, wordId: string): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words = g.words.filter((w) => w.id !== wordId);
  });
}

/** 同一グループ内でのワード並び替え（Motion Reorder の結果を受ける）。
 *  Motion は value の参照でアイテムを追跡するため、クローンせず同一参照を保つ。 */
export function reorderWords(
  root: RootState,
  groupId: string,
  newWords: Word[],
): RootState {
  return mutateGroup(root, groupId, (g) => {
    g.words = newWords;
  });
}
