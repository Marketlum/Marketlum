'use client';

import { useState } from 'react';
import { ChevronRight, Globe, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GeographyTreeNode } from '@marketlum/shared';
import { GeographyType } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useIsMobile } from '../../hooks/use-mobile';

const TYPE_HIERARCHY: GeographyType[] = [
  GeographyType.PLANET,
  GeographyType.CONTINENT,
  GeographyType.CONTINENTAL_SECTION,
  GeographyType.COUNTRY,
  GeographyType.REGION,
  GeographyType.CITY,
  GeographyType.DISTRICT,
];

function getChildType(parentType: GeographyType): GeographyType | null {
  const index = TYPE_HIERARCHY.indexOf(parentType);
  if (index < 0 || index >= TYPE_HIERARCHY.length - 1) return null;
  return TYPE_HIERARCHY[index + 1];
}

const TYPE_LABEL_KEYS: Record<GeographyType, string> = {
  [GeographyType.PLANET]: 'typePlanet',
  [GeographyType.CONTINENT]: 'typeContinent',
  [GeographyType.CONTINENTAL_SECTION]: 'typeContinentalSection',
  [GeographyType.COUNTRY]: 'typeCountry',
  [GeographyType.REGION]: 'typeRegion',
  [GeographyType.CITY]: 'typeCity',
  [GeographyType.DISTRICT]: 'typeDistrict',
};

interface GeographyTreeNodeProps {
  node: GeographyTreeNode;
  depth: number;
  onCreateChild: (
    parentId: string,
    data: { name: string; code: string; type: GeographyType },
  ) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; code?: string }) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}

export function GeographyTreeNodeComponent({
  node,
  depth,
  onCreateChild,
  onUpdate,
  onDelete,
}: GeographyTreeNodeProps) {
  const t = useTranslations('geographies');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editCode, setEditCode] = useState(node.code);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildCode, setNewChildCode] = useState('');

  const hasChildren = node.children && node.children.length > 0;
  const childType = getChildType(node.type as GeographyType);

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedCode = editCode.trim();

    const data: { name?: string; code?: string } = {};
    if (trimmedName && trimmedName !== node.name) data.name = trimmedName;
    if (trimmedCode && trimmedCode !== node.code) data.code = trimmedCode;

    if (Object.keys(data).length === 0) {
      setEditing(false);
      setEditName(node.name);
      setEditCode(node.code);
      return;
    }
    await onUpdate(node.id, data);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(node.name);
    setEditCode(node.code);
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim() || !newChildCode.trim() || !childType) return;
    await onCreateChild(node.id, {
      name: newChildName.trim(),
      code: newChildCode.trim(),
      type: childType,
    });
    setNewChildName('');
    setNewChildCode('');
    setAddingChild(false);
    setExpanded(true);
  };

  const handleCancelAddChild = () => {
    setAddingChild(false);
    setNewChildName('');
    setNewChildCode('');
  };

  return (
    <div>
      <div
        className="group flex items-start gap-1 rounded-md px-1 py-1 hover:bg-secondary/50"
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
        <button
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <Globe className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />

        {editing ? (
          <div className="mx-1 flex flex-1 flex-col gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('namePlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
              autoFocus
            />
            <Input
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('codePlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={handleSaveEdit}>
                {tc('save')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelEdit}>
                {tc('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-1 flex flex-1 items-start gap-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm">{node.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                  {node.code}
                </Badge>
                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                  {t(TYPE_LABEL_KEYS[node.type as GeographyType])}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {childType && (
                  <DropdownMenuItem
                    onClick={() => {
                      setAddingChild(true);
                      setExpanded(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addChild')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(node.name);
                    setEditCode(node.code);
                    setEditing(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {tc('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(node.id, node.name)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tc('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <GeographyTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {addingChild && childType && (
        <div
          className="flex flex-col gap-1 py-1"
          style={{ paddingLeft: (depth + 1) * (isMobile ? 16 : 24) + 4 }}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4" />
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('childNamePlaceholder')}
              className="mx-1 h-7 w-full text-sm md:max-w-xs"
              autoFocus
            />
          </div>
          <div className="ml-6 md:ml-12 flex flex-col gap-1">
            <Input
              value={newChildCode}
              onChange={(e) => setNewChildCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('childCodePlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {t(TYPE_LABEL_KEYS[childType])}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCreateChild}>
                {tc('save')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelAddChild}>
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
