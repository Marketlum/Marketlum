import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateAddressInput,
  UpdateAddressInput,
  GeographyType,
} from '@marketlum/shared';
import { Address } from './entities/address.entity';
import { Agent } from '../entities/agent.entity';
import { Geography } from '../../geographies/geography.entity';
import {
  GEOCODING_CLIENT,
  GeocodingClient,
} from '../../geocoding/geocoding.client';

/**
 * Server-only options for AddressesService.create. Not part of the public
 * Zod surface — only seeders / internal call sites reach this path.
 */
export interface AddressCreateOpts {
  /** When true, skip the geocoder entirely. */
  skipGeocode?: boolean;
  /** Explicit coordinates to write (typically paired with skipGeocode=true). */
  latitude?: string;
  longitude?: string;
}

const POSTAL_FIELDS: ReadonlyArray<keyof UpdateAddressInput> = [
  'line1',
  'line2',
  'city',
  'region',
  'postalCode',
  'countryId',
];

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    @InjectRepository(Geography)
    private readonly geographiesRepository: Repository<Geography>,
    @Inject(GEOCODING_CLIENT)
    private readonly geocoder: GeocodingClient,
  ) {}

  async create(
    agentId: string,
    input: CreateAddressInput,
    opts?: AddressCreateOpts,
  ): Promise<Address> {
    await this.assertAgentExists(agentId);
    const country = await this.assertCountry(input.countryId);

    const address = this.addressesRepository.create({
      agentId,
      countryId: input.countryId,
      label: input.label ?? null,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      region: input.region ?? null,
      postalCode: input.postalCode,
      isPrimary: input.isPrimary === true,
      latitude: opts?.latitude ?? null,
      longitude: opts?.longitude ?? null,
    });

    if (address.isPrimary) {
      await this.clearPrimaryForAgent(agentId);
    }

    const saved = await this.addressesRepository.save(address);

    if (!opts?.skipGeocode && opts?.latitude === undefined) {
      const coords = await this.geocoder.geocode({
        line1: saved.line1,
        line2: saved.line2,
        city: saved.city,
        region: saved.region,
        postalCode: saved.postalCode,
        countryName: country.name,
      });
      if (coords) {
        await this.addressesRepository.update(saved.id, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }

    return this.findOne(agentId, saved.id);
  }

  async findAllForAgent(agentId: string): Promise<Address[]> {
    await this.assertAgentExists(agentId);
    const rows = await this.addressesRepository.find({
      where: { agentId },
      relations: ['country'],
    });
    return this.sortAddresses(rows);
  }

  async findOne(agentId: string, id: string): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id },
      relations: ['country'],
    });
    if (!address || address.agentId !== agentId) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async update(
    agentId: string,
    id: string,
    input: UpdateAddressInput,
  ): Promise<Address> {
    const address = await this.findOne(agentId, id);

    const postalChanged = POSTAL_FIELDS.some((field) => {
      if (input[field] === undefined) return false;
      const incoming = input[field] ?? null;
      const current = (address as unknown as Record<string, unknown>)[field] ?? null;
      return incoming !== current;
    });

    if (input.countryId !== undefined) {
      await this.assertCountry(input.countryId);
      address.countryId = input.countryId;
    }
    if (input.label !== undefined) address.label = input.label ?? null;
    if (input.line1 !== undefined) address.line1 = input.line1;
    if (input.line2 !== undefined) address.line2 = input.line2 ?? null;
    if (input.city !== undefined) address.city = input.city;
    if (input.region !== undefined) address.region = input.region ?? null;
    if (input.postalCode !== undefined) address.postalCode = input.postalCode;

    if (input.isPrimary !== undefined) {
      if (input.isPrimary === true && !address.isPrimary) {
        await this.clearPrimaryForAgent(agentId);
        address.isPrimary = true;
      } else if (input.isPrimary === false) {
        address.isPrimary = false;
      }
    }

    if (postalChanged) {
      address.latitude = null;
      address.longitude = null;
    }

    await this.addressesRepository.save(address);

    if (postalChanged) {
      const country = await this.geographiesRepository.findOne({
        where: { id: address.countryId },
      });
      if (country) {
        const coords = await this.geocoder.geocode({
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          region: address.region,
          postalCode: address.postalCode,
          countryName: country.name,
        });
        if (coords) {
          await this.addressesRepository.update(address.id, {
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      }
    }

    return this.findOne(agentId, id);
  }

  async remove(agentId: string, id: string): Promise<void> {
    const address = await this.findOne(agentId, id);
    await this.addressesRepository.remove(address);
  }

  /**
   * Sort: primary first, then createdAt ASC.
   * If no row is flagged primary, the most-recently-created row is treated as
   * primary at the API boundary (its `isPrimary` is set to true in the
   * returned objects without persisting to the DB).
   */
  sortAddresses(rows: Address[]): Address[] {
    const sorted = [...rows].sort((a, b) => {
      const at = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return at - bt;
    });
    const hasPrimary = sorted.some((r) => r.isPrimary);
    if (!hasPrimary && sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      last.isPrimary = true;
    }
    return sorted.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      const at = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return at - bt;
    });
  }

  private async assertAgentExists(agentId: string): Promise<void> {
    const exists = await this.agentsRepository.exist({ where: { id: agentId } });
    if (!exists) {
      throw new NotFoundException('Agent not found');
    }
  }

  private async assertCountry(countryId: string): Promise<Geography> {
    const country = await this.geographiesRepository.findOne({
      where: { id: countryId },
    });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    if (country.type !== GeographyType.COUNTRY) {
      throw new BadRequestException("Country must be of type 'country'");
    }
    return country;
  }

  private async clearPrimaryForAgent(agentId: string): Promise<void> {
    await this.addressesRepository.update(
      { agentId, isPrimary: true },
      { isPrimary: false },
    );
  }
}
