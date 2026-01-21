import { FileUpload } from "@/components/files/types";
import { ReactNode } from "react";

// Base tree item interface - all tree entities must extend this
export interface BaseTreeItem {
  id: string;
  name: string;
  children?: BaseTreeItem[];
  image?: FileUpload | null;
  imageId?: string | null;
}

// Field types supported in inline forms
export type FieldType = "text" | "textarea" | "image";

// Field configuration for dynamic form generation
export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

// Data returned from inline form
export type FormData = Record<string, string | null | undefined>;

// Props for generic tree component
export interface GenericTreeProps<T extends BaseTreeItem> {
  items: T[];
  editingId: string | null;
  addingChildOf: string | null;
  addingRoot: boolean;
  fields: FieldConfig[];
  renderIcon: (item: T) => ReactNode;
  renderSecondaryText?: (item: T) => ReactNode;
  onEdit: (item: T) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: FormData) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: FormData) => Promise<void>;
  onCancelAddRoot: () => void;
  onSaveNewRoot: (data: FormData) => Promise<void>;
  onDelete: (item: T) => void;
  emptyMessage?: string;
}

// Props for inline form
export interface GenericInlineFormProps<T extends BaseTreeItem> {
  item?: T;
  fields: FieldConfig[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
}
