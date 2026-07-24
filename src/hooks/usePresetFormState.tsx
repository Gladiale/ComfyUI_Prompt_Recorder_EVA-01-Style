// プリセット保存・編集フォームの状態・検証・画像処理
import { useRef, useState } from "react";
import { processPresetImage } from "@/lib/image";
import type {
  PresetFormData,
  PresetMetadata,
  PresetModelRef,
  PromptPreset,
} from "@/types";

/** フォーム編集用。未入力フィールドは undefined。 */
export type FormMetadata = Partial<PresetMetadata>;

export function emptyForm(): PresetFormData {
  return {
    name: "",
    baseModel: "",
    baseModelKind: "",
    loras: [],
    controlNets: [],
    image: "",
    description: "",
  };
}

export function presetToForm(p: PromptPreset): PresetFormData {
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

/** 編集中の Partial を、何か入力があれば PresetMetadata にまとめる。未入力のみなら undefined。 */
function toFormMetadata(m: FormMetadata): PresetMetadata | undefined {
  const hasAny =
    m.steps != null ||
    m.cfg != null ||
    (typeof m.sampler === "string" && m.sampler.length > 0) ||
    (typeof m.scheduler === "string" && m.scheduler.length > 0) ||
    m.width != null ||
    m.height != null;
  if (!hasAny) return undefined;
  return {
    steps: m.steps ?? 0,
    cfg: m.cfg ?? 0,
    sampler: m.sampler ?? "",
    scheduler: m.scheduler ?? "",
    width: m.width ?? 0,
    height: m.height ?? 0,
  };
}

export interface UsePresetFormStateOptions {
  initial: PresetFormData;
  excludeId?: string;
  existingNames: Array<{ id: string; name: string }>;
  requireImage: boolean;
  onSubmit: (form: PresetFormData) => void;
}

export function usePresetFormState({
  initial,
  excludeId,
  existingNames,
  requireImage,
  onSubmit,
}: UsePresetFormStateOptions) {
  const [name, setName] = useState(initial.name);
  const [baseModel, setBaseModel] = useState(initial.baseModel);
  const [baseModelKind, setBaseModelKind] = useState(initial.baseModelKind);
  const [loras, setLoras] = useState<PresetModelRef[]>(initial.loras ?? []);
  const [controlNets, setControlNets] = useState<PresetModelRef[]>(
    initial.controlNets ?? [],
  );
  const [metadata, setMetadata] = useState<FormMetadata>(
    initial.metadata ?? {},
  );
  const [image, setImage] = useState(initial.image);
  const [description, setDescription] = useState(initial.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  // 同名（大小無視）は不可。編集中の自身は除外
  const nameDup = existingNames.some(
    (p) =>
      p.id !== excludeId &&
      p.name.trim().toLowerCase() === nameTrim.toLowerCase(),
  );

  const canSubmit =
    nameTrim.length > 0 && !nameDup && !busy && (!requireImage || !!image);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: nameTrim,
      baseModel: baseModel.trim(),
      baseModelKind: baseModelKind.trim(),
      loras,
      controlNets,
      metadata: toFormMetadata(metadata),
      image,
      description: description.trim() || undefined,
    });
  };

  const setMeta = <K extends keyof PresetMetadata>(
    key: K,
    value: PresetMetadata[K] | undefined,
  ) => {
    setMetadata((m) => {
      if (value === undefined) {
        const next = { ...m };
        delete next[key];
        return next;
      }
      return { ...m, [key]: value };
    });
  };

  return {
    name,
    setName,
    baseModel,
    setBaseModel,
    baseModelKind,
    setBaseModelKind,
    loras,
    setLoras,
    controlNets,
    setControlNets,
    metadata,
    setMeta,
    image,
    setImage,
    description,
    setDescription,
    busy,
    error,
    fileRef,
    onPickFile,
    nameDup,
    canSubmit,
    submit,
  };
}
