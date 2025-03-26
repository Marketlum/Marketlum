import { Injectable } from '@nestjs/common';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Value } from './entities/value.entity';
import { ValueStream } from 'src/value_streams/entities/value_stream.entity';
import { Agent } from 'src/agents/entities/agent.entity';

@Injectable()
export class ValueService {
  constructor(
    @InjectRepository(Value)
    private valueRepository: TreeRepository<Value>,

    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
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

    if (createValueDto.agentId) {
      const agent = await this.agentRepository.findOneBy({ id: createValueDto.agentId });

      if (!agent) {
        throw new Error('Agent not found.');
      }

      value.agent = agent;
    }

    return this.valueRepository.save(value);
  }

  update(id: string, updateValueDto: UpdateValueDto) {
    return this.valueRepository.update(id, updateValueDto);
  }

  findAll(): Promise<Value[]> {
    return this.valueRepository.findTrees({ relations: ["stream", "agent"] });
  }

  findFlat(streamId: string): Promise<Value[]> {
    return this.valueRepository.find({ where: {"streamId": streamId} });
  }

  async findOne(id: string): Promise<Value | null> {
    return await this.valueRepository.findOne({ where: {"id": id}, relations: ["parent", "stream", "agent"] });
  }

  async remove(id: string): Promise<void> {
    await this.valueRepository.delete(id);
  }
}
