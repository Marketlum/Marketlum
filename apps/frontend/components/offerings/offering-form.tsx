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
import { Offering } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be at most 200 characters"),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional(),
  purpose: z.string().max(500, "Purpose must be at most 500 characters").optional(),
  link: z.string().url("Must be a valid URL").max(2048).optional().or(z.literal("")),
  activeFrom: z.string().optional(),
  activeUntil: z.string().optional(),
  agentId: z.string().uuid("Please select an agent"),
  valueStreamId: z.string().uuid("Please select a value stream"),
});

type FormData = z.infer<typeof formSchema>;

type Agent = {
  id: string;
  name: string;
  type: string;
};

type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
};

type OfferingFormProps = {
  offering?: Offering | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function OfferingForm({ offering, onSuccess, onCancel }: OfferingFormProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [valueStreams, setValueStreams] = useState<ValueStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: offering?.name || "",
      description: offering?.description || "",
      purpose: offering?.purpose || "",
      link: offering?.link || "",
      activeFrom: offering?.activeFrom ? offering.activeFrom.split("T")[0] : "",
      activeUntil: offering?.activeUntil ? offering.activeUntil.split("T")[0] : "",
      agentId: offering?.agentId || "",
      valueStreamId: offering?.valueStreamId || "",
    },
  });

  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getValueStreams(),
    ])
      .then(([agentsData, valueStreamsData]) => {
        setAgents(agentsData.items);
        setValueStreams(valueStreamsData);
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
      const payload = {
        ...data,
        link: data.link || undefined,
        description: data.description || undefined,
        purpose: data.purpose || undefined,
        activeFrom: data.activeFrom || undefined,
        activeUntil: data.activeUntil || undefined,
      };

      if (offering) {
        await api.updateOffering(offering.id, {
          ...payload,
          link: data.link || null,
          description: data.description || null,
          purpose: data.purpose || null,
          activeFrom: data.activeFrom || null,
          activeUntil: data.activeUntil || null,
        });
        toast.success("Offering updated successfully");
      } else {
        await api.createOffering(payload);
        toast.success("Offering created successfully");
      }
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save offering";
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
                <Input placeholder="e.g., Premium Consultation Package" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief purpose of this offering"
                  {...field}
                />
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
                  placeholder="Detailed description of the offering"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={agentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search for an agent..."
                  />
                </FormControl>
                <FormDescription>Who owns this offering</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valueStreamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value Stream</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a value stream" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {valueStreams.map((stream) => (
                      <SelectItem key={stream.id} value={stream.id}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="https://example.com/offering-details"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="activeFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Active From (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>When the offering becomes active</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activeUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Active Until (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>When the offering expires</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : offering ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
