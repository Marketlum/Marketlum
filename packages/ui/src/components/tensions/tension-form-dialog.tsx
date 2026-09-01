'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateTensionInput, ActorResponse, UserResponse, CreateActorInput } from '@marketlum/shared';
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
import { ActorFormDialog } from '../actors/actor-form-dialog';
import { api } from '../../lib/api-client';
import { Can } from '../../permissions/can';

/**
 * Create-only since spec 027 (Q20): existing tensions are edited field by field
 * on the detail page, each field dispatching its own command.
 */
interface TensionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTensionInput) => void;
  isSubmitting: boolean;
  actors: ActorResponse[];
  users: UserResponse[];
  onActorsRefresh?: () => void;
}

export function TensionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  actors,
  users,
  onActorsRefresh,
}: TensionFormDialogProps) {
  const t = useTranslations('tensions');
  const tc = useTranslations('common');
  const ta = useTranslations('actors');

  const [name, setName] = useState('');
  const [createActorOpen, setCreateActorOpen] = useState(false);
  const [isCreatingActor, setIsCreatingActor] = useState(false);
  const [currentContext, setCurrentContext] = useState('');
  const [potentialFuture, setPotentialFuture] = useState('');
  const [actorId, setActorId] = useState('');
  const [leadUserId, setLeadUserId] = useState('none');
  const [score, setScore] = useState(5);

  useEffect(() => {
    if (open) {
      setName('');
      setCurrentContext('');
      setPotentialFuture('');
      setActorId('');
      setLeadUserId('none');
      setScore(5);
    }
  }, [open]);

  const handleCreateActor = async (data: CreateActorInput) => {
    setIsCreatingActor(true);
    try {
      const created = await api.post<ActorResponse>('/actors', data);
      toast.success(ta('created'));
      setCreateActorOpen(false);
      setActorId(created.id);
      onActorsRefresh?.();
    } catch {
      toast.error(ta('failedToCreate'));
    } finally {
      setIsCreatingActor(false);
    }
  };

  const handleSubmit = () => {
    const input: CreateTensionInput = {
      name,
      actorId,
      score,
      currentContext: currentContext || null,
      potentialFuture: potentialFuture || null,
      leadUserId: leadUserId === 'none' ? null : leadUserId,
    };
    onSubmit(input);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createTension')}</DialogTitle>
          <DialogDescription>
            {t('createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label>{tc('name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>{t('actor')}</Label>
            <div className="flex gap-2">
              <Select value={actorId} onValueChange={setActorId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('selectActor')} />
                </SelectTrigger>
                <SelectContent>
                  {actors.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id}>
                      {actor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Can resource="actors" action="write">
                <Button type="button" variant="outline" size="icon" onClick={() => setCreateActorOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </Can>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || !name || !actorId}>
            {isSubmitting ? tc('saving') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ActorFormDialog
        open={createActorOpen}
        onOpenChange={setCreateActorOpen}
        onSubmit={handleCreateActor}
        isSubmitting={isCreatingActor}
      />
    </Dialog>
  );
}
