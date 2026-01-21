"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Account, Transaction } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  fromAccountId: z.string().uuid("Please select a source account"),
  toAccountId: z.string().uuid("Please select a destination account"),
  amount: z.coerce.number().refine((val) => val !== 0, "Amount must not be zero"),
  timestamp: z.string().optional(),
  verified: z.boolean().default(false),
  note: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
});

type FormData = z.infer<typeof formSchema>;

type TransactionFormProps = {
  transaction?: Transaction | null;
  preselectedFromAccountId?: string;
  preselectedToAccountId?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function TransactionForm({
  transaction,
  preselectedFromAccountId,
  preselectedToAccountId,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAccountId: transaction?.fromAccountId || preselectedFromAccountId || "",
      toAccountId: transaction?.toAccountId || preselectedToAccountId || "",
      amount: transaction ? parseFloat(transaction.amount) : 0,
      timestamp: transaction?.timestamp
        ? new Date(transaction.timestamp).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      verified: transaction?.verified || false,
      note: transaction?.note || "",
    },
  });

  useEffect(() => {
    api.getAccounts({ limit: 100 })
      .then((data) => {
        setAccounts(data.items);
      })
      .catch((error) => {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load accounts");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedFromAccountId = form.watch("fromAccountId");
  const selectedFromAccount = accounts.find((a) => a.id === selectedFromAccountId);

  // Filter destination accounts to same value as source
  const availableToAccounts = selectedFromAccount
    ? accounts.filter((a) => a.valueId === selectedFromAccount.valueId && a.id !== selectedFromAccountId)
    : accounts;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : undefined,
      };

      if (transaction) {
        await api.updateTransaction(transaction.id, payload);
        toast.success("Transaction updated successfully");
      } else {
        await api.createTransaction(payload);
        toast.success("Transaction created successfully");
      }
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to save transaction";
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
          name="fromAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.value?.name || "Unknown"})
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
          name="toAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Account</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!selectedFromAccountId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableToAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.value?.name || "Unknown"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFromAccount && availableToAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No other accounts with the same value type
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="Enter amount"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Positive: moves from source to destination. Negative: effectively reverses direction.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timestamp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timestamp</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
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
                  placeholder="Optional note for this transaction"
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
          name="verified"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Verified</FormLabel>
                <FormDescription>
                  Mark this transaction as verified
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : transaction ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
