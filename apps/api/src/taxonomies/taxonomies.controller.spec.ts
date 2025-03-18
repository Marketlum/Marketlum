import { Test, TestingModule } from '@nestjs/testing';
import { TaxonomiesController } from './taxonomies.controller';
import { TaxonomiesService } from './taxonomies.service';

describe('TaxonomiesController', () => {
  let controller: TaxonomiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxonomiesController],
      providers: [TaxonomiesService],
    }).compile();

    controller = module.get<TaxonomiesController>(TaxonomiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
