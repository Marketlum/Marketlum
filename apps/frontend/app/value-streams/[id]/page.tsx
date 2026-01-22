"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  HandHeart,
  Package,
  Wrench,
  Heart,
  Key,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Minus,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  Zap,
  Archive,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { ValueStreamIcon } from "@/components/value-streams/icons";
import api from "@/lib/api-sdk";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
  image?: { id: string; altText?: string | null } | null;
};

type ValueStreamStats = {
  values: {
    total: number;
    byType: {
      product: number;
      service: number;
      relationship: number;
      right: number;
    };
  };
  valueInstances: {
    total: number;
    byDirection: {
      incoming: number;
      outgoing: number;
      internal: number;
      neutral: number;
    };
  };
  exchanges: {
    total: number;
    byState: {
      open: number;
      completed: number;
      closed: number;
    };
  };
  offerings: {
    total: number;
    byState: {
      draft: number;
      live: number;
      archived: number;
    };
  };
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  color = "text-primary",
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  color?: string;
}) {
  const content = (
    <Card
      className={`transition-all hover:shadow-md ${href ? "cursor-pointer hover:border-primary/50" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold">{value}</div>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function MiniStatItem({
  icon: Icon,
  label,
  value,
  color = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold ml-auto">{value}</span>
    </div>
  );
}

const ValueStreamDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [valueStream, setValueStream] = useState<ValueStream | null>(null);
  const [stats, setStats] = useState<ValueStreamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getValueStream(id), api.getValueStreamStats(id)])
      .then(([streamData, statsData]) => {
        setValueStream(streamData);
        setStats(statsData);
      })
      .catch((error) => {
        console.error("Error fetching value stream:", error);
        router.push("/value-streams");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  if (loading || !valueStream || !stats) {
    return <MarketlumDefaultSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/value-streams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {valueStream.image ? (
              <img
                src={`${apiBaseUrl}/files/${valueStream.image.id}/thumbnail`}
                alt={valueStream.image.altText || valueStream.name}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <ValueStreamIcon className="h-8 w-8" />
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HandHeart className="h-6 w-6" />
                {valueStream.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Overview Card */}
      {valueStream.purpose && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose</label>
              <p className="mt-1">{valueStream.purpose}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Values"
          value={stats.values.total}
          description="Products, services, relationships & rights"
          icon={Package}
          href="/value"
          color="text-green-500"
        />
        <StatCard
          title="Value Instances"
          value={stats.valueInstances.total}
          description="Concrete value occurrences"
          icon={Boxes}
          href="/value-instances"
          color="text-blue-500"
        />
        <StatCard
          title="Exchanges"
          value={stats.exchanges.total}
          description={`${stats.exchanges.byState.open} open, ${stats.exchanges.byState.completed} completed`}
          icon={ShoppingCart}
          href="/exchanges"
          color="text-amber-500"
        />
        <StatCard
          title="Offerings"
          value={stats.offerings.total}
          description={`${stats.offerings.byState.live} live, ${stats.offerings.byState.draft} draft`}
          icon={Zap}
          href="/offerings"
          color="text-purple-500"
        />
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Values by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Values by Type
            </CardTitle>
            <CardDescription>Distribution of value types</CardDescription>
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

        {/* Value Instances by Direction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-500" />
              Instances by Direction
            </CardTitle>
            <CardDescription>Flow direction of instances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={ArrowDownLeft}
              label="Incoming"
              value={stats.valueInstances.byDirection.incoming}
              color="text-green-500"
            />
            <MiniStatItem
              icon={ArrowUpRight}
              label="Outgoing"
              value={stats.valueInstances.byDirection.outgoing}
              color="text-red-500"
            />
            <MiniStatItem
              icon={RefreshCw}
              label="Internal"
              value={stats.valueInstances.byDirection.internal}
              color="text-blue-500"
            />
            <MiniStatItem
              icon={Minus}
              label="Neutral"
              value={stats.valueInstances.byDirection.neutral}
              color="text-gray-500"
            />
          </CardContent>
        </Card>

        {/* Exchanges by State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              Exchanges by State
            </CardTitle>
            <CardDescription>Current state of exchanges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={Clock}
              label="Open"
              value={stats.exchanges.byState.open}
              color="text-amber-500"
            />
            <MiniStatItem
              icon={CheckCircle2}
              label="Completed"
              value={stats.exchanges.byState.completed}
              color="text-green-500"
            />
            <MiniStatItem
              icon={XCircle}
              label="Closed"
              value={stats.exchanges.byState.closed}
              color="text-gray-500"
            />
          </CardContent>
        </Card>

        {/* Offerings by State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Offerings by State
            </CardTitle>
            <CardDescription>Current state of offerings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStatItem
              icon={FileEdit}
              label="Draft"
              value={stats.offerings.byState.draft}
              color="text-gray-500"
            />
            <MiniStatItem
              icon={Zap}
              label="Live"
              value={stats.offerings.byState.live}
              color="text-green-500"
            />
            <MiniStatItem
              icon={Archive}
              label="Archived"
              value={stats.offerings.byState.archived}
              color="text-amber-500"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ValueStreamDetailsPage;
