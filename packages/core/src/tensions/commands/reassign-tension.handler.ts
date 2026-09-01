import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TensionEventType } from '@marketlum/shared';
import { Actor } from '../../actors/entities/actor.entity';
import { TensionCommandRunner } from '../tension-command.runner';
import { ReassignTensionCommand } from './reassign-tension.command';

@CommandHandler(ReassignTensionCommand)
export class ReassignTensionHandler implements ICommandHandler<ReassignTensionCommand> {
  constructor(
    private readonly runner: TensionCommandRunner,
    @InjectRepository(Actor) private readonly actors: Repository<Actor>,
  ) {}

  async execute(command: ReassignTensionCommand): Promise<void> {
    const actor = await this.actors.findOne({ where: { id: command.actorId } });
    if (!actor) throw new NotFoundException('Actor not found');

    await this.runner.amend(command.id, (state) =>
      state.actorId === command.actorId
        ? []
        : [
            {
              type: TensionEventType.REASSIGNED,
              payload: { actorId: command.actorId, previousActorId: state.actorId },
            },
          ],
    );
  }
}
