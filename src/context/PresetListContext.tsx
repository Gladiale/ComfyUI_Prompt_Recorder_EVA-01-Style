// プリセット一覧パネルの Provider / Context
// open/close で全画面ハニカム一覧を表示する。
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import { PresetListPanel } from "@/components/PresetListPanel";

interface PresetListValue {
  open: () => void;
  close: () => void;
}

const PresetListContext = createContext<PresetListValue | null>(null);

export function PresetListProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <PresetListContext value={value}>
      {children}
      <AnimatePresence>{visible && <PresetListPanel onClose={close} />}</AnimatePresence>
    </PresetListContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresetList(): PresetListValue {
  const ctx = useContext(PresetListContext);
  if (!ctx) throw new Error("usePresetList must be used within PresetListProvider");
  return ctx;
}
