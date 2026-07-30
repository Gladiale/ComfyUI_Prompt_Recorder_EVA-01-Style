// ワード画像選択・プレビュー
import { FiImage, FiX } from "react-icons/fi";
import type { ChangeEvent, RefObject } from "react";

interface WordImagePickerProps {
  image?: string;
  busy: boolean;
  error: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  onPickFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function WordImagePicker({
  image,
  busy,
  error,
  fileRef,
  onPickFile,
  onRemove,
}: WordImagePickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
        IMAGE (任意・最大420px / JPEG圧縮)
      </span>

      {image ? (
        <div className="relative w-fit">
          <img
            src={image}
            alt="preview"
            className="max-h-40 max-w-full rounded-sm border border-eva-line-soft"
          />
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full border border-eva-line bg-eva-bg-panel text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="画像を削除"
          >
            <FiX size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-sm border border-dashed border-eva-line px-2 py-2 text-[11px] text-eva-ink-dim hover:text-eva-green hover:border-eva-green transition-colors disabled:opacity-50"
        >
          <FiImage size={13} />
          {busy ? "圧縮中…" : "画像を選択"}
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
