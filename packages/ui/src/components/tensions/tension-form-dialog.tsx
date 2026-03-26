'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { TensionResponse, CreateTensionInput, AgentResponse, UserResponse } from '@marketlum/shared';
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

interface TensionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTensionInput) => void;
  tension?: TensionResponse | null;
  isSubmitting: boolean;
  agents: AgentResponse[];
  users: UserResponse[];
}

export function TensionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  tension,
  isSubmitting,
  agents,
  users,
}: TensionFormDialogProps) {
  const t = useTranslations('tensions');
  const tc = useTranslations('common');

  const [name, setName] = useState('');
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
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
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
    </Dialog>
  );
}
