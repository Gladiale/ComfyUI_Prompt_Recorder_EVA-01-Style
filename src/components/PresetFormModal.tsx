// プリセット保存・編集フォーム / PresetFormModal
// 保存時は現在の選択ワード + フォーム情報を記録。
// 編集時はメタ情報のみ更新（entries は維持）。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiImage, FiMinus, FiPlus, FiX } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { processPresetImage } from "@/lib/image";
import type {
  PresetFormData,
  PresetMetadata,
  PresetModelRef,
  PromptPreset,
} from "@/types";
import { DEFAULT_PRESET_METADATA } from "@/types";

// ============================================================
// Context
// ============================================================

type Mode =
  | { kind: "save" }
  | { kind: "edit"; preset: PromptPreset };

interface PresetFormValue {
  openSave: () => void;
  openEdit: (preset: PromptPreset) => void;
}

const PresetFormContext = createContext<PresetFormValue | null>(null);

export function PresetFormProvider({ children }: { children: ReactNode }) {
  const { savePreset, updatePresetMeta, state } = usePrompt();
  const [mode, setMode] = useState<Mode | null>(null);

  const openSave = useCallback(() => setMode({ kind: "save" }), []);
  const openEdit = useCallback(
    (preset: PromptPreset) => setMode({ kind: "edit", preset }),
    [],
  );
  const close = useCallback(() => setMode(null), []);

  const submit = useCallback(
    (form: PresetFormData) => {
      if (!mode) return;
      if (mode.kind === "save") {
        savePreset(form);
      } else {
        updatePresetMeta(mode.preset.id, form);
      }
      close();
    },
    [mode, savePreset, updatePresetMeta, close],
  );

  // 同名チェック用
  const existingNames = (state.presets ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const value: PresetFormValue = { openSave, openEdit };

  return (
    <PresetFormContext value={value}>
      {children}
      <AnimatePresence>
        {mode && (
          <PresetFormModalView
            key={mode.kind === "save" ? "save" : `edit-${mode.preset.id}`}
            title={mode.kind === "save" ? "SAVE PRESET" : "EDIT PRESET"}
            mode={mode.kind}
            initial={
              mode.kind === "save"
                ? emptyForm()
                : presetToForm(mode.preset)
            }
            excludeId={mode.kind === "edit" ? mode.preset.id : undefined}
            existingNames={existingNames}
            requireImage={mode.kind === "save"}
            onSubmit={submit}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </PresetFormContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresetForm(): PresetFormValue {
  const ctx = useContext(PresetFormContext);
  if (!ctx) throw new Error("usePresetForm must be used within PresetFormProvider");
  return ctx;
}

// ============================================================
// Helpers
// ============================================================

function emptyForm(): PresetFormData {
  return {
    name: "",
    baseModel: "",
    baseModelKind: "",
    loras: [],
    controlNets: [],
    metadata: { ...DEFAULT_PRESET_METADATA },
    image: "",
    description: "",
  };
}

function presetToForm(p: PromptPreset): PresetFormData {
  return {
    name: p.name,
    baseModel: p.baseModel,
    baseModelKind: p.baseModelKind,
    loras: p.loras ? p.loras.map((m) => ({ ...m })) : [],
    controlNets: p.controlNets ? p.controlNets.map((m) => ({ ...m })) : [],
    metadata: { ...p.metadata },
    image: p.image,
    description: p.description ?? "",
  };
}

// ============================================================
// Modal View
// ============================================================

interface ViewProps {
  title: string;
  mode: "save" | "edit";
  initial: PresetFormData;
  excludeId?: string;
  existingNames: Array<{ id: string; name: string }>;
  requireImage: boolean;
  onSubmit: (form: PresetFormData) => void;
  onClose: () => void;
}

function PresetFormModalView({
  title,
  mode,
  initial,
  excludeId,
  existingNames,
  requireImage,
  onSubmit,
  onClose,
}: ViewProps) {
  const [name, setName] = useState(initial.name);
  const [baseModel, setBaseModel] = useState(initial.baseModel);
  const [baseModelKind, setBaseModelKind] = useState(initial.baseModelKind);
  const [loras, setLoras] = useState<PresetModelRef[]>(initial.loras ?? []);
  const [controlNets, setControlNets] = useState<PresetModelRef[]>(
    initial.controlNets ?? [],
  );
  const [metadata, setMetadata] = useState<PresetMetadata>(initial.metadata);
  const [image, setImage] = useState(initial.image);
  const [description, setDescription] = useState(initial.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { dataUrl, width, height } = await processPresetImage(file);
      setImage(dataUrl);
      setMetadata((m) => ({ ...m, width, height }));
    } catch {
      setError("画像の読み込みに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const nameTrim = name.trim();
  const nameDup = existingNames.some(
    (p) =>
      p.id !== excludeId &&
      p.name.trim().toLowerCase() === nameTrim.toLowerCase(),
  );

  const canSubmit =
    nameTrim.length > 0 && !busy && (!requireImage || !!image);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: nameTrim,
      baseModel: baseModel.trim(),
      baseModelKind: baseModelKind.trim(),
      loras,
      controlNets,
      metadata,
      image,
      description: description.trim() || undefined,
    });
  };

  const setMeta = <K extends keyof PresetMetadata>(key: K, value: PresetMetadata[K]) => {
    setMetadata((m) => ({ ...m, [key]: value }));
  };

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
          {/* 画像 */}
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
                  onClick={() => setImage("")}
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

          {/* 名前 */}
          <Field label="NAME *">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ev-input rounded-sm px-1.5 py-1 text-[13px] w-full"
              placeholder="プリセット名"
            />
            {nameDup && (
              <span className="text-[10px] text-eva-magenta">
                同名のプリセットが既に存在します（保存すると上書きされます）
              </span>
            )}
          </Field>

          {/* Base model */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="BASE MODEL">
              <input
                value={baseModel}
                onChange={(e) => setBaseModel(e.target.value)}
                className="ev-input rounded-sm px-1.5 py-1 text-[12px] w-full"
                placeholder="e.g. sd_xl_base"
              />
            </Field>
            <Field label="KIND">
              <input
                value={baseModelKind}
                onChange={(e) => setBaseModelKind(e.target.value)}
                className="ev-input rounded-sm px-1.5 py-1 text-[12px] w-full"
                placeholder="SDXL / Pony / FLUX…"
              />
            </Field>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
              METADATA
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <NumField
                label="Steps"
                value={metadata.steps}
                onChange={(v) => setMeta("steps", v)}
                min={1}
                step={1}
              />
              <NumField
                label="CFG"
                value={metadata.cfg}
                onChange={(v) => setMeta("cfg", v)}
                min={0}
                step={0.5}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] text-eva-ink-dim/80">Sampler</span>
                <input
                  value={metadata.sampler}
                  onChange={(e) => setMeta("sampler", e.target.value)}
                  className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] text-eva-ink-dim/80">Scheduler</span>
                <input
                  value={metadata.scheduler}
                  onChange={(e) => setMeta("scheduler", e.target.value)}
                  className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full"
                />
              </div>
              <NumField
                label="Width"
                value={metadata.width}
                onChange={(v) => setMeta("width", v)}
                min={1}
                step={8}
              />
              <NumField
                label="Height"
                value={metadata.height}
                onChange={(v) => setMeta("height", v)}
                min={1}
                step={8}
              />
            </div>
          </div>

          {/* LoRAs */}
          <ModelListEditor
            label="LoRAs"
            items={loras}
            onChange={setLoras}
          />

          {/* ControlNets */}
          <ModelListEditor
            label="ControlNets"
            items={controlNets}
            onChange={setControlNets}
          />

          {/* Description */}
          <Field label="DESCRIPTION">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="ev-input rounded-sm px-1.5 py-1 text-[11px] font-mono resize-none w-full"
              placeholder="メモ・説明（任意）"
            />
          </Field>

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
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 rounded-sm border border-eva-green/60 px-2 py-1.5 text-[12px] font-medium text-eva-green-soft hover:bg-eva-green/15 hover:shadow-glow-green transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            {busy ? "処理中…" : mode === "save" ? "保存" : "更新"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Sub components
// ============================================================

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] text-eva-ink-dim/80">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="ev-input rounded-sm px-1 py-0.5 text-[11px] w-full font-mono"
      />
    </div>
  );
}

function ModelListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: PresetModelRef[];
  onChange: (next: PresetModelRef[]) => void;
}) {
  const add = () => onChange([...items, { model: "", strength: 1 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const patch = (i: number, patch: Partial<PresetModelRef>) =>
    onChange(items.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-eva-ink-dim">
          {label}
        </span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-0.5 text-[10px] text-eva-green-soft hover:text-eva-green transition-colors"
        >
          <FiPlus size={11} /> 追加
        </button>
      </div>
      {items.length === 0 && (
        <span className="text-[10px] text-eva-ink-dim/60 italic">なし</span>
      )}
      {items.map((m, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            value={m.model}
            onChange={(e) => patch(i, { model: e.target.value })}
            className="ev-input flex-1 min-w-0 rounded-sm px-1.5 py-0.5 text-[11px]"
            placeholder="model name"
          />
          <input
            type="number"
            value={m.strength}
            step={0.05}
            onChange={(e) => {
              const n = Number(e.target.value);
              patch(i, { strength: Number.isFinite(n) ? n : 1 });
            }}
            className="ev-input w-14 rounded-sm px-1 py-0.5 text-[11px] font-mono text-center"
            title="strength"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="p-0.5 text-eva-ink-dim hover:text-eva-magenta transition-colors"
            title="削除"
          >
            <FiMinus size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
