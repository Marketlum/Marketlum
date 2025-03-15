import { Injectable } from '@nestjs/common';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Value } from './entities/value.entity';

@Injectable()
export class ValueService {
  constructor(
    @InjectRepository(Value)
    private valueRepository: TreeRepository<Value>,
  ) {}

  async create(createValueDto: CreateValueDto) {
    const value = this.valueRepository.create(createValueDto);

    if (createValueDto.parentId) {
      const parent = await this.valueRepository.findOneBy({ id: createValueDto.parentId });

      if (!parent) {
        throw new Error('Parent value not found.');
      }

      value.parent = parent;
    }

    return this.valueRepository.save(value);
  }

  update(id: string, updateValueDto: UpdateValueDto) {
    return this.valueRepository.update(id, updateValueDto);
  }

  findAll(): Promise<Value[]> {
    return this.valueRepository.findTrees();
  }

  findOne(id: string): Promise<Value | null> {
    return this.valueRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.valueRepository.delete(id);
  }
}
