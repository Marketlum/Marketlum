'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

  useEffect(() => {
    if (open) {
      reset(
        agent
          ? { name: agent.name, type: agent.type, description: agent.description ?? '' }
          : { name: '', type: AgentType.BUYER, description: '' },
      );
    }
  }, [open, agent, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Agent' : 'Create Agent'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update agent details below.' : 'Fill in the details to create a new agent.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input id="agent-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={typeValue}
              onValueChange={(value) => setValue('type', value as AgentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AgentType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
