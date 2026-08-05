/**
 * プロンプト変換ルール操作のユニットテスト
 */

import { describe, expect, it } from "vitest";
import {
  addRule,
  deleteRule,
  isValidRuleInput,
  normalizeRuleInput,
  reorderRules,
  setRuleEnabled,
  updateRule,
} from "./rules";
import { makeEmptyRoot, makeSampleRoot } from "./__fixtures__/sampleState";
import type { PromptTransformRule, RootState } from "@/types";

function withRules(rules: PromptTransformRule[]): RootState {
  return { ...makeEmptyRoot(), rules };
}

function rule(
  id: string,
  from = "a",
  to = "b",
  enabled = false,
  name = id,
): PromptTransformRule {
  return { id, name, from, to, enabled };
}

// ============================================================
// normalize / validate
// ============================================================

describe("normalizeRuleInput / isValidRuleInput", () => {
  it("name のみ trim し、from / to の空白は保持する", () => {
    expect(normalizeRuleInput({ name: "  n  ", from: " a ", to: " b " })).toEqual({
      name: "n",
      from: " a ",
      to: " b ",
    });
  });

  it("空白のみの from / to も保持する", () => {
    expect(normalizeRuleInput({ name: "sp", from: " ", to: "  " })).toEqual({
      name: "sp",
      from: " ",
      to: "  ",
    });
  });

  it("name が空、または from が空文字なら invalid（空白 from は valid）", () => {
    expect(isValidRuleInput({ name: "", from: "a", to: "" })).toBe(false);
    expect(isValidRuleInput({ name: "  ", from: "a", to: "" })).toBe(false);
    expect(isValidRuleInput({ name: "n", from: "", to: "" })).toBe(false);
    expect(isValidRuleInput({ name: "n", from: "  ", to: "" })).toBe(true);
    expect(isValidRuleInput({ name: "n", from: " ", to: " " })).toBe(true);
    expect(isValidRuleInput({ name: "n", from: "a", to: "" })).toBe(true);
  });
});

// ============================================================
// addRule
// ============================================================

describe("addRule", () => {
  it("新規ルールを末尾に disabled で追加する（from/to の空白は保持）", () => {
    const root = withRules([rule("r1")]);
    const next = addRule(root, { name: "  my  ", from: " cat ", to: " dog " });
    expect(next.rules).toHaveLength(2);
    expect(next.rules[1]).toMatchObject({
      name: "my",
      from: " cat ",
      to: " dog ",
      enabled: false,
    });
    expect(next.rules[1].id).toMatch(/^rule_/);
    // 元は不変
    expect(root.rules).toHaveLength(1);
  });

  it("空白のみの from も保存できる", () => {
    const root = withRules([]);
    const next = addRule(root, { name: "space", from: " ", to: "_" });
    expect(next.rules).toHaveLength(1);
    expect(next.rules[0]).toMatchObject({
      name: "space",
      from: " ",
      to: "_",
      enabled: false,
    });
  });

  it("name または from が空なら変更しない", () => {
    const root = withRules([]);
    expect(addRule(root, { name: "", from: "a", to: "" })).toBe(root);
    expect(addRule(root, { name: "n", from: "", to: "" })).toBe(root);
  });
});

// ============================================================
// updateRule
// ============================================================

describe("updateRule", () => {
  it("既存ルールを編集し enabled を維持する（from/to の空白は保持）", () => {
    const root = withRules([rule("r1", "a", "b", true, "old")]);
    const next = updateRule(root, "r1", {
      name: " new ",
      from: " x ",
      to: " y ",
    });
    expect(next.rules[0]).toEqual({
      id: "r1",
      name: "new",
      from: " x ",
      to: " y ",
      enabled: true,
    });
  });

  it("存在しない id は変更しない", () => {
    const root = withRules([rule("r1")]);
    expect(updateRule(root, "missing", { name: "n", from: "a", to: "" })).toBe(
      root,
    );
  });
});

// ============================================================
// deleteRule / setRuleEnabled
// ============================================================

describe("deleteRule", () => {
  it("指定 id を削除する", () => {
    const root = withRules([rule("r1"), rule("r2")]);
    const next = deleteRule(root, "r1");
    expect(next.rules.map((r) => r.id)).toEqual(["r2"]);
  });

  it("存在しない id は変更しない", () => {
    const root = withRules([rule("r1")]);
    expect(deleteRule(root, "x")).toBe(root);
  });
});

describe("setRuleEnabled", () => {
  it("適用状態を切替する", () => {
    const root = withRules([rule("r1", "a", "b", false)]);
    const on = setRuleEnabled(root, "r1", true);
    expect(on.rules[0].enabled).toBe(true);
    const off = setRuleEnabled(on, "r1", false);
    expect(off.rules[0].enabled).toBe(false);
  });

  it("同じ値なら変更しない", () => {
    const root = withRules([rule("r1", "a", "b", true)]);
    expect(setRuleEnabled(root, "r1", true)).toBe(root);
  });
});

// ============================================================
// reorderRules
// ============================================================

describe("reorderRules", () => {
  it("target の前へ挿入する（C を A へ → C,A,B）", () => {
    const root = withRules([rule("A"), rule("B"), rule("C")]);
    const next = reorderRules(root, "C", "A");
    expect(next.rules.map((r) => r.id)).toEqual(["C", "A", "B"]);
  });

  it("後方への移動", () => {
    const root = withRules([rule("A"), rule("B"), rule("C")]);
    const next = reorderRules(root, "A", "C");
    expect(next.rules.map((r) => r.id)).toEqual(["B", "C", "A"]);
  });

  it("同一 id / 不明 id は変更しない", () => {
    const root = withRules([rule("A"), rule("B")]);
    expect(reorderRules(root, "A", "A")).toBe(root);
    expect(reorderRules(root, "A", "X")).toBe(root);
    expect(reorderRules(root, "X", "A")).toBe(root);
  });
});

// ============================================================
// sample root 互換
// ============================================================

describe("sample root", () => {
  it("makeSampleRoot は rules を持つ", () => {
    const root = makeSampleRoot();
    expect(root.rules).toEqual([]);
  });
});
