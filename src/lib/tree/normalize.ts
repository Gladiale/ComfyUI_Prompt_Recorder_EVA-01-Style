/**
 * Import / Export ユーティリティ
 * 外部データの検証と正規化を担当
 */

import type { Group, PresetEntry, PromptPreset, RootState, Word } from "@/types";
import { ROOT_VERSION } from "@/types";
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
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : genId("preset"),
    name: typeof obj.name === "string" ? obj.name : "PRESET",
    entries,
    createdAt:
      typeof obj.createdAt === "number" && Number.isFinite(obj.createdAt)
        ? obj.createdAt
        : 0,
  };
}

function normalizePresetEntry(raw: unknown): PresetEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const strength =
    typeof obj.strength === "number" && Number.isFinite(obj.strength)
      ? Math.max(0, Math.min(10, Math.round(obj.strength)))
      : 0;
  return {
    wordId: typeof obj.wordId === "string" && obj.wordId ? obj.wordId : "",
    selected: typeof obj.selected === "boolean" ? obj.selected : true,
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
