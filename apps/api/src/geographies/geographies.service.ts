import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateGeographyDto } from './dto/create-geography.dto';
import { UpdateGeographyDto } from './dto/update-geography.dto';
import { MoveGeographyDto } from './dto/move-geography.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Geography, GeographyLevel, VALID_PARENT_LEVELS } from './entities/geography.entity';

interface SeedNode {
  name: string;
  code: string;
  level: GeographyLevel;
  children?: SeedNode[];
}

const DEFAULT_SEED_DATA: SeedNode[] = [
  {
    name: 'Earth',
    code: 'EARTH',
    level: GeographyLevel.PLANET,
    children: [
      {
        name: 'Europe',
        code: 'EUROPE',
        level: GeographyLevel.CONTINENT,
        children: [
          {
            name: 'European Union',
            code: 'EU',
            level: GeographyLevel.CONTINENTAL_SECTION,
            children: [
              {
                name: 'Poland',
                code: 'PL',
                level: GeographyLevel.COUNTRY,
                children: [
                  { name: 'Warsaw', code: 'PL-WAW', level: GeographyLevel.CITY },
                  { name: 'Łódź', code: 'PL-LDZ', level: GeographyLevel.CITY },
                ],
              },
              {
                name: 'Germany',
                code: 'DE',
                level: GeographyLevel.COUNTRY,
                children: [
                  { name: 'Berlin', code: 'DE-BER', level: GeographyLevel.CITY },
                ],
              },
              {
                name: 'France',
                code: 'FR',
                level: GeographyLevel.COUNTRY,
                children: [
                  { name: 'Paris', code: 'FR-PAR', level: GeographyLevel.CITY },
                ],
              },
            ],
          },
          {
            name: 'United Kingdom',
            code: 'GB',
            level: GeographyLevel.COUNTRY,
            children: [
              { name: 'London', code: 'GB-LON', level: GeographyLevel.CITY },
            ],
          },
        ],
      },
      {
        name: 'North America',
        code: 'NORTH-AMERICA',
        level: GeographyLevel.CONTINENT,
        children: [
          {
            name: 'United States',
            code: 'US',
            level: GeographyLevel.COUNTRY,
            children: [
              {
                name: 'California',
                code: 'US-CA',
                level: GeographyLevel.REGION,
                children: [
                  { name: 'San Francisco', code: 'US-CA-SF', level: GeographyLevel.CITY },
                  { name: 'Los Angeles', code: 'US-CA-LA', level: GeographyLevel.CITY },
                ],
              },
              {
                name: 'New York',
                code: 'US-NY',
                level: GeographyLevel.REGION,
                children: [
                  { name: 'New York City', code: 'US-NY-NYC', level: GeographyLevel.CITY },
                ],
              },
              {
                name: 'Texas',
                code: 'US-TX',
                level: GeographyLevel.REGION,
                children: [
                  { name: 'Austin', code: 'US-TX-AUS', level: GeographyLevel.CITY },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

@Injectable()
export class GeographiesService {
  constructor(
    @InjectRepository(Geography)
    private geographyRepository: TreeRepository<Geography>,
  ) {}

  async create(createGeographyDto: CreateGeographyDto): Promise<Geography> {
    const geography = this.geographyRepository.create({
      name: createGeographyDto.name.trim(),
      code: createGeographyDto.code.trim().toUpperCase(),
      level: createGeographyDto.level,
    });

    if (createGeographyDto.parentId) {
      const parent = await this.geographyRepository.findOneBy({ id: createGeographyDto.parentId });

      if (!parent) {
        throw new NotFoundException('Parent geography not found.');
      }

      this.validateParentChildLevel(createGeographyDto.level, parent.level);
      await this.checkCodeUniqueness(geography.code, createGeographyDto.parentId);
      geography.parent = parent;
    } else {
      // Root node - must be Planet
      if (createGeographyDto.level !== GeographyLevel.PLANET) {
        throw new BadRequestException('Only Planet level can be a root geography.');
      }
      await this.checkCodeUniqueness(geography.code, null);
    }

    return this.geographyRepository.save(geography);
  }

  async update(id: string, updateGeographyDto: UpdateGeographyDto): Promise<Geography> {
    const geography = await this.geographyRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!geography) {
      throw new NotFoundException('Geography not found.');
    }

    // Handle parent change
    if (updateGeographyDto.parentId !== undefined) {
      await this.validateParentChange(id, updateGeographyDto.parentId);

      const newLevel = updateGeographyDto.level || geography.level;

      if (updateGeographyDto.parentId) {
        const parent = await this.geographyRepository.findOneBy({ id: updateGeographyDto.parentId });
        if (!parent) {
          throw new NotFoundException('Parent geography not found.');
        }
        this.validateParentChildLevel(newLevel, parent.level);
        geography.parent = parent;
      } else {
        if (newLevel !== GeographyLevel.PLANET) {
          throw new BadRequestException('Only Planet level can be a root geography.');
        }
        (geography as any).parent = null;
      }
    }

    // Handle level change
    if (updateGeographyDto.level && updateGeographyDto.level !== geography.level) {
      const parentLevel = geography.parent?.level;
      if (parentLevel) {
        this.validateParentChildLevel(updateGeographyDto.level, parentLevel);
      } else if (updateGeographyDto.level !== GeographyLevel.PLANET) {
        throw new BadRequestException('Only Planet level can be a root geography.');
      }
      geography.level = updateGeographyDto.level;
    }

    // Handle code change
    if (updateGeographyDto.code && updateGeographyDto.code.toUpperCase() !== geography.code) {
      const parentId = updateGeographyDto.parentId !== undefined
        ? updateGeographyDto.parentId
        : geography.parent?.id || null;
      await this.checkCodeUniqueness(updateGeographyDto.code.toUpperCase(), parentId, id);
      geography.code = updateGeographyDto.code.toUpperCase();
    }

    if (updateGeographyDto.name) geography.name = updateGeographyDto.name.trim();

    return this.geographyRepository.save(geography);
  }

  async move(id: string, moveGeographyDto: MoveGeographyDto): Promise<Geography> {
    const geography = await this.geographyRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!geography) {
      throw new NotFoundException('Geography not found.');
    }

    const newParentId = moveGeographyDto.parentId ?? null;
    await this.validateParentChange(id, newParentId);

    if (newParentId) {
      const parent = await this.geographyRepository.findOneBy({ id: newParentId });
      if (!parent) {
        throw new NotFoundException('Parent geography not found.');
      }
      this.validateParentChildLevel(geography.level, parent.level);
      await this.checkCodeUniqueness(geography.code, newParentId, id);
      geography.parent = parent;
    } else {
      if (geography.level !== GeographyLevel.PLANET) {
        throw new BadRequestException('Only Planet level can be a root geography.');
      }
      await this.checkCodeUniqueness(geography.code, null, id);
      (geography as any).parent = null;
    }

    return this.geographyRepository.save(geography);
  }

  findTree(): Promise<Geography[]> {
    return this.geographyRepository.findTrees();
  }

  findOne(id: string): Promise<Geography | null> {
    return this.geographyRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  async remove(id: string): Promise<void> {
    const geography = await this.geographyRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!geography) {
      throw new NotFoundException('Geography not found.');
    }

    if (geography.children && geography.children.length > 0) {
      throw new ConflictException('Cannot delete a geography that has children.');
    }

    await this.geographyRepository.delete(id);
  }

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    const createNodes = async (nodes: SeedNode[], parent?: Geography) => {
      for (const node of nodes) {
        // Check if already exists (by code and parentId)
        const existing = await this.findByCodeAndParent(node.code, parent?.id || null);

        let geography: Geography;
        if (existing) {
          skipped++;
          geography = existing;
        } else {
          geography = this.geographyRepository.create({
            name: node.name,
            code: node.code,
            level: node.level,
          });
          if (parent) {
            geography.parent = parent;
          }
          geography = await this.geographyRepository.save(geography);
          inserted++;
        }

        if (node.children) {
          await createNodes(node.children, geography);
        }
      }
    };

    await createNodes(DEFAULT_SEED_DATA);

    return { inserted, skipped };
  }

  private async findByCodeAndParent(code: string, parentId: string | null): Promise<Geography | null> {
    const queryBuilder = this.geographyRepository.createQueryBuilder('geography');
    queryBuilder.where('UPPER(geography.code) = UPPER(:code)', { code });

    if (parentId) {
      queryBuilder.andWhere('geography.parentId = :parentId', { parentId });
    } else {
      queryBuilder.andWhere('geography.parentId IS NULL');
    }

    return queryBuilder.getOne();
  }

  private validateParentChildLevel(childLevel: GeographyLevel, parentLevel: GeographyLevel): void {
    const validParents = VALID_PARENT_LEVELS[childLevel];
    if (!validParents.includes(parentLevel)) {
      throw new BadRequestException(
        `Invalid level for selected parent. ${childLevel} cannot be a child of ${parentLevel}.`
      );
    }
  }

  private async validateParentChange(geographyId: string, newParentId: string | null): Promise<void> {
    if (!newParentId) {
      return;
    }

    if (geographyId === newParentId) {
      throw new BadRequestException('A geography cannot be its own parent.');
    }

    const geography = await this.geographyRepository.findOneBy({ id: geographyId });
    if (!geography) {
      throw new NotFoundException('Geography not found.');
    }

    const descendants = await this.geographyRepository.findDescendants(geography);
    const descendantIds = descendants.map(d => d.id);

    if (descendantIds.includes(newParentId)) {
      throw new BadRequestException('Cannot set a descendant as the parent (would create a cycle).');
    }
  }

  private async checkCodeUniqueness(
    code: string,
    parentId: string | null,
    excludeId?: string
  ): Promise<void> {
    const queryBuilder = this.geographyRepository.createQueryBuilder('geography');
    queryBuilder.where('UPPER(geography.code) = UPPER(:code)', { code });

    if (parentId) {
      queryBuilder.andWhere('geography.parentId = :parentId', { parentId });
    } else {
      queryBuilder.andWhere('geography.parentId IS NULL');
    }

    if (excludeId) {
      queryBuilder.andWhere('geography.id != :excludeId', { excludeId });
    }

    const existing = await queryBuilder.getOne();

    if (existing) {
      throw new ConflictException('Code already exists under this parent.');
    }
  }
}
