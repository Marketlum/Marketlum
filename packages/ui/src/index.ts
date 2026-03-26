// =============================================================================
// 1. UI Primitives (components/ui/)
// =============================================================================

// badge
export type { BadgeProps } from './components/ui/badge';
export { Badge, badgeVariants } from './components/ui/badge';

// breadcrumb
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './components/ui/breadcrumb';

// button
export type { ButtonProps } from './components/ui/button';
export { Button, buttonVariants } from './components/ui/button';

// card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/ui/card';

// dialog
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './components/ui/dialog';

// dropdown-menu
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from './components/ui/dropdown-menu';

// input
export type { InputProps } from './components/ui/input';
export { Input } from './components/ui/input';

// label
export { Label } from './components/ui/label';

// popover
export { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover';

// select
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem } from './components/ui/select';

// sheet
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './components/ui/sheet';

// table
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/ui/table';

// tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';

// textarea
export type { TextareaProps } from './components/ui/textarea';
export { Textarea } from './components/ui/textarea';

// tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip';

// =============================================================================
// 2. Shared Components (components/shared/)
// =============================================================================

export type { ActiveFilter } from './components/shared/active-filters';
export { ActiveFilters } from './components/shared/active-filters';
export { ColumnVisibilityDropdown } from './components/shared/column-visibility-dropdown';
export { ConfirmDeleteDialog } from './components/shared/confirm-delete-dialog';
export { DataTable } from './components/shared/data-table';
export { DataTableFilterSheet } from './components/shared/data-table-filter-sheet';
export { DataTablePagination } from './components/shared/data-table-pagination';
export { DataTableToolbar } from './components/shared/data-table-toolbar';
export { ExportDropdown } from './components/shared/export-dropdown';
export { isImageMimeType, getFileIcon, FileImagePreview } from './components/shared/file-image-preview';
export { LocaleSwitcher } from './components/shared/locale-switcher';
export { MarkdownEditor, MarkdownContent } from './components/shared/markdown-editor';
export { PerspectiveSelector } from './components/shared/perspective-selector';
export { TaxonomyMultiCombobox } from './components/shared/taxonomy-multi-combobox';
export { TaxonomyTreeSelect } from './components/shared/taxonomy-tree-select';
export { ThemeProvider } from './components/shared/theme-provider';
export { ThemeSwitcher } from './components/shared/theme-switcher';
export { ValueCombobox } from './components/shared/value-combobox';

// =============================================================================
// 3. Entity Components (components/<entity>/)
// =============================================================================

// accounts
export { AccountFormDialog } from './components/accounts/account-form-dialog';
export { AccountsDataTable } from './components/accounts/accounts-data-table';
export { getAccountColumns } from './components/accounts/columns';

// agents
export { AgentFormDialog } from './components/agents/agent-form-dialog';
export { AgentTypeBadge } from './components/agents/agent-type-badge';
export { AgentValuesTable } from './components/agents/agent-values-table';
export { AgentsDataTable } from './components/agents/agents-data-table';
export { getAgentColumns } from './components/agents/columns';
export { ImageLibraryDialog as AgentImageLibraryDialog } from './components/agents/image-library-dialog';

// agreement-templates
export { AgreementTemplateFormDialog } from './components/agreement-templates/agreement-template-form-dialog';
export { AgreementTemplateTreeNodeComponent } from './components/agreement-templates/agreement-template-tree-node';
export { AgreementTemplateTreeView } from './components/agreement-templates/agreement-template-tree-view';
export { AgreementTemplatesDataTable } from './components/agreement-templates/agreement-templates-data-table';
export { getAgreementTemplateColumns } from './components/agreement-templates/columns';

// agreements
export { AgreementFormDialog } from './components/agreements/agreement-form-dialog';
export { AgreementTreeNodeComponent } from './components/agreements/agreement-tree-node';
export { AgreementTreeView } from './components/agreements/agreement-tree-view';
export { AgreementsDataTable } from './components/agreements/agreements-data-table';
export { getAgreementColumns } from './components/agreements/columns';

