import { Module } from '@nestjs/common';
import { GEOCODING_CLIENT, RealGeocodingClient } from './geocoding.client';

@Module({
  providers: [
    {
      provide: GEOCODING_CLIENT,
      useFactory: () => new RealGeocodingClient(),
    },
  ],
  exports: [GEOCODING_CLIENT],
})
export class GeocodingModule {}
