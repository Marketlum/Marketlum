import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '@marketlum/core';
import { NbpService } from './nbp.service';

@Controller('plugins/nbp')
@UseGuards(AdminGuard)
export class NbpController {
  constructor(private readonly nbp: NbpService) {}

  /** Fetch the latest NBP rates now and return a summary of the run. */
  @Post('refresh')
  async refresh() {
    return this.nbp.sync();
  }
}
