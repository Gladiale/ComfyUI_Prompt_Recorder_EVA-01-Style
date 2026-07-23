/**
 * Import / Export ユーティリティ
 * 外部データの検証と正規化を担当
 *
 * - 未知・欠損フィールドは安全なデフォルトへ落とす
 * - 旧形式プリセット（name + entries のみ / entry.selected）も読み込み可能
 * - 強度は clampStrength と同一ルール（0..10 整数）
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
import { ROOT_VERSION } from "@/types";
import { clampStrength } from "@/lib/strength";
import { genId } from "./id";
import { createDefaultState } from "./factory";

// ============================================================
// Import / Export
// ============================================================

/** 未知のデータを RootState へ検証付きで正規化する。 */
export function normalizeImportedState(raw: unknown): RootState {
  // null / 非オブジェクト（配列含む）は初期状態へフォールバック
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createDefaultState();
  }
  const obj = raw as Record<string, unknown>;
  const rootGroups = Array.isArray(obj.rootGroups)
    ? (obj.rootGroups.map(normalizeGroup).filter(Boolean) as Group[])
    : [];
  const presets = Array.isArray(obj.presets)
    ? (obj.presets.map(normalizePreset).filter(Boolean) as PromptPreset[])
    : [];

  // createDefaultState と同様、空の presets はキー自体を持たせない
  const state: RootState = { version: ROOT_VERSION, rootGroups };
  if (presets.length > 0) state.presets = presets;
  return state;
}

function normalizePreset(raw: unknown): PromptPreset | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? (obj.entries.map(normalizePresetEntry).filter(Boolean) as PresetEntry[])
    : [];

  // 旧形式（name + entries のみ）も読み込み可能にする
  const metadata = normalizeMetadata(obj.metadata);
  const loras = normalizeModelList(obj.loras);
  const controlNets = normalizeModelList(obj.controlNets);
  const description = readOptionalTrimmedString(obj.description);
  const updatedAt = readOptionalFiniteNumber(obj.updatedAt);
  const name =
    typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "PRESET";

  const preset: PromptPreset = {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("preset"),
    name,
    baseModel: typeof obj.baseModel === "string" ? obj.baseModel.trim() : "",
    baseModelKind:
      typeof obj.baseModelKind === "string" ? obj.baseModelKind.trim() : "",
    metadata,
    image: typeof obj.image === "string" ? obj.image : "",
    entries,
    createdAt: readOptionalFiniteNumber(obj.createdAt) ?? 0,
  };
  if (loras) preset.loras = loras;
  if (controlNets) preset.controlNets = controlNets;
  if (description) preset.description = description;
  if (updatedAt !== undefined) preset.updatedAt = updatedAt;
  return preset;
}

/** 未設定・不正値は 0 / 空文字へ落とす。 */
function normalizeMetadata(raw: unknown): PresetMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      steps: 0,
      cfg: 0,
      sampler: "",
      scheduler: "",
      width: 0,
      height: 0,
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    steps: readNonNegativeInt(obj.steps, 0),
    cfg: readFiniteNumber(obj.cfg, 0),
    sampler: typeof obj.sampler === "string" ? obj.sampler.trim() : "",
    scheduler: typeof obj.scheduler === "string" ? obj.scheduler.trim() : "",
    width: readNonNegativeInt(obj.width, 0),
    height: readNonNegativeInt(obj.height, 0),
  };
}

function normalizeModelList(raw: unknown): PresetModelRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const obj = item as Record<string, unknown>;
      const model = typeof obj.model === "string" ? obj.model.trim() : "";
      if (!model) return null;
      // LoRA / ControlNet の strength は 0..10 制約ではなく任意の有限数
      const strength = readFiniteNumber(obj.strength, 1);
      return { model, strength };
    })
    .filter(Boolean) as PresetModelRef[];
  return list.length > 0 ? list : undefined;
}

function normalizePresetEntry(raw: unknown): PresetEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  // 旧形式: selected のみ / 新形式: text 付き（selected は破棄、存在すれば選択扱い）
  const wordId = typeof obj.wordId === "string" ? obj.wordId.trim() : "";
  if (!wordId) return null;
  return {
    wordId,
    text: typeof obj.text === "string" ? obj.text : "",
    strength: clampStrength(obj.strength),
  };
}

function normalizeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const groups = Array.isArray(obj.groups)
    ? (obj.groups.map(normalizeGroup).filter(Boolean) as Group[])
    : [];
  const words = Array.isArray(obj.words)
    ? (obj.words.map(normalizeWord).filter(Boolean) as Word[])
    : [];
  const name =
    typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "GROUP";
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("grp"),
    name,
    collapsed: typeof obj.collapsed === "boolean" ? obj.collapsed : false,
    groups,
    words,
  };
}

function normalizeWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const word: Word = {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("w"),
    text: typeof obj.text === "string" ? obj.text : "",
    note: typeof obj.note === "string" ? obj.note : "",
    selected: typeof obj.selected === "boolean" ? obj.selected : false,
    strength: clampStrength(obj.strength),
  };
  if (typeof obj.image === "string" && obj.image) word.image = obj.image;
  return word;
}

// ============================================================
// 読み取りヘルパ（未知 JSON 向け）
// ============================================================

function readOptionalTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function readOptionalFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function readFiniteNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readNonNegativeInt(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(0, Math.round(v));
}
