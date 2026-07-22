/** Line total for an order item: quantity × unitPrice, fixed to 2 decimals. */
export function orderItemTotal(quantity: string, unitPrice: string): string {
  return (Number(quantity) * Number(unitPrice)).toFixed(2);
}

/** Order total: sum of item line totals, fixed to 2 decimals. */
export function orderTotal(items: { quantity: string; unitPrice: string }[]): string {
  return items
    .reduce((sum, item) => sum + Number(orderItemTotal(item.quantity, item.unitPrice)), 0)
    .toFixed(2);
}
