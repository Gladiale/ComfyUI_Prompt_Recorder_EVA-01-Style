// 全体レイアウト / App
// 左右非対称（黄金比 1.618:1 → 左 61.8%, 右 38.2%）。縦固定・横可変。
import { PromptProvider, usePrompt } from "@/context/PromptContext";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { WordEditorProvider } from "@/components/WordEditModal";
import { WordPanel } from "@/components/WordPanel";
import { SynthesisPanel } from "@/components/SynthesisPanel";
import { SelectedPanel } from "@/components/SelectedPanel";

function Shell() {
  const { ready } = usePrompt();

  return (
    <div className="relative z-10 w-full h-full flex flex-col">
      {/* クレストバー */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-eva-line bg-eva-bg-panel/40">
        <span className="font-cinzel-deco tracking-[0.3em] text-[10px] text-eva-green">
          ◇ NERV · PROMPT TERMINAL ◇
        </span>
        <div className="flex-1" />
        <span className="font-mono text-[11px] text-[#e7b2ed] tracking-widest">
          {ready ? "✙ 絶対領域展開 𝄇" : "○ BOOTING…"}
        </span>
      </div>

      {/* メイン：黄金比 左61.8 / 右38.2 */}
      <main className="flex-1 min-h-0 flex gap-2 p-2">
        <div
          style={{ flexBasis: "61.8%", flexGrow: 0, flexShrink: 1 }}
          className="min-w-0 h-full"
        >
          <WordPanel />
        </div>
        <div
          style={{ flexBasis: "38.2%", flexGrow: 0, flexShrink: 1 }}
          className="min-w-0 h-full flex flex-col gap-2"
        >
          <div className="h-1/2 min-h-0">
            <SynthesisPanel />
          </div>
          <div className="h-1/2 min-h-0">
            <SelectedPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PromptProvider>
      <ConfirmProvider>
        <WordEditorProvider>
          <Shell />
        </WordEditorProvider>
      </ConfirmProvider>
    </PromptProvider>
  );
}
