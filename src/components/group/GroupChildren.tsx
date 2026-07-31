import type { Group } from "@/types";
import { GroupNode } from "@/components/GroupNode";

interface Props { groups: Group[]; depth: number }

export function GroupChildren({ groups, depth }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${groups.length > 0 ? "pb-1.5" : ""}`}>
      {groups.map((child) => <GroupNode key={child.id} group={child} depth={depth + 1} />)}
    </div>
  );
}
