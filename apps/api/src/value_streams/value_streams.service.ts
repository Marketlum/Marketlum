import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateValueStreamDto } from './dto/create-value_stream.dto';
import { UpdateValueStreamDto } from './dto/update-value_stream.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { ValueStream } from './entities/value_stream.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Injectable()
export class ValueStreamsService {
  constructor(
    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(FileUpload)
    private fileRepository: Repository<FileUpload>,
  ) {}

  async create(createValueStreamDto: CreateValueStreamDto) {
    const { imageId, parentId, ...data } = createValueStreamDto;
    const valueStream = this.valueStreamRepository.create(data);

    if (parentId) {
      const parent = await this.valueStreamRepository.findOneBy({ id: parentId });

      if (!parent) {
        throw new Error('Parent value not found.');
      }

      valueStream.parent = parent;
    }

    if (imageId) {
      const image = await this.fileRepository.findOne({ where: { id: imageId } });
      if (!image) {
        throw new NotFoundException(`Image with ID ${imageId} not found`);
      }
      valueStream.image = image;
      valueStream.imageId = imageId;
    }

    return this.valueStreamRepository.save(valueStream);
  }

  async update(id: string, updateValueStreamDto: UpdateValueStreamDto) {
    const { imageId, ...data } = updateValueStreamDto;

    // Handle imageId separately if provided
    if (imageId !== undefined) {
      if (imageId === null) {
        await this.valueStreamRepository.update(id, { ...data, image: null, imageId: null });
      } else {
        const image = await this.fileRepository.findOne({ where: { id: imageId } });
        if (!image) {
          throw new NotFoundException(`Image with ID ${imageId} not found`);
        }
        await this.valueStreamRepository.update(id, { ...data, imageId });
      }
    } else {
      await this.valueStreamRepository.update(id, data);
    }

    return this.findOne(id);
  }

  findAll(): Promise<ValueStream[]> {
    return this.valueStreamRepository.findTrees({ relations: ['image'] });
  }

  findOne(id: string): Promise<ValueStream | null> {
    return this.valueStreamRepository.findOne({
      where: { id },
      relations: ['image'],
    });
  }

  async remove(id: string): Promise<void> {
    await this.valueStreamRepository.delete(id);
  }
}
