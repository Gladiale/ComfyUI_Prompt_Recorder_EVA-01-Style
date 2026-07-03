// ============================================================
// 型定義 / Data Model
// ============================================================

/** ルート構造のバージョン。将来のマイグレーション用。 */
export const ROOT_VERSION = 1

/** ワード：必ずいずれかのグループに属する。 */
export interface Word {
  id: string
  text: string
  note: string
  selected: boolean
  /**
   * 出力時の強度（0..10）。
   *  0=そのまま / 1=() / 2..10=(text:1.x)
   * 未設定（旧データ）は 0 扱い。選択時のみ総括欄へ反映される。
   */
  strength?: number
}

/** グループ：任意の深さで再帰的にネスト可能。 */
export interface Group {
  id: string
  name: string
  collapsed: boolean
  groups: Group[]
  words: Word[]
}

/**
 * プリセット（選択状態の組み合わせ）の1エントリ。
 * 復元時は wordId で現ツリーのワードを探し selected/strength を当てはめる。
 */
export interface PresetEntry {
  wordId: string
  selected: boolean
  strength: number
}

/** プロンプトの組み合わせを保存したプリセット。 */
export interface PromptPreset {
  id: string
  name: string
  entries: PresetEntry[]
  createdAt: number
}

/** ルート構造。chrome.storage.local に永続化される。 */
export interface RootState {
  version: number
  rootGroups: Group[]
  /** 保存済みの選択組み合わせ一覧。旧データは undefined 可。 */
  presets?: PromptPreset[]
}
