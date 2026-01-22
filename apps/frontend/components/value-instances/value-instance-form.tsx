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
import {
  ValueInstance,
  ValueInstanceDirection,
  ValueInstanceVisibility,
  DIRECTION_OPTIONS,
  VISIBILITY_OPTIONS,
} from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  valueId: z.string().min(1, "Value is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  purpose: z.string().max(500).optional(),
  version: z.string().max(50).optional(),
  direction: z.enum(["incoming", "outgoing", "internal", "neutral"]),
  fromAgentId: z.string().optional(),
  toAgentId: z.string().optional(),
  parentId: z.string().optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageFileId: z.string().optional(),
  visibility: z.enum(["public", "private"]),
}).refine((data) => data.fromAgentId || data.toAgentId, {
  message: "At least one agent (from or to) is required",
  path: ["fromAgentId"],
});

type FormValues = z.infer<typeof formSchema>;

type Agent = { id: string; name: string };
type Value = { id: string; name: string; type: string };

interface ValueInstanceFormProps {
  instance?: Partial<ValueInstance> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ValueInstanceForm = ({ instance, onSuccess, onCancel }: ValueInstanceFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [values, setValues] = useState<Value[]>([]);
  const [instances, setInstances] = useState<ValueInstance[]>([]);

  const isEditing = !!instance?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valueId: instance?.valueId || "",
      name: instance?.name || "",
      purpose: instance?.purpose || "",
      version: instance?.version || "1.0",
      direction: instance?.direction || "neutral",
      fromAgentId: instance?.fromAgentId || "",
      toAgentId: instance?.toAgentId || "",
      parentId: instance?.parentId || "",
      link: instance?.link || "",
      imageFileId: instance?.imageFileId || "",
      visibility: instance?.visibility || "private",
    },
  });

  useEffect(() => {
    // Fetch reference data
    Promise.all([
      api.getAgents(1, 100),
      api.getValuesTree(),
      api.getValueInstances({ pageSize: 100 }),
    ])
      .then(([agentsData, valuesData, instancesData]) => {
        setAgents(agentsData.items || []);
        // Flatten values tree
        const flatValues: Value[] = [];
        const flatten = (items: any[]) => {
          for (const item of items) {
            flatValues.push({ id: item.id, name: item.name, type: item.type });
            if (item.children) flatten(item.children);
          }
        };
        if (Array.isArray(valuesData)) {
          flatten(valuesData);
        }
        setValues(flatValues);
        setInstances(instancesData.data || []);
      })
      .catch((error) => console.error("Error fetching form data:", error));
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        valueId: data.valueId,
        name: data.name,
        purpose: data.purpose || undefined,
        version: data.version || "1.0",
        direction: data.direction,
        fromAgentId: data.fromAgentId || undefined,
        toAgentId: data.toAgentId || undefined,
        parentId: data.parentId || undefined,
        link: data.link || undefined,
        imageFileId: data.imageFileId || undefined,
        visibility: data.visibility,
      };

      if (isEditing) {
        await api.updateValueInstance(instance.id!, payload);
        toast.success("Value instance updated");
      } else {
        await api.createValueInstance(payload);
        toast.success("Value instance created");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save value instance");
    } finally {
      setIsLoading(false);
    }
  };

  const agentOptions: AutocompleteOption[] = agents.map((a) => ({ value: a.id, label: a.name }));
  const valueOptions: AutocompleteOption[] = values.map((v) => ({ value: v.id, label: `${v.name} (${v.type})` }));
  const parentOptions: AutocompleteOption[] = instances
    .filter((i) => i.id !== instance?.id)
    .map((i) => ({ value: i.id, label: i.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="valueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value *</FormLabel>
              <FormControl>
                <Autocomplete
                  options={valueOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a value..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Coaching Session #12" {...field} />
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
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input placeholder="1.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DIRECTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromAgentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Agent</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={agentOptions}
                    value={field.value || ""}
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
                <FormLabel>To Agent</FormLabel>
                <FormControl>
                  <Autocomplete
                    options={agentOptions}
                    value={field.value || ""}
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
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Instance</FormLabel>
              <FormControl>
                <Autocomplete
                  options={parentOptions}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Select parent (optional)..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
