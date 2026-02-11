'use client';

import { useState } from 'react';
import { Layers, Check, Star, Trash2, RotateCcw } from 'lucide-react';
import type { PerspectiveResponse, PerspectiveConfig } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PerspectiveSelectorProps {
  perspectives: PerspectiveResponse[];
  activePerspectiveId: string | null;
  onSelect: (id: string) => void;
  onSave: (name: string, config: PerspectiveConfig, isDefault?: boolean) => void;
  onUpdate: (id: string, data: { name?: string; config?: PerspectiveConfig; isDefault?: boolean }) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  getCurrentConfig: () => PerspectiveConfig;
  translations: {
    perspectives: string;
    savePerspective: string;
    updatePerspective: string;
    deletePerspective: string;
    setAsDefault: string;
    removeDefault: string;
    reset: string;
    namePlaceholder: string;
    noPerspectives: string;
  };
}

export function PerspectiveSelector({
  perspectives,
  activePerspectiveId,
  onSelect,
  onSave,
  onUpdate,
  onDelete,
  onReset,
  getCurrentConfig,
  translations,
}: PerspectiveSelectorProps) {
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activePerspective = perspectives.find((p) => p.id === activePerspectiveId);

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSave(saveName.trim(), getCurrentConfig());
    setSaveName('');
    setIsSaving(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Layers className="mr-2 h-4 w-4" />
          {activePerspective ? activePerspective.name : translations.perspectives}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>{translations.perspectives}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {perspectives.length === 0 && !isSaving && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{translations.noPerspectives}</div>
        )}

        {perspectives.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => onSelect(p.id)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {p.id === activePerspectiveId && <Check className="h-4 w-4" />}
              {p.id !== activePerspectiveId && <span className="w-4" />}
              {p.name}
            </span>
            {p.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {isSaving ? (
          <div className="p-2 flex gap-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={translations.namePlaceholder}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsSaving(false);
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 px-2" onClick={handleSave} disabled={!saveName.trim()}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsSaving(true); }}>
            {translations.savePerspective}
          </DropdownMenuItem>
        )}

        {activePerspective && (
          <>
            <DropdownMenuItem onSelect={() => onUpdate(activePerspective.id, { config: getCurrentConfig() })}>
              {translations.updatePerspective}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                onUpdate(activePerspective.id, { isDefault: !activePerspective.isDefault })
              }
            >
              {activePerspective.isDefault ? translations.removeDefault : translations.setAsDefault}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(activePerspective.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {translations.deletePerspective}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {translations.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
