// 検索結果ビュー — ヒットしたワードと直属グループ名のみ表示
import type { DragEvent } from "react";
import type { Word } from "@/types";
import type { SearchHitGroup } from "@/lib/tree";
import { WordItem } from "./WordItem";

interface Props {
  hits: SearchHitGroup[];
}

const noopWord: (word: Word) => void = () => {};
const noopWordDragOver: (event: DragEvent, word: Word) => void = () => {};
const noop = () => {};

export function SearchResults({ hits }: Props) {
  if (hits.length === 0) {
    return (
      <div className="text-center text-eva-ink-dim italic mt-10 font-garamond">
        該当するワードがありません。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hits.map((hit) => (
        <section key={hit.groupId} className="bg-eva-claret rounded-xl border-t border-[#c993e0] overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-eva-line/40">
            <span className="font-cinzel tracking-widest text-[11px] text-eva-ink-dim truncate">
              {hit.groupName}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 py-1.5 px-2.5">
            {hit.words.map((word) => (
              <WordItem
                key={word.id}
                word={word}
                groupId={hit.groupId}
                isDragging={false}
                onWordDragStart={noopWord}
                onWordDragOver={noopWordDragOver}
                onWordDragEnd={noop}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
