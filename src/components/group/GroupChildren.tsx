import type { Group } from "@/types";
import { GroupNode } from "@/components/GroupNode";

interface Props { groups: Group[]; depth: number; query: string }

export function GroupChildren({ groups, depth, query }: Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${groups.length > 0 ? "pb-1.5" : ""}`}>
      {groups.map((child) => <GroupNode key={child.id} group={child} depth={depth + 1} query={query} />)}
    </div>
  );
}
