"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
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
import { ExchangeParty, ExchangeFlow } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  fromPartyAgentId: z.string().uuid("Please select a source party"),
  toPartyAgentId: z.string().uuid("Please select a destination party"),
  valueId: z.string().uuid("Please select a value"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  note: z.string().max(2000, "Note must be at most 2000 characters").optional(),
}).refine((data) => data.fromPartyAgentId !== data.toPartyAgentId, {
  message: "Source and destination parties must be different",
  path: ["toPartyAgentId"],
});

type FormData = z.infer<typeof formSchema>;

type Value = {
  id: string;
  name: string;
  description?: string;
  type: string;
};

type FlowFormProps = {
  exchangeId: string;
  parties: ExchangeParty[];
  flow?: ExchangeFlow | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function FlowForm({ exchangeId, parties, flow, onSuccess, onCancel }: FlowFormProps) {
  const [values, setValues] = useState<Value[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromPartyAgentId: flow?.fromPartyAgentId || "",
      toPartyAgentId: flow?.toPartyAgentId || "",
      valueId: flow?.valueId || "",
      quantity: flow?.quantity ?? 1,
      note: flow?.note || "",
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

  const valueOptions: AutocompleteOption[] = values.map((value) => ({
    value: value.id,
    label: value.name,
    sublabel: value.type,
  }));

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        fromPartyAgentId: data.fromPartyAgentId,
        toPartyAgentId: data.toPartyAgentId,
        valueId: data.valueId,
        quantity: data.quantity,
        note: data.note || undefined,
      };

      if (flow) {
        await api.updateExchangeFlow(exchangeId, flow.id, {
          ...payload,
          note: data.note || null,
        });
        toast.success("Flow updated successfully");
      } else {
        await api.createExchangeFlow(exchangeId, payload);
        toast.success("Flow created successfully");
      }
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save flow";
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromPartyAgentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Party</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.agentId} value={party.agentId}>
                        {party.agent?.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Who gives the value</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toPartyAgentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Party</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.agentId} value={party.agentId}>
                        {party.agent?.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Who receives the value</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="valueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Autocomplete
                  options={valueOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search for a value..."
                />
              </FormControl>
              <FormDescription>The value being exchanged</FormDescription>
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
                  step="0.0001"
                  min="0"
                  placeholder="1"
                  {...field}
                />
              </FormControl>
              <FormDescription>Amount of the value being exchanged</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details about this flow..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : flow ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
