"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Value, ValueType, ValueParentType, getValueTypeLabel, getParentTypeLabel } from "./types";
import { ValueTypeIcon } from "./icons";
import { ValueInlineForm } from "./inline-form";
import { cn } from "@/lib/utils";

type ValueNodeProps = {
  value: Value;
  level: number;
  editingId: string | null;
  addingChildOf: string | null;
  onEdit: (value: Value) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType }) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType }) => Promise<void>;
  onDelete: (value: Value) => void;
};

function ValueNode({
  value,
  level,
  editingId,
  addingChildOf,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAddChild,
  onCancelAddChild,
  onSaveNewChild,
  onDelete,
}: ValueNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = value.children && value.children.length > 0;
  const isEditing = editingId === value.id;
  const isAddingChild = addingChildOf === value.id;

  if (isEditing) {
    return (
      <div style={{ paddingLeft: `${level * 24}px` }}>
        <ValueInlineForm
          value={value}
          onSave={(data) => onSaveEdit(value.id, data)}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group",
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

        {/* Type Icon */}
        <ValueTypeIcon type={value.type} className="h-4 w-4 shrink-0" />

        {/* Name */}
        <span className="font-medium">{value.name}</span>

        {/* Description */}
        {value.description && (
          <span className="text-muted-foreground text-sm truncate max-w-[200px]">
            {value.description}
          </span>
        )}

        {/* Type Badge */}
        <Badge variant="outline" className="text-xs">
          {getValueTypeLabel(value.type)}
        </Badge>

        {/* Parent Type Badge */}
        <Badge variant="secondary" className="text-xs">
          {getParentTypeLabel(value.parentType)}
        </Badge>

        {/* Actions - visible on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onAddChild(value.id)}
            title="Add child"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(value)}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDelete(value)}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Inline add child form */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(level + 1) * 24}px` }}>
          <ValueInlineForm
            onSave={(data) => onSaveNewChild(value.id, data)}
            onCancel={onCancelAddChild}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {value.children!.map((child) => (
            <ValueNode
              key={child.id}
              value={child}
              level={level + 1}
              editingId={editingId}
              addingChildOf={addingChildOf}
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

type ValueTreeProps = {
  values: Value[];
  editingId: string | null;
  addingChildOf: string | null;
  addingRoot: boolean;
  onEdit: (value: Value) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType }) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType }) => Promise<void>;
  onCancelAddRoot: () => void;
  onSaveNewRoot: (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType }) => Promise<void>;
  onDelete: (value: Value) => void;
};

export function ValueTree({
  values,
  editingId,
  addingChildOf,
  addingRoot,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAddChild,
  onCancelAddChild,
  onSaveNewChild,
  onCancelAddRoot,
  onSaveNewRoot,
  onDelete,
}: ValueTreeProps) {
  if (values.length === 0 && !addingRoot) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No values yet. Add a root value to get started.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Add root form */}
      {addingRoot && (
        <ValueInlineForm
          onSave={onSaveNewRoot}
          onCancel={onCancelAddRoot}
        />
      )}

      {/* Tree nodes */}
      {values.map((value) => (
        <ValueNode
          key={value.id}
          value={value}
          level={0}
          editingId={editingId}
          addingChildOf={addingChildOf}
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
