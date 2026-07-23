// プリセット保存・編集フォーム / PresetFormModal
// 保存時は現在の選択ワード + フォーム情報を記録。
// 編集時はメタ情報のみ更新（entries は維持）。
import { motion } from "motion/react";
import { FiX } from "react-icons/fi";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { usePresetFormState } from "@/hooks/usePresetFormState";
import type { PresetFormData } from "@/types";
import { FormField } from "./preset/FormField";
import { ImagePicker } from "./preset/ImagePicker";
import { ModelListEditor } from "./preset/ModelListEditor";
import { NumField } from "./preset/NumField";

export interface PresetFormModalProps {
  title: string;
  mode: "save" | "edit";
  initial: PresetFormData;
  excludeId?: string;
  existingNames: Array<{ id: string; name: string }>;
  requireImage: boolean;
  onSubmit: (form: PresetFormData) => void;
  onClose: () => void;
}

export function PresetFormModal({
  title,
  mode,
  initial,
  excludeId,
  existingNames,
  requireImage,
  onSubmit,
  onClose,
}: PresetFormModalProps) {
  useEscapeKey(onClose);

  const form = usePresetFormState({
    initial,
    excludeId,
    existingNames,
    requireImage,
    onSubmit,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-105 max-h-[92vh] flex flex-col rounded-sm border border-eva-line bg-eva-bg-panel-2 shadow-glow-purple"
      >
        {/* ヘッダ */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-eva-line-soft shrink-0">
          <span className="font-cinzel tracking-widest text-[11px] text-eva-green">
            {title}
          </span>
          <button
            onClick={onClose}
            className="text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="閉じる"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* 本文（スクロール） */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          <ImagePicker
            image={form.image}
            busy={form.busy}
            error={form.error}
            requireImage={requireImage}
            fileRef={form.fileRef}
            onPickFile={form.onPickFile}
            onClear={() => form.setImage("")}
            onOpenPicker={() => form.fileRef.current?.click()}
          />

          <FormField label="NAME *">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => form.setName(e.target.value)}
              className="ev-input rounded-sm px-1.5 py-1 text-[13px] w-full"
              placeholder="プリセット名"
            />
            {form.nameDup && (
              <span className="text-[10px] text-eva-magenta">
                同名のプリセットが既に存在します
              </span>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="BASE MODEL">
              <input
                value={form.baseModel}
                onChange={(e) => form.setBaseModel(e.target.value)}
                className="ev-input rounded-sm px-1.5 py-1 text-[12px] w-full"
                placeholder="e.g. sd_xl_base"
              />
            </FormField>
            <FormField label="KIND">
              <input
                value={form.baseModelKind}
                onChange={(e) => form.setBaseModelKind(e.target.value)}
                className="ev-input rounded-sm px-1.5 py-1 text-[12px] w-full"
                placeholder="SDXL / Pony / FLUX…"
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              METADATA
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <NumField
                label="Steps"
                value={form.metadata.steps}
                onChange={(v) => form.setMeta("steps", v)}
                min={1}
                step={1}
              />
              <NumField
                label="CFG"
                value={form.metadata.cfg}
                onChange={(v) => form.setMeta("cfg", v)}
                min={0}
                step={0.5}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] text-eva-ink-dim/80">
                  Sampler
                </span>
                <input
                  value={form.metadata.sampler}
                  onChange={(e) => form.setMeta("sampler", e.target.value)}
                  className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] text-eva-ink-dim/80">
                  Scheduler
                </span>
                <input
                  value={form.metadata.scheduler}
                  onChange={(e) => form.setMeta("scheduler", e.target.value)}
                  className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full"
                />
              </div>
              <NumField
                label="Width"
                value={form.metadata.width}
                onChange={(v) => form.setMeta("width", v)}
                min={1}
                step={8}
              />
              <NumField
                label="Height"
                value={form.metadata.height}
                onChange={(v) => form.setMeta("height", v)}
                min={1}
                step={8}
              />
            </div>
          </div>

          <ModelListEditor
            label="LoRAs"
            items={form.loras}
            onChange={form.setLoras}
          />

          <ModelListEditor
            label="ControlNets"
            items={form.controlNets}
            onChange={form.setControlNets}
          />

          <FormField label="DESCRIPTION">
            <textarea
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              rows={2}
              className="ev-input rounded-sm px-1.5 py-1 text-[11px] font-mono resize-none w-full"
              placeholder="メモ・説明（任意）"
            />
          </FormField>

          {mode === "save" && (
            <p className="text-[10px] text-eva-ink-dim/80 leading-relaxed">
              保存時に現在選択中のワード（id / text / strength）が一緒に記録されます。
            </p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex gap-2 px-3 py-2.5 border-t border-eva-line-soft shrink-0">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-eva-line px-2 py-1.5 text-[12px] text-eva-ink-dim hover:text-eva-ink hover:border-eva-purple-bright transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={form.submit}
            disabled={!form.canSubmit}
            className="flex-1 rounded-sm border border-eva-green/60 px-2 py-1.5 text-[12px] font-medium text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            {form.busy ? "処理中…" : mode === "save" ? "保存" : "更新"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
