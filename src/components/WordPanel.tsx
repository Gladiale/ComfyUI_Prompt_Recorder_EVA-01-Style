// 左：ワード画面 / WordPanel
import { useState, type DragEvent } from "react";
import { FiPlus } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { GroupNode } from "./GroupNode";
import { SearchBox } from "./SearchBox";
import { IOButtons } from "./IOButtons";
import { useClockNav } from "./ClockNav";

export function WordPanel() {
  const { state, addGroup, moveGroup } = usePrompt();
  const { open: openClockNav } = useClockNav();
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
    <section className="flex flex-col h-full">
      {/* ヘッダ：タイトル + IO + 検索 */}
      <header className="flex items-center justify-between pb-2 mb-2 border-b border-eva-line">
        <button
          onClick={openClockNav}
          title="時計ロードマップを開く"
          className="font-cinzel-deco tracking-[0.2em] text-[13px] text-[#d08be3] hover:text-eva-green glow-text whitespace-nowrap cursor-pointer transition-colors"
        >
          WORDS
        </button>
        {/* <div className="flex-1" /> */}
        <SearchBox query={query} onChange={setQuery} />
        <IOButtons />
        <button
          onClick={() => addGroup(null)}
          className="group h-full aspect-square rounded-full active:scale-90 flex items-center justify-center p-1 border border-eva-purple hover:border-eva-green text-eva-green-soft hover:text-eva-green hover:shadow-glow-green transition-all cursor-pointer"
          title="ルートグループ追加"
        >
          <FiPlus size={15} className="absolute group-hover:opacity-0 transition-all" />
          <span className="text-[10px] font-mono tracking-tighter absolute opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all">
            Group
          </span>
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
