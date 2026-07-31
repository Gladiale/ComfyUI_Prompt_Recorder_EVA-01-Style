/**
 * 検索ヒット収集
 * ワード本文・注釈のみを対象に、直属グループ単位でヒットを収集する。
 */

import type { Group, Word } from "@/types";
import { normalizeText } from "@/lib/normalize";

export interface SearchHitGroup {
  groupId: string;
  groupName: string;
  words: Word[];
}

/** 正規化済み query に対してワードがヒットするか（本文 or 注釈）。 */
export function wordMatchesQuery(word: Word, query: string): boolean {
  if (!query) return false;
  return (
    normalizeText(word.text).includes(query) ||
    word.note.toLowerCase().includes(query)
  );
}

/**
 * ツリーを深さ優先で走査し、直下ワードにヒットがあるグループだけを収集する。
 * グループ名はマッチ対象にしない。空クエリは空配列。
 */
export function collectSearchHits(groups: Group[], rawQuery: string): SearchHitGroup[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const out: SearchHitGroup[] = [];
  const walk = (group: Group) => {
    const hits = group.words.filter((w) => wordMatchesQuery(w, query));
    if (hits.length > 0) {
      out.push({ groupId: group.id, groupName: group.name, words: hits });
    }
    for (const child of group.groups) walk(child);
  };
  for (const g of groups) walk(g);
  return out;
}
