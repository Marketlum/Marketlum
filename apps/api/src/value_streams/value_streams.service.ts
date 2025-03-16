import { Injectable } from '@nestjs/common';
import { CreateValueStreamDto } from './dto/create-value_stream.dto';
import { UpdateValueStreamDto } from './dto/update-value_stream.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { ValueStream } from './entities/value_stream.entity';

@Injectable()
export class ValueStreamsService {
  constructor(
    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,
  ) {}

  async create(createValueStreamDto: CreateValueStreamDto) {
    const valueStream = this.valueStreamRepository.create(createValueStreamDto);

    if (createValueStreamDto.parentId) {
      const parent = await this.valueStreamRepository.findOneBy({ id: createValueStreamDto.parentId });

      if (!parent) {
        throw new Error('Parent value not found.');
      }

      valueStream.parent = parent;
    }

    return this.valueStreamRepository.save(valueStream);
  }

  update(id: string, updateValueStreamDto: UpdateValueStreamDto) {
    return this.valueStreamRepository.update(id, updateValueStreamDto);
  }

  findAll(): Promise<ValueStream[]> {
    return this.valueStreamRepository.findTrees();
  }

  findOne(id: string): Promise<ValueStream | null> {
    return this.valueStreamRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.valueStreamRepository.delete(id);
  }
}
