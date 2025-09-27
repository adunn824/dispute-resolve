import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "open" | "pending" | "in_progress" | "resolved" | "closed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "pending":
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium",
        getStatusColor(status),
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {status === "in_progress" ? "In Progress" : status}
    </Badge>
  );
}