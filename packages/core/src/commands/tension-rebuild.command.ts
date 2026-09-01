import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { TensionRebuildService } from '../tensions/tension-rebuild.service';

interface TensionRebuildOptions {
  execute?: boolean;
}

/**
 * Replays the tension event streams and reconciles the `tensions` projection
 * (spec 027 Q18). Dry-run by default, matching `audit:prune` — a destructive
 * full-table reconciliation should take deliberate typing.
 */
@Command({
  name: 'tension:rebuild',
  description: 'Rebuild the tensions projection from the event store',
})
export class TensionRebuildCommand extends CommandRunner {
  private readonly logger = new Logger('TensionRebuild');

  constructor(private readonly rebuildService: TensionRebuildService) {
    super();
  }

  async run(_params: string[], options: TensionRebuildOptions): Promise<void> {
    const execute = Boolean(options.execute);
    const report = await this.rebuildService.rebuild({ execute });

    const summary =
      `${report.streamsReplayed} stream(s) replayed — ` +
      `${report.inserted} inserted, ${report.updated} updated, ` +
      `${report.unchanged} unchanged, ${report.deleted} deleted.`;

    if (report.orphanRowIds.length > 0) {
      this.logger.warn(
        `${report.orphanRowIds.length} projection row(s) had no event stream: ` +
          report.orphanRowIds.join(', '),
      );
    }

    if (execute) {
      this.logger.log(summary);
    } else {
      this.logger.log(`Dry run: ${summary} Pass --execute to apply.`);
    }
  }

  @Option({ flags: '--execute', description: 'Apply the rebuild (default is a dry run)' })
  parseExecute(): boolean {
    return true;
  }
}
