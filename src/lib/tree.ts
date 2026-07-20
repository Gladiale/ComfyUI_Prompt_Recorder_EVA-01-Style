// ============================================================
// ツリー操作 / Tree Operations
// 再帰的な木構造に対する純粋関数群（immutable 更新）。
// 単一責任の原則に基づき、機能ごとにモジュール分割。
// ============================================================

// ID生成
export { genId } from "./tree/id";

// ファクトリ関数
export { createWord, createGroup, createDefaultState } from "./tree/factory";

// 検索ヘルパ
export { findGroup, isDescendant } from "./tree/search";

// グループ操作
export {
  addGroup,
  renameGroup,
  toggleCollapse,
  setCollapsed,
  deleteGroup,
  moveGroup,
  type GroupDropTarget,
} from "./tree/group";

// ワード操作
export {
  addWord,
  updateWord,
  toggleWord,
  setWordSelected,
  setWordStrength,
  deleteWord,
  reorderWords,
} from "./tree/word";

// 選択ワード収集
export {
  collectSelected,
  groupHasSelection,
  countSelectedWords,
  countSelectedWordsInGroup,
  type SelectedWordRef,
} from "./tree/collector";

// グループ列挙・展開
export {
  collectAllGroups,
  expandGroupPath,
  type GroupRef,
} from "./tree/navigation";

// プリセット操作
export {
  savePreset,
  applyPreset,
  deletePreset,
  renamePreset,
  reorderPresets,
} from "./tree/preset";

// Import / Export
export { normalizeImportedState } from "./tree/normalize";
