import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionCommandRunner } from '../tension-command.runner';
import { transitionEvent } from '../tension.aggregate';
import { ReopenTensionCommand } from './reopen-tension.command';

@CommandHandler(ReopenTensionCommand)
export class ReopenTensionHandler implements ICommandHandler<ReopenTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: ReopenTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) => [
      { type: transitionEvent(state, 'reopen'), payload: {} },
    ]);
  }
}
