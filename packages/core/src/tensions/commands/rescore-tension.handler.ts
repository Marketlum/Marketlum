import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionEventType } from '@marketlum/shared';
import { TensionCommandRunner } from '../tension-command.runner';
import { RescoreTensionCommand } from './rescore-tension.command';

@CommandHandler(RescoreTensionCommand)
export class RescoreTensionHandler implements ICommandHandler<RescoreTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: RescoreTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) =>
      state.score === command.score
        ? []
        : [
            {
              type: TensionEventType.RESCORED,
              payload: { score: command.score, previousScore: state.score },
            },
          ],
    );
  }
}
