import type { NbpTableA } from '@marketlum/plugin-nbp';

/**
 * Deterministic stand-in for NbpClient used in e2e tests. Step definitions seed
 * `tableA` via setRate(); the NBP service reads it instead of calling the live API.
 */
export class FakeNbpClient {
  public tableA: NbpTableA = { table: 'A', effectiveDate: '2026-01-01', rates: [] };
  public failNext = false;

  async fetchTableA(): Promise<NbpTableA> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('NBP unavailable');
    }
    return this.tableA;
  }

  setRate(code: string, mid: number, effectiveDate: string): void {
    this.tableA.effectiveDate = effectiveDate;
    this.tableA.rates = this.tableA.rates.filter((r) => r.code !== code);
    this.tableA.rates.push({ currency: code, code, mid });
  }

  reset(): void {
    this.tableA = { table: 'A', effectiveDate: '2026-01-01', rates: [] };
    this.failNext = false;
  }
}
