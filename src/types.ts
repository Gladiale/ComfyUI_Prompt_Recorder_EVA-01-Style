// ============================================================
// 型定義 / Data Model
// ============================================================

/** ルート構造のバージョン。将来のマイグレーション用。 */
export const ROOT_VERSION = 1;

/** ワード：必ずいずれかのグループに属する。 */
export interface Word {
  id: string;
  text: string;
  note: string;
  selected: boolean;
  /**
   * 参照用画像。最大420×420に縮小されたJPEGの data URL（Base64）。
   * 旧データ・注釈のみのワードは undefined。
   */
  image?: string;
  /**
   * 出力時の強度（0..10）。
   *  0=そのまま / 1=() / 2..10=(text:1.x)
   * 未設定（旧データ）は 0 扱い。選択時のみ総括欄へ反映される。
   */
  strength?: number;
}

/** グループ：任意の深さで再帰的にネスト可能。 */
export interface Group {
  id: string;
  name: string;
  collapsed: boolean;
  groups: Group[];
  words: Word[];
}

/**
 * プリセットに保存する LoRA / ControlNet 参照。
 */
export interface PresetModelRef {
  model: string;
  strength: number;
}

/**
 * 生成メタデータ（ComfyUI パラメータのメモ）。
 * width/height は画像選択時に元解像度から自動記入される。
 */
export interface PresetMetadata {
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  width: number;
  height: number;
}

/**
 * プリセット内の選択ワード1件。
 * 復元時は wordId で現ツリーのワードを探す。
 * text は復元には使わず、id 欠落・テキスト変更の通知用に保持する。
 */
export interface PresetEntry {
  wordId: string;
  /** 保存時点のテキスト（復元には使わない・差分通知用）。 */
  text: string;
  strength: number;
}

/** プロンプトの組み合わせを保存したプリセット。 */
export interface PromptPreset {
  id: string;
  name: string;
  baseModel: string;
  baseModelKind: string;
  loras?: PresetModelRef[];
  controlNets?: PresetModelRef[];
  metadata: PresetMetadata;
  /** プレビュー画像（最大560px JPEG の data URL）。 */
  image: string;
  description?: string;
  entries: PresetEntry[];
  createdAt: number;
  updatedAt?: number;
}

/** プリセット新規保存・メタ編集時の入力（id/createdAt 以外）。 */
export interface PresetFormData {
  name: string;
  baseModel: string;
  baseModelKind: string;
  loras?: PresetModelRef[];
  controlNets?: PresetModelRef[];
  /** ユーザー入力前は未設定。保存時に正規化して PromptPreset.metadata へ落とす。 */
  metadata?: PresetMetadata;
  image: string;
  description?: string;
}

/** ルート構造。chrome.storage.local に永続化される。 */
export interface RootState {
  version: number;
  rootGroups: Group[];
  /** 保存済みの選択組み合わせ一覧。旧データは undefined 可。 */
  presets?: PromptPreset[];
}
