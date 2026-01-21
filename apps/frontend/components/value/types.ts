export type ValueType = "product" | "service" | "relationship" | "right";

export type ValueParentType = "on_top_of" | "part_of";

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

export function getParentTypeLabel(parentType: ValueParentType): string {
  return VALUE_PARENT_TYPES.find((t) => t.value === parentType)?.label || parentType;
}
