import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

interface AuditPruneOptions {
  before?: string;
  execute?: boolean;
  force?: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Prunes audit entries older than a date (spec 026 Q6/Q22). Dry-run by
 * default; --execute deletes; dates less than 30 days in the past require
 * --force — destroying audit history should take deliberate typing.
 */
@Command({ name: 'audit:prune', description: 'Prune audit entries older than a date' })
export class AuditPruneCommand extends CommandRunner {
  private readonly logger = new Logger('AuditPrune');

  constructor(private readonly auditService: AuditService) {
    super();
  }

  async run(_params: string[], options: AuditPruneOptions): Promise<void> {
    if (!options.before) {
      this.logger.error('Missing --before <ISO date>');
      process.exitCode = 1;
      return;
    }
    const before = new Date(options.before);
    if (Number.isNaN(before.getTime())) {
      this.logger.error(`Not a date: "${options.before}"`);
      process.exitCode = 1;
      return;
    }
    if (Date.now() - before.getTime() < THIRTY_DAYS_MS && !options.force) {
      this.logger.error(
        `Refusing to prune entries newer than 30 days (${before.toISOString()}); pass --force to override.`,
      );
      process.exitCode = 1;
      return;
    }

    const count = await this.auditService.countBefore(before);
    if (!options.execute) {
      this.logger.log(
        `Dry run: ${count} audit entries older than ${before.toISOString()} would be deleted. Pass --execute to delete.`,
      );
      return;
    }
    const deleted = await this.auditService.pruneBefore(before);
    this.logger.log(`Deleted ${deleted} audit entries older than ${before.toISOString()}.`);
  }

  @Option({ flags: '--before <date>', description: 'Delete entries created before this ISO date' })
  parseBefore(value: string): string {
    return value;
  }

  @Option({ flags: '--execute', description: 'Actually delete (default is a dry run)' })
  parseExecute(): boolean {
    return true;
  }

  @Option({ flags: '--force', description: 'Allow dates less than 30 days in the past' })
  parseForce(): boolean {
    return true;
  }
}
