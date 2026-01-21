"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Agreement,
  AgreementCategory,
  AgreementGateway,
  AgreementPartyRole,
  CATEGORY_OPTIONS,
  GATEWAY_OPTIONS,
  PARTY_ROLE_OPTIONS,
} from "./types";
import { X, Loader2 } from "lucide-react";
import { FilePicker } from "@/components/files/file-picker";
import { FileUpload } from "@/components/files/types";
import api from "@/lib/api-sdk";

type Agent = {
  id: string;
  name: string;
  type: string;
};

type PartyInput = {
  agentId: string;
  agentName?: string;
  role?: AgreementPartyRole;
};

type AgreementFormProps = {
  agreement?: Agreement;
  parentId?: string;
  onSave: (data: {
    title: string;
    category: AgreementCategory;
    gateway: AgreementGateway;
    link?: string;
    content?: string;
    completedAt?: string | null;
    parentId?: string | null;
    fileId?: string | null;
    parties?: PartyInput[];
  }) => Promise<void>;
  onCancel: () => void;
};

export function AgreementForm({
  agreement,
  parentId,
  onSave,
  onCancel,
}: AgreementFormProps) {
  const [title, setTitle] = useState(agreement?.title || "");
  const [category, setCategory] = useState<AgreementCategory>(
    agreement?.category || "external_market"
  );
  const [gateway, setGateway] = useState<AgreementGateway>(
    agreement?.gateway || "pen_and_paper"
  );
  const [link, setLink] = useState(agreement?.link || "");
  const [content, setContent] = useState(agreement?.content || "");
  const [isCompleted, setIsCompleted] = useState(!!agreement?.completedAt);
  const [parties, setParties] = useState<PartyInput[]>(
    agreement?.parties?.map((p) => ({
      agentId: p.agentId,
      agentName: p.agent?.name,
      role: p.role,
    })) || []
  );
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(
    agreement?.file ? (agreement.file as FileUpload) : null
  );

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AgreementPartyRole | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch agents for party selection
    api.getAgents(1, 100).then((data) => {
      setAgents(data.items || []);
    });
  }, []);

  const handleAddParty = () => {
    if (!selectedAgentId) return;

    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;

    // Check if agent is already a party
    if (parties.some((p) => p.agentId === selectedAgentId)) return;

    setParties([
      ...parties,
      {
        agentId: selectedAgentId,
        agentName: agent.name,
        role: selectedRole || undefined,
      },
    ]);
    setSelectedAgentId("");
    setSelectedRole("");
  };

  const handleRemoveParty = (agentId: string) => {
    setParties(parties.filter((p) => p.agentId !== agentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave({
        title: title.trim(),
        category,
        gateway,
        link: link.trim() || undefined,
        content: content.trim() || undefined,
        completedAt: isCompleted ? new Date().toISOString() : null,
        parentId: parentId || agreement?.parentId || null,
        fileId: selectedFile?.id || null,
        parties: parties.map((p) => ({ agentId: p.agentId, role: p.role })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Agreement title"
          required
          minLength={2}
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as AgreementCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway">Gateway *</Label>
          <Select value={gateway} onValueChange={(v) => setGateway(v as AgreementGateway)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gateway" />
            </SelectTrigger>
            <SelectContent>
              {GATEWAY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link (URL)</Label>
        <Input
          id="link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content / Notes</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Additional content or notes..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Parties</Label>
        <div className="flex gap-2">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {agents
                .filter((a) => !parties.some((p) => p.agentId === a.id))
                .map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedRole || "_none"}
            onValueChange={(v) => setSelectedRole(v === "_none" ? "" : (v as AgreementPartyRole))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Role (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No role</SelectItem>
              {PARTY_ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddParty}
            disabled={!selectedAgentId}
          >
            Add
          </Button>
        </div>
        {parties.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {parties.map((party) => (
              <Badge key={party.agentId} variant="secondary" className="gap-1">
                {party.agentName}
                {party.role && (
                  <span className="text-muted-foreground">
                    ({PARTY_ROLE_OPTIONS.find((r) => r.value === party.role)?.label})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveParty(party.agentId)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Attachment</Label>
        <FilePicker
          value={selectedFile}
          onChange={setSelectedFile}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="completed"
          checked={isCompleted}
          onCheckedChange={setIsCompleted}
        />
        <Label htmlFor="completed">Mark as completed</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : agreement ? (
            "Update Agreement"
          ) : (
            "Create Agreement"
          )}
        </Button>
      </div>
    </form>
  );
}
