'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
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
import { TaxonomyTreeSelect } from '@/components/shared/taxonomy-tree-select';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';

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
  const { tree } = useTaxonomyTree();

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
            <TaxonomyTreeSelect
              tree={tree}
              value={mainTaxonomyIdValue}
              onSelect={(id) => setValue('mainTaxonomyId', id)}
              placeholder={t('selectMainTaxonomy')}
              noneLabel="-"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('taxonomies')}</Label>
            <TaxonomyTreeSelect
              tree={tree}
              multiple
              values={taxonomyIdsValue}
              onToggle={toggleTaxonomyId}
              placeholder={t('selectTaxonomies')}
            />
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
