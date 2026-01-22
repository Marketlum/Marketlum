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
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Invoice } from "./types";
import { FilePicker } from "@/components/files/file-picker";
import { FileUpload } from "@/components/files/types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  fromAgentId: z.string().min(1, "From Agent is required"),
  toAgentId: z.string().min(1, "To Agent is required"),
  number: z.string().min(1, "Invoice number is required").max(100),
  issuedAt: z.string().min(1, "Issue date is required"),
  dueAt: z.string().min(1, "Due date is required"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  fileId: z.string().optional(),
  note: z.string().max(2000).optional(),
}).refine((data) => {
  const issued = new Date(data.issuedAt);
  const due = new Date(data.dueAt);
  return due >= issued;
}, {
  message: "Due date cannot be before issue date",
  path: ["dueAt"],
});

type FormValues = z.infer<typeof formSchema>;

type Agent = { id: string; name: string };

interface InvoiceFormProps {
  invoice?: Partial<Invoice> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InvoiceForm = ({ invoice, onSuccess, onCancel }: InvoiceFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(
    invoice?.file ? (invoice.file as FileUpload) : null
  );

  const isEditing = !!invoice?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAgentId: invoice?.fromAgentId || "",
      toAgentId: invoice?.toAgentId || "",
      number: invoice?.number || "",
      issuedAt: invoice?.issuedAt ? invoice.issuedAt.split('T')[0] : "",
      dueAt: invoice?.dueAt ? invoice.dueAt.split('T')[0] : "",
      link: invoice?.link || "",
      fileId: invoice?.fileId || "",
      note: invoice?.note || "",
    },
  });

  useEffect(() => {
    api.getAgents(1, 100)
      .then((data) => setAgents(data.items || []))
      .catch((error) => console.error("Error fetching agents:", error));
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        fromAgentId: data.fromAgentId,
        toAgentId: data.toAgentId,
        number: data.number,
        issuedAt: data.issuedAt,
        dueAt: data.dueAt,
        link: data.link || undefined,
        fileId: selectedFile?.id || undefined,
        note: data.note || undefined,
      };

      if (isEditing) {
        await api.updateInvoice(invoice.id!, payload);
        toast.success("Invoice updated");
      } else {
        await api.createInvoice(payload);
        toast.success("Invoice created");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save invoice");
    } finally {
      setIsLoading(false);
    }
  };

  const agentOptions: AutocompleteOption[] = agents.map((a) => ({ value: a.id, label: a.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromAgentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Agent *</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={agentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select agent..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toAgentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To Agent *</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={agentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select agent..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., FV/2026/01/001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="issuedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>File Attachment</FormLabel>
          <FilePicker
            value={selectedFile}
            onChange={setSelectedFile}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional note..." {...field} />
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
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
