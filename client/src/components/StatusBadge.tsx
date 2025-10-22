import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface StatusConfig {
  id: string;
  name: string;
  code: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

// Validate and sanitize hex color codes
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Normalize 3-digit hex to 6-digit hex (e.g., #RGB -> #RRGGBB)
function normalizeHex(hex: string): string {
  if (hex.length === 4) { // #RGB format
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

// Convert hex to RGB for lighter background
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Normalize 3-digit hex to 6-digit
  const normalizedHex = normalizeHex(hex);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Fetch statuses configuration
  const { data: statusesData } = useQuery<{data: StatusConfig[]}>({
    queryKey: ["/api/statuses"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since statuses rarely change
  });

  const statuses = statusesData?.data || [];
  
  // Find the matching status configuration
  const statusConfig = statuses.find(s => s.code === status);

  const getStatusStyles = (color?: string) => {
    // If we have a hex color, use inline styles
    if (color && isValidHexColor(color)) {
      const rgb = hexToRgb(color);
      if (rgb) {
        return {
          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
          color: normalizeHex(color),
          borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
        };
      }
    }
    
    // No custom styles - use default Badge styling
    return {};
  };

  const getFallbackClassName = (color?: string) => {
    // Only use fallback classes if no hex color is provided
    if (color && isValidHexColor(color)) {
      return ""; // Inline styles will handle it
    }

    // Map named colors to Tailwind classes
    if (color) {
      switch (color.toLowerCase()) {
        case "blue":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
        case "yellow":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
        case "green":
          return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
        case "red":
          return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
        case "gray":
        case "grey":
          return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
        case "purple":
          return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
        case "orange":
          return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      }
    }
    
    // Fallback to default colors based on common status codes
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "pending_intake":
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusLabel = () => {
    // Use configured name if available
    if (statusConfig?.name) {
      return statusConfig.name;
    }
    
    // Fallback to formatted code
    if (status === "in_progress") return "In Progress";
    if (status === "pending_intake") return "Pending Intake";
    return status;
  };

  // Get the icon component if specified
  const IconComponent = statusConfig?.icon 
    ? (LucideIcons[statusConfig.icon as keyof typeof LucideIcons] as any)
    : null;

  const customStyles = getStatusStyles(statusConfig?.color);
  const hasCustomColor = Object.keys(customStyles).length > 0;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium flex items-center gap-1",
        !hasCustomColor && getFallbackClassName(statusConfig?.color),
        className
      )}
      style={hasCustomColor ? customStyles : undefined}
      data-testid={`badge-status-${status}`}
    >
      {IconComponent && <IconComponent className="h-3 w-3" />}
      {getStatusLabel()}
    </Badge>
  );
}
