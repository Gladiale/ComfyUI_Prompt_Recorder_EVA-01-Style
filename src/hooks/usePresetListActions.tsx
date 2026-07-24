// プリセット一覧パネルの還元・更新・削除アクション
import { useCallback } from "react";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "@/components/ConfirmDialog";
import type { PromptPreset } from "@/types";
import { UpdateDiffBody } from "@/components/preset/UpdateDiffBody";

export function usePresetListActions(options: {
  detailId: string | null;
  setDetailId: (id: string | null) => void;
  onApplied?: () => void;
}) {
  const {
    applyPreset,
    deletePreset,
    updatePresetEntries,
    analyzePresetApply,
    diffPresetEntries,
    selectedRefs,
  } = usePrompt();
  const confirm = useConfirm();
  const { detailId, setDetailId, onApplied } = options;

  const onApply = useCallback(
    async (p: PromptPreset) => {
      const report = analyzePresetApply(p.id);
      let message = `プリセット「${p.name}」（${p.entries.length} pt）を還元しますか？\n現在の選択状態は置き換えられます。`;
      if (report) {
        const warnings: string[] = [];
        if (report.missing.length > 0) {
          warnings.push(
            `・消失したワード ${report.missing.length} 件（ツリーに id がありません）:\n` +
              report.missing
                .slice(0, 5)
                .map((e) => `  - ${e.text || "(空)"}`)
                .join("\n") +
              (report.missing.length > 5 ? `\n  …他 ${report.missing.length - 5} 件` : ""),
          );
        }
        if (report.textChanged.length > 0) {
          warnings.push(
            `・テキストが変更されたワード ${report.textChanged.length} 件:\n` +
              report.textChanged
                .slice(0, 5)
                .map((t) => `  - 「${t.savedText}」→「${t.currentText}」`)
                .join("\n") +
              (report.textChanged.length > 5
                ? `\n  …他 ${report.textChanged.length - 5} 件`
                : ""),
          );
        }
        if (warnings.length > 0) {
          message +=
            `\n\n⚠ 注意（還元は id 基準・text は復元しません）:\n` + warnings.join("\n");
        }
        message += `\n\n適用可能: ${report.applied} / ${report.total}`;
      }

      const ok = await confirm({
        title: "PRESET RESTORE",
        message,
        confirmLabel: "還元",
        cancelLabel: "キャンセル",
        danger: true,
      });
      if (ok) {
        applyPreset(p.id);
        onApplied?.();
      }
    },
    [analyzePresetApply, applyPreset, confirm, onApplied],
  );

  const onUpdateEntries = useCallback(
    async (p: PromptPreset) => {
      if (selectedRefs.length === 0) {
        await confirm({
          title: "PRESET UPDATE",
          message: "現在選択中のワードがありません。更新できません。",
          confirmLabel: "OK",
          cancelLabel: "閉じる",
        });
        return;
      }
      const diff = diffPresetEntries(p.id);
      if (!diff) return;

      if (!diff.hasChanges) {
        await confirm({
          title: "PRESET UPDATE",
          message: "現在の選択とプリセットのワード情報は同一です。更新の必要はありません。",
          confirmLabel: "OK",
          cancelLabel: "閉じる",
        });
        return;
      }

      const ok = await confirm({
        title: "PRESET UPDATE",
        message: <UpdateDiffBody name={p.name} diff={diff} />,
        confirmLabel: "更新する",
        cancelLabel: "キャンセル",
        danger: true,
        width: 360,
      });
      if (ok) updatePresetEntries(p.id);
    },
    [confirm, diffPresetEntries, selectedRefs.length, updatePresetEntries],
  );

  const onDelete = useCallback(
    async (p: PromptPreset) => {
      const ok = await confirm({
        title: "PRESET DELETE",
        message: `プリセット「${p.name}」を削除しますか？`,
        confirmLabel: "削除",
        cancelLabel: "キャンセル",
        danger: true,
      });
      if (ok) {
        if (detailId === p.id) setDetailId(null);
        deletePreset(p.id);
      }
    },
    [confirm, deletePreset, detailId, setDetailId],
  );

  return { onApply, onUpdateEntries, onDelete };
}
