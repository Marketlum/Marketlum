import { faker } from '@faker-js/faker';
import { TransactionsService } from '../../ledger/transactions.service';

interface TransactionDeps {
  accounts: Array<{ id: string }>;
}

export async function seedTransactions(service: TransactionsService, deps: TransactionDeps) {
  const transactions: Array<{ id: string }> = [];

  // Create transactions between account pairs
  for (let i = 0; i < Math.min(6, deps.accounts.length); i++) {
    const fromAccount = deps.accounts[i % deps.accounts.length];
    const toAccount = deps.accounts[(i + 1) % deps.accounts.length];
    const amount = faker.number.int({ min: 100, max: 10000 });

    const transaction = await service.create({
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: `${amount}.00`,
      description: faker.finance.transactionDescription(),
      timestamp: new Date(2026, i % 12, faker.number.int({ min: 1, max: 28 })).toISOString(),
    });
    transactions.push({ id: transaction.id });
  }

  return transactions;
}
