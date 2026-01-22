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
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { Exchange } from "./types";
import api from "@/lib/api-sdk";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be at most 200 characters"),
  purpose: z.string().max(500, "Purpose must be at most 500 characters").optional(),
  valueStreamId: z.string().uuid("Please select a value stream"),
  channelId: z.string().uuid().optional().or(z.literal("")),
  taxonId: z.string().uuid().optional().or(z.literal("")),
  leadUserId: z.string().uuid().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

type Agent = {
  id: string;
  name: string;
  type: string;
};

type User = {
  id: string;
  email: string;
  agent?: Agent;
  avatarFileId?: string | null;
};

type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
  children?: ValueStream[];
};

type Channel = {
  id: string;
  name: string;
  type: string;
  children?: Channel[];
};

type Taxonomy = {
  id: string;
  name: string;
  description?: string;
  children?: Taxonomy[];
};

type FlatValueStream = {
  id: string;
  name: string;
  level: number;
};

type FlatChannel = {
  id: string;
  name: string;
  level: number;
};

type FlatTaxonomy = {
  id: string;
  name: string;
  level: number;
};

function flattenValueStreams(streams: ValueStream[], level = 0): FlatValueStream[] {
  const result: FlatValueStream[] = [];
  for (const stream of streams) {
    result.push({ id: stream.id, name: stream.name, level });
    if (stream.children && stream.children.length > 0) {
      result.push(...flattenValueStreams(stream.children, level + 1));
    }
  }
  return result;
}

function flattenChannels(channels: Channel[], level = 0): FlatChannel[] {
  const result: FlatChannel[] = [];
  for (const channel of channels) {
    result.push({ id: channel.id, name: channel.name, level });
    if (channel.children && channel.children.length > 0) {
      result.push(...flattenChannels(channel.children, level + 1));
    }
  }
  return result;
}

function flattenTaxonomies(taxonomies: Taxonomy[], level = 0): FlatTaxonomy[] {
  const result: FlatTaxonomy[] = [];
  for (const taxon of taxonomies) {
    result.push({ id: taxon.id, name: taxon.name, level });
    if (taxon.children && taxon.children.length > 0) {
      result.push(...flattenTaxonomies(taxon.children, level + 1));
    }
  }
  return result;
}

type ExchangeFormProps = {
  exchange?: Exchange | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export function ExchangeForm({ exchange, onSuccess, onCancel }: ExchangeFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [valueStreams, setValueStreams] = useState<FlatValueStream[]>([]);
  const [channels, setChannels] = useState<FlatChannel[]>([]);
  const [taxonomies, setTaxonomies] = useState<FlatTaxonomy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: exchange?.name || "",
      purpose: exchange?.purpose || "",
      valueStreamId: exchange?.valueStreamId || "",
      channelId: exchange?.channelId || "",
      taxonId: exchange?.taxonId || "",
      leadUserId: exchange?.leadUserId || "",
    },
  });

  useEffect(() => {
    Promise.all([
      api.getUsers({ pageSize: 100 }),
      api.getValueStreams(),
      api.getChannelsTree(),
      api.getTaxonomies(),
    ])
      .then(([usersData, valueStreamsData, channelsData, taxonomiesData]) => {
        setUsers(usersData?.data || []);
        setValueStreams(flattenValueStreams(valueStreamsData || []));
        setChannels(flattenChannels(channelsData || []));
        setTaxonomies(flattenTaxonomies(taxonomiesData || []));
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const userOptions: AutocompleteOption[] = (users || []).map((user) => ({
    value: user.id,
    label: user.agent?.name || user.email,
    sublabel: user.agent?.name ? user.email : undefined,
    imageUrl: user.avatarFileId ? `${apiBaseUrl}/files/${user.avatarFileId}/thumbnail` : undefined,
  }));

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        name: data.name,
        purpose: data.purpose || undefined,
        valueStreamId: data.valueStreamId,
        channelId: data.channelId || undefined,
        taxonId: data.taxonId || undefined,
        leadUserId: data.leadUserId || undefined,
      };

      if (exchange) {
        await api.updateExchange(exchange.id, {
          name: data.name,
          purpose: data.purpose || null,
          channelId: data.channelId || null,
          taxonId: data.taxonId || null,
          leadUserId: data.leadUserId || null,
        });
        toast.success("Exchange updated successfully");
      } else {
        await api.createExchange(payload);
        toast.success("Exchange created successfully");
      }
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save exchange";
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
                <Input placeholder="e.g., Software License Agreement Q1" {...field} />
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
                  placeholder="Brief purpose of this exchange"
                  {...field}
                />
              </FormControl>
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
                      <span style={{ paddingLeft: `${stream.level * 12}px` }}>
                        {stream.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The value stream this exchange belongs to</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="channelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel (optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "_none" ? "" : value)}
                value={field.value || "_none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">No channel</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <span style={{ paddingLeft: `${channel.level * 12}px` }}>
                        {channel.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The channel through which this exchange occurs</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxonId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taxonomy (optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "_none" ? "" : value)}
                value={field.value || "_none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a taxonomy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">No taxonomy</SelectItem>
                  {taxonomies.map((taxon) => (
                    <SelectItem key={taxon.id} value={taxon.id}>
                      <span style={{ paddingLeft: `${taxon.level * 12}px` }}>
                        {taxon.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Classification of this exchange</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leadUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead User (optional)</FormLabel>
              <FormControl>
                <Autocomplete
                  options={userOptions}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Search for a lead user..."
                />
              </FormControl>
              <FormDescription>Who is responsible for this exchange</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : exchange ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
