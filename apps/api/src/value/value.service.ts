import { Injectable } from '@nestjs/common';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Value } from './entities/value.entity';
import { ValueStream } from 'src/value_streams/entities/value_stream.entity';

@Injectable()
export class ValueService {
  constructor(
    @InjectRepository(Value)
    private valueRepository: TreeRepository<Value>,

    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,
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
    if (createValueDto.streamId) {
      const stream = await this.valueStreamRepository.findOneBy({ id: createValueDto.streamId });

      if (!stream) {
        throw new Error('Value stream not found.');
      }

      value.stream = stream;
    }

    return this.valueRepository.save(value);
  }

  update(id: string, updateValueDto: UpdateValueDto) {
    return this.valueRepository.update(id, updateValueDto);
  }

  findAll(): Promise<Value[]> {
    return this.valueRepository.findTrees({ relations: ["stream"] });
  }

  findOne(id: string): Promise<Value | null> {
    return this.valueRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.valueRepository.delete(id);
  }
}