// archetypes
export { ArchetypeFormDialog } from './components/archetypes/archetype-form-dialog';
export { ArchetypesDataTable } from './components/archetypes/archetypes-data-table';
export { getArchetypeColumns } from './components/archetypes/columns';
export { ImageLibraryDialog as ArchetypeImageLibraryDialog } from './components/archetypes/image-library-dialog';

// auth
export { LoginForm } from './components/auth/login-form';

// channels
export { ChannelFormDialog } from './components/channels/channel-form-dialog';
export { ChannelTreeNodeComponent } from './components/channels/channel-tree-node';
export { ChannelTreeView } from './components/channels/channel-tree-view';
export { ChannelsDataTable } from './components/channels/channels-data-table';
export { getChannelColumns } from './components/channels/columns';

// dashboard
export { Dashboard } from './components/dashboard/dashboard';
export { RevenueExpensesChart } from './components/dashboard/revenue-expenses-chart';

// exchanges
export { ExchangeFlowGraph } from './components/exchanges/exchange-flow-graph';
export { ExchangeFlowsPanel } from './components/exchanges/exchange-flows-panel';
export { ExchangeFormDialog } from './components/exchanges/exchange-form-dialog';
export { ExchangesDataTable } from './components/exchanges/exchanges-data-table';
export { getExchangeColumns } from './components/exchanges/columns';

// files
export { FilesManager } from './components/files/files-manager';

// geographies
export { GeographyTreeNodeComponent } from './components/geographies/geography-tree-node';
export { GeographyTreeView } from './components/geographies/geography-tree-view';

// invoices
export { InvoiceFormDialog } from './components/invoices/invoice-form-dialog';
export { InvoicesDataTable } from './components/invoices/invoices-data-table';
export { getInvoiceColumns } from './components/invoices/columns';

// locales
export { LocaleCreateDialog } from './components/locales/locale-create-dialog';
export { LocalesDataTable } from './components/locales/locales-data-table';
export { getLocaleColumns } from './components/locales/columns';

// offerings
export { OfferingFormDialog } from './components/offerings/offering-form-dialog';
export { OfferingsDataTable } from './components/offerings/offerings-data-table';
export { getOfferingColumns } from './components/offerings/columns';

// pipelines
export { PipelineFormDialog } from './components/pipelines/pipeline-form-dialog';
export { PipelinesDataTable } from './components/pipelines/pipelines-data-table';
export { getPipelineColumns } from './components/pipelines/columns';

// search
export { GlobalSearchInput } from './components/search/global-search-input';

// taxonomies
export { getTaxonomySearchColumns } from './components/taxonomies/taxonomy-search-columns';
export { TaxonomyTreeNodeComponent } from './components/taxonomies/taxonomy-tree-node';
export { TaxonomyTreeView } from './components/taxonomies/taxonomy-tree-view';

// transactions
export { TransactionFormDialog } from './components/transactions/transaction-form-dialog';
export { TransactionsDataTable } from './components/transactions/transactions-data-table';
export { getTransactionColumns } from './components/transactions/columns';

// users
export { UserFormDialog } from './components/users/user-form-dialog';
export { UsersDataTable } from './components/users/users-data-table';
export { getUserColumns } from './components/users/columns';

// value-instances
export { ValueInstanceFormDialog } from './components/value-instances/value-instance-form-dialog';
export { ValueInstancesDataTable } from './components/value-instances/value-instances-data-table';
export { NetworkGraph } from './components/value-instances/network-graph';
export { getValueInstanceColumns } from './components/value-instances/columns';

// value-streams
export { ValueStreamFormDialog } from './components/value-streams/value-stream-form-dialog';
export { ValueStreamTreeNodeComponent } from './components/value-streams/value-stream-tree-node';
export { ValueStreamTreeView } from './components/value-streams/value-stream-tree-view';

// values
export { ValueFormDialog } from './components/values/value-form-dialog';
export { ValueLifecycleBadge } from './components/values/value-lifecycle-badge';
export { ValueTypeBadge } from './components/values/value-type-badge';
export { ValuesDataTable } from './components/values/values-data-table';
export { ValuesNetworkGraph } from './components/values/values-network-graph';
export { getValueColumns } from './components/values/columns';

// =============================================================================
// 4. Hooks
// =============================================================================

