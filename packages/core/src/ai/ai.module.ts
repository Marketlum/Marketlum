import { Module } from '@nestjs/common';
import { ANTHROPIC_CLIENT, RealAnthropicClient } from './anthropic.client';

@Module({
  providers: [
    {
      provide: ANTHROPIC_CLIENT,
      useFactory: () => new RealAnthropicClient(),
    },
  ],
  exports: [ANTHROPIC_CLIENT],
})
export class AiModule {}
