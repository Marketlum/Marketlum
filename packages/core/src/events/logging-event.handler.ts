import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

interface LoggedEvent {
  name: string;
  payload: { id: string; code?: string };
}

@Injectable()
export class LoggingEventHandler {
  private readonly logger = new Logger('DomainEvents');

  @OnEvent('marketlum.**', { async: true })
  handle(event: LoggedEvent): void {
    const codePart = event.payload.code ? ` code=${event.payload.code}` : '';
    this.logger.debug(`${event.name} id=${event.payload.id}${codePart}`);
  }
}
