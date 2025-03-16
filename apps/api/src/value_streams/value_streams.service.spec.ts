import { Test, TestingModule } from '@nestjs/testing';
import { ValueStreamsService } from './value_streams.service';

describe('ValueStreamsService', () => {
  let service: ValueStreamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValueStreamsService],
    }).compile();

    service = module.get<ValueStreamsService>(ValueStreamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
