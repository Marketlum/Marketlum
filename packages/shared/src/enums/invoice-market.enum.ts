/** Which market an invoice belongs to: between own entities (internal) or
 * with outside counterparties (external). A recorded attribute only. */
export enum InvoiceMarket {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}
