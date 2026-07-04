// ============================================================
// chrome.storage.local ラッパ
// ============================================================

import type { RootState } from '@/types'
import type { Snapshot } from '@/lib/diff'

const STORAGE_KEY = 'comfy_prompt_recorder_state_v1'
const SNAPSHOT_KEY = 'comfy_prompt_recorder_snapshot_v1'

/**
 * chrome.storage が利用可能か（拡張機能実環境 / 通常のブラウザ）。
 * 利用不可時はフォールバックとして localStorage を使う。
 */
const hasChromeStorage =
  typeof chrome !== 'undefined' &&
  !!chrome.storage &&
  !!chrome.storage.local

const memoryStore = new Map<string, string>()

async function getRaw(key: string): Promise<string | null> {
  try {
    if (hasChromeStorage) {
      const res = await chrome.storage.local.get(key)
      const v = res[key]
      return typeof v === 'string' ? v : v != null ? JSON.stringify(v) : null
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
    return memoryStore.get(key) ?? null
  } catch {
    return null
  }
}

async function setRaw(key: string, value: string): Promise<void> {
  try {
    if (hasChromeStorage) {
      await chrome.storage.local.set({ [key]: value })
      return
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
      return
    }
    memoryStore.set(key, value)
  } catch {
    /* ignore */
  }
}

export async function loadState(): Promise<RootState | null> {
  const raw = await getRaw(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RootState
  } catch {
    return null
  }
}

export async function saveState(state: RootState): Promise<void> {
  await setRaw(STORAGE_KEY, JSON.stringify(state))
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  const raw = await getRaw(SNAPSHOT_KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Snapshot
    if (!v || !Array.isArray(v.entries)) return null
    return v
  } catch {
    return null
  }
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await setRaw(SNAPSHOT_KEY, JSON.stringify(snapshot))
}

// ---- debounce ヘルパ ----
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}
