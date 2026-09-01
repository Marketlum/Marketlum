import { SenseTensionHandler } from './sense-tension.handler';
import { RenameTensionHandler } from './rename-tension.handler';
import { RescoreTensionHandler } from './rescore-tension.handler';
import { ReviseTensionContextHandler } from './revise-tension-context.handler';
import { AssignTensionLeadHandler } from './assign-tension-lead.handler';
import { ReassignTensionHandler } from './reassign-tension.handler';
import { ResolveTensionHandler } from './resolve-tension.handler';
import { DropTensionHandler } from './drop-tension.handler';
import { ReopenTensionHandler } from './reopen-tension.handler';
import { ReviveTensionHandler } from './revive-tension.handler';
import { DiscardTensionHandler } from './discard-tension.handler';

export * from './sense-tension.command';
export * from './rename-tension.command';
export * from './rescore-tension.command';
export * from './revise-tension-context.command';
export * from './assign-tension-lead.command';
export * from './reassign-tension.command';
export * from './resolve-tension.command';
export * from './drop-tension.command';
export * from './reopen-tension.command';
export * from './revive-tension.command';
export * from './discard-tension.command';

export const TENSION_COMMAND_HANDLERS = [
  SenseTensionHandler,
  RenameTensionHandler,
  RescoreTensionHandler,
  ReviseTensionContextHandler,
  AssignTensionLeadHandler,
  ReassignTensionHandler,
  ResolveTensionHandler,
  DropTensionHandler,
  ReopenTensionHandler,
  ReviveTensionHandler,
  DiscardTensionHandler,
];
