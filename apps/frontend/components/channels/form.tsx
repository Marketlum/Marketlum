"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { toast } from "sonner"
import axios from "axios"

import api from "@/lib/api-sdk"

const channelTypes = [
  { value: "website", label: "Website" },
  { value: "web_app", label: "Web App" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "marketplace", label: "Marketplace" },
  { value: "social_media", label: "Social Media" },
  { value: "messaging", label: "Messaging" },
  { value: "email", label: "Email" },
  { value: "paid_ads", label: "Paid Ads" },
  { value: "partner", label: "Partner" },
  { value: "retail_store", label: "Retail Store" },
  { value: "event", label: "Event" },
  { value: "field_sales", label: "Field Sales" },
  { value: "print", label: "Print" },
  { value: "b2b_outbound", label: "B2B Outbound" },
  { value: "b2b_inbound", label: "B2B Inbound" },
  { value: "other", label: "Other" },
] as const

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }).max(120, {
    message: "Name must be at most 120 characters.",
  }),
  purpose: z.string().max(500, {
    message: "Purpose must be at most 500 characters.",
  }).optional(),
  type: z.enum([
    "website", "web_app", "mobile_app", "marketplace", "social_media",
    "messaging", "email", "paid_ads", "partner", "retail_store",
    "event", "field_sales", "print", "b2b_outbound", "b2b_inbound", "other"
  ], {
    required_error: "Please select a channel type.",
  }),
  parentId: z.string().optional(),
})

type Channel = {
  id: string
  name: string
  purpose?: string
  type: string
  parentId?: string
}

type ChannelFormProps = {
  channel?: Channel
  parentId?: string
  onFormSubmit: () => void
  onCancel?: () => void
}

export function ChannelForm({ channel, parentId, onFormSubmit, onCancel }: ChannelFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!channel

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: channel?.name || "",
      purpose: channel?.purpose || "",
      type: (channel?.type as z.infer<typeof formSchema>["type"]) || "website",
      parentId: channel?.parentId || parentId || undefined,
    },
  })

  const onSubmit = async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      if (isEditing) {
        await api.updateChannel(channel.id, {
          name: values.name,
          purpose: values.purpose,
          type: values.type,
        })
        toast.success("Channel updated successfully.")
      } else {
        await api.createChannel({
          name: values.name,
          purpose: values.purpose,
          type: values.type,
          parentId: values.parentId,
        })
        toast.success("Channel created successfully.")
      }

      onFormSubmit()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error(isEditing ? "Failed to update channel." : "Failed to create channel.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{isEditing ? "Edit channel" : "Create a new channel"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Update the channel's information."
                : "Add a new channel to reach your market."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Name of the channel"
                      data-testid="channel-form-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="channel-form-type">
                        <SelectValue placeholder="Select channel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channelTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="The purpose or goal of this channel..."
                      data-testid="channel-form-purpose"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button type="submit" data-testid="channel-form-submit">
                {isLoading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Create")}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

export { channelTypes }
