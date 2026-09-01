import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionCommandRunner } from '../tension-command.runner';
import { transitionEvent } from '../tension.aggregate';
import { DropTensionCommand } from './drop-tension.command';

@CommandHandler(DropTensionCommand)
export class DropTensionHandler implements ICommandHandler<DropTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: DropTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) => [
      { type: transitionEvent(state, 'drop'), payload: {} },
    ]);
  }
}
