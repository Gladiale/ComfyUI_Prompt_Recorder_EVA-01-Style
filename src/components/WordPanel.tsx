// 左：ワード画面 / WordPanel
import { useState, type DragEvent } from "react";
import { FiPlus } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { GroupNode } from "./GroupNode";
import { SearchBox } from "./SearchBox";
import { IOButtons } from "./IOButtons";

export function WordPanel() {
  const { state, addGroup, moveGroup } = usePrompt();
  const [query, setQuery] = useState("");
  const [draggingGroup, setDraggingGroup] = useState<string | null>(null);

  // ルート領域へのドロップ → ルート直下へ
  const onRootDragOver = (e: DragEvent) => {
    if (draggingGroup && e.dataTransfer.types.includes("text/group")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };
  const onRootDrop = (e: DragEvent) => {
    if (!draggingGroup) return;
    e.preventDefault();
    moveGroup(draggingGroup, { kind: "root" });
    setDraggingGroup(null);
  };

  return (
    <section className="flex flex-col h-full min-h-0">
      {/* ヘッダ：タイトル + IO + 検索 */}
      <header className="flex items-center gap-2 pb-2 mb-2 border-b border-eva-line justify-between">
        <h2 className="font-cinzel-deco tracking-[0.2em] text-[13px] text-[#d08be3] glow-text whitespace-nowrap">
          WORDS
        </h2>
        {/* <div className="flex-1" /> */}
        <SearchBox query={query} onChange={setQuery} />
        <IOButtons />
        <button
          onClick={() => addGroup(null)}
          className="flex items-center gap-1 px-2 py-1 rounded-sm border border-eva-line hover:border-eva-green text-eva-green-soft hover:text-eva-green hover:shadow-glow-green transition-all text-[11px] font-mono tracking-widest"
          title="ルートグループ追加"
        >
          <FiPlus size={12} /> GROUP
        </button>
      </header>

      {/* ツリー本体（スクロール領域） */}
      <div
        onDragOver={onRootDragOver}
        onDrop={onRootDrop}
        className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2"
      >
        <div className="flex flex-col gap-2">
          {state.rootGroups.map((g) => (
            <GroupNode
              key={g.id}
              group={g}
              depth={0}
              query={query}
              isDraggingGroup={draggingGroup}
              setIsDraggingGroup={setDraggingGroup}
            />
          ))}
        </div>
        {state.rootGroups.length === 0 && (
          <div className="text-center text-eva-ink-dim italic mt-10 font-garamond">
            グループがありません。
            <br />
            「+ GROUP」で新規作成。
          </div>
        )}
      </div>
    </section>
  );
}
