import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository, In } from 'typeorm';
import { Agreement } from './entities/agreement.entity';
import { Agent } from '../agents/entities/agent.entity';
import { File } from '../files/entities/file.entity';
import {
  CreateAgreementInput,
  UpdateAgreementInput,
  MoveAgreementInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly agreementRepository: TreeRepository<Agreement>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async create(input: CreateAgreementInput): Promise<Agreement> {
    const { parentId, fileId, partyIds, ...rest } = input;

    const agreement = this.agreementRepository.create({
      ...rest,
      content: rest.content ?? null,
      link: rest.link ?? null,
    });

    if (parentId) {
      const parent = await this.agreementRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent agreement not found');
      }
      agreement.parent = parent;
    }

    if (fileId) {
      const file = await this.fileRepository.findOne({
        where: { id: fileId },
      });
      if (!file) {
        throw new NotFoundException('File not found');
      }
      agreement.fileId = fileId;
      agreement.file = file;
    }

    const agents = await this.agentRepository.findBy({ id: In(partyIds) });
    if (agents.length < 2) {
      throw new BadRequestException('At least 2 valid parties are required');
    }
    agreement.parties = agents;

    const saved = await this.agreementRepository.save(agreement);
    return this.findOne(saved.id);
  }

  async search(query: PaginationQuery) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const qb = this.agreementRepository.createQueryBuilder('agreement');

    qb.leftJoinAndSelect('agreement.file', 'file');
    qb.leftJoinAndSelect('agreement.parties', 'parties');

    if (search) {
      qb.andWhere(
        '(agreement.title ILIKE :search OR agreement.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`agreement.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('agreement.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTree(): Promise<Agreement[]> {
    const trees = await this.agreementRepository.findTrees({
      relations: ['file', 'parties'],
    });
    return trees;
  }

  async findRoots(): Promise<Agreement[]> {
    return this.agreementRepository.findRoots();
  }

  async findOne(id: string): Promise<Agreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['file', 'parties'],
    });
    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }
    return agreement;
  }

  async findChildren(id: string): Promise<Agreement[]> {
    const parent = await this.findOne(id);
    const tree = await this.agreementRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async findDescendantsTree(id: string): Promise<Agreement> {
    const parent = await this.findOne(id);
    return this.agreementRepository.findDescendantsTree(parent);
  }

  async update(id: string, input: UpdateAgreementInput): Promise<Agreement> {
    const agreement = await this.findOne(id);
    const { fileId, partyIds, ...rest } = input;

    Object.assign(agreement, rest);

    if (fileId !== undefined) {
      if (fileId === null) {
        agreement.file = null;
        agreement.fileId = null;
      } else {
        const file = await this.fileRepository.findOne({
          where: { id: fileId },
        });
        if (!file) {
          throw new NotFoundException('File not found');
        }
        agreement.fileId = fileId;
        agreement.file = file;
      }
    }

    if (partyIds !== undefined) {
      const agents = await this.agentRepository.findBy({ id: In(partyIds) });
      if (agents.length < 2) {
        throw new BadRequestException('At least 2 valid parties are required');
      }
      agreement.parties = agents;
    }

    await this.agreementRepository.save(agreement);
    return this.findOne(id);
  }

  async move(id: string, input: MoveAgreementInput): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (input.parentId === null) {
      agreement.parent = null;
    } else {
      const parent = await this.agreementRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent agreement not found');
      }
      agreement.parent = parent;
    }

    return this.agreementRepository.save(agreement);
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.findOne(id);
    const descendants = await this.agreementRepository.findDescendants(agreement);
    descendants.sort((a, b) => b.level - a.level);
    await this.agreementRepository.remove(descendants);
  }
}
