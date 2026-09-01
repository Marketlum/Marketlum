import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionEventType } from '@marketlum/shared';
import { TensionCommandRunner } from '../tension-command.runner';
import { RenameTensionCommand } from './rename-tension.command';

@CommandHandler(RenameTensionCommand)
export class RenameTensionHandler implements ICommandHandler<RenameTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: RenameTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) =>
      state.name === command.name
        ? [] // no-op: an unchanged rename records no fact
        : [
            {
              type: TensionEventType.RENAMED,
              payload: { name: command.name, previousName: state.name },
            },
          ],
    );
  }
}
