'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  createAgentSchema,
  updateAgentSchema,
  AgentType,
  type CreateAgentInput,
  type AgentResponse,
} from '@marketlum/shared';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTaxonomies } from '@/hooks/use-taxonomies';

const typeTranslationKeys: Record<string, string> = {
  [AgentType.ORGANIZATION]: 'typeOrganization',
  [AgentType.INDIVIDUAL]: 'typeIndividual',
  [AgentType.VIRTUAL]: 'typeVirtual',
};

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAgentInput) => Promise<void>;
  agent?: AgentResponse | null;
  isSubmitting?: boolean;
}

export function AgentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  agent,
  isSubmitting,
}: AgentFormDialogProps) {
  const isEditing = !!agent;
  const schema = isEditing ? updateAgentSchema : createAgentSchema;
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const { taxonomies } = useTaxonomies();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(schema),
  });

  const typeValue = watch('type');
  const mainTaxonomyIdValue = watch('mainTaxonomyId');
  const taxonomyIdsValue = watch('taxonomyIds') ?? [];

  const [taxonomyPopoverOpen, setTaxonomyPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      reset(
        agent
          ? {
              name: agent.name,
              type: agent.type,
              purpose: agent.purpose ?? '',
              mainTaxonomyId: agent.mainTaxonomy?.id ?? null,
              taxonomyIds: agent.taxonomies?.map((t) => t.id) ?? [],
            }
          : {
              name: '',
              type: AgentType.ORGANIZATION,
              purpose: '',
              mainTaxonomyId: null,
              taxonomyIds: [],
            },
      );
    }
  }, [open, agent, reset]);

  const toggleTaxonomyId = (id: string) => {
    const current = taxonomyIdsValue;
    if (current.includes(id)) {
      setValue(
        'taxonomyIds',
        current.filter((tid) => tid !== id),
      );
    } else {
      setValue('taxonomyIds', [...current, id]);
    }
  };

  const selectedTaxonomyNames = taxonomyIdsValue
    .map((id) => taxonomies.find((t) => t.id === id)?.name)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editAgent') : t('createAgent')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">{tc('name')}</Label>
            <Input id="agent-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{tc('type')}</Label>
            <Select
              value={typeValue}
              onValueChange={(value) => setValue('type', value as AgentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectType')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AgentType).map((agentType) => (
                  <SelectItem key={agentType} value={agentType}>
                    {t(typeTranslationKeys[agentType])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">{t('purpose')}</Label>
            <Input id="purpose" {...register('purpose')} />
            {errors.purpose && (
              <p className="text-sm text-destructive">{errors.purpose.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('mainTaxonomy')}</Label>
            <Select
              value={mainTaxonomyIdValue ?? 'none'}
              onValueChange={(value) =>
                setValue('mainTaxonomyId', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectMainTaxonomy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {taxonomies.map((tax) => (
                  <SelectItem key={tax.id} value={tax.id}>
                    {tax.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('taxonomies')}</Label>
            <Popover open={taxonomyPopoverOpen} onOpenChange={setTaxonomyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={taxonomyPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedTaxonomyNames.length > 0
                      ? selectedTaxonomyNames.join(', ')
                      : t('selectTaxonomies')}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-2" align="start">
                {taxonomies.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    {t('noTaxonomyFound')}
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {taxonomies.map((tax) => (
                      <button
                        key={tax.id}
                        type="button"
                        onClick={() => toggleTaxonomyId(tax.id)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            taxonomyIdsValue.includes(tax.id) ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {tax.name}
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
