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
}

/** グループ：任意の深さで再帰的にネスト可能。 */
export interface Group {
  id: string
  name: string
  collapsed: boolean
  groups: Group[]
  words: Word[]
}

/** ルート構造。chrome.storage.local に永続化される。 */
export interface RootState {
  version: number
  rootGroups: Group[]
}
