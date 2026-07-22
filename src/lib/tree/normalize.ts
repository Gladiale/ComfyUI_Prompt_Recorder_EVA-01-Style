/**
 * Import / Export ユーティリティ
 * 外部データの検証と正規化を担当
 */

import type {
  Group,
  PresetEntry,
  PresetMetadata,
  PresetModelRef,
  PromptPreset,
  RootState,
  Word,
} from "@/types";
import { DEFAULT_PRESET_METADATA, ROOT_VERSION } from "@/types";
import { genId } from "./id";
import { createDefaultState } from "./factory";

// ============================================================
// Import / Export
// ============================================================

/** 未知のデータを RootState へ検証付きで正規化する。 */
export function normalizeImportedState(raw: unknown): RootState {
  if (!raw || typeof raw !== "object") return createDefaultState();
  const obj = raw as Record<string, unknown>;
  const rootGroups = Array.isArray(obj.rootGroups)
    ? (obj.rootGroups.map(normalizeGroup).filter(Boolean) as Group[])
    : [];
  const presets = Array.isArray(obj.presets)
    ? (obj.presets.map(normalizePreset).filter(Boolean) as PromptPreset[])
    : [];
  return { version: ROOT_VERSION, rootGroups, presets };
}

function normalizePreset(raw: unknown): PromptPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? (obj.entries.map(normalizePresetEntry).filter(Boolean) as PresetEntry[])
    : [];

  // 旧形式（name + entries のみ）も読み込み可能にする
  const metadata = normalizeMetadata(obj.metadata);
  const loras = normalizeModelList(obj.loras);
  const controlNets = normalizeModelList(obj.controlNets);
  const description =
    typeof obj.description === "string" && obj.description.trim()
      ? obj.description.trim()
      : undefined;
  const updatedAt =
    typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt)
      ? obj.updatedAt
      : undefined;

  const preset: PromptPreset = {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("preset"),
    name: typeof obj.name === "string" ? obj.name : "PRESET",
    baseModel: typeof obj.baseModel === "string" ? obj.baseModel : "",
    baseModelKind: typeof obj.baseModelKind === "string" ? obj.baseModelKind : "",
    metadata,
    image: typeof obj.image === "string" ? obj.image : "",
    entries,
    createdAt:
      typeof obj.createdAt === "number" && Number.isFinite(obj.createdAt)
        ? obj.createdAt
        : 0,
  };
  if (loras) preset.loras = loras;
  if (controlNets) preset.controlNets = controlNets;
  if (description) preset.description = description;
  if (updatedAt !== undefined) preset.updatedAt = updatedAt;
  return preset;
}

function normalizeMetadata(raw: unknown): PresetMetadata {
  const d = DEFAULT_PRESET_METADATA;
  if (!raw || typeof raw !== "object") return { ...d };
  const obj = raw as Record<string, unknown>;
  return {
    steps:
      typeof obj.steps === "number" && Number.isFinite(obj.steps)
        ? Math.max(1, Math.round(obj.steps))
        : d.steps,
    cfg: typeof obj.cfg === "number" && Number.isFinite(obj.cfg) ? obj.cfg : d.cfg,
    sampler: typeof obj.sampler === "string" && obj.sampler ? obj.sampler : d.sampler,
    scheduler:
      typeof obj.scheduler === "string" && obj.scheduler ? obj.scheduler : d.scheduler,
    width:
      typeof obj.width === "number" && Number.isFinite(obj.width)
        ? Math.max(1, Math.round(obj.width))
        : d.width,
    height:
      typeof obj.height === "number" && Number.isFinite(obj.height)
        ? Math.max(1, Math.round(obj.height))
        : d.height,
  };
}

function normalizeModelList(raw: unknown): PresetModelRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const model = typeof obj.model === "string" ? obj.model.trim() : "";
      if (!model) return null;
      const strength =
        typeof obj.strength === "number" && Number.isFinite(obj.strength)
          ? obj.strength
          : 1;
      return { model, strength };
    })
    .filter(Boolean) as PresetModelRef[];
  return list.length > 0 ? list : undefined;
}

function normalizePresetEntry(raw: unknown): PresetEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const strength =
    typeof obj.strength === "number" && Number.isFinite(obj.strength)
      ? Math.max(0, Math.min(10, Math.round(obj.strength)))
      : 0;
  // 旧形式: selected のみ / 新形式: text 付き
  const wordId = typeof obj.wordId === "string" && obj.wordId ? obj.wordId : "";
  if (!wordId) return null;
  return {
    wordId,
    text: typeof obj.text === "string" ? obj.text : "",
    strength,
  };
}

function normalizeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const groups = Array.isArray(obj.groups)
    ? (obj.groups.map(normalizeGroup).filter(Boolean) as Group[])
    : [];
  const words = Array.isArray(obj.words)
    ? (obj.words.map(normalizeWord).filter(Boolean) as Word[])
    : [];
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("grp"),
    name: typeof obj.name === "string" ? obj.name : "GROUP",
    collapsed: typeof obj.collapsed === "boolean" ? obj.collapsed : false,
    groups,
    words,
  };
}

function normalizeWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const strength =
    typeof obj.strength === "number" && Number.isFinite(obj.strength)
      ? Math.max(0, Math.min(10, Math.round(obj.strength)))
      : 0;
  const word: Word = {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("w"),
    text: typeof obj.text === "string" ? obj.text : "",
    note: typeof obj.note === "string" ? obj.note : "",
    selected: typeof obj.selected === "boolean" ? obj.selected : false,
    strength,
  };
  if (typeof obj.image === "string" && obj.image) word.image = obj.image;
  return word;
}
