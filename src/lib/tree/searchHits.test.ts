import { describe, expect, it } from "vitest";
import { collectSearchHits, wordMatchesQuery } from "./searchHits";
import { group, makeEmptyRoot, makeSampleRoot, word } from "./__fixtures__/sampleState";

describe("wordMatchesQuery", () => {
  it("本文の部分一致（大小文字・空白正規化）", () => {
    expect(wordMatchesQuery(word("w1", "  Alpha  Beta "), "alpha beta")).toBe(true);
    expect(wordMatchesQuery(word("w1", "Alpha"), "alp")).toBe(true);
    expect(wordMatchesQuery(word("w1", "Alpha"), "gamma")).toBe(false);
  });

  it("注釈の部分一致（小文字化のみ）", () => {
    expect(wordMatchesQuery(word("w1", "x", { note: "Note-A2" }), "note-a2")).toBe(true);
    expect(wordMatchesQuery(word("w1", "x", { note: "hello" }), "ell")).toBe(true);
    expect(wordMatchesQuery(word("w1", "x", { note: "hello" }), "world")).toBe(false);
  });

  it("空クエリは false", () => {
    expect(wordMatchesQuery(word("w1", "alpha"), "")).toBe(false);
  });
});

describe("collectSearchHits", () => {
  it("空クエリは空配列", () => {
    expect(collectSearchHits(makeSampleRoot().rootGroups, "")).toEqual([]);
    expect(collectSearchHits(makeSampleRoot().rootGroups, "   ")).toEqual([]);
  });

  it("空ルートは空配列", () => {
    expect(collectSearchHits(makeEmptyRoot().rootGroups, "alpha")).toEqual([]);
  });

  it("直下ヒットのみ収集し、祖先は出さない", () => {
    const hits = collectSearchHits(makeSampleRoot().rootGroups, "beta");
    expect(hits).toEqual([
      {
        groupId: "grp-b",
        groupName: "Group B",
        words: [expect.objectContaining({ id: "w-b1", text: "beta" })],
      },
    ]);
  });

  it("孫グループのヒットは孫のセクションに出る", () => {
    const hits = collectSearchHits(makeSampleRoot().rootGroups, "gamma");
    expect(hits.map((h) => h.groupId)).toEqual(["grp-c"]);
    expect(hits[0].groupName).toBe("Group C");
    expect(hits[0].words.map((w) => w.id)).toEqual(["w-c1"]);
  });

  it("同一グループ内の複数ヒットをまとめる", () => {
    const hits = collectSearchHits(makeSampleRoot().rootGroups, "alpha");
    expect(hits).toHaveLength(1);
    expect(hits[0].groupId).toBe("grp-a");
    expect(hits[0].words.map((w) => w.id)).toEqual(["w-a1", "w-a2"]);
  });

  it("注釈ヒットを収集する", () => {
    const hits = collectSearchHits(makeSampleRoot().rootGroups, "note-a2");
    expect(hits).toHaveLength(1);
    expect(hits[0].words.map((w) => w.id)).toEqual(["w-a2"]);
  });

  it("グループ名一致ではヒットしない", () => {
    const hits = collectSearchHits(makeSampleRoot().rootGroups, "group a");
    expect(hits).toEqual([]);
  });

  it("深さ優先・出現順でセクションを並べる", () => {
    const roots = [
      group("g1", "One", {
        words: [word("w1", "match-one")],
        groups: [
          group("g2", "Two", {
            words: [word("w2", "match-two")],
          }),
        ],
      }),
      group("g3", "Three", {
        words: [word("w3", "match-three")],
      }),
    ];
    const hits = collectSearchHits(roots, "match");
    expect(hits.map((h) => h.groupId)).toEqual(["g1", "g2", "g3"]);
  });
});
