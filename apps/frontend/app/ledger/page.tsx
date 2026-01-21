"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Landmark,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  CheckCircle,
  Circle,
  ArrowRight,
  Database,
  ArrowUpDown,
  Users,
  Package,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  Account,
  Transaction,
  AccountsResponse,
  TransactionsResponse,
  formatBalance,
  formatAmount,
} from "@/components/ledger/types";
import { AccountForm } from "@/components/ledger/account-form";
import { TransactionForm } from "@/components/ledger/transaction-form";
import api from "@/lib/api-sdk";

type Agent = {
  id: string;
  name: string;
  type: string;
};

type Value = {
  id: string;
  name: string;
  type: string;
};

const ITEMS_PER_PAGE = 10;

type ViewMode = "accounts" | "transactions";

const LedgerPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("accounts");

  // Filter data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [values, setValues] = useState<Value[]>([]);

  // Accounts state
  const [accountsData, setAccountsData] = useState<AccountsResponse | null>(null);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsSearch, setAccountsSearch] = useState("");
  const [accountsOwnerFilter, setAccountsOwnerFilter] = useState<string>("");
  const [accountsValueFilter, setAccountsValueFilter] = useState<string>("");
  const [accountsSort, setAccountsSort] = useState<string>("updatedAt_desc");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  // Transactions state
  const [transactionsData, setTransactionsData] = useState<TransactionsResponse | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsSearch, setTransactionsSearch] = useState("");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch filter data
  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getValuesList(1, 100),
    ])
      .then(([agentsData, valuesData]) => {
        setAgents(agentsData.items);
        setValues(valuesData.items);
      })
      .catch((error) => {
        console.error("Error fetching filter data:", error);
      });
  }, []);

  // Fetch accounts
  const fetchAccounts = (page: number = accountsPage) => {
    api.getAccounts({
      page,
      limit: ITEMS_PER_PAGE,
      q: accountsSearch || undefined,
      ownerAgentId: accountsOwnerFilter || undefined,
      valueId: accountsValueFilter || undefined,
      sort: accountsSort,
    })
      .then((data) => setAccountsData(data))
      .catch((error) => {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to fetch accounts");
      });
  };

  // Fetch transactions
  const fetchTransactions = (page: number = transactionsPage) => {
    api.getTransactions({
      page,
      limit: ITEMS_PER_PAGE,
      q: transactionsSearch || undefined,
      sort: "timestamp_desc",
    })
      .then((data) => setTransactionsData(data))
      .catch((error) => {
        console.error("Error fetching transactions:", error);
        toast.error("Failed to fetch transactions");
      });
  };

  useEffect(() => {
    fetchAccounts(1);
    fetchTransactions(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode === "accounts") {
        setAccountsPage(1);
        fetchAccounts(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [accountsSearch]);

  // Refetch accounts when filters or sort change
  useEffect(() => {
    if (viewMode === "accounts") {
      setAccountsPage(1);
      fetchAccounts(1);
    }
  }, [accountsOwnerFilter, accountsValueFilter, accountsSort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode === "transactions") {
        setTransactionsPage(1);
        fetchTransactions(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [transactionsSearch]);

  // Account handlers
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await api.deleteAccount(deletingAccount.id);
      toast.success("Account deleted successfully");
      fetchAccounts();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to delete account";
      toast.error(message);
    } finally {
      setDeletingAccount(null);
    }
  };

  const handleAccountFormSuccess = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
    fetchAccounts();
  };

  const handleAccountFormCancel = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
  };

  // Transaction handlers
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    try {
      await api.deleteTransaction(deletingTransaction.id);
      toast.success("Transaction deleted successfully");
      fetchTransactions();
      fetchAccounts(); // Refresh balances
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to delete transaction";
      toast.error(message);
    } finally {
      setDeletingTransaction(null);
    }
  };

  const handleVerifyTransaction = async (transaction: Transaction) => {
    try {
      await api.verifyTransaction(transaction.id, !transaction.verified);
      toast.success(transaction.verified ? "Transaction unverified" : "Transaction verified");
      fetchTransactions();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to update verification";
      toast.error(message);
    }
  };

  const handleTransactionFormSuccess = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
    fetchTransactions();
    fetchAccounts(); // Refresh balances
  };

  const handleTransactionFormCancel = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  // Seed handler
  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedLedger();
      toast.success(`Loaded ${result.accounts} accounts and ${result.transactions} transactions`);
      fetchAccounts(1);
      fetchTransactions(1);
      // Refresh filter data too
      const [agentsData, valuesData] = await Promise.all([
        api.getAgents(1, 100),
        api.getValuesList(1, 100),
      ]);
      setAgents(agentsData.items);
      setValues(valuesData.items);
    } catch {
      toast.error("Failed to load sample data");
    } finally {
      setIsSeeding(false);
    }
  };

  if (!accountsData || !transactionsData) {
    return <MarketlumDefaultSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          LEDGER
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={() => setShowAccountForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </header>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Accounts ({accountsData.meta.totalItems})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transactions ({transactionsData.meta.totalItems})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={accountsSearch}
                onChange={(e) => setAccountsSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={accountsOwnerFilter || "_all"}
              onValueChange={(value) => setAccountsOwnerFilter(value === "_all" ? "" : value)}
            >
              <SelectTrigger className="w-[200px]">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All owners</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={accountsValueFilter || "_all"}
              onValueChange={(value) => setAccountsValueFilter(value === "_all" ? "" : value)}
            >
              <SelectTrigger className="w-[200px]">
                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All values</SelectItem>
                {values.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={accountsSort}
              onValueChange={setAccountsSort}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt_desc">Recently updated</SelectItem>
                <SelectItem value="updatedAt_asc">Oldest updated</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="balance_desc">Balance (high to low)</SelectItem>
                <SelectItem value="balance_asc">Balance (low to high)</SelectItem>
                <SelectItem value="createdAt_desc">Newest first</SelectItem>
                <SelectItem value="createdAt_asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No accounts found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  accountsData.items.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.name}</div>
                          {account.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {account.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{account.ownerAgent?.name || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.value?.name || "Unknown"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBalance(account.balance)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingAccount(account)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {accountsData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {accountsData.meta.currentPage} of {accountsData.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAccountsPage(accountsPage - 1);
                    fetchAccounts(accountsPage - 1);
                  }}
                  disabled={accountsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAccountsPage(accountsPage + 1);
                    fetchAccounts(accountsPage + 1);
                  }}
                  disabled={accountsPage === accountsData.meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions by note..."
              value={transactionsSearch}
              onChange={(e) => setTransactionsSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No transactions found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactionsData.items.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transaction.fromAccount?.name || "Unknown"}</TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>{transaction.toAccount?.name || "Unknown"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {transaction.verified ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Circle className="h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground truncate block max-w-[150px]">
                          {transaction.note || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleVerifyTransaction(transaction)}>
                              {transaction.verified ? (
                                <>
                                  <Circle className="mr-2 h-4 w-4" />
                                  Mark Unverified
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Verified
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingTransaction(transaction)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {transactionsData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {transactionsData.meta.currentPage} of {transactionsData.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTransactionsPage(transactionsPage - 1);
                    fetchTransactions(transactionsPage - 1);
                  }}
                  disabled={transactionsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTransactionsPage(transactionsPage + 1);
                    fetchTransactions(transactionsPage + 1);
                  }}
                  disabled={transactionsPage === transactionsData.meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Account Form Dialog */}
      <Dialog open={showAccountForm} onOpenChange={(open) => !open && handleAccountFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "New Account"}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onSuccess={handleAccountFormSuccess}
            onCancel={handleAccountFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Transaction Form Dialog */}
      <Dialog open={showTransactionForm} onOpenChange={(open) => !open && handleTransactionFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Edit Transaction" : "New Transaction"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={editingTransaction}
            onSuccess={handleTransactionFormSuccess}
            onCancel={handleTransactionFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAccount?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This will reverse its effect on account balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LedgerPage;
