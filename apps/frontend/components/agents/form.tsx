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
import { useState, useEffect } from "react"
import { toast } from "sonner"

import api from "@/lib/api-sdk"
import { Geography } from "@/components/geographies/types"

const agentTypes = [
  { value: "individual", label: "Individual" },
  { value: "organization", label: "Organization" },
  { value: "virtual", label: "Virtual" },
] as const

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  type: z.enum(["individual", "organization", "virtual"], {
    required_error: "Please select an agent type.",
  }),
  geographyId: z.string().optional(),
})

type AgentFormProps = {
  agent?: { id: string; name: string; type: string; geographyId?: string }
  onFormSubmit: () => void
}

// Flatten geography tree for select options
function flattenGeographies(geographies: Geography[], level = 0): { id: string; name: string; level: number; code: string }[] {
  const result: { id: string; name: string; level: number; code: string }[] = []
  for (const geo of geographies) {
    result.push({ id: geo.id, name: geo.name, level, code: geo.code })
    if (geo.children && geo.children.length > 0) {
      result.push(...flattenGeographies(geo.children, level + 1))
    }
  }
  return result
}

export function AgentForm({ agent, onFormSubmit }: AgentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [geographies, setGeographies] = useState<{ id: string; name: string; level: number; code: string }[]>([])
  const isEditing = !!agent

  useEffect(() => {
    api.getGeographiesTree()
      .then((data) => setGeographies(flattenGeographies(data)))
      .catch((error) => console.error("Error fetching geographies:", error))
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: agent?.name || "",
      type: (agent?.type as "individual" | "organization" | "virtual") || "organization",
      geographyId: agent?.geographyId || "",
    },
  })

  const onSubmit = async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      const geographyId = values.geographyId || undefined

      if (isEditing) {
        await api.updateAgent(agent.id, {
          name: values.name,
          type: values.type,
          geographyId: geographyId || null,
        })
        toast.success("Agent updated successfully.")
      } else {
        await api.createAgent({
          name: values.name,
          type: values.type,
          geographyId,
        })
        toast.success("Agent created successfully.")
      }

      onFormSubmit()
    } catch (error) {
      toast.error(isEditing ? "Failed to update agent." : "Failed to create agent.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{isEditing ? "Edit agent" : "Create a new agent"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Update the agent's information."
                : "Add a new individual, organization, or virtual agent to your market."}
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
                      placeholder="Name of the agent"
                      data-testid="agent-form-name"
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
                      <SelectTrigger data-testid="agent-form-type">
                        <SelectValue placeholder="Select agent type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agentTypes.map((type) => (
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
              name="geographyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geography (optional)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "_none" ? "" : value)} defaultValue={field.value || "_none"}>
                    <FormControl>
                      <SelectTrigger data-testid="agent-form-geography">
                        <SelectValue placeholder="Select geography" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {geographies.map((geo) => (
                        <SelectItem key={geo.id} value={geo.id}>
                          <span style={{ paddingLeft: `${geo.level * 12}px` }}>
                            {geo.name} ({geo.code})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="submit" data-testid="agent-form-submit">
              {isLoading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Create")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
