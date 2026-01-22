export type ValueType = "product" | "service" | "relationship" | "right";

export type ValueParentType = "on_top_of" | "part_of";

import { FileUpload } from "../files/types";

export type Value = {
  id: string;
  name: string;
  description?: string;
  type: ValueType;
  parentType: ValueParentType;
  stream?: {
    id: string;
    name: string;
  };
  agent?: {
    id: string;
    name: string;
  };
  parent?: {
    id: string;
    name: string;
  };
  files?: FileUpload[];
  children?: Value[];
};

export const VALUE_TYPES: { value: ValueType; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "relationship", label: "Relationship" },
  { value: "right", label: "Right" },
];

export const VALUE_PARENT_TYPES: { value: ValueParentType; label: string }[] = [
  { value: "on_top_of", label: "On Top Of" },
  { value: "part_of", label: "Part Of" },
];

export function getValueTypeLabel(type: ValueType): string {
  return VALUE_TYPES.find((t) => t.value === type)?.label || type;
}

export const VALUE_TYPE_COLORS: Record<ValueType, { bg: string; text: string; border: string }> = {
  product: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  service: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  relationship: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
  right: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
};

export function getValueTypeColorClasses(type: ValueType): string {
  const colors = VALUE_TYPE_COLORS[type];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

export function getParentTypeLabel(parentType: ValueParentType): string {
  return VALUE_PARENT_TYPES.find((t) => t.value === parentType)?.label || parentType;
}
