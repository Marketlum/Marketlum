"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Geography, GeographyLevel, getValidChildLevels } from "./types";
import { LevelIcon } from "./icons";
import { GeographyInlineForm } from "./inline-form";
import { cn } from "@/lib/utils";

type GeographyNodeProps = {
  geography: Geography;
  level: number;
  editingId: string | null;
  addingChildOf: string | null;
  onEdit: (geography: Geography) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onDelete: (geography: Geography) => void;
};

function GeographyNode({
  geography,
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
}: GeographyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = geography.children && geography.children.length > 0;
  const isEditing = editingId === geography.id;
  const isAddingChild = addingChildOf === geography.id;
  const canHaveChildren = getValidChildLevels(geography.level).length > 0;

  if (isEditing) {
    return (
      <div style={{ paddingLeft: `${level * 24}px` }}>
        <GeographyInlineForm
          geography={geography}
          onSave={(data) => onSaveEdit(geography.id, data)}
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

        {/* Level Icon */}
        <LevelIcon level={geography.level} className="h-4 w-4 shrink-0" />

        {/* Name */}
        <span className="font-medium">{geography.name}</span>

        {/* Code */}
        <span className="text-muted-foreground font-mono text-sm">{geography.code}</span>

        {/* Level Badge */}
        <Badge variant="outline" className="text-xs">
          {geography.level}
        </Badge>

        {/* Actions - visible on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canHaveChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onAddChild(geography.id)}
              title="Add child"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(geography)}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDelete(geography)}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Inline add child form */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(level + 1) * 24}px` }}>
          <GeographyInlineForm
            parentLevel={geography.level}
            onSave={(data) => onSaveNewChild(geography.id, data)}
            onCancel={onCancelAddChild}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {geography.children!.map((child) => (
            <GeographyNode
              key={child.id}
              geography={child}
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

type GeographyTreeProps = {
  geographies: Geography[];
  editingId: string | null;
  addingChildOf: string | null;
  addingRoot: boolean;
  onEdit: (geography: Geography) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onAddChild: (parentId: string) => void;
  onCancelAddChild: () => void;
  onSaveNewChild: (parentId: string, data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onCancelAddRoot: () => void;
  onSaveNewRoot: (data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onDelete: (geography: Geography) => void;
};

export function GeographyTree({
  geographies,
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
}: GeographyTreeProps) {
  if (geographies.length === 0 && !addingRoot) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No geographies yet. Add a root geography or seed sample data to get started.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Add root form */}
      {addingRoot && (
        <GeographyInlineForm
          onSave={onSaveNewRoot}
          onCancel={onCancelAddRoot}
        />
      )}

      {/* Tree nodes */}
      {geographies.map((geography) => (
        <GeographyNode
          key={geography.id}
          geography={geography}
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
