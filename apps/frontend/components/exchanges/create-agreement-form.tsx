"use client";

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
import { toast } from "sonner";
import api from "@/lib/api-sdk";

const CATEGORY_OPTIONS = [
  { value: "internal_market", label: "Internal Market" },
  { value: "external_market", label: "External Market" },
];

const GATEWAY_OPTIONS = [
  { value: "pen_and_paper", label: "Pen and Paper" },
  { value: "notary", label: "Notary" },
  { value: "docu_sign", label: "DocuSign" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(255, "Title must be at most 255 characters"),
  category: z.enum(["internal_market", "external_market"], { required_error: "Please select a category" }),
  gateway: z.enum(["pen_and_paper", "notary", "docu_sign", "other"], { required_error: "Please select a gateway" }),
  link: z.string().url("Must be a valid URL").max(2048).optional().or(z.literal("")),
  content: z.string().max(10000, "Content must be at most 10000 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

type CreateAgreementFormProps = {
  exchangeId: string;
  exchangeName: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function CreateAgreementForm({ exchangeId, exchangeName, onSuccess, onCancel }: CreateAgreementFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: `Agreement for ${exchangeName}`,
      category: "external_market",
      gateway: "pen_and_paper",
      link: "",
      content: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        title: data.title,
        category: data.category,
        gateway: data.gateway,
        link: data.link || undefined,
        content: data.content || undefined,
      };

      await api.createAgreementFromExchange(exchangeId, payload);
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to create agreement";
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Agreement title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="gateway"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gateway</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GATEWAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>How the agreement is signed</FormDescription>
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
              <FormLabel>Link (optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/agreement"
                  {...field}
                />
              </FormControl>
              <FormDescription>URL to the agreement document</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Agreement content or notes..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-sm text-muted-foreground">
          This will create a new agreement and link it to this exchange. The exchange parties will be added as agreement parties.
        </p>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create Agreement"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
