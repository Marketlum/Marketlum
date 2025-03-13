import { Injectable } from '@nestjs/common';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Value } from './entities/value.entity';

@Injectable()
export class ValueService {
  constructor(
    @InjectRepository(Value)
    private valueRepository: Repository<Value>,
  ) {}

  create(createValueDto: CreateValueDto) {
    const value = this.valueRepository.create(createValueDto);

    return this.valueRepository.save(value);
  }

  update(id: string, updateValueDto: UpdateValueDto) {
    return this.valueRepository.update(id, updateValueDto);
  }

  findAll(): Promise<Value[]> {
    return this.valueRepository.find();
  }

  findOne(id: string): Promise<Value | null> {
    return this.valueRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.valueRepository.delete(id);
  }
}
