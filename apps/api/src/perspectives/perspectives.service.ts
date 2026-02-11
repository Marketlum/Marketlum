import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perspective } from './entities/perspective.entity';
import type { CreatePerspectiveInput, UpdatePerspectiveInput } from '@marketlum/shared';

@Injectable()
export class PerspectivesService {
  constructor(
    @InjectRepository(Perspective)
    private readonly perspectiveRepository: Repository<Perspective>,
  ) {}

  async create(userId: string, input: CreatePerspectiveInput): Promise<Perspective> {
    if (input.isDefault) {
      await this.unsetDefaultForUserAndTable(userId, input.table);
    }

    const perspective = this.perspectiveRepository.create({
      ...input,
      userId,
    });

    return this.perspectiveRepository.save(perspective);
  }

  async findAll(userId: string, table: string): Promise<Perspective[]> {
    return this.perspectiveRepository.find({
      where: { userId, table },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Perspective> {
    const perspective = await this.perspectiveRepository.findOne({
      where: { id, userId },
    });

    if (!perspective) {
      throw new NotFoundException();
    }

    return perspective;
  }

  async update(userId: string, id: string, input: UpdatePerspectiveInput): Promise<Perspective> {
    const perspective = await this.findOne(userId, id);

    if (input.isDefault) {
      await this.unsetDefaultForUserAndTable(userId, perspective.table);
    }

    Object.assign(perspective, input);
    return this.perspectiveRepository.save(perspective);
  }

  async remove(userId: string, id: string): Promise<void> {
    const perspective = await this.findOne(userId, id);
    await this.perspectiveRepository.remove(perspective);
  }

  private async unsetDefaultForUserAndTable(userId: string, table: string): Promise<void> {
    await this.perspectiveRepository.update(
      { userId, table, isDefault: true },
      { isDefault: false },
    );
  }
}
