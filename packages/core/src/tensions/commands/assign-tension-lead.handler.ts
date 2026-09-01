import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TensionEventType } from '@marketlum/shared';
import { User } from '../../users/entities/user.entity';
import { TensionCommandRunner } from '../tension-command.runner';
import { AssignTensionLeadCommand } from './assign-tension-lead.command';

@CommandHandler(AssignTensionLeadCommand)
export class AssignTensionLeadHandler implements ICommandHandler<AssignTensionLeadCommand> {
  constructor(
    private readonly runner: TensionCommandRunner,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async execute(command: AssignTensionLeadCommand): Promise<void> {
    if (command.leadUserId) {
      const lead = await this.users.findOne({ where: { id: command.leadUserId } });
      if (!lead) throw new NotFoundException('Lead user not found');
    }

    await this.runner.amend(command.id, (state) => {
      if (state.leadUserId === command.leadUserId) return [];

      // A null lead is an unassignment, which is its own fact.
      if (command.leadUserId === null) {
        return [
          {
            type: TensionEventType.LEAD_UNASSIGNED,
            payload: { previousLeadUserId: state.leadUserId },
          },
        ];
      }
      return [
        {
          type: TensionEventType.LEAD_ASSIGNED,
          payload: { leadUserId: command.leadUserId, previousLeadUserId: state.leadUserId },
        },
      ];
    });
  }
}
