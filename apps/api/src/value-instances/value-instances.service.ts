import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import {
  ValueInstance,
  ValueInstanceDirection,
  ValueInstanceVisibility,
} from './entities/value-instance.entity';
import { CreateValueInstanceDto } from './dto/create-value-instance.dto';
import { UpdateValueInstanceDto } from './dto/update-value-instance.dto';
import { Value, ValueType } from '../value/entities/value.entity';
import { Agent } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

interface FindAllOptions {
  q?: string;
  valueId?: string;
  fromAgentId?: string;
  toAgentId?: string;
  direction?: ValueInstanceDirection;
  visibility?: ValueInstanceVisibility;
  parentId?: string | null;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface TreeNode {
  id: string;
  name: string;
  version: string;
  visibility: ValueInstanceVisibility;
  valueId: string;
  children: TreeNode[];
}

@Injectable()
export class ValueInstancesService {
  constructor(
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
  ) {}

  async findAll(options: FindAllOptions): Promise<{ data: ValueInstance[]; total: number }> {
    const {
      q,
      valueId,
      fromAgentId,
      toAgentId,
      direction,
      visibility,
      parentId,
      sort = 'updatedAt_desc',
      page = 1,
      pageSize = 20,
    } = options;

    const qb = this.valueInstanceRepository
      .createQueryBuilder('vi')
      .leftJoinAndSelect('vi.value', 'value')
      .leftJoinAndSelect('vi.fromAgent', 'fromAgent')
      .leftJoinAndSelect('vi.toAgent', 'toAgent')
      .leftJoinAndSelect('vi.imageFile', 'imageFile');

    if (q) {
      qb.andWhere('(vi.name ILIKE :q OR vi.purpose ILIKE :q)', { q: `%${q}%` });
    }

    if (valueId) {
      qb.andWhere('vi.valueId = :valueId', { valueId });
    }

    if (fromAgentId) {
      qb.andWhere('vi.fromAgentId = :fromAgentId', { fromAgentId });
    }

    if (toAgentId) {
      qb.andWhere('vi.toAgentId = :toAgentId', { toAgentId });
    }

    if (direction) {
      qb.andWhere('vi.direction = :direction', { direction });
    }

    if (visibility) {
      qb.andWhere('vi.visibility = :visibility', { visibility });
    }

    if (parentId === null || parentId === 'null') {
      qb.andWhere('vi.parentId IS NULL');
    } else if (parentId) {
      qb.andWhere('vi.parentId = :parentId', { parentId });
    }

    // Sorting
    const [sortField, sortDir] = sort.split('_');
    const orderDir = sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (sortField) {
      case 'name':
        qb.orderBy('vi.name', orderDir);
        break;
      case 'createdAt':
        qb.orderBy('vi.createdAt', orderDir);
        break;
      case 'version':
        qb.orderBy('vi.version', orderDir);
        break;
      default:
        qb.orderBy('vi.updatedAt', orderDir);
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<ValueInstance> {
    const instance = await this.valueInstanceRepository.findOne({
      where: { id },
      relations: ['value', 'fromAgent', 'toAgent', 'imageFile', 'parent', 'children'],
    });

    if (!instance) {
      throw new NotFoundException('ValueInstance not found');
    }

    return instance;
  }

  async getTree(options: { valueId?: string; visibility?: ValueInstanceVisibility }): Promise<TreeNode[]> {
    const qb = this.valueInstanceRepository
      .createQueryBuilder('vi')
      .select(['vi.id', 'vi.name', 'vi.version', 'vi.visibility', 'vi.valueId', 'vi.parentId']);

    if (options.valueId) {
      qb.andWhere('vi.valueId = :valueId', { valueId: options.valueId });
    }

    if (options.visibility) {
      qb.andWhere('vi.visibility = :visibility', { visibility: options.visibility });
    }

    const instances = await qb.getMany();

    // Build tree from flat list
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create nodes
    for (const inst of instances) {
      map.set(inst.id, {
        id: inst.id,
        name: inst.name,
        version: inst.version,
        visibility: inst.visibility,
        valueId: inst.valueId,
        children: [],
      });
    }

    // Second pass: link children to parents
    for (const inst of instances) {
      const node = map.get(inst.id)!;
      if (inst.parentId && map.has(inst.parentId)) {
        map.get(inst.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(dto: CreateValueInstanceDto): Promise<ValueInstance> {
    // Validate at least one agent is set
    if (!dto.fromAgentId && !dto.toAgentId) {
      throw new BadRequestException('At least one of fromAgentId or toAgentId must be provided');
    }

    // Validate value exists
    const value = await this.valueRepository.findOne({ where: { id: dto.valueId } });
    if (!value) {
      throw new BadRequestException('Value not found');
    }

    // Validate agents exist
    if (dto.fromAgentId) {
      const fromAgent = await this.agentRepository.findOne({ where: { id: dto.fromAgentId } });
      if (!fromAgent) {
        throw new BadRequestException('From Agent not found');
      }
    }

    if (dto.toAgentId) {
      const toAgent = await this.agentRepository.findOne({ where: { id: dto.toAgentId } });
      if (!toAgent) {
        throw new BadRequestException('To Agent not found');
      }
    }

    // Validate parent exists and prevent cycles
    if (dto.parentId) {
      const parent = await this.valueInstanceRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new BadRequestException('Parent instance not found');
      }
    }

    // Validate image file is an image
    if (dto.imageFileId) {
      const file = await this.fileRepository.findOne({ where: { id: dto.imageFileId } });
      if (!file) {
        throw new BadRequestException('Image file not found');
      }
      if (!file.mimeType.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }
    }

    const instance = this.valueInstanceRepository.create({
      valueId: dto.valueId,
      name: dto.name,
      purpose: dto.purpose || null,
      version: dto.version || '1.0',
      direction: dto.direction,
      fromAgentId: dto.fromAgentId || null,
      toAgentId: dto.toAgentId || null,
      parentId: dto.parentId || null,
      link: dto.link || null,
      imageFileId: dto.imageFileId || null,
      visibility: dto.visibility || ValueInstanceVisibility.PRIVATE,
    });

    return this.valueInstanceRepository.save(instance);
  }

  async update(id: string, dto: UpdateValueInstanceDto): Promise<ValueInstance> {
    const instance = await this.findOne(id);

    // Validate at least one agent if both are being changed
    if (dto.fromAgentId !== undefined || dto.toAgentId !== undefined) {
      const newFromAgentId = dto.fromAgentId !== undefined ? dto.fromAgentId : instance.fromAgentId;
      const newToAgentId = dto.toAgentId !== undefined ? dto.toAgentId : instance.toAgentId;
      if (!newFromAgentId && !newToAgentId) {
        throw new BadRequestException('At least one of fromAgentId or toAgentId must be provided');
      }
    }

    // Validate value exists
    if (dto.valueId) {
      const value = await this.valueRepository.findOne({ where: { id: dto.valueId } });
      if (!value) {
        throw new BadRequestException('Value not found');
      }
    }

    // Validate agents exist
    if (dto.fromAgentId) {
      const fromAgent = await this.agentRepository.findOne({ where: { id: dto.fromAgentId } });
      if (!fromAgent) {
        throw new BadRequestException('From Agent not found');
      }
    }

    if (dto.toAgentId) {
      const toAgent = await this.agentRepository.findOne({ where: { id: dto.toAgentId } });
      if (!toAgent) {
        throw new BadRequestException('To Agent not found');
      }
    }

    // Validate parent and prevent cycles
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Cannot set instance as its own parent');
      }

      if (dto.parentId) {
        const parent = await this.valueInstanceRepository.findOne({ where: { id: dto.parentId } });
        if (!parent) {
          throw new BadRequestException('Parent instance not found');
        }

        // Check for cycles - ensure new parent is not a descendant
        const isDescendant = await this.isDescendantOf(dto.parentId, id);
        if (isDescendant) {
          throw new BadRequestException('Cannot set a descendant as parent (would create a cycle)');
        }
      }
    }

    // Validate image file is an image
    if (dto.imageFileId) {
      const file = await this.fileRepository.findOne({ where: { id: dto.imageFileId } });
      if (!file) {
        throw new BadRequestException('Image file not found');
      }
      if (!file.mimeType.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }
    }

    // Update fields
    if (dto.valueId !== undefined) instance.valueId = dto.valueId;
    if (dto.name !== undefined) instance.name = dto.name;
    if (dto.purpose !== undefined) instance.purpose = dto.purpose || null;
    if (dto.version !== undefined) instance.version = dto.version;
    if (dto.direction !== undefined) instance.direction = dto.direction;
    if (dto.fromAgentId !== undefined) instance.fromAgentId = dto.fromAgentId || null;
    if (dto.toAgentId !== undefined) instance.toAgentId = dto.toAgentId || null;
    if (dto.parentId !== undefined) instance.parentId = dto.parentId || null;
    if (dto.link !== undefined) instance.link = dto.link || null;
    if (dto.imageFileId !== undefined) instance.imageFileId = dto.imageFileId || null;
    if (dto.visibility !== undefined) instance.visibility = dto.visibility;

    return this.valueInstanceRepository.save(instance);
  }

  async delete(id: string): Promise<void> {
    const instance = await this.findOne(id);

    // Check if has children
    const childCount = await this.valueInstanceRepository.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new ConflictException('Cannot delete ValueInstance with children. Delete children first.');
    }

    await this.valueInstanceRepository.remove(instance);
  }

  private async isDescendantOf(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [potentialDescendantId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const current = await this.valueInstanceRepository.findOne({
        where: { id: currentId },
        select: ['id', 'parentId'],
      });

      if (!current) continue;

      if (current.parentId === ancestorId) {
        return true;
      }

      if (current.parentId) {
        queue.push(current.parentId);
      }
    }

    return false;
  }

  async seed(): Promise<{ created: number }> {
    // Check if already seeded
    const existingCount = await this.valueInstanceRepository.count();
    if (existingCount > 0) {
      return { created: 0 };
    }

    // Get or create agents
    let marketlum = await this.agentRepository.findOne({ where: { name: 'Marketlum' } });
    if (!marketlum) {
      marketlum = await this.agentRepository.save(
        this.agentRepository.create({ name: 'Marketlum' }),
      );
    }

    let xyzInc = await this.agentRepository.findOne({ where: { name: 'XYZ Inc.' } });
    if (!xyzInc) {
      xyzInc = await this.agentRepository.save(
        this.agentRepository.create({ name: 'XYZ Inc.' }),
      );
    }

    let janeDoe = await this.agentRepository.findOne({ where: { name: 'Jane Doe' } });
    if (!janeDoe) {
      janeDoe = await this.agentRepository.save(
        this.agentRepository.create({ name: 'Jane Doe' }),
      );
    }

    // Get or create values
    let coachingValue = await this.valueRepository.findOne({ where: { name: 'Coaching' } });
    if (!coachingValue) {
      coachingValue = await this.valueRepository.save(
        this.valueRepository.create({ name: 'Coaching', type: ValueType.SERVICE }),
      );
    }

    let trademarkValue = await this.valueRepository.findOne({ where: { name: 'Trademark' } });
    if (!trademarkValue) {
      trademarkValue = await this.valueRepository.save(
        this.valueRepository.create({ name: 'Trademark', type: ValueType.RIGHT }),
      );
    }

    let partnershipValue = await this.valueRepository.findOne({ where: { name: 'Partnership' } });
    if (!partnershipValue) {
      partnershipValue = await this.valueRepository.save(
        this.valueRepository.create({ name: 'Partnership', type: ValueType.RELATIONSHIP }),
      );
    }

    const instances: ValueInstance[] = [];

    // 1. Coaching engagement with children
    const coachingEngagement = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: coachingValue.id,
        name: 'Coaching engagement - XYZ Inc.',
        purpose: 'Support leadership team',
        version: '1.0',
        direction: ValueInstanceDirection.OUTGOING,
        fromAgentId: marketlum.id,
        toAgentId: xyzInc.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(coachingEngagement);

    const session1 = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: coachingValue.id,
        name: 'Coaching Session #1',
        purpose: 'Initial assessment',
        version: '1.0',
        direction: ValueInstanceDirection.OUTGOING,
        fromAgentId: marketlum.id,
        toAgentId: xyzInc.id,
        parentId: coachingEngagement.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(session1);

    const session2 = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: coachingValue.id,
        name: 'Coaching Session #2',
        purpose: 'Follow-up session',
        version: '1.0',
        direction: ValueInstanceDirection.OUTGOING,
        fromAgentId: marketlum.id,
        toAgentId: xyzInc.id,
        parentId: coachingEngagement.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(session2);

    // 2. Trademark with child
    const trademarkReg = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: trademarkValue.id,
        name: 'Marketlum Trademark Registration',
        purpose: 'Protect Marketlum brand',
        version: '1.0',
        direction: ValueInstanceDirection.NEUTRAL,
        fromAgentId: marketlum.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(trademarkReg);

    const trademarkRenewal = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: trademarkValue.id,
        name: 'Trademark Renewal 2026',
        purpose: 'Annual renewal',
        version: '2026',
        direction: ValueInstanceDirection.NEUTRAL,
        fromAgentId: marketlum.id,
        parentId: trademarkReg.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(trademarkRenewal);

    // 3. Partnership
    const partnership = await this.valueInstanceRepository.save(
      this.valueInstanceRepository.create({
        valueId: partnershipValue.id,
        name: 'Partnership - Jane Doe',
        purpose: 'Strategic partnership',
        version: '1.0',
        direction: ValueInstanceDirection.NEUTRAL,
        fromAgentId: marketlum.id,
        toAgentId: janeDoe.id,
        visibility: ValueInstanceVisibility.PRIVATE,
      }),
    );
    instances.push(partnership);

    return { created: instances.length };
  }
}
