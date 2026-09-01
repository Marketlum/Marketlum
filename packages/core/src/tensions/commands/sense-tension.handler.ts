import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TensionEventType } from '@marketlum/shared';
import { Actor } from '../../actors/entities/actor.entity';
import { User } from '../../users/entities/user.entity';
import { TensionCommandRunner } from '../tension-command.runner';
import { SenseTensionCommand } from './sense-tension.command';

@CommandHandler(SenseTensionCommand)
export class SenseTensionHandler implements ICommandHandler<SenseTensionCommand> {
  constructor(
    private readonly runner: TensionCommandRunner,
    @InjectRepository(Actor) private readonly actors: Repository<Actor>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Returns the id of the new tension so the controller can read it back. */
  async execute(command: SenseTensionCommand): Promise<string> {
    const { input } = command;

    const actor = await this.actors.findOne({ where: { id: input.actorId } });
    if (!actor) throw new NotFoundException('Actor not found');

    const leadUserId = input.leadUserId ?? null;
    if (leadUserId) {
      const lead = await this.users.findOne({ where: { id: leadUserId } });
      if (!lead) throw new NotFoundException('Lead user not found');
    }

    const id = randomUUID();
    await this.runner.sense(id, {
      type: TensionEventType.SENSED,
      payload: {
        name: input.name,
        currentContext: input.currentContext ?? null,
        potentialFuture: input.potentialFuture ?? null,
        score: input.score ?? 5,
        actorId: input.actorId,
        leadUserId,
      },
    });
    return id;
  }
}
