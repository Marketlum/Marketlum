import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateValueStreamDto } from './dto/create-value_stream.dto';
import { UpdateValueStreamDto } from './dto/update-value_stream.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { ValueStream } from './entities/value_stream.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Value, ValueType } from '../value/entities/value.entity';
import { ValueInstance, ValueInstanceDirection } from '../value-instances/entities/value-instance.entity';
import { Exchange, ExchangeState } from '../exchanges/entities/exchange.entity';
import { Offering, OfferingState } from '../offerings/entities/offering.entity';

@Injectable()
export class ValueStreamsService {
  constructor(
    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(FileUpload)
    private fileRepository: Repository<FileUpload>,
    @InjectRepository(Value)
    private valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private valueInstanceRepository: Repository<ValueInstance>,
    @InjectRepository(Exchange)
    private exchangeRepository: Repository<Exchange>,
    @InjectRepository(Offering)
    private offeringRepository: Repository<Offering>,
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

  async getStats(id: string) {
    const valueStream = await this.findOne(id);
    if (!valueStream) {
      throw new NotFoundException(`Value stream with ID ${id} not found`);
    }

    // Get all descendant value stream IDs (including self)
    const descendants = await this.valueStreamRepository.findDescendants(valueStream);
    const streamIds = descendants.map(d => d.id);

    // Values stats
    const valuesQuery = this.valueRepository
      .createQueryBuilder('value')
      .leftJoin('value.stream', 'stream')
      .where('stream.id IN (:...streamIds)', { streamIds });

    const valuesTotal = await valuesQuery.getCount();

    const valuesByType = await this.valueRepository
      .createQueryBuilder('value')
      .leftJoin('value.stream', 'stream')
      .select('value.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('stream.id IN (:...streamIds)', { streamIds })
      .groupBy('value.type')
      .getRawMany();

    const valuesTypeMap = {
      product: 0,
      service: 0,
      relationship: 0,
      right: 0,
    };
    valuesByType.forEach(row => {
      valuesTypeMap[row.type] = parseInt(row.count, 10);
    });

    // Value Instances stats - need to get values first then find instances
    const valueIds = await this.valueRepository
      .createQueryBuilder('value')
      .leftJoin('value.stream', 'stream')
      .select('value.id')
      .where('stream.id IN (:...streamIds)', { streamIds })
      .getRawMany();

    const valueIdList = valueIds.map(v => v.value_id);

    let instancesTotal = 0;
    let instancesByDirection = {
      incoming: 0,
      outgoing: 0,
      internal: 0,
      neutral: 0,
    };

    if (valueIdList.length > 0) {
      instancesTotal = await this.valueInstanceRepository
        .createQueryBuilder('instance')
        .where('instance.valueId IN (:...valueIds)', { valueIds: valueIdList })
        .getCount();

      const instancesByDir = await this.valueInstanceRepository
        .createQueryBuilder('instance')
        .select('instance.direction', 'direction')
        .addSelect('COUNT(*)', 'count')
        .where('instance.valueId IN (:...valueIds)', { valueIds: valueIdList })
        .groupBy('instance.direction')
        .getRawMany();

      instancesByDir.forEach(row => {
        instancesByDirection[row.direction] = parseInt(row.count, 10);
      });
    }

    // Exchanges stats
    const exchangesTotal = await this.exchangeRepository
      .createQueryBuilder('exchange')
      .where('exchange.valueStreamId IN (:...streamIds)', { streamIds })
      .getCount();

    const exchangesByState = await this.exchangeRepository
      .createQueryBuilder('exchange')
      .select('exchange.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('exchange.valueStreamId IN (:...streamIds)', { streamIds })
      .groupBy('exchange.state')
      .getRawMany();

    const exchangesStateMap = {
      open: 0,
      completed: 0,
      closed: 0,
    };
    exchangesByState.forEach(row => {
      exchangesStateMap[row.state] = parseInt(row.count, 10);
    });

    // Offerings stats
    const offeringsTotal = await this.offeringRepository
      .createQueryBuilder('offering')
      .where('offering.valueStreamId IN (:...streamIds)', { streamIds })
      .getCount();

    const offeringsByState = await this.offeringRepository
      .createQueryBuilder('offering')
      .select('offering.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('offering.valueStreamId IN (:...streamIds)', { streamIds })
      .groupBy('offering.state')
      .getRawMany();

    const offeringsStateMap = {
      draft: 0,
      live: 0,
      archived: 0,
    };
    offeringsByState.forEach(row => {
      offeringsStateMap[row.state] = parseInt(row.count, 10);
    });

    return {
      values: {
        total: valuesTotal,
        byType: valuesTypeMap,
      },
      valueInstances: {
        total: instancesTotal,
        byDirection: instancesByDirection,
      },
      exchanges: {
        total: exchangesTotal,
        byState: exchangesStateMap,
      },
      offerings: {
        total: offeringsTotal,
        byState: offeringsStateMap,
      },
    };
  }
}
