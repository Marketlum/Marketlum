import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TensionEventType } from '@marketlum/shared';
import { TensionCommandRunner } from '../tension-command.runner';
import { DiscardTensionCommand } from './discard-tension.command';

@CommandHandler(DiscardTensionCommand)
export class DiscardTensionHandler implements ICommandHandler<DiscardTensionCommand> {
  constructor(private readonly runner: TensionCommandRunner) {}

  /**
   * The stream is retained forever; only the projection row goes, which nulls
   * `exchanges.tensionId` exactly as the pre-027 delete did (spec 027 Q6).
   */
  async execute(command: DiscardTensionCommand): Promise<void> {
    await this.runner.amend(command.id, () => [
      { type: TensionEventType.DISCARDED, payload: {} },
    ]);
  }
}
