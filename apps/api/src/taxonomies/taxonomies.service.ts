import { Injectable } from '@nestjs/common';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Taxonomy } from './entities/taxonomy.entity';

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private taxonomyRepository: TreeRepository<Taxonomy>,
  ) {}

  async create(createTaxonomyDto: CreateTaxonomyDto) {
    const taxonomy = this.taxonomyRepository.create(createTaxonomyDto);

    if (createTaxonomyDto.parentId) {
      const parent = await this.taxonomyRepository.findOneBy({ id: createTaxonomyDto.parentId });

      if (!parent) {
        throw new Error('Parent taxonomy not found.');
      }

      taxonomy.parent = parent;
    }

    return this.taxonomyRepository.save(taxonomy);
  }

  update(id: string, updateTaxonomyDto: UpdateTaxonomyDto) {
    return this.taxonomyRepository.update(id, updateTaxonomyDto);
  }

  findAll(): Promise<Taxonomy[]> {
    return this.taxonomyRepository.findTrees();
  }

  findOne(id: string): Promise<Taxonomy | null> {
    return this.taxonomyRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.taxonomyRepository.delete(id);
  }
}
