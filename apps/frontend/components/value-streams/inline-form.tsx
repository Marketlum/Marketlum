"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { ValueStream } from "./types";
import { FileUpload } from "@/components/files/types";
import { FilePicker } from "@/components/files/file-picker";

type InlineFormProps = {
  valueStream?: ValueStream;
  onSave: (data: { name: string; purpose?: string; imageId?: string | null }) => Promise<void>;
  onCancel: () => void;
};

export function ValueStreamInlineForm({ valueStream, onSave, onCancel }: InlineFormProps) {
  const [name, setName] = useState(valueStream?.name || "");
  const [purpose, setPurpose] = useState(valueStream?.purpose || "");
  const [selectedImage, setSelectedImage] = useState<FileUpload | null>(
    valueStream?.image || null
  );
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
        purpose: purpose.trim() || undefined,
        imageId: selectedImage?.id || null,
      });
    } catch {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex items-start gap-2 py-2 px-2 bg-muted/50 rounded-md">
      <div className="flex-1 flex flex-col gap-2">
        <div>
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

        <Textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Purpose (optional)"
          className="min-h-[60px] resize-none"
          disabled={isSubmitting}
        />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Image (optional)
          </label>
          <FilePicker
            value={selectedImage}
            onChange={setSelectedImage}
            accept="image/*"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 mt-1">
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
