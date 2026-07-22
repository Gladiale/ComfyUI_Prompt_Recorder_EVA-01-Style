// プリセット保存・編集フォームの状態・検証・画像処理
import { useRef, useState } from "react";
import { processPresetImage } from "@/lib/image";
import type {
  PresetFormData,
  PresetMetadata,
  PresetModelRef,
  PromptPreset,
} from "@/types";
import { DEFAULT_PRESET_METADATA } from "@/types";

export function emptyForm(): PresetFormData {
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
  const [metadata, setMetadata] = useState<PresetMetadata>(initial.metadata);
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

  const setMeta = <K extends keyof PresetMetadata>(
    key: K,
    value: PresetMetadata[K],
  ) => {
    setMetadata((m) => ({ ...m, [key]: value }));
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
