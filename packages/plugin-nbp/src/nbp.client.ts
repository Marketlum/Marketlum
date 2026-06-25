import { Injectable } from '@nestjs/common';

export interface NbpRate {
  currency: string;
  code: string;
  mid: number;
}

export interface NbpTableA {
  table: string;
  effectiveDate: string;
  rates: NbpRate[];
}

const NBP_TABLE_A_URL = 'https://api.nbp.pl/api/exchangerates/tables/A?format=json';

/**
 * Thin HTTP client for the NBP table A endpoint. Isolated behind an injectable
 * so tests can substitute a deterministic fake.
 */
@Injectable()
export class NbpClient {
  async fetchTableA(): Promise<NbpTableA> {
    const response = await fetch(NBP_TABLE_A_URL);
    if (!response.ok) {
      throw new Error(`NBP API returned ${response.status}`);
    }
    const payload = (await response.json()) as NbpTableA[];
    const table = payload[0];
    return {
      table: table.table,
      effectiveDate: table.effectiveDate,
      rates: table.rates,
    };
  }
}
