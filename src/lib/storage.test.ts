/**
 * storage.ts のユニットテスト。
 *
 * 環境分岐の注意:
 * - `hasChromeStorage` はモジュールロード時に一度だけ評価される。
 * - 既定の Node 環境（chrome なし・localStorage なし）→ memoryStore パス。
 * - chrome パスは vi.resetModules() + stubGlobal + dynamic import で検証。
 * - debounce はストレージ実装に依存しないため static import で検証。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./storage";
import { makeSampleRoot, makeEmptyRoot } from "./tree/__fixtures__/sampleState";
import type { Snapshot } from "@/lib/diff";
import type { RootState } from "@/types";

const STORAGE_KEY = "comfy_prompt_recorder_state_v1";
const SNAPSHOT_KEY = "comfy_prompt_recorder_snapshot_v1";

function sampleSnapshot(
  overrides: Partial<Snapshot> = {},
): Snapshot {
  return {
    entries: [
      {
        wordId: "w1",
        text: "alpha",
        strength: 0,
        formatted: "alpha",
        groupId: "g1",
        groupPath: ["G"],
      },
    ],
    separator: "comma",
    takenAt: 1_700_000_000_000,
    count: 1,
    ...overrides,
  };
}

// ============================================================
// debounce
// ============================================================

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("wait 内の複数呼び出しは最後の 1 回だけ実行する", () => {
    const fn = vi.fn();
    const d = debounce(fn, 220);
    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(219);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("wait 経過後に実行される", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("経過後の再呼び出しは新しいタイマーで動く", () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d(1);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    d(2);
    vi.advanceTimersByTime(49);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });
});

// ============================================================
// memory フォールバック（chrome なし・localStorage なし）
// Node の Vitest 既定環境。モジュールは static import 済み。
// ============================================================

describe("storage — memory fallback (no chrome)", () => {
  /**
   * Node 既定環境: chrome なし・localStorage なし → memoryStore。
   * 「未保存 → null」と壊 JSON は chrome モック側で厳密に検証する。
   * ここでは memory パスの往復を担保する。
   */

  it("saveState → loadState でラウンドトリップする", async () => {
    const { saveState, loadState } = await import("./storage");
    const state = makeSampleRoot();
    await saveState(state);
    expect(await loadState()).toEqual(state);
  });

  it("空 root もラウンドトリップできる", async () => {
    const { saveState, loadState } = await import("./storage");
    await saveState(makeEmptyRoot());
    expect(await loadState()).toEqual(makeEmptyRoot());
  });

  it("saveSnapshot → loadSnapshot で entries 配列を復元する", async () => {
    const { saveSnapshot, loadSnapshot } = await import("./storage");
    const snap = sampleSnapshot();
    await saveSnapshot(snap);
    const loaded = await loadSnapshot();
    expect(loaded).toEqual(snap);
    expect(Array.isArray(loaded?.entries)).toBe(true);
  });
});

// ============================================================
// chrome.storage.local パス（resetModules + dynamic import）
// ============================================================

describe("storage — chrome.storage.local", () => {
  type StorageApi = typeof import("./storage");

  let store: Record<string, unknown>;
  let getFn: ReturnType<typeof vi.fn>;
  let setFn: ReturnType<typeof vi.fn>;
  let api: StorageApi;

  async function loadWithChrome(
    chromeImpl?: {
      get?: (key: string) => Promise<Record<string, unknown>>;
      set?: (obj: Record<string, unknown>) => Promise<void>;
    },
  ): Promise<StorageApi> {
    store = {};
    getFn = vi.fn(async (key: string) => {
      if (chromeImpl?.get) return chromeImpl.get(key);
      return { [key]: store[key] };
    });
    setFn = vi.fn(async (obj: Record<string, unknown>) => {
      if (chromeImpl?.set) return chromeImpl.set(obj);
      Object.assign(store, obj);
    });

    vi.resetModules();
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: getFn,
          set: setFn,
        },
      },
    });

    api = await import("./storage");
    return api;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("chrome ありで saveState/loadState が set/get を呼ぶ", async () => {
    const { saveState, loadState } = await loadWithChrome();
    const state = makeSampleRoot();
    await saveState(state);

    expect(setFn).toHaveBeenCalled();
    const setArg = setFn.mock.calls[0][0] as Record<string, string>;
    expect(setArg[STORAGE_KEY]).toBe(JSON.stringify(state));

    const loaded = await loadState();
    expect(getFn).toHaveBeenCalledWith(STORAGE_KEY);
    expect(loaded).toEqual(state);
  });

  it("未保存で loadState は null", async () => {
    const { loadState } = await loadWithChrome();
    expect(await loadState()).toBeNull();
  });

  it("壊れた JSON の loadState は null", async () => {
    const { loadState } = await loadWithChrome({
      get: async (key) => ({ [key]: "{not-json" }),
    });
    expect(await loadState()).toBeNull();
  });

  it("saveSnapshot → loadSnapshot で復元する", async () => {
    const { saveSnapshot, loadSnapshot } = await loadWithChrome();
    const snap = sampleSnapshot();
    await saveSnapshot(snap);
    expect(await loadSnapshot()).toEqual(snap);
    expect(setFn).toHaveBeenCalled();
    const setArg = setFn.mock.calls[0][0] as Record<string, string>;
    expect(setArg[SNAPSHOT_KEY]).toBe(JSON.stringify(snap));
  });

  it("snapshot の entries が配列でないと null", async () => {
    const { loadSnapshot } = await loadWithChrome({
      get: async (key) => ({
        [key]: JSON.stringify({
          entries: "nope",
          separator: "comma",
          takenAt: 1,
          count: 0,
        }),
      }),
    });
    expect(await loadSnapshot()).toBeNull();
  });

  it("壊れた snapshot JSON は null", async () => {
    const { loadSnapshot } = await loadWithChrome({
      get: async (key) => ({ [key]: "not-json{{{" }),
    });
    expect(await loadSnapshot()).toBeNull();
  });

  it("get が throw しても loadState は null（例外を外に出さない）", async () => {
    const { loadState } = await loadWithChrome({
      get: async () => {
        throw new Error("storage unavailable");
      },
    });
    await expect(loadState()).resolves.toBeNull();
  });

  it("set が throw しても saveState は例外を外に出さない", async () => {
    const { saveState } = await loadWithChrome({
      set: async () => {
        throw new Error("quota exceeded");
      },
    });
    await expect(saveState(makeEmptyRoot())).resolves.toBeUndefined();
  });

  it("chrome.storage がオブジェクトを返す場合も loadState できる", async () => {
    // getRaw: string でなければ JSON.stringify して返す
    const state: RootState = makeEmptyRoot();
    const { loadState } = await loadWithChrome({
      get: async (key) => ({ [key]: state }),
    });
    const loaded = await loadState();
    expect(loaded).toEqual(state);
  });
});
