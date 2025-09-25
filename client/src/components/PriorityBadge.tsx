import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "Low" | "Medium" | "High" | "Critical" | "BK24" | "BK48";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "Critical":
        return "bg-status-critical text-white";
      case "High":
        return "bg-status-high text-white";
      case "Medium":
        return "bg-status-medium text-white";
      case "Low":
        return "bg-status-low text-white";
      case "BK24":
      case "BK48":
        return "bg-status-bk text-white";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case "BK24":
        return "BK 24hr";
      case "BK48":
        return "BK 48hr";
      default:
        return priority;
    }
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium",
        getPriorityColor(priority),
        className
      )}
      data-testid={`badge-priority-${priority.toLowerCase()}`}
    >
      {getPriorityLabel(priority)}
    </Badge>
  );
}