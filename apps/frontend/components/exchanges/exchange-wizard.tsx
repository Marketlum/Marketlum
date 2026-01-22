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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { Stepper, Step } from "@/components/ui/stepper";
import { toast } from "sonner";
import { Exchange, ExchangeParty, ExchangeFlow } from "./types";
import { Trash2, Plus, Edit, ArrowRight, UserPlus } from "lucide-react";
import api from "@/lib/api-sdk";
import { ValueTypeBadge } from "@/components/value/value-type-badge";
import { ValueType } from "@/components/value/types";

const AGENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "organization", label: "Organization" },
  { value: "virtual", label: "Virtual" },
] as const;

// Schema for creating a new agent
const newAgentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be at most 200 characters"),
  type: z.enum(["individual", "organization", "virtual"], {
    required_error: "Please select an agent type",
  }),
});

type NewAgentFormData = z.infer<typeof newAgentSchema>;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Step 1 Schema - Basic Information
const basicInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be at most 200 characters"),
  purpose: z.string().max(500, "Purpose must be at most 500 characters").optional(),
  valueStreamId: z.string().uuid("Please select a value stream"),
  channelId: z.string().uuid().optional().or(z.literal("")),
  taxonId: z.string().uuid().optional().or(z.literal("")),
  leadUserId: z.string().uuid().optional().or(z.literal("")),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

// Step 3 Schema - Flow Form
const flowSchema = z.object({
  fromPartyAgentId: z.string().uuid("Please select a source party"),
  toPartyAgentId: z.string().uuid("Please select a destination party"),
  valueId: z.string().uuid("Please select a value"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  note: z.string().max(2000, "Note must be at most 2000 characters").optional(),
}).refine((data) => data.fromPartyAgentId !== data.toPartyAgentId, {
  message: "Source and destination parties must be different",
  path: ["toPartyAgentId"],
});

type FlowFormData = z.infer<typeof flowSchema>;

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

type Value = {
  id: string;
  name: string;
  type: string;
};

type FlatItem = {
  id: string;
  name: string;
  level: number;
};

function flattenTree<T extends { id: string; name: string; children?: T[] }>(
  items: T[],
  level = 0
): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    result.push({ id: item.id, name: item.name, level });
    if (item.children && item.children.length > 0) {
      result.push(...flattenTree(item.children, level + 1));
    }
  }
  return result;
}

const STEPS: Step[] = [
  { id: 1, label: "Basic Info", description: "Name, purpose, and settings" },
  { id: 2, label: "Parties", description: "Add participating agents" },
  { id: 3, label: "Flows", description: "Define value exchanges" },
];

