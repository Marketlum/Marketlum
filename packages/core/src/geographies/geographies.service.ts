import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Geography } from './geography.entity';
import {
  CreateGeographyInput,
  UpdateGeographyInput,
  MoveGeographyInput,
  GeographyType,
} from '@marketlum/shared';

const TYPE_HIERARCHY: GeographyType[] = [
  GeographyType.PLANET,
  GeographyType.CONTINENT,
  GeographyType.CONTINENTAL_SECTION,
  GeographyType.COUNTRY,
  GeographyType.REGION,
  GeographyType.CITY,
  GeographyType.DISTRICT,
];

@Injectable()
export class GeographiesService {
  constructor(
    @InjectRepository(Geography)
    private readonly geographyRepository: TreeRepository<Geography>,
  ) {}

  private validateTypeHierarchy(
    childType: GeographyType,
    parent: Geography | null,
  ): void {
    if (!parent) {
      if (childType !== GeographyType.PLANET) {
        throw new BadRequestException(
          'Only planet type is allowed at root level',
        );
      }
      return;
    }

    const parentIndex = TYPE_HIERARCHY.indexOf(parent.type);
    const childIndex = TYPE_HIERARCHY.indexOf(childType);

    if (childIndex !== parentIndex + 1) {
      const expectedType = TYPE_HIERARCHY[parentIndex + 1];
      throw new BadRequestException(
        `Child of ${parent.type} must be ${expectedType}, got ${childType}`,
      );
    }
  }

  async create(input: CreateGeographyInput): Promise<Geography> {
    const { parentId, ...rest } = input;

    let parent: Geography | null = null;
    if (parentId) {
      parent = await this.geographyRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent geography not found');
      }
    }

    this.validateTypeHierarchy(rest.type, parent);

    const geography = this.geographyRepository.create(rest);
    geography.parent = parent;

    try {
      const saved = await this.geographyRepository.save(geography);
      return this.findOne(saved.id);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Geography with this code already exists');
      }
      throw error;
    }
  }

  async findTree(): Promise<Geography[]> {
    return this.geographyRepository.findTrees();
  }

  async findOne(id: string): Promise<Geography> {
    const geography = await this.geographyRepository.findOne({
      where: { id },
    });
    if (!geography) {
      throw new NotFoundException('Geography not found');
    }
    return geography;
  }

  async findChildren(id: string): Promise<Geography[]> {
    const parent = await this.findOne(id);
    const tree = await this.geographyRepository.findDescendantsTree(parent, {
      depth: 1,
    });
    return tree.children;
  }

  async findRoots(): Promise<Geography[]> {
    return this.geographyRepository.findRoots();
  }

  async update(id: string, input: UpdateGeographyInput): Promise<Geography> {
    const geography = await this.findOne(id);
    Object.assign(geography, input);

    try {
      await this.geographyRepository.save(geography);
      return this.findOne(id);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Geography with this code already exists');
      }
      throw error;
    }
  }

  async move(id: string, input: MoveGeographyInput): Promise<Geography> {
    const geography = await this.findOne(id);

    if (input.parentId === null) {
      this.validateTypeHierarchy(geography.type, null);
      geography.parent = null;
    } else {
      const parent = await this.geographyRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent geography not found');
      }
      this.validateTypeHierarchy(geography.type, parent);
      geography.parent = parent;
    }

    return this.geographyRepository.save(geography);
  }

  async remove(id: string): Promise<void> {
    const geography = await this.findOne(id);
    const descendants =
      await this.geographyRepository.findDescendants(geography);
    descendants.sort((a, b) => b.level - a.level);
    await this.geographyRepository.remove(descendants);
  }
}
