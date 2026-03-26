'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { TensionResponse, CreateTensionInput, AgentResponse, UserResponse, CreateAgentInput } from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MarkdownEditor } from '../shared/markdown-editor';
import { AgentFormDialog } from '../agents/agent-form-dialog';
import { api } from '../../lib/api-client';

interface TensionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTensionInput) => void;
  tension?: TensionResponse | null;
  isSubmitting: boolean;
  agents: AgentResponse[];
  users: UserResponse[];
  onAgentsRefresh?: () => void;
}

export function TensionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  tension,
  isSubmitting,
  agents,
  users,
  onAgentsRefresh,
}: TensionFormDialogProps) {
  const t = useTranslations('tensions');
  const tc = useTranslations('common');
  const ta = useTranslations('agents');

  const [name, setName] = useState('');
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [currentContext, setCurrentContext] = useState('');
  const [potentialFuture, setPotentialFuture] = useState('');
  const [agentId, setAgentId] = useState('');
  const [leadUserId, setLeadUserId] = useState('none');
  const [score, setScore] = useState(5);

  useEffect(() => {
    if (open) {
      if (tension) {
        setName(tension.name);
        setCurrentContext(tension.currentContext ?? '');
        setPotentialFuture(tension.potentialFuture ?? '');
        setAgentId(tension.agent?.id ?? '');
        setLeadUserId(tension.lead?.id ?? 'none');
        setScore(tension.score);
      } else {
        setName('');
        setCurrentContext('');
        setPotentialFuture('');
        setAgentId('');
        setLeadUserId('none');
        setScore(5);
      }
    }
  }, [open, tension]);

  const handleCreateAgent = async (data: CreateAgentInput) => {
    setIsCreatingAgent(true);
    try {
      const created = await api.post<AgentResponse>('/agents', data);
      toast.success(ta('created'));
      setCreateAgentOpen(false);
      setAgentId(created.id);
      onAgentsRefresh?.();
    } catch {
      toast.error(ta('failedToCreate'));
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleSubmit = () => {
    const input: CreateTensionInput = {
      name,
      agentId,
      score,
      currentContext: currentContext || null,
      potentialFuture: potentialFuture || null,
      leadUserId: leadUserId === 'none' ? null : leadUserId,
    };
    onSubmit(input);
  };

  const isEditing = !!tension;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTension') : t('createTension')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label>{tc('name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>{t('agent')}</Label>
            <div className="flex gap-2">
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('selectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setCreateAgentOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('lead')}</Label>
            <Select value={leadUserId} onValueChange={setLeadUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectLead')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc('none')}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('score')} ({score})</Label>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('currentContext')}</Label>
            <MarkdownEditor value={currentContext} onChange={setCurrentContext} />
          </div>

          <div className="space-y-1">
            <Label>{t('potentialFuture')}</Label>
            <MarkdownEditor value={potentialFuture} onChange={setPotentialFuture} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name || !agentId}>
            {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AgentFormDialog
        open={createAgentOpen}
        onOpenChange={setCreateAgentOpen}
        onSubmit={handleCreateAgent}
        isSubmitting={isCreatingAgent}
      />
    </Dialog>
  );
}
