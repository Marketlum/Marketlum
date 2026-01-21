"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  HardDrive,
  Check,
  X,
} from "lucide-react";
import { Folder } from "./types";
import { cn } from "@/lib/utils";

type FolderTreeProps = {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (folder: Folder) => void;
};

type FolderNodeProps = {
  folder: Folder;
  depth: number;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  editingId: string | null;
  editValue: string;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEdit: (folder: Folder) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditValueChange: (value: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (folder: Folder) => void;
};

function FolderNode({
  folder,
  depth,
  selectedFolderId,
  expandedIds,
  editingId,
  editValue,
  onToggleExpand,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditValueChange,
  onAddChild,
  onDelete,
}: FolderNodeProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const isEditing = editingId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-muted",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(folder.id);
            }}
            className="p-0.5 hover:bg-muted-foreground/20 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FolderIcon className="h-4 w-4 text-muted-foreground" />
        )}

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="h-6 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSaveEdit();
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm truncate">{folder.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddChild(folder.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStartEdit(folder)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(folder)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {isExpanded &&
        folder.children?.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            selectedFolderId={selectedFolderId}
            expandedIds={expandedIds}
            editingId={editingId}
            editValue={editValue}
            onToggleExpand={onToggleExpand}
            onSelect={onSelect}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onEditValueChange={onEditValueChange}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingToParentId, setAddingToParentId] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartEdit = (folder: Folder) => {
    setEditingId(folder.id);
    setEditValue(folder.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (editingId && editValue.trim()) {
      await onRenameFolder(editingId, editValue.trim());
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleStartAddFolder = (parentId?: string) => {
    setAddingToParentId(parentId === undefined ? null : parentId);
    setNewFolderName("");
    if (parentId) {
      setExpandedIds((prev) => new Set([...prev, parentId]));
    }
  };

  const handleCancelAddFolder = () => {
    setAddingToParentId(undefined);
    setNewFolderName("");
  };

  const handleSaveNewFolder = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim(), addingToParentId || undefined);
      setAddingToParentId(undefined);
      setNewFolderName("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="font-semibold text-sm">Folders</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => handleStartAddFolder()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {/* All Media (root) */}
        <div
          className={cn(
            "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-muted",
            selectedFolderId === null && "bg-muted"
          )}
          onClick={() => onSelectFolder(null)}
        >
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">All Media</span>
        </div>

        {/* New folder input at root level */}
        {addingToParentId === null && (
          <div className="flex items-center gap-1 py-1 px-2 ml-6">
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder"
              className="h-6 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNewFolder();
                if (e.key === "Escape") handleCancelAddFolder();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleSaveNewFolder}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCancelAddFolder}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Folder tree */}
        {folders.map((folder) => (
          <div key={folder.id}>
            <FolderNode
              folder={folder}
              depth={0}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              editingId={editingId}
              editValue={editValue}
              onToggleExpand={toggleExpand}
              onSelect={onSelectFolder}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onEditValueChange={setEditValue}
              onAddChild={handleStartAddFolder}
              onDelete={onDeleteFolder}
            />
            {/* New folder input under this folder */}
            {addingToParentId === folder.id && (
              <div
                className="flex items-center gap-1 py-1 px-2"
                style={{ paddingLeft: `${1 * 16 + 8 + 20}px` }}
              >
                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder"
                  className="h-6 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNewFolder();
                    if (e.key === "Escape") handleCancelAddFolder();
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleSaveNewFolder}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCancelAddFolder}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
