import { cn } from "@/lib/utils";
import type { Status } from "@/lib/api";

export function StatusBadge({ status }: { status: Status }) {
  const label = status === "saved" ? "Reviewed" : status;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
        status === "draft" && "bg-amber-100 text-amber-800",
        status === "saved" && "bg-emerald-100 text-emerald-800",
        status === "failed" && "bg-rose-100 text-rose-800"
      )}
    >
      {label}
    </span>
  );
}
