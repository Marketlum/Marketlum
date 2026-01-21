"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { ValueStream } from "./types";
import { ValueStreamIcon } from "./icons";
import { ValueStreamInlineForm } from "./inline-form";
import { cn } from "@/lib/utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type ValueStreamData = { name: string; purpose?: string; imageId?: string | null };

type ValueStreamNodeProps = {
  valueStream: ValueStream;
  level: number;
  editingId: string | null;
  addingChildOf: string | null;
  onEdit: (valueStream: ValueStream) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: ValueStreamData) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: ValueStreamData) => Promise<void>;
  onDelete: (valueStream: ValueStream) => void;
};

function ValueStreamNode({
  valueStream,
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
}: ValueStreamNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = valueStream.children && valueStream.children.length > 0;
  const isEditing = editingId === valueStream.id;
  const isAddingChild = addingChildOf === valueStream.id;

  if (isEditing) {
    return (
      <div style={{ paddingLeft: `${level * 24}px` }}>
        <ValueStreamInlineForm
          valueStream={valueStream}
          onSave={(data) => onSaveEdit(valueStream.id, data)}
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

        {/* Image or Icon */}
        {valueStream.image ? (
          <img
            src={`${apiBaseUrl}/files/${valueStream.image.id}/thumbnail`}
            alt={valueStream.image.altText || valueStream.name}
            className="h-6 w-6 rounded object-cover shrink-0"
          />
        ) : (
          <ValueStreamIcon className="h-4 w-4 shrink-0" />
        )}

        {/* Name */}
        <span className="font-medium">{valueStream.name}</span>

        {/* Purpose */}
        {valueStream.purpose && (
          <span className="text-muted-foreground text-sm">
            — {valueStream.purpose}
          </span>
        )}

        {/* Actions - visible on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onAddChild(valueStream.id)}
            title="Add child"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(valueStream)}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDelete(valueStream)}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Inline add child form */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(level + 1) * 24}px` }}>
          <ValueStreamInlineForm
            onSave={(data) => onSaveNewChild(valueStream.id, data)}
            onCancel={onCancelAddChild}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {valueStream.children!.map((child) => (
            <ValueStreamNode
              key={child.id}
              valueStream={child}
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

type ValueStreamTreeProps = {
  valueStreams: ValueStream[];
  editingId: string | null;
  addingChildOf: string | null;
  addingRoot: boolean;
  onEdit: (valueStream: ValueStream) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: ValueStreamData) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: ValueStreamData) => Promise<void>;
  onCancelAddRoot: () => void;
  onSaveNewRoot: (data: ValueStreamData) => Promise<void>;
  onDelete: (valueStream: ValueStream) => void;
};

export function ValueStreamTree({
  valueStreams,
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
}: ValueStreamTreeProps) {
  if (valueStreams.length === 0 && !addingRoot) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No value streams yet. Add a root value stream to get started.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Add root form */}
      {addingRoot && (
        <ValueStreamInlineForm
          onSave={onSaveNewRoot}
          onCancel={onCancelAddRoot}
        />
      )}

      {/* Tree nodes */}
      {valueStreams.map((valueStream) => (
        <ValueStreamNode
          key={valueStream.id}
          valueStream={valueStream}
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
