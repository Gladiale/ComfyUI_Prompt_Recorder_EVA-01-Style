// プリセット画像の選択・プレビュー・削除
import type { RefObject } from "react";
import { FiImage, FiX } from "react-icons/fi";

export function ImagePicker({
  image,
  busy,
  error,
  requireImage,
  fileRef,
  onPickFile,
  onClear,
  onOpenPicker,
}: {
  image: string;
  busy: boolean;
  error: string | null;
  requireImage: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
        IMAGE {requireImage ? "(必須・最大560px)" : "(任意・最大560px)"}
      </span>
      {image ? (
        <div className="relative w-fit max-w-full">
          <img
            src={image}
            alt="preset"
            className="max-h-36 max-w-full rounded-sm border border-eva-line-soft object-contain"
          />
          <button
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full border border-eva-line bg-eva-bg-panel text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="画像を削除"
          >
            <FiX size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenPicker}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-sm border border-dashed border-eva-line px-2 py-2.5 text-[11px] text-eva-ink-dim hover:text-eva-green hover:border-eva-green transition-colors disabled:opacity-50"
        >
          <FiImage size={13} />
          {busy ? "圧縮中…" : "画像を選択（幅・高さを自動検出）"}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPickFile}
        className="hidden"
      />
      {error && <span className="text-[10px] text-eva-magenta">{error}</span>}
    </div>
  );
}
