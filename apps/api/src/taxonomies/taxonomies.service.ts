import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { Taxonomy } from './entities/taxonomy.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private taxonomyRepository: TreeRepository<Taxonomy>,
    @InjectRepository(FileUpload)
    private fileRepository: Repository<FileUpload>,
  ) {}

  async create(createTaxonomyDto: CreateTaxonomyDto) {
    const taxonomy = this.taxonomyRepository.create({
      name: createTaxonomyDto.name,
      description: createTaxonomyDto.description,
      link: createTaxonomyDto.link,
    });

    if (createTaxonomyDto.parentId) {
      const parent = await this.taxonomyRepository.findOneBy({ id: createTaxonomyDto.parentId });
      if (!parent) {
        throw new NotFoundException('Parent taxonomy not found.');
      }
      taxonomy.parent = parent;
    }

    if (createTaxonomyDto.imageId) {
      const image = await this.fileRepository.findOne({ where: { id: createTaxonomyDto.imageId } });
      if (!image) {
        throw new NotFoundException(`Image with ID ${createTaxonomyDto.imageId} not found`);
      }
      taxonomy.image = image;
      taxonomy.imageId = createTaxonomyDto.imageId;
    }

    const saved = await this.taxonomyRepository.save(taxonomy);
    return this.findOne(saved.id);
  }

  async update(id: string, updateTaxonomyDto: UpdateTaxonomyDto) {
    const taxonomy = await this.taxonomyRepository.findOne({
      where: { id },
      relations: ['image'],
    });

    if (!taxonomy) {
      throw new NotFoundException('Taxonomy not found.');
    }

    if (updateTaxonomyDto.name !== undefined) {
      taxonomy.name = updateTaxonomyDto.name;
    }
    if (updateTaxonomyDto.description !== undefined) {
      taxonomy.description = updateTaxonomyDto.description || null;
    }
    if (updateTaxonomyDto.link !== undefined) {
      taxonomy.link = updateTaxonomyDto.link || null;
    }

    if (updateTaxonomyDto.imageId !== undefined) {
      if (updateTaxonomyDto.imageId === null) {
        taxonomy.image = null;
        taxonomy.imageId = null;
      } else {
        const image = await this.fileRepository.findOne({ where: { id: updateTaxonomyDto.imageId } });
        if (!image) {
          throw new NotFoundException(`Image with ID ${updateTaxonomyDto.imageId} not found`);
        }
        taxonomy.image = image;
        taxonomy.imageId = updateTaxonomyDto.imageId;
      }
    }

    await this.taxonomyRepository.save(taxonomy);
    return this.findOne(id);
  }

  async findAll(): Promise<Taxonomy[]> {
    const trees = await this.taxonomyRepository.findTrees({ relations: ['image'] });
    return trees;
  }

  async findOne(id: string): Promise<Taxonomy | null> {
    return this.taxonomyRepository.findOne({
      where: { id },
      relations: ['image'],
    });
  }

  async remove(id: string): Promise<void> {
    const taxonomy = await this.taxonomyRepository.findOne({ where: { id } });
    if (!taxonomy) {
      throw new NotFoundException('Taxonomy not found.');
    }
    await this.taxonomyRepository.delete(id);
  }
}
