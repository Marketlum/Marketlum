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
import { Value, ValueType, ValueParentType, VALUE_TYPES, VALUE_PARENT_TYPES } from "./types";
import { ValueTypeIcon } from "./icons";
import { MultiFilePicker } from "@/components/files/multi-file-picker";
import { FileUpload } from "@/components/files/types";

type InlineFormProps = {
  value?: Value;
  defaultParentType?: ValueParentType;
  onSave: (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => Promise<void>;
  onCancel: () => void;
};

export function ValueInlineForm({ value, defaultParentType, onSave, onCancel }: InlineFormProps) {
  const [name, setName] = useState(value?.name || "");
  const [description, setDescription] = useState(value?.description || "");
  const [type, setType] = useState<ValueType>(value?.type || "product");
  const [parentType, setParentType] = useState<ValueParentType>(
    value?.parentType || defaultParentType || "on_top_of"
  );
  const [files, setFiles] = useState<FileUpload[]>(value?.files || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 120) {
      newErrors.name = "Name must be at most 120 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        parentType,
        fileIds: files.map((f) => f.id),
      });
    } catch {
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
    <div className="flex items-start gap-2 py-2 px-2 bg-muted/50 rounded-md">
      <ValueTypeIcon type={type} className="h-4 w-4 shrink-0 mt-2" />

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Value name"
              className="h-8"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div className="w-36">
            <Select value={type} onValueChange={(v) => setType(v as ValueType)} disabled={isSubmitting}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <ValueTypeIcon type={t.value} className="h-3 w-3" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <Select value={parentType} onValueChange={(v) => setParentType(v as ValueParentType)} disabled={isSubmitting}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUE_PARENT_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          className="h-8 text-sm"
          disabled={isSubmitting}
        />

        <div className="pt-1">
          <MultiFilePicker
            value={files}
            onChange={setFiles}
            maxFiles={10}
          />
        </div>
      </div>
    </div>
  );
}