export { useAccounts } from './hooks/use-accounts';
export { useAgents } from './hooks/use-agents';
export { useAgreementTemplates } from './hooks/use-agreement-templates';
export { useAgreementTree } from './hooks/use-agreement-tree';
export { useChannels } from './hooks/use-channels';
export { useDebounce } from './hooks/use-debounce';
export { useIsMobile } from './hooks/use-mobile';
export type { PaginationState } from './hooks/use-pagination';
export { usePagination } from './hooks/use-pagination';
export { usePerspectives } from './hooks/use-perspectives';
export { usePipelines } from './hooks/use-pipelines';
export { useTaxonomies } from './hooks/use-taxonomies';
export { useTaxonomyTree } from './hooks/use-taxonomy-tree';
export { useUsers } from './hooks/use-users';
export { useValueInstances } from './hooks/use-value-instances';
export { useValueStreamTree } from './hooks/use-value-stream-tree';
export { useValueStreams } from './hooks/use-value-streams';
export { useValues } from './hooks/use-values';

// =============================================================================
// 5. Lib
// =============================================================================

export { ApiError, api } from './lib/api-client';
export { login, logout, getMe } from './lib/auth';
export { getMobileColumnVisibility, mergeColumnVisibility } from './lib/column-visibility';
export type { FieldDef, ExportFormat } from './lib/export-utils';
export { toCsv, toJson, toXml, toMarkdown, exportData } from './lib/export-utils';
export { cn } from './lib/utils';

// =============================================================================
// 6. Pages
// =============================================================================

export { AccountsPage } from './pages/admin/accounts-page';
export { AgentDetailPage } from './pages/admin/agent-detail-page';
export { AgentsPage } from './pages/admin/agents-page';
export { AgreementDetailPage } from './pages/admin/agreement-detail-page';
export { AgreementTemplatesPage } from './pages/admin/agreement-templates-page';
export { AgreementsPage } from './pages/admin/agreements-page';
export { ArchetypeDetailPage } from './pages/admin/archetype-detail-page';
export { ArchetypesPage } from './pages/admin/archetypes-page';
export { ChannelsPage } from './pages/admin/channels-page';
export { DashboardPage } from './pages/admin/dashboard-page';
export { ExchangeDetailPage } from './pages/admin/exchange-detail-page';
export { ExchangesGraphPage } from './pages/admin/exchanges-graph-page';
export { ExchangesPage } from './pages/admin/exchanges-page';
export { FilesPage } from './pages/admin/files-page';
export { GeographiesPage } from './pages/admin/geographies-page';
export { InvoiceDetailPage } from './pages/admin/invoice-detail-page';
export { InvoicesPage } from './pages/admin/invoices-page';
export { LocalesPage } from './pages/admin/locales-page';
export { OfferingDetailPage } from './pages/admin/offering-detail-page';
export { OfferingsPage } from './pages/admin/offerings-page';
export { PipelinesPage } from './pages/admin/pipelines-page';
export { SearchPage } from './pages/admin/search-page';
export { TaxonomiesPage } from './pages/admin/taxonomies-page';
export { TransactionsPage } from './pages/admin/transactions-page';
export { UsersPage } from './pages/admin/users-page';
export { ValueDetailPage } from './pages/admin/value-detail-page';
export { ValueInstanceDetailPage } from './pages/admin/value-instance-detail-page';
export { ValueInstancesGraphPage } from './pages/admin/value-instances-graph-page';
export { ValueInstancesPage } from './pages/admin/value-instances-page';
export { ValueStreamDetailPage } from './pages/admin/value-stream-detail-page';
export { ValueStreamsPage } from './pages/admin/value-streams-page';
export { ValuesGraphPage } from './pages/admin/values-graph-page';
export { ValuesPage } from './pages/admin/values-page';
export { LoginPage } from './pages/login-page';

// =============================================================================
// 7. Layouts
// =============================================================================

export { AdminLayout } from './layouts/admin-layout';

// =============================================================================
// 8. i18n Config
// =============================================================================

export { locales, defaultLocale } from './i18n/config';
export type { Locale } from './i18n/config';
export { setLocale } from './i18n/actions';
