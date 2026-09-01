import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionEventType } from '@marketlum/shared';
import { TensionCommandRunner } from '../tension-command.runner';
import { ReviseTensionContextCommand } from './revise-tension-context.command';

@CommandHandler(ReviseTensionContextCommand)
export class ReviseTensionContextHandler
  implements ICommandHandler<ReviseTensionContextCommand>
{
  constructor(private readonly runner: TensionCommandRunner) {}

  async execute(command: ReviseTensionContextCommand): Promise<void> {
    await this.runner.amend(command.id, (state) => {
      const payload: Record<string, unknown> = {};

      // Only fields actually supplied *and* changed reach the event.
      if (command.currentContext !== undefined && command.currentContext !== state.currentContext) {
        payload.currentContext = command.currentContext;
        payload.previousCurrentContext = state.currentContext;
      }
      if (
        command.potentialFuture !== undefined &&
        command.potentialFuture !== state.potentialFuture
      ) {
        payload.potentialFuture = command.potentialFuture;
        payload.previousPotentialFuture = state.potentialFuture;
      }

      if (Object.keys(payload).length === 0) return [];
      return [{ type: TensionEventType.CONTEXT_REVISED, payload }];
    });
  }
}
