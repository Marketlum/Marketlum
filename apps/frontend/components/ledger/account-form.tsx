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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const onSubmit = async (data: FormData) => {
    try {
      if (account) {
        await api.updateAccount(account.id, data);
        toast.success("Account updated successfully");
      } else {
        await api.createAccount(data);
        toast.success("Account created successfully");
      }
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to save account";
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an owner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} ({agent.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={!!account}
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
              {account && (
                <p className="text-xs text-muted-foreground">
                  Value cannot be changed for accounts with transactions
                </p>
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
