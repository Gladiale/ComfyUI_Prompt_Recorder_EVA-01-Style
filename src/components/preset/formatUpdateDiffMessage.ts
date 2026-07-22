import type { PresetUpdateDiff } from "@/lib/tree";

/** プリセット更新確認ダイアログ用の差分メッセージを組み立てる。 */
export function formatUpdateDiffMessage(name: string, diff: PresetUpdateDiff): string {
  const lines: string[] = [
    `プリセット「${name}」のワード情報を現在の選択で更新します。`,
    "",
  ];

  if (diff.added.length > 0) {
    lines.push(`＋ 追加 ${diff.added.length} 件:`);
    for (const e of diff.added.slice(0, 6)) {
      lines.push(`  + ${e.text || "(空)"} (str ${e.strength})`);
    }
    if (diff.added.length > 6) lines.push(`  …他 ${diff.added.length - 6} 件`);
  }
  if (diff.removed.length > 0) {
    lines.push(`− 削除 ${diff.removed.length} 件:`);
    for (const e of diff.removed.slice(0, 6)) {
      lines.push(`  - ${e.text || "(空)"} (str ${e.strength})`);
    }
    if (diff.removed.length > 6) lines.push(`  …他 ${diff.removed.length - 6} 件`);
  }
  if (diff.strengthChanged.length > 0) {
    lines.push(`△ 強度変化 ${diff.strengthChanged.length} 件:`);
    for (const e of diff.strengthChanged.slice(0, 6)) {
      lines.push(`  ~ ${e.text || "(空)"} : ${e.from} → ${e.to}`);
    }
    if (diff.strengthChanged.length > 6)
      lines.push(`  …他 ${diff.strengthChanged.length - 6} 件`);
  }
  if (diff.textChanged.length > 0) {
    lines.push(`✎ テキスト変化 ${diff.textChanged.length} 件（保存テキストを更新）:`);
    for (const e of diff.textChanged.slice(0, 6)) {
      lines.push(`  ~ 「${e.savedText}」→「${e.currentText}」`);
    }
    if (diff.textChanged.length > 6)
      lines.push(`  …他 ${diff.textChanged.length - 6} 件`);
  }

  lines.push("", "よろしいですか？");
  return lines.join("\n");
}
