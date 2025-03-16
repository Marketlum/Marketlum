import { Test, TestingModule } from '@nestjs/testing';
import { ValueStreamsController } from './value_streams.controller';
import { ValueStreamsService } from './value_streams.service';

describe('ValueStreamsController', () => {
  let controller: ValueStreamsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValueStreamsController],
      providers: [ValueStreamsService],
    }).compile();

    controller = module.get<ValueStreamsController>(ValueStreamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
