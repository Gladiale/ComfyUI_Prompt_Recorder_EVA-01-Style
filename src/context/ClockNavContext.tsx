// 時計ナビ（ClockNav）の Provider / Context
// open で指針型ロードマップを表示する。
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import { ClockDial } from "@/components/clock/ClockDial";

interface ClockNavValue {
  open: () => void;
}

const ClockNavContext = createContext<ClockNavValue | null>(null);

export function ClockNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo<ClockNavValue>(() => ({ open }), [open]);

  return (
    <ClockNavContext value={value}>
      {children}
      <AnimatePresence>
        {isOpen && <ClockDial onClose={close} />}
      </AnimatePresence>
    </ClockNavContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClockNav(): ClockNavValue {
  const ctx = useContext(ClockNavContext);
  if (!ctx) throw new Error("useClockNav must be used within ClockNavProvider");
  return ctx;
}
