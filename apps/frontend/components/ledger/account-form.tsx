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
import { Account } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(160, "Name must be at most 160 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters").optional(),
  ownerAgentId: z.string().uuid("Please select an owner"),
  valueId: z.string().uuid("Please select a value"),
});

type FormData = z.infer<typeof formSchema>;

type Agent = {
  id: string;
  name: string;
  type: string;
};

type Value = {
  id: string;
  name: string;
  type: string;
};

type AccountFormProps = {
  account?: Account | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [values, setValues] = useState<Value[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isEditing = !!account;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name || "",
      description: account?.description || "",
      ownerAgentId: account?.ownerAgentId || "",
      valueId: account?.valueId || "",
    },
  });

  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getValuesList(1, 100),
    ])
      .then(([agentsData, valuesData]) => {
        setAgents(agentsData.items);
        setValues(valuesData.items);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const agentOptions: AutocompleteOption[] = agents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    sublabel: agent.type,
  }));

  const onSubmit = async (data: FormData) => {
    try {
      if (account) {
        // Don't send ownerAgentId when updating - it's not allowed
        const { ownerAgentId, ...updateData } = data;
        await api.updateAccount(account.id, updateData);
        toast.success("Account updated successfully");
      } else {
        await api.createAccount(data);
        toast.success("Account created successfully");
      }
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save account";
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Marketlum PLN" {...field} />
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
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description of this account"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerAgentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <Autocomplete
                  options={agentOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search for an agent..."
                  disabled={isEditing}
                />
              </FormControl>
              {isEditing && (
                <FormDescription>
                  Owner cannot be changed after account creation
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isEditing}
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
              {isEditing && (
                <FormDescription>
                  Value cannot be changed for accounts with transactions
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : account ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
