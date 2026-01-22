"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InvoiceItem } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  itemType: z.enum(["value", "valueInstance"]),
  valueId: z.string().optional(),
  valueInstanceId: z.string().optional(),
  quantity: z.coerce.number().min(0.0001, "Quantity must be greater than 0"),
  description: z.string().max(500).optional(),
}).refine((data) => {
  if (data.itemType === "value") {
    return !!data.valueId;
  }
  return !!data.valueInstanceId;
}, {
  message: "Please select a value or value instance",
  path: ["valueId"],
});

type FormValues = z.infer<typeof formSchema>;

type Value = { id: string; name: string; type: string };
type ValueInstance = { id: string; name: string; value?: { name: string } };

interface InvoiceItemFormProps {
  invoiceId: string;
  item?: Partial<InvoiceItem> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InvoiceItemForm = ({ invoiceId, item, onSuccess, onCancel }: InvoiceItemFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState<Value[]>([]);
  const [instances, setInstances] = useState<ValueInstance[]>([]);

  const isEditing = !!item?.id;

  const getInitialItemType = (): "value" | "valueInstance" => {
    if (item?.valueInstanceId) return "valueInstance";
    return "value";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemType: getInitialItemType(),
      valueId: item?.valueId || "",
      valueInstanceId: item?.valueInstanceId || "",
      quantity: item?.quantity || 1,
      description: item?.description || "",
    },
  });

  const itemType = form.watch("itemType");

  useEffect(() => {
    // Fetch values tree and flatten
    api.getValuesTree()
      .then((data) => {
        const flatValues: Value[] = [];
        const flatten = (items: any[]) => {
          for (const v of items) {
            flatValues.push({ id: v.id, name: v.name, type: v.type });
            if (v.children) flatten(v.children);
          }
        };
        if (Array.isArray(data)) flatten(data);
        setValues(flatValues);
      })
      .catch((error) => console.error("Error fetching values:", error));

    // Fetch value instances
    api.getValueInstances({ pageSize: 100 })
      .then((data) => setInstances(data.data || []))
      .catch((error) => console.error("Error fetching instances:", error));
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        valueId: data.itemType === "value" ? data.valueId : undefined,
        valueInstanceId: data.itemType === "valueInstance" ? data.valueInstanceId : undefined,
        quantity: data.quantity,
        description: data.description || undefined,
      };

      if (isEditing) {
        await api.updateInvoiceItem(invoiceId, item.id!, payload);
        toast.success("Item updated");
      } else {
        await api.addInvoiceItem(invoiceId, payload);
        toast.success("Item added");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save item");
    } finally {
      setIsLoading(false);
    }
  };

  const valueOptions: AutocompleteOption[] = values.map((v) => ({
    value: v.id,
    label: `${v.name} (${v.type})`,
  }));

  const instanceOptions: AutocompleteOption[] = instances.map((i) => ({
    value: i.id,
    label: i.value ? `${i.name} - ${i.value.name}` : i.name,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="itemType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="valueInstance">Value Instance</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {itemType === "value" ? (
          <FormField
            control={form.control}
            name="valueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value *</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={valueOptions}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select a value..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="valueInstanceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value Instance *</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={instanceOptions}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select a value instance..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity *</FormLabel>
              <FormControl>
                <Input type="number" step="0.0001" min="0.0001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Add"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
