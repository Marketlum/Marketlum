import { Logger } from '@nestjs/common';
import { Client, Status } from '@googlemaps/google-maps-services-js';

export const GEOCODING_CLIENT = Symbol.for('GEOCODING_CLIENT');

export interface GeocodeInput {
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  countryName: string;
}

export interface GeocodingClient {
  /**
   * Returns coordinates as decimal strings, or null when geocoding
   * fails for any reason (missing API key, ZERO_RESULTS, network, parse).
   * Never throws — write-null-and-move-on by design (see spec 007 §3.2).
   */
  geocode(input: GeocodeInput): Promise<{ latitude: string; longitude: string } | null>;
}

export class RealGeocodingClient implements GeocodingClient {
  private readonly logger = new Logger(RealGeocodingClient.name);
  private readonly client: Client;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not set — geocoding disabled');
    }
    this.client = new Client({});
  }

  async geocode(input: GeocodeInput): Promise<{ latitude: string; longitude: string } | null> {
    if (!this.apiKey) return null;

    const address = [
      input.line1,
      input.line2,
      [input.postalCode, input.city].filter(Boolean).join(' '),
      input.region,
      input.countryName,
    ]
      .filter((s) => s && s.trim().length > 0)
      .join(', ');

    try {
      const res = await this.client.geocode({
        params: { address, key: this.apiKey, language: 'en' },
        timeout: 5_000,
      });

      if (res.data.status !== Status.OK || res.data.results.length === 0) {
        this.logger.warn(`geocode failed status=${res.data.status} address="${address}"`);
        return null;
      }

      const loc = res.data.results[0].geometry.location;
      return {
        latitude: Number(loc.lat).toFixed(7),
        longitude: Number(loc.lng).toFixed(7),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`geocode error: ${message} address="${address}"`);
      return null;
    }
  }
}
