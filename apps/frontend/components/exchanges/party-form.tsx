"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import api from "@/lib/api-sdk";

type Agent = {
  id: string;
  name: string;
  type: string;
};

type PartyFormProps = {
  exchangeId: string;
  existingPartyAgentIds: string[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function PartyForm({ exchangeId, existingPartyAgentIds, onSuccess, onCancel }: PartyFormProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getAgents(1, 100)
      .then((data) => setAgents(data.items))
      .catch((error) => {
        console.error("Error fetching agents:", error);
        toast.error("Failed to load agents");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Filter out already added agents
  const availableAgents = agents.filter((a) => !existingPartyAgentIds.includes(a.id));

  const agentOptions: AutocompleteOption[] = availableAgents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    sublabel: agent.type,
  }));

  const handleSubmit = async () => {
    if (!selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    try {
      setIsSubmitting(true);
      // Get current parties and add new one
      const newParties = [
        ...existingPartyAgentIds.map((agentId) => ({ agentId })),
        { agentId: selectedAgentId },
      ];
      await api.setExchangeParties(exchangeId, newParties);
      toast.success("Party added successfully");
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to add party";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  if (availableAgents.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-center text-muted-foreground py-4">
          All available agents have already been added as parties.
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Agent</label>
        <Autocomplete
          options={agentOptions}
          value={selectedAgentId}
          onChange={setSelectedAgentId}
          placeholder="Search for an agent..."
        />
        <p className="text-sm text-muted-foreground">
          Choose an agent to add as a party to this exchange.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !selectedAgentId}>
          {isSubmitting ? "Adding..." : "Add Party"}
        </Button>
      </div>
    </div>
  );
}
