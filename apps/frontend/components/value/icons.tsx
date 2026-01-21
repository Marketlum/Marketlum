import { Package, Wrench, Heart, Scale, LucideIcon } from "lucide-react";
import { ValueType } from "./types";

export const VALUE_TYPE_ICONS: Record<ValueType, LucideIcon> = {
  product: Package,
  service: Wrench,
  relationship: Heart,
  right: Scale,
};

type ValueTypeIconProps = {
  type: ValueType;
  className?: string;
};

export function ValueTypeIcon({ type, className = "h-4 w-4" }: ValueTypeIconProps) {
  const Icon = VALUE_TYPE_ICONS[type];
  return <Icon className={className} />;
}
