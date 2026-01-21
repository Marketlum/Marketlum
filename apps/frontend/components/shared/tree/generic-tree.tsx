"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseTreeItem, FieldConfig, FormData, GenericTreeProps } from "./types";
import { GenericInlineForm } from "./generic-inline-form";

interface TreeNodeProps<T extends BaseTreeItem> {
  item: T;
  level: number;
  editingId: string | null;
  addingChildOf: string | null;
  fields: FieldConfig[];
  renderIcon: (item: T) => ReactNode;
  renderSecondaryText?: (item: T) => ReactNode;
  onEdit: (item: T) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: FormData) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: FormData) => Promise<void>;
  onDelete: (item: T) => void;
}

function TreeNode<T extends BaseTreeItem>({
  item,
  level,
  editingId,
  addingChildOf,
  fields,
  renderIcon,
  renderSecondaryText,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAddChild,
  onCancelAddChild,
  onSaveNewChild,
  onDelete,
}: TreeNodeProps<T>) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isEditing = editingId === item.id;
  const isAddingChild = addingChildOf === item.id;

  if (isEditing) {
    return (
      <div style={{ paddingLeft: `${level * 24}px` }}>
        <GenericInlineForm<T>
          item={item}
          fields={fields}
          onSave={(data) => onSaveEdit(item.id, data)}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
        )}
        style={{ paddingLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-5 h-5 flex items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Icon */}
        {renderIcon(item)}

        {/* Name */}
        <span className="font-medium">{item.name}</span>

        {/* Secondary text (e.g., purpose, description) */}
        {renderSecondaryText && renderSecondaryText(item)}

        {/* Actions - visible on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onAddChild(item.id)}
            title="Add child"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(item)}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDelete(item)}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Inline add child form */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(level + 1) * 24}px` }}>
          <GenericInlineForm<T>
            fields={fields}
            onSave={(data) => onSaveNewChild(item.id, data)}
            onCancel={onCancelAddChild}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {(item.children as T[])!.map((child) => (
            <TreeNode<T>
              key={child.id}
              item={child}
              level={level + 1}
              editingId={editingId}
              addingChildOf={addingChildOf}
              fields={fields}
              renderIcon={renderIcon}
              renderSecondaryText={renderSecondaryText}
              onEdit={onEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onAddChild={onAddChild}
              onCancelAddChild={onCancelAddChild}
              onSaveNewChild={onSaveNewChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GenericTree<T extends BaseTreeItem>({
  items,
  editingId,
  addingChildOf,
  addingRoot,
  fields,
  renderIcon,
  renderSecondaryText,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAddChild,
  onCancelAddChild,
  onSaveNewChild,
  onCancelAddRoot,
  onSaveNewRoot,
  onDelete,
  emptyMessage = "No items yet. Add a root item to get started.",
}: GenericTreeProps<T>) {
  if (items.length === 0 && !addingRoot) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Add root form */}
      {addingRoot && (
        <GenericInlineForm<T>
          fields={fields}
          onSave={onSaveNewRoot}
          onCancel={onCancelAddRoot}
        />
      )}

      {/* Tree nodes */}
      {items.map((item) => (
        <TreeNode<T>
          key={item.id}
          item={item}
          level={0}
          editingId={editingId}
          addingChildOf={addingChildOf}
          fields={fields}
          renderIcon={renderIcon}
          renderSecondaryText={renderSecondaryText}
          onEdit={onEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onAddChild={onAddChild}
          onCancelAddChild={onCancelAddChild}
          onSaveNewChild={onSaveNewChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
