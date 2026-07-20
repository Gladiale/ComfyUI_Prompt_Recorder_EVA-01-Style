/**
 * プリセット操作ユーティリティ
 * プリセットの保存・適用・削除・名前変更・並替を担当
 */

import type { Group, PresetEntry, PromptPreset, RootState, Word } from "@/types";
import { clone } from "./immutable";
import { genId } from "./id";

// ============================================================
// プリセット（選択状態の組み合わせ）操作
// ============================================================

/** ツリー内の全ワードを「出現順（深さ優先）」で走査する。 */
function forEachWord(root: RootState, cb: (w: Word) => void): void {
  const visit = (g: Group): void => {
    for (const w of g.words) cb(w);
    for (const child of g.groups) visit(child);
  };
  for (const g of root.rootGroups) visit(g);
}

/**
 * 現在の選択ワード（selected == true）をプリセットとして保存する。
 * 同名のプリセットが既にあれば上書き（id/createdAt は継承）、
 * 無ければ新規追加する。entries は出現順。
 */
export function savePreset(root: RootState, name: string): RootState {
  const trimmed = name.trim();
  const entries: PresetEntry[] = [];
  // SELECTED欄の定義（collectSelected と同じ w.selected == true）に揃える：
  // pt数が SELECTED欄と一致するように strength≠0 だけのワードは含めない。
  forEachWord(root, (w) => {
    if (w.selected) {
      entries.push({
        wordId: w.id,
        selected: true,
        strength: w.strength ?? 0,
      });
    }
  });
  const next = clone(root);
  const existing = (next.presets ?? []).find(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    // 同名上書き：id・createdAt・順序は維持し、内容だけ更新
    next.presets = (next.presets ?? []).map((p) =>
      p.id === existing.id ? { ...p, entries } : p,
    );
  } else {
    const preset: PromptPreset = {
      id: genId("preset"),
      name: trimmed || `PRESET ${(next.presets?.length ?? 0) + 1}`,
      entries,
      createdAt: Date.now(),
    };
    next.presets = [...(next.presets ?? []), preset];
  }
  return next;
}

/**
 * プリセットを復元（完全置換）：
 * 一旦全ワードを未選択・強度0にリセットし、
 * プリセットの entries に一致する wordId があれば selected/strength を当てはめる。
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
      w.selected = e.selected;
      w.strength = e.strength;
    } else {
      w.selected = false;
      w.strength = 0;
    }
  });
  return next;
}

export function deletePreset(root: RootState, presetId: string): RootState {
  const next = clone(root);
  next.presets = (next.presets ?? []).filter((p) => p.id !== presetId);
  return next;
}

export function renamePreset(root: RootState, presetId: string, name: string): RootState {
  const next = clone(root);
  next.presets = (next.presets ?? []).map((p) =>
    p.id === presetId ? { ...p, name: name.trim() || p.name } : p,
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
