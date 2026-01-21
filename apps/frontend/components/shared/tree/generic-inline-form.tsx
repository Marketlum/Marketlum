"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { FileUpload } from "@/components/files/types";
import { FilePicker } from "@/components/files/file-picker";
import { BaseTreeItem, FormData, GenericInlineFormProps } from "./types";

export function GenericInlineForm<T extends BaseTreeItem>({
  item,
  fields,
  onSave,
  onCancel,
}: GenericInlineFormProps<T>) {
  // Initialize form values from item or empty strings
  const initialValues: FormData = {};
  const itemRecord = item as Record<string, unknown>;
  fields.forEach((field) => {
    if (field.type === "image") {
      const imageField = itemRecord?.[field.name] as { id?: string } | undefined;
      initialValues[field.name] = imageField?.id || (itemRecord?.[`${field.name}Id`] as string) || null;
    } else {
      initialValues[field.name] = (itemRecord?.[field.name] as string) || "";
    }
  });

  const [values, setValues] = useState<FormData>(initialValues);
  const [selectedImage, setSelectedImage] = useState<FileUpload | null>(
    (itemRecord?.image as FileUpload) || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.type === "image") return; // Images don't need validation

      const value = (values[field.name] as string || "").trim();

      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.minLength && value.length < field.minLength) {
        newErrors[field.name] = `${field.label} must be at least ${field.minLength} characters`;
      } else if (field.maxLength && value.length > field.maxLength) {
        newErrors[field.name] = `${field.label} must be at most ${field.maxLength} characters`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formData: FormData = {};
      fields.forEach((field) => {
        if (field.type === "image") {
          formData[`${field.name}Id`] = selectedImage?.id || null;
        } else {
          const value = (values[field.name] as string || "").trim();
          formData[field.name] = value || undefined;
        }
      });
      await onSave(formData);
    } catch {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleValueChange = (fieldName: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  return (
    <div className="flex items-start gap-2 py-2 px-2 bg-muted/50 rounded-md">
      <div className="flex-1 flex flex-col gap-2">
        {fields.map((field, index) => {
          if (field.type === "text") {
            return (
              <div key={field.name}>
                <Input
                  ref={index === 0 ? firstInputRef : undefined}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={field.placeholder || field.label}
                  className="h-8"
                  disabled={isSubmitting}
                />
                {errors[field.name] && (
                  <p className="text-xs text-destructive mt-1">{errors[field.name]}</p>
                )}
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.name}>
                <Textarea
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={field.placeholder || `${field.label} (optional)`}
                  className="min-h-[60px] resize-none"
                  disabled={isSubmitting}
                />
                {errors[field.name] && (
                  <p className="text-xs text-destructive mt-1">{errors[field.name]}</p>
                )}
              </div>
            );
          }

          if (field.type === "image") {
            return (
              <div key={field.name}>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {field.label} (optional)
                </label>
                <FilePicker
                  value={selectedImage}
                  onChange={setSelectedImage}
                  accept="image/*"
                />
              </div>
            );
          }

          return null;
        })}
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
