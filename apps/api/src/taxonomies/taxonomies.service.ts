import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Taxonomy } from './entities/taxonomy.entity';
import { CreateTaxonomyInput, UpdateTaxonomyInput, MoveTaxonomyInput } from '@marketlum/shared';

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepository: TreeRepository<Taxonomy>,
  ) {}

  async create(input: CreateTaxonomyInput): Promise<Taxonomy> {
    const taxonomy = this.taxonomyRepository.create({
      name: input.name,
      description: input.description ?? null,
    });

    if (input.parentId) {
      const parent = await this.taxonomyRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent taxonomy not found');
      }
      taxonomy.parent = parent;
    }

    return this.taxonomyRepository.save(taxonomy);
  }

  async findTree(): Promise<Taxonomy[]> {
    return this.taxonomyRepository.findTrees();
  }

  async findRoots(): Promise<Taxonomy[]> {
    return this.taxonomyRepository.findRoots();
  }

  async findOne(id: string): Promise<Taxonomy> {
    const taxonomy = await this.taxonomyRepository.findOne({ where: { id } });
    if (!taxonomy) {
      throw new NotFoundException('Taxonomy not found');
    }
    return taxonomy;
  }

  async findChildren(id: string): Promise<Taxonomy[]> {
    const parent = await this.findOne(id);
    const tree = await this.taxonomyRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async findDescendantsTree(id: string): Promise<Taxonomy> {
    const parent = await this.findOne(id);
    return this.taxonomyRepository.findDescendantsTree(parent);
  }

  async update(id: string, input: UpdateTaxonomyInput): Promise<Taxonomy> {
    const taxonomy = await this.findOne(id);
    Object.assign(taxonomy, input);
    return this.taxonomyRepository.save(taxonomy);
  }

  async move(id: string, input: MoveTaxonomyInput): Promise<Taxonomy> {
    const taxonomy = await this.findOne(id);

    if (input.parentId === null) {
      taxonomy.parent = null;
    } else {
      const parent = await this.taxonomyRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent taxonomy not found');
      }
      taxonomy.parent = parent;
    }

    return this.taxonomyRepository.save(taxonomy);
  }

  async remove(id: string): Promise<void> {
    const taxonomy = await this.findOne(id);
    const descendants = await this.taxonomyRepository.findDescendants(taxonomy);
    // Sort by level descending so leaves are removed first
    descendants.sort((a, b) => b.level - a.level);
    await this.taxonomyRepository.remove(descendants);
  }
}
