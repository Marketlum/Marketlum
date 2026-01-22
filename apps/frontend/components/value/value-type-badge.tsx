"use client";

import { Badge } from "@/components/ui/badge";
import { ValueType, getValueTypeLabel, getValueTypeColorClasses } from "./types";
import { ValueTypeIcon } from "./icons";
import { cn } from "@/lib/utils";

type ValueTypeBadgeProps = {
  type: ValueType;
  showIcon?: boolean;
  className?: string;
};

export function ValueTypeBadge({ type, showIcon = false, className }: ValueTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border",
        getValueTypeColorClasses(type),
        className
      )}
    >
      {showIcon && <ValueTypeIcon type={type} className="h-3 w-3 mr-1" />}
      {getValueTypeLabel(type)}
    </Badge>
  );
}
