"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { OfferingItem } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  valueId: z.string().uuid("Please select a value"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  pricingFormula: z.string().max(500, "Pricing formula must be at most 500 characters").optional(),
  pricingLink: z.string().url("Must be a valid URL").max(2048).optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

type Value = {
  id: string;
  name: string;
  type: string;
};

type OfferingItemFormProps = {
  offeringId: string;
  item?: OfferingItem | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function OfferingItemForm({ offeringId, item, onSuccess, onCancel }: OfferingItemFormProps) {
  const [values, setValues] = useState<Value[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valueId: item?.valueId || "",
      quantity: item?.quantity || 1,
      pricingFormula: item?.pricingFormula || "",
      pricingLink: item?.pricingLink || "",
    },
  });

  useEffect(() => {
    api.getValuesList(1, 100)
      .then((data) => setValues(data.items))
      .catch((error) => {
        console.error("Error fetching values:", error);
        toast.error("Failed to load values");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        pricingFormula: data.pricingFormula || undefined,
        pricingLink: data.pricingLink || undefined,
      };

      if (item) {
        await api.updateOfferingItem(offeringId, item.id, {
          quantity: payload.quantity,
          pricingFormula: payload.pricingFormula,
          pricingLink: payload.pricingLink,
        });
        toast.success("Item updated successfully");
      } else {
        await api.addOfferingItem(offeringId, payload);
        toast.success("Item added successfully");
      }
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save item";
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="valueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!item}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {values.map((value) => (
                    <SelectItem key={value.id} value={value.id}>
                      {value.name} ({value.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!!item && (
                <FormDescription>Value cannot be changed after creation</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1.00"
                  {...field}
                />
              </FormControl>
              <FormDescription>Amount of this value in the offering</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricingFormula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Formula (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., $100/hour, 15% of value"
                  {...field}
                />
              </FormControl>
              <FormDescription>Describe how this item is priced</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricingLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Link (optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/pricing"
                  {...field}
                />
              </FormControl>
              <FormDescription>Link to detailed pricing information</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : item ? "Update" : "Add"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
