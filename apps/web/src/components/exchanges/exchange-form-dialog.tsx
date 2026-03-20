'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import type { CreateExchangeInput } from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgents } from '@/hooks/use-agents';
import { useValueStreams } from '@/hooks/use-value-streams';
import { useUsers } from '@/hooks/use-users';

interface PartyRow {
  agentId: string;
  role: string;
}

interface ExchangeData {
  id: string;
  name: string;
  purpose: string;
  description: string | null;
  valueStream: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  pipeline: { id: string; name: string; color: string } | null;
  state: string;
  openedAt: string;
  completedAt: string | null;
  link: string | null;
  lead: { id: string; name: string } | null;
  parties: { id: string; agent: { id: string; name: string }; role: string }[];
}

interface ExchangeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateExchangeInput) => Promise<void>;
  exchange?: ExchangeData | null;
  isSubmitting?: boolean;
  channels?: { id: string; name: string }[];
  pipelines?: { id: string; name: string; color: string }[];
}

export function ExchangeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  exchange,
  isSubmitting,
  channels = [],
  pipelines = [],
}: ExchangeFormDialogProps) {
  const isEditing = !!exchange;
  const t = useTranslations('exchanges');
  const tc = useTranslations('common');
  const { agents } = useAgents(open);
  const { valueStreams } = useValueStreams(open);
  const { users } = useUsers(open);

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [valueStreamId, setValueStreamId] = useState<string>('none');
  const [channelId, setChannelId] = useState<string>('none');
  const [pipelineId, setPipelineId] = useState<string>('none');
  const [leadUserId, setLeadUserId] = useState<string>('none');
  const [parties, setParties] = useState<PartyRow[]>([
    { agentId: '', role: '' },
    { agentId: '', role: '' },
  ]);

  useEffect(() => {
    if (open && exchange) {
      setName(exchange.name);
      setPurpose(exchange.purpose);
      setDescription(exchange.description ?? '');
      setLink(exchange.link ?? '');
      setValueStreamId(exchange.valueStream?.id ?? 'none');
      setChannelId(exchange.channel?.id ?? 'none');
      setPipelineId(exchange.pipeline?.id ?? 'none');
      setLeadUserId(exchange.lead?.id ?? 'none');
      setParties(
        exchange.parties.map((p) => ({
          agentId: p.agent.id,
          role: p.role,
        })),
      );
    } else if (open) {
      setName('');
      setPurpose('');
      setDescription('');
      setLink('');
      setValueStreamId('none');
      setChannelId('none');
      setPipelineId('none');
      setLeadUserId('none');
      setParties([
        { agentId: '', role: '' },
        { agentId: '', role: '' },
      ]);
    }
  }, [open, exchange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name,
      purpose,
      parties: parties.filter((p) => p.agentId && p.role),
    };
    if (description) body.description = description;
    if (link) body.link = link;
    body.valueStreamId = valueStreamId !== 'none' ? valueStreamId : null;
    body.channelId = channelId !== 'none' ? channelId : null;
    body.pipelineId = pipelineId !== 'none' ? pipelineId : null;
    body.leadUserId = leadUserId !== 'none' ? leadUserId : null;
    await onSubmit(body as CreateExchangeInput);
  };

  const addParty = () => {
    setParties([...parties, { agentId: '', role: '' }]);
  };

  const removeParty = (index: number) => {
    if (parties.length <= 2) return;
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: 'agentId' | 'role', value: string) => {
    setParties(parties.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editExchange') : t('createExchange')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>{tc('name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>{t('purpose')}</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>{t('descriptionLabel')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('link')}</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>{t('valueStream')}</Label>
            <Select value={valueStreamId} onValueChange={setValueStreamId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectValueStream')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">&mdash;</SelectItem>
                {valueStreams.map((vs) => (
                  <SelectItem key={vs.id} value={vs.id}>{vs.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('channel')}</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">&mdash;</SelectItem>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('pipeline')}</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectPipeline')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">&mdash;</SelectItem>
                {pipelines.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pl.color }} />
                      {pl.name}
                    </span>
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
                <SelectItem value="none">&mdash;</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('parties')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParty}>
                <Plus className="mr-1 h-3 w-3" /> {t('addParty')}
              </Button>
            </div>
            {parties.map((party, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={party.agentId} onValueChange={(v) => updateParty(index, 'agentId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectAgent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder={t('role')}
                    value={party.role}
                    onChange={(e) => updateParty(index, 'role', e.target.value)}
                  />
                </div>
                {parties.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeParty(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
