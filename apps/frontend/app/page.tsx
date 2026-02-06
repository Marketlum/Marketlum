"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton"
import {
  Users,
  Building2,
  Bot,
  FileText,
  Package,
  Wrench,
  Heart,
  Key,
  Workflow,
  Globe,
  FolderTree,
  Radio,
  Wallet,
  ArrowRightLeft,
  HardDrive,
  UserCheck,
  UserX,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MessageSquare,
  Send
} from "lucide-react"
import api from "@/lib/api-sdk"

type DashboardStats = {
  agents: {
    total: number
    byType: {
      individual: number
      organization: number
      virtual: number
    }
    withLocation: number
  }
  agreements: {
    total: number
    open: number
    completed: number
  }
  values: {
    total: number
    byType: {
      product: number
      service: number
      relationship: number
      right: number
    }
  }
  valueStreams: {
    total: number
  }
  users: {
    total: number
    active: number
    inactive: number
  }
  files: {
    total: number
    totalSizeBytes: number
  }
  ledger: {
    accounts: number
    transactions: number
    verifiedTransactions: number
  }
  geographies: {
    total: number
  }
  taxonomies: {
    total: number
  }
  channels: {
    total: number
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  color = "text-primary"
}: {
  title: string
  value: number | string
  description?: string
  icon: React.ElementType
  href?: string
  color?: string
}) {
  const content = (
    <Card className={`transition-all hover:shadow-md ${href ? "cursor-pointer hover:border-primary/50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold">{value}</div>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

function MiniStatItem({
  icon: Icon,
  label,
  value,
  color = "text-muted-foreground"
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold ml-auto">{value}</span>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [askInput, setAskInput] = useState("")

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch((error) => console.error("Error fetching dashboard stats:", error))
  }, [])

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (askInput.trim()) {
      router.push(`/chat?message=${encodeURIComponent(askInput.trim())}`)
    }
  }

  if (!stats) return <MarketlumDefaultSkeleton />

  return (
    <div className="flex flex-col space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your marketplace data</p>
      </header>

      {/* Ask Anything */}
      <Card className="bg-gradient-to-r from-green-500/5 via-cyan-500/5 to-purple-500/5 border-primary/20">
        <CardContent className="pt-6">
          <form onSubmit={handleAskSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Ask anything about your market"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                className="pl-11 h-12 text-base"
              />
            </div>
            <button
              type="submit"
              disabled={!askInput.trim()}
              className="h-12 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Send className="h-4 w-4" />
              Ask
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Main Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Agents"
          value={stats.agents.total}
          description="Market participants"
          icon={Users}
          href="/agents"
          color="text-blue-500"
        />
        <StatCard
          title="Agreements"
          value={stats.agreements.total}
          description={`${stats.agreements.open} open, ${stats.agreements.completed} completed`}
          icon={FileText}
          href="/agreements"
          color="text-amber-500"
        />
        <StatCard
          title="Values"
          value={stats.values.total}
          description="Products, services, relationships & rights"
          icon={Package}
          href="/value"
          color="text-green-500"
        />
        <StatCard
          title="Users"
          value={stats.users.total}
          description={`${stats.users.active} active, ${stats.users.inactive} inactive`}
          icon={UserCheck}
          href="/users"
          color="text-purple-500"
        />
      </div>

      {/* Detailed Stats Sections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Agents Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Agents by Type
            </CardTitle>
            <CardDescription>Distribution of market participants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Users}
              label="Individuals"
              value={stats.agents.byType.individual}
              color="text-blue-400"
            />
            <MiniStatItem
              icon={Building2}
              label="Organizations"
              value={stats.agents.byType.organization}
              color="text-blue-500"
            />
            <MiniStatItem
              icon={Bot}
              label="Virtual"
              value={stats.agents.byType.virtual}
              color="text-blue-600"
            />
            <hr className="my-2" />
            <MiniStatItem
              icon={MapPin}
              label="With Location"
              value={stats.agents.withLocation}
              color="text-green-500"
            />
          </CardContent>
        </Card>

        {/* Values Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Values by Type
            </CardTitle>
            <CardDescription>Types of value in the marketplace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Package}
              label="Products"
              value={stats.values.byType.product}
              color="text-blue-500"
            />
            <MiniStatItem
              icon={Wrench}
              label="Services"
              value={stats.values.byType.service}
              color="text-green-500"
            />
            <MiniStatItem
              icon={Heart}
              label="Relationships"
              value={stats.values.byType.relationship}
              color="text-amber-500"
            />
            <MiniStatItem
              icon={Key}
              label="Rights"
              value={stats.values.byType.right}
              color="text-purple-500"
            />
          </CardContent>
        </Card>

        {/* Agreements Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Agreement Status
            </CardTitle>
            <CardDescription>Current state of agreements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Clock}
              label="Open"
              value={stats.agreements.open}
              color="text-amber-500"
            />
            <MiniStatItem
              icon={CheckCircle2}
              label="Completed"
              value={stats.agreements.completed}
              color="text-green-500"
            />
          </CardContent>
        </Card>

        {/* Ledger Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-500" />
              Ledger
            </CardTitle>
            <CardDescription>Transaction tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Wallet}
              label="Accounts"
              value={stats.ledger.accounts}
              color="text-indigo-400"
            />
            <MiniStatItem
              icon={ArrowRightLeft}
              label="Transactions"
              value={stats.ledger.transactions}
              color="text-indigo-500"
            />
            <MiniStatItem
              icon={ShieldCheck}
              label="Verified"
              value={stats.ledger.verifiedTransactions}
              color="text-green-500"
            />
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-cyan-500" />
              Organization
            </CardTitle>
            <CardDescription>Taxonomies and structures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Workflow}
              label="Value Streams"
              value={stats.valueStreams.total}
              color="text-cyan-400"
            />
            <MiniStatItem
              icon={FolderTree}
              label="Taxonomies"
              value={stats.taxonomies.total}
              color="text-cyan-500"
            />
            <MiniStatItem
              icon={Radio}
              label="Channels"
              value={stats.channels.total}
              color="text-cyan-600"
            />
            <MiniStatItem
              icon={Globe}
              label="Geographies"
              value={stats.geographies.total}
              color="text-cyan-700"
            />
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-rose-500" />
              Media Library
            </CardTitle>
            <CardDescription>Uploaded files and storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={FileText}
              label="Total Files"
              value={stats.files.total}
              color="text-rose-400"
            />
            <MiniStatItem
              icon={HardDrive}
              label="Storage Used"
              value={formatBytes(stats.files.totalSizeBytes)}
              color="text-rose-500"
            />
          </CardContent>
        </Card>
      </div>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            User Activity
          </CardTitle>
          <CardDescription>User account status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.users.total}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.users.active}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <UserX className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.users.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive Users</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
