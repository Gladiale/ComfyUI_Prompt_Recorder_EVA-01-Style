// 検索欄 / SearchBox — ワード本文と注釈を横断検索
import { FiSearch, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  query: string;
  onChange: (q: string) => void;
}

export function SearchBox({ query, onChange }: Props) {
  return (
    <div className="relative flex items-center">
      <FiSearch
        className="absolute left-3 text-eva-ink-dim pointer-events-none"
        size={14}
      />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SEARCH WORDS · NOTES"
        className="ev-input w-full rounded-sm pl-9 pr-8 py-2 font-mono text-[12px] tracking-widest uppercase placeholder:text-eva-ink-dim/60"
      />
      <AnimatePresence>
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={() => onChange("")}
            className="absolute right-2 text-eva-ink-dim hover:text-eva-green transition-colors"
            title="クリア"
          >
            <FiX size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
