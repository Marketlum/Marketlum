import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionCommandRunner } from '../tension-command.runner';
import { transitionEvent } from '../tension.aggregate';
import { ResolveTensionCommand } from './resolve-tension.command';

@CommandHandler(ResolveTensionCommand)
export class ResolveTensionHandler implements ICommandHandler<ResolveTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: ResolveTensionCommand): Promise<void> {
    await this.runner.amend(command.id, (state) => [
      { type: transitionEvent(state, 'resolve'), payload: {} },
    ]);
  }
}
