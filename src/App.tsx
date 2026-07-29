// 全体レイアウト / App
import { PromptProvider } from "@/context/PromptContext";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { WordEditorProvider } from "@/components/WordEditModal";
import { ClockNavProvider } from "@/context/ClockNavContext";
import { PresetFormProvider } from "@/context/PresetFormContext";
import { PresetListProvider } from "@/context/PresetListContext";
import { WordPanel } from "@/components/WordPanel";
import { SynthesisPanel } from "@/components/SynthesisPanel";
import { SelectedPanel } from "@/components/SelectedPanel";
import Decoration from "./components/Decoration";

function Shell() {
  // const { ready } = usePrompt();

  return (
    <div className="relative z-10 w-full h-full flex flex-col">
      <Decoration />

      {/* クレストバー */}
      {/* <div className="flex items-center gap-2 px-3 py-1 border-b border-eva-line bg-eva-bg-panel/40">
        <span className="font-cinzel-deco tracking-[0.3em] text-[10px] text-eva-green">
          ◇ NERV · PROMPT TERMINAL ◇
        </span>
        <div className="flex-1" />
        <span className="font-mono text-[11px] text-[#e7b2ed] tracking-widest">
          {ready ? "✙ 絶対領域展開 𝄇" : "○ BOOTING…"}
        </span>
      </div> */}

      {/* レイアウト */}
      <main className="flex-1 min-h-0 flex gap-1.5 px-2 py-3">
        <div
          style={{ flexBasis: "63%", flexGrow: 0, flexShrink: 1 }}
          className="min-w-0 h-full"
        >
          <WordPanel />
        </div>
        <div
          style={{ flexBasis: "37%", flexGrow: 0, flexShrink: 1 }}
          className="min-w-0 h-full flex flex-col gap-1.5"
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
          <PresetFormProvider>
            <PresetListProvider>
              <ClockNavProvider>
                <Shell />
              </ClockNavProvider>
            </PresetListProvider>
          </PresetFormProvider>
        </WordEditorProvider>
      </ConfirmProvider>
    </PromptProvider>
  );
}
