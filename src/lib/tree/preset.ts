/**
 * プリセット操作ユーティリティ
 * プリセットの保存・適用・削除・編集・更新・並替を担当
 */

import type {
  Group,
  PresetEntry,
  PresetFormData,
  PresetMetadata,
  PresetModelRef,
  PromptPreset,
  RootState,
  Word,
} from "@/types";
import { DEFAULT_PRESET_METADATA } from "@/types";
import { clone } from "./immutable";
import { genId } from "./id";

// ============================================================
// 走査ヘルパ
// ============================================================

/** ツリー内の全ワードを「出現順（深さ優先）」で走査する。 */
function forEachWord(root: RootState, cb: (w: Word) => void): void {
  const visit = (g: Group): void => {
    for (const w of g.words) cb(w);
    for (const child of g.groups) visit(child);
  };
  for (const g of root.rootGroups) visit(g);
}

/** 現在の選択ワードから PresetEntry 配列を構築する。 */
export function collectPresetEntries(root: RootState): PresetEntry[] {
  const entries: PresetEntry[] = [];
  forEachWord(root, (w) => {
    if (w.selected) {
      entries.push({
        wordId: w.id,
        text: w.text,
        strength: w.strength ?? 0,
      });
    }
  });
  return entries;
}

function normalizeModelList(list?: PresetModelRef[]): PresetModelRef[] | undefined {
  if (!list || list.length === 0) return undefined;
  const cleaned = list
    .map((m) => ({
      model: (m.model ?? "").trim(),
      strength:
        typeof m.strength === "number" && Number.isFinite(m.strength) ? m.strength : 1,
    }))
    .filter((m) => m.model.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeMetadata(meta?: Partial<PresetMetadata>): PresetMetadata {
  const d = DEFAULT_PRESET_METADATA;
  return {
    steps:
      typeof meta?.steps === "number" && Number.isFinite(meta.steps)
        ? Math.max(1, Math.round(meta.steps))
        : d.steps,
    cfg:
      typeof meta?.cfg === "number" && Number.isFinite(meta.cfg) ? meta.cfg : d.cfg,
    sampler: typeof meta?.sampler === "string" && meta.sampler ? meta.sampler : d.sampler,
    scheduler:
      typeof meta?.scheduler === "string" && meta.scheduler
        ? meta.scheduler
        : d.scheduler,
    width:
      typeof meta?.width === "number" && Number.isFinite(meta.width)
        ? Math.max(1, Math.round(meta.width))
        : d.width,
    height:
      typeof meta?.height === "number" && Number.isFinite(meta.height)
        ? Math.max(1, Math.round(meta.height))
        : d.height,
  };
}

function applyFormToPreset(
  base: PromptPreset,
  form: PresetFormData,
  entries: PresetEntry[],
): PromptPreset {
  const desc = form.description?.trim();
  return {
    ...base,
    name: form.name.trim() || base.name,
    baseModel: form.baseModel.trim(),
    baseModelKind: form.baseModelKind.trim(),
    loras: normalizeModelList(form.loras),
    controlNets: normalizeModelList(form.controlNets),
    metadata: normalizeMetadata(form.metadata),
    image: form.image || base.image,
    description: desc ? desc : undefined,
    entries,
    updatedAt: Date.now(),
  };
}

// ============================================================
// 保存・更新
// ============================================================

/**
 * 現在の選択ワード + フォーム情報をプリセットとして新規保存する。
 * 同名があっても上書きせず、常に新規プリセットを追加する。
 * （同名チェックはフォーム側で行い、送信をブロックする想定）
 */
export function savePreset(root: RootState, form: PresetFormData): RootState {
  const entries = collectPresetEntries(root);
  const trimmed = form.name.trim();
  const next = clone(root);
  const preset: PromptPreset = applyFormToPreset(
    {
      id: genId("preset"),
      name: trimmed || `PRESET ${(next.presets?.length ?? 0) + 1}`,
      baseModel: "",
      baseModelKind: "",
      metadata: { ...DEFAULT_PRESET_METADATA },
      image: "",
      entries: [],
      createdAt: Date.now(),
    },
    form,
    entries,
  );
  // 新規は createdAt を上書きしない
  preset.createdAt = Date.now();
  delete preset.updatedAt;
  next.presets = [...(next.presets ?? []), preset];
  return next;
}

/**
 * プリセットのメタ情報（ワード entries 以外）を編集する。
 */
export function updatePresetMeta(
  root: RootState,
  presetId: string,
  form: PresetFormData,
): RootState {
  const next = clone(root);
  next.presets = (next.presets ?? []).map((p) => {
    if (p.id !== presetId) return p;
    // entries は維持。image が空なら既存を残す
    const merged: PresetFormData = {
      ...form,
      image: form.image || p.image,
    };
    return applyFormToPreset(p, merged, p.entries);
  });
  return next;
}

/**
 * プリセットのワード情報だけを「現在の選択」で更新する。
 */
export function updatePresetEntries(root: RootState, presetId: string): RootState {
  const entries = collectPresetEntries(root);
  const next = clone(root);
  next.presets = (next.presets ?? []).map((p) =>
    p.id === presetId ? { ...p, entries, updatedAt: Date.now() } : p,
  );
  return next;
}

// ============================================================
// 還元（適用）と差分
// ============================================================

export interface PresetApplyReport {
  /** ツリーに存在しない wordId */
  missing: PresetEntry[];
  /** id はあるが text が保存時と異なる */
  textChanged: Array<{
    wordId: string;
    savedText: string;
    currentText: string;
    strength: number;
  }>;
  /** 実際に選択状態を当てはめた件数 */
  applied: number;
  /** プリセットに保存されていた総エントリ数 */
  total: number;
}

/**
 * プリセット適用前に id 欠落・テキスト変更を検査する。
 */
export function analyzePresetApply(
  root: RootState,
  presetId: string,
): PresetApplyReport | null {
  const preset = (root.presets ?? []).find((p) => p.id === presetId);
  if (!preset) return null;

  const byId = new Map<string, Word>();
  forEachWord(root, (w) => byId.set(w.id, w));

  const missing: PresetEntry[] = [];
  const textChanged: PresetApplyReport["textChanged"] = [];
  let applied = 0;

  for (const e of preset.entries) {
    const w = byId.get(e.wordId);
    if (!w) {
      missing.push(e);
      continue;
    }
    applied++;
    if ((e.text ?? "") !== w.text) {
      textChanged.push({
        wordId: e.wordId,
        savedText: e.text ?? "",
        currentText: w.text,
        strength: e.strength,
      });
    }
  }

  return { missing, textChanged, applied, total: preset.entries.length };
}

/**
 * プリセットを復元（完全置換）：
 * 一旦全ワードを未選択・強度0にリセットし、
 * プリセットの entries に一致する wordId があれば selected/strength を当てはめる。
 * ※ text は復元しない（差分通知用のみ）。
 */
export function applyPreset(root: RootState, presetId: string): RootState {
  const preset = (root.presets ?? []).find((p) => p.id === presetId);
  if (!preset) return root;
  const map = new Map<string, PresetEntry>();
  for (const e of preset.entries) map.set(e.wordId, e);
  const next = clone(root);
  forEachWord(next, (w) => {
    const e = map.get(w.id);
    if (e) {
      w.selected = true;
      w.strength = e.strength;
    } else {
      w.selected = false;
      w.strength = 0;
    }
  });
  return next;
}

// ============================================================
// 更新差分（現在の選択 vs プリセット entries）
// ============================================================

export interface PresetUpdateDiff {
  added: PresetEntry[];
  removed: PresetEntry[];
  strengthChanged: Array<{
    wordId: string;
    text: string;
    from: number;
    to: number;
  }>;
  textChanged: Array<{
    wordId: string;
    savedText: string;
    currentText: string;
    strength: number;
  }>;
  hasChanges: boolean;
}

/**
 * プリセットの entries と「現在の選択」の差分を算出する。
 */
export function diffPresetEntries(
  root: RootState,
  presetId: string,
): PresetUpdateDiff | null {
  const preset = (root.presets ?? []).find((p) => p.id === presetId);
  if (!preset) return null;

  const current = collectPresetEntries(root);
  const savedById = new Map(preset.entries.map((e) => [e.wordId, e]));
  const currentById = new Map(current.map((e) => [e.wordId, e]));

  const added: PresetEntry[] = [];
  const removed: PresetEntry[] = [];
  const strengthChanged: PresetUpdateDiff["strengthChanged"] = [];
  const textChanged: PresetUpdateDiff["textChanged"] = [];

  for (const c of current) {
    const s = savedById.get(c.wordId);
    if (!s) {
      added.push(c);
      continue;
    }
    if (s.strength !== c.strength) {
      strengthChanged.push({
        wordId: c.wordId,
        text: c.text,
        from: s.strength,
        to: c.strength,
      });
    }
    if ((s.text ?? "") !== c.text) {
      textChanged.push({
        wordId: c.wordId,
        savedText: s.text ?? "",
        currentText: c.text,
        strength: c.strength,
      });
    }
  }

  for (const s of preset.entries) {
    if (!currentById.has(s.wordId)) {
      removed.push(s);
    }
  }

  const hasChanges =
    added.length > 0 ||
    removed.length > 0 ||
    strengthChanged.length > 0 ||
    textChanged.length > 0;

  return { added, removed, strengthChanged, textChanged, hasChanges };
}

// ============================================================
// 削除・リネーム・並替
// ============================================================

export function deletePreset(root: RootState, presetId: string): RootState {
  const next = clone(root);
  next.presets = (next.presets ?? []).filter((p) => p.id !== presetId);
  return next;
}

export function renamePreset(
  root: RootState,
  presetId: string,
  name: string,
): RootState {
  const next = clone(root);
  next.presets = (next.presets ?? []).map((p) =>
    p.id === presetId ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
  );
  return next;
}

/**
 * プリセットの並び順を入替える。newIds は全プリセットの id を新順序で並べたもの。
 */
export function reorderPresets(root: RootState, newIds: string[]): RootState {
  const next = clone(root);
  const byId = new Map((next.presets ?? []).map((p) => [p.id, p]));
  const reordered: PromptPreset[] = [];
  for (const id of newIds) {
    const p = byId.get(id);
    if (p) reordered.push(p);
  }
  // newIds に含まれないプリセットがあれば末尾に維持（安全網）
  for (const p of next.presets ?? []) {
    if (!newIds.includes(p.id)) reordered.push(p);
  }
  next.presets = reordered;
  return next;
}
