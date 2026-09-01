import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionCommandRunner } from '../tension-command.runner';
import { transitionEvent } from '../tension.aggregate';
import { ReviveTensionCommand } from './revive-tension.command';

@CommandHandler(ReviveTensionCommand)
export class ReviveTensionHandler implements ICommandHandler<ReviveTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: ReviveTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) => [
      { type: transitionEvent(state, 'revive'), payload: {} },
    ]);
  }
}
