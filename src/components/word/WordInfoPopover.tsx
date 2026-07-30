import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { RefObject } from "react";
import type { WordPopoverPosition } from "@/lib/wordPopoverGeometry";

interface Props {
  word: { text: string; note: string; image?: string };
  show: boolean;
  position: WordPopoverPosition | null;
  popRef: RefObject<HTMLDivElement | null>;
  measure: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function WordInfoPopover({ word, show, position, popRef, measure, onMouseEnter, onMouseLeave }: Props) {
  const hasNote = !!word.note.trim();
  const hasImage = !!word.image;
  if (!hasNote && !hasImage) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          ref={popRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.14 }}
          onClick={(event) => event.stopPropagation()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          style={{
            position: "fixed",
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            x: position?.x ?? "0",
            visibility: position ? "visible" : "hidden",
            zIndex: 9999,
          }}
          className="w-fit max-w-80 rounded-xl border border-eva-line bg-eva-ink/95 shadow-glow-green p-1.5"
        >
          {hasImage && (
            <img src={word.image} alt={word.text} onLoad={measure} className="w-full rounded-sm mb-1" />
          )}
          {hasNote && (
            <p className="text-[11px] font-mono text-eva-purple whitespace-pre-wrap wrap-break-word">
              {word.note}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
