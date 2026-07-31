// 変換ルール調整ポップアップ
import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { FiPlus } from "react-icons/fi";
import { usePrompt } from "@/context/PromptContext";
import { useConfirm } from "@/components/ConfirmDialog";
import type { PromptTransformRule } from "@/types";
import type { RuleFormInput } from "@/lib/tree";
import { RuleForm, type RuleFormState } from "./RuleForm";
import { RuleListItem } from "./RuleListItem";

type FormMode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; ruleId: string };

const emptyForm = (): RuleFormState => ({ name: "", from: "", to: "" });

export function RulesPopup() {
  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    setRuleEnabled,
    reorderRules,
  } = usePrompt();
  const confirm = useConfirm();

  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const openAdd = useCallback(() => {
    setForm(emptyForm());
    setFormMode({ kind: "add" });
  }, []);

  const openEdit = useCallback((rule: PromptTransformRule) => {
    setForm({ name: rule.name, from: rule.from, to: rule.to });
    setFormMode({ kind: "edit", ruleId: rule.id });
  }, []);

  const closeForm = useCallback(() => {
    setFormMode({ kind: "closed" });
    setForm(emptyForm());
  }, []);

  const onSubmit = useCallback(
    (input: RuleFormInput) => {
      if (formMode.kind === "add") {
        addRule(input);
      } else if (formMode.kind === "edit") {
        updateRule(formMode.ruleId, input);
      }
      closeForm();
    },
    [formMode, addRule, updateRule, closeForm],
  );

  const onToggle = useCallback(
    (rule: PromptTransformRule) => {
      setRuleEnabled(rule.id, !rule.enabled);
    },
    [setRuleEnabled],
  );

  const onDelete = useCallback(
    async (rule: PromptTransformRule) => {
      const toLabel = rule.to === "" ? "（空欄）" : rule.to;
      const ok = await confirm({
        title: "RULE DELETE",
        message: `ルール「${rule.name}」を削除しますか？\n\n変換前: ${rule.from}\n変換後: ${toLabel}`,
        confirmLabel: "削除",
        cancelLabel: "キャンセル",
        danger: true,
      });
      if (ok) {
        deleteRule(rule.id);
        if (formMode.kind === "edit" && formMode.ruleId === rule.id) {
          closeForm();
        }
      }
    },
    [confirm, deleteRule, formMode, closeForm],
  );

  const onDrop = useCallback(
    (targetId: string) => {
      if (dragId && dragId !== targetId) {
        reorderRules(dragId, targetId);
      }
      setDragId(null);
      setOverId(null);
    },
    [dragId, reorderRules],
  );

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.14 }}
      className="absolute right-0 top-full mt-0 z-30 w-95 max-h-135.5 flex flex-col rounded-sm border border-eva-line bg-[#4e0f42]/95 backdrop-blur shadow-glow-purple"
    >
      {/* ヘッダ */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-eva-line-soft shrink-0">
        <div className="min-w-0">
          <div className="font-cinzel-deco tracking-[0.14em] text-[10px] text-eva-green glow-text">
            TRANSFORM RULES
          </div>
          <div className="font-mono text-[10px] text-eva-ink-dim truncate">
            {rules.length === 0
              ? "ルールなし"
              : `${rules.length} 件 · 有効 ${enabledCount}`}
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 p-1 rounded-sm border border-eva-line text-eva-ink-dim hover:text-eva-green hover:border-eva-green/60 transition-colors"
          title="ルールを追加"
        >
          <FiPlus size={13} />
        </button>
      </div>

      {/* 追加・編集フォーム */}
      {formMode.kind !== "closed" && (
        <div className="px-2 py-2 border-b border-eva-line-soft shrink-0">
          <div className="font-mono text-[10px] text-eva-lavender mb-1 px-1">
            {formMode.kind === "add" ? "新規ルール" : "ルール編集"}
          </div>
          <RuleForm
            value={form}
            onChange={setForm}
            onSubmit={onSubmit}
            onCancel={closeForm}
            submitLabel={formMode.kind === "add" ? "追加" : "保存"}
          />
        </div>
      )}

      {/* 一覧 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {rules.length === 0 ? (
          <p className="text-eva-ink-dim italic font-garamond text-[12px] px-1 py-2">
            ルールがありません。右上の ＋ から追加できます。
          </p>
        ) : (
          <ul className="space-y-1">
            {rules.map((rule) => (
              <RuleListItem
                key={rule.id}
                rule={rule}
                isDragging={dragId === rule.id}
                isDropTarget={overId === rule.id && dragId !== rule.id}
                onDragStart={setDragId}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={setOverId}
                onDrop={onDrop}
                onToggle={onToggle}
                onEdit={openEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
