"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { Geography, GeographyLevel, getValidChildLevels, getNextLevel } from "./types";
import { LevelIcon } from "./icons";

type InlineFormProps = {
  geography?: Geography;
  parentLevel?: GeographyLevel;
  onSave: (data: { name: string; code: string; level: GeographyLevel }) => Promise<void>;
  onCancel: () => void;
};

export function GeographyInlineForm({ geography, parentLevel, onSave, onCancel }: InlineFormProps) {
  const [name, setName] = useState(geography?.name || "");
  const [code, setCode] = useState(geography?.code || "");
  const [level, setLevel] = useState<GeographyLevel>(
    geography?.level || (parentLevel ? getNextLevel(parentLevel) : "Planet") || "Planet"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  const validLevels = parentLevel ? getValidChildLevels(parentLevel) : ["Planet" as GeographyLevel];

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors: { name?: string; code?: string } = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 120) {
      newErrors.name = "Name must be at most 120 characters";
    }

    if (!code.trim() || code.trim().length < 2) {
      newErrors.code = "Code must be at least 2 characters";
    } else if (code.trim().length > 32) {
      newErrors.code = "Code must be at most 32 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave({ name: name.trim(), code: code.trim().toUpperCase(), level });
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 py-2 px-2 bg-muted/50 rounded-md">
      <LevelIcon level={level} className="h-4 w-4 shrink-0" />

      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1">
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name"
            className="h-8"
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div className="w-32">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="CODE"
            className="h-8 font-mono"
            disabled={isSubmitting}
          />
          {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
        </div>

        <div className="w-40">
          <Select value={level} onValueChange={(v) => setLevel(v as GeographyLevel)} disabled={isSubmitting}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validLevels.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  <div className="flex items-center gap-2">
                    <LevelIcon level={lvl} className="h-3 w-3" />
                    {lvl}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
