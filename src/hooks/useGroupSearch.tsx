// グループ検索の表示判定
import type { Group, Word } from "@/types";
import { normalizeText } from "@/lib/normalize";

export interface GroupSearchResult {
  query: string;
  hasQuery: boolean;
  wordMatches: (word: Word) => boolean;
  groupMatchesSearch: boolean;
  containsMatch: boolean;
  expanded: boolean;
}

export function useGroupSearch(group: Group, rawQuery: string): GroupSearchResult {
  const query = rawQuery.trim().toLowerCase();
  const hasQuery = !!query;
  const wordMatches = (word: Word) =>
    !hasQuery || normalizeText(word.text).includes(query) || word.note.toLowerCase().includes(query);

  const containsMatch = hasQuery && recursiveHasMatch(group, wordMatches);
  const groupMatchesSearch = !hasQuery || group.name.toLowerCase().includes(query) || containsMatch;

  return {
    query,
    hasQuery,
    wordMatches,
    groupMatchesSearch,
    containsMatch,
    expanded: !group.collapsed || containsMatch,
  };
}

function recursiveHasMatch(group: Group, wordMatches: (word: Word) => boolean): boolean {
  return group.words.some(wordMatches) || group.groups.some((child) => recursiveHasMatch(child, wordMatches));
}