type ExchangeWizardProps = {
  exchange?: Exchange | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ExchangeWizard({ exchange, onSuccess, onCancel }: ExchangeWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [createdExchange, setCreatedExchange] = useState<Exchange | null>(exchange || null);

  // Data loading states
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [valueStreams, setValueStreams] = useState<FlatItem[]>([]);
  const [channels, setChannels] = useState<FlatItem[]>([]);
  const [taxonomies, setTaxonomies] = useState<FlatItem[]>([]);
  const [values, setValues] = useState<Value[]>([]);

  // Step 2 - Parties state
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Step 3 - Flows state
  const [editingFlow, setEditingFlow] = useState<ExchangeFlow | null>(null);
  const [isAddingFlow, setIsAddingFlow] = useState(false);

  // Step 1 Form
  const basicInfoForm = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: exchange?.name || "",
      purpose: exchange?.purpose || "",
      valueStreamId: exchange?.valueStreamId || "",
      channelId: exchange?.channelId || "",
      taxonId: exchange?.taxonId || "",
      leadUserId: exchange?.leadUserId || "",
    },
  });

  // Step 2 New Agent Form
  const newAgentForm = useForm<NewAgentFormData>({
    resolver: zodResolver(newAgentSchema),
    defaultValues: {
      name: "",
      type: "organization",
    },
  });

  // Step 3 Flow Form
  const flowForm = useForm<FlowFormData>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      fromPartyAgentId: "",
      toPartyAgentId: "",
      valueId: "",
      quantity: 1,
      note: "",
    },
  });

  // Check if exchange is editable
  const isEditable = !exchange || exchange.state === "open";

  // Load all required data
  useEffect(() => {
    Promise.all([
      api.getUsers({ pageSize: 100 }),
      api.getAgents(1, 100),
      api.getValueStreams(),
      api.getChannelsTree(),
      api.getTaxonomies(),
      api.getValuesList(1, 100),
    ])
      .then(([usersData, agentsData, streamsData, channelsData, taxData, valuesData]) => {
        setUsers(usersData?.data || []);
        setAgents(agentsData?.items || []);
        setValueStreams(flattenTree(streamsData || []));
        setChannels(flattenTree(channelsData || []));
        setTaxonomies(flattenTree(taxData || []));
        setValues(valuesData?.items || []);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Refresh exchange data
  const refreshExchange = async () => {
    if (!createdExchange?.id) return;
    try {
      const updated = await api.getExchange(createdExchange.id);
      setCreatedExchange(updated);
    } catch (error) {
      console.error("Error refreshing exchange:", error);
    }
  };

  // User options for autocomplete
  const userOptions: AutocompleteOption[] = users.map((user) => ({
    value: user.id,
    label: user.agent?.name || user.email,
    sublabel: user.agent?.name ? user.email : undefined,
    imageUrl: user.avatarFileId ? `${apiBaseUrl}/files/${user.avatarFileId}/thumbnail` : undefined,
  }));

  // Agent options (excluding already added parties)
  const partyAgentIds = createdExchange?.parties?.map((p) => p.agentId) || [];
  const availableAgents = agents.filter((a) => !partyAgentIds.includes(a.id));
  const agentOptions: AutocompleteOption[] = availableAgents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    sublabel: agent.type,
  }));

  // Value options for flow form
  const valueOptions: AutocompleteOption[] = values.map((v) => ({
    value: v.id,
    label: v.name,
    sublabel: v.type,
  }));

  // Step 1: Handle basic info submission
  const handleBasicInfoSubmit = async (data: BasicInfoFormData) => {
    try {
      const payload = {
        name: data.name,
        purpose: data.purpose || undefined,
        valueStreamId: data.valueStreamId,
        channelId: data.channelId || undefined,
        taxonId: data.taxonId || undefined,
        leadUserId: data.leadUserId || undefined,
      };

      if (createdExchange) {
        // Update existing exchange
        await api.updateExchange(createdExchange.id, {
          name: data.name,
          purpose: data.purpose || null,
          channelId: data.channelId || null,
          taxonId: data.taxonId || null,
          leadUserId: data.leadUserId || null,
        });
        toast.success("Exchange updated");
        await refreshExchange();
      } else {
        // Create new exchange
        const newExchange = await api.createExchange(payload);
        setCreatedExchange(newExchange);
        toast.success("Exchange created");
      }
      setCurrentStep(2);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to save exchange";
      toast.error(message);
    }
  };

  // Step 2: Add party
  const handleAddParty = async () => {
    if (!selectedAgentId || !createdExchange) return;

    try {
      setIsAddingParty(true);
      const newParties = [
        ...partyAgentIds.map((agentId) => ({ agentId })),
        { agentId: selectedAgentId },
      ];
      await api.setExchangeParties(createdExchange.id, newParties);
      toast.success("Party added");
      setSelectedAgentId("");
      await refreshExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to add party");
    } finally {
      setIsAddingParty(false);
    }
  };

  // Step 2: Remove party
  const handleRemoveParty = async (agentId: string) => {
    if (!createdExchange) return;

    try {
      const newParties = partyAgentIds
        .filter((id) => id !== agentId)
        .map((id) => ({ agentId: id }));
      await api.setExchangeParties(createdExchange.id, newParties);
      toast.success("Party removed");
      await refreshExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to remove party");
    }
  };

  // Step 2: Create new agent and add as party
  const handleCreateAgent = async (data: NewAgentFormData) => {
    if (!createdExchange) return;

    try {
      setIsCreatingAgent(true);
      // Create the agent
      const newAgent = await api.createAgent({
        name: data.name,
        type: data.type,
      });
      // Add the new agent to the agents list
      setAgents((prev) => [...prev, newAgent]);
      // Add the new agent as a party
      const newParties = [
        ...partyAgentIds.map((agentId) => ({ agentId })),
        { agentId: newAgent.id },
      ];
      await api.setExchangeParties(createdExchange.id, newParties);
      toast.success(`Agent "${newAgent.name}" created and added as party`);
      newAgentForm.reset();
      setShowCreateAgent(false);
      await refreshExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to create agent");
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // Step 3: Handle flow submission
  const handleFlowSubmit = async (data: FlowFormData) => {
    if (!createdExchange) return;

    try {
      const payload = {
        fromPartyAgentId: data.fromPartyAgentId,
        toPartyAgentId: data.toPartyAgentId,
        valueId: data.valueId,
        quantity: data.quantity,
        note: data.note || undefined,
      };

      if (editingFlow) {
        await api.updateExchangeFlow(createdExchange.id, editingFlow.id, {
          ...payload,
          note: data.note || null,
        });
        toast.success("Flow updated");
      } else {
        await api.createExchangeFlow(createdExchange.id, payload);
        toast.success("Flow added");
      }

      flowForm.reset({ fromPartyAgentId: "", toPartyAgentId: "", valueId: "", quantity: 1, note: "" });
      setEditingFlow(null);
      setIsAddingFlow(false);
      await refreshExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to save flow");
    }
  };

  // Step 3: Edit flow
  const handleEditFlow = (flow: ExchangeFlow) => {
    setEditingFlow(flow);
    setIsAddingFlow(true);
    flowForm.reset({
      fromPartyAgentId: flow.fromPartyAgentId,
      toPartyAgentId: flow.toPartyAgentId,
      valueId: flow.valueId,
      quantity: flow.quantity ?? 1,
      note: flow.note || "",
    });
  };

  // Step 3: Remove flow
  const handleRemoveFlow = async (flowId: string) => {
    if (!createdExchange) return;

    try {
      await api.removeExchangeFlow(createdExchange.id, flowId);
      toast.success("Flow removed");
      await refreshExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to remove flow");
    }
  };

  const handleStepClick = (step: number) => {
    // Can only go back or stay on current step (unless exchange exists)
    if (step < currentStep || createdExchange) {
      setCurrentStep(step);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!isEditable) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          This exchange is {exchange?.state} and cannot be edited.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={createdExchange ? handleStepClick : undefined}
      />

      <div className="min-h-[400px]">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Form {...basicInfoForm}>
            <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-4">
              <FormField
                control={basicInfoForm.control}
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
                control={basicInfoForm.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief purpose of this exchange" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={basicInfoForm.control}
                name="valueStreamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Stream</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={basicInfoForm.control}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={basicInfoForm.control}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={basicInfoForm.control}
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

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={basicInfoForm.formState.isSubmitting}>
                  {basicInfoForm.formState.isSubmitting ? "Saving..." : "Next: Add Parties"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2: Parties */}
        {currentStep === 2 && createdExchange && (
          <div className="space-y-4">
            {showCreateAgent ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-4">Create New Agent</h4>
                <Form {...newAgentForm}>
                  <form onSubmit={newAgentForm.handleSubmit(handleCreateAgent)} className="space-y-4">
                    <FormField
                      control={newAgentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter agent name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newAgentForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select agent type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGENT_TYPES.map((type) => (
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
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateAgent(false);
                          newAgentForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreatingAgent}>
                        {isCreatingAgent ? "Creating..." : "Create & Add"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Add Party</label>
                  <Autocomplete
                    options={agentOptions}
                    value={selectedAgentId}
                    onChange={setSelectedAgentId}
                    placeholder="Search for an agent..."
                  />
                </div>
                <Button
                  onClick={handleAddParty}
                  disabled={!selectedAgentId || isAddingParty}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isAddingParty ? "Adding..." : "Add"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateAgent(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  New Agent
                </Button>
              </div>
            )}

            {!showCreateAgent && availableAgents.length === 0 && agents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                All available agents have been added as parties. You can create a new agent.
              </p>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(createdExchange.parties?.length || 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No parties added yet. Add at least 2 parties to create flows.
                      </TableCell>
                    </TableRow>
                  ) : (
                    createdExchange.parties?.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium">{party.agent?.name || "Unknown"}</TableCell>
                        <TableCell className="text-muted-foreground">{party.agent?.type}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParty(party.agentId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={(createdExchange.parties?.length || 0) < 2}
              >
                Next: Add Flows
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Flows */}
        {currentStep === 3 && createdExchange && (
          <div className="space-y-4">
            {isAddingFlow ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-4">{editingFlow ? "Edit Flow" : "Add Flow"}</h4>
                <Form {...flowForm}>
                  <form onSubmit={flowForm.handleSubmit(handleFlowSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={flowForm.control}
                        name="fromPartyAgentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Party</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {createdExchange.parties?.map((party) => (
                                  <SelectItem key={party.agentId} value={party.agentId}>
                                    {party.agent?.name || "Unknown"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={flowForm.control}
                        name="toPartyAgentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To Party</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {createdExchange.parties?.map((party) => (
                                  <SelectItem key={party.agentId} value={party.agentId}>
                                    {party.agent?.name || "Unknown"}
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
                      control={flowForm.control}
                      name="valueId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={valueOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Search for a value..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={flowForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.0001" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={flowForm.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Additional details..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddingFlow(false);
                          setEditingFlow(null);
                          flowForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={flowForm.formState.isSubmitting}>
                        {flowForm.formState.isSubmitting ? "Saving..." : editingFlow ? "Update" : "Add Flow"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            ) : (
              <Button onClick={() => setIsAddingFlow(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Flow
              </Button>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(createdExchange.flows?.length || 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No flows added yet. Flows define how value moves between parties.
                      </TableCell>
                    </TableRow>
                  ) : (
                    createdExchange.flows?.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell>{flow.fromPartyAgent?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{flow.value?.name || "Unknown"}</span>
                            {flow.value?.type && (
                              <ValueTypeBadge type={flow.value.type as ValueType} className="text-xs" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{flow.toPartyAgent?.name || "Unknown"}</TableCell>
                        <TableCell>{flow.quantity}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFlow(flow)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFlow(flow.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button onClick={onSuccess}>
                Finish
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
