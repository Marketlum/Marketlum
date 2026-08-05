'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, MapIcon } from 'lucide-react';
import type { ActorResponse, PaginatedResponse } from '@marketlum/shared';
import { ActorType } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { TaxonomyTreeSelect } from '../../components/shared/taxonomy-tree-select';
import { CountryCombobox } from '../../components/shared/country-combobox';
import { useTaxonomyTree } from '../../hooks/use-taxonomy-tree';
import { useCountries } from '../../hooks/use-countries';
import { ActorMapEmpty } from '../../components/actors/actor-map-empty';

const ActorsMap = dynamic(
  () => import('../../components/actors/actors-map').then((m) => m.ActorsMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

function MapSkeleton() {
  return <div className="h-[600px] w-full animate-pulse rounded-md bg-muted" />;
}

const ALL = '__all__';

export function ActorsMapPage() {
  const t = useTranslations('actorsMap');
  const [actors, setActors] = useState<ActorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [taxonomyId, setTaxonomyId] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);

  const { tree } = useTaxonomyTree();
  const { countries } = useCountries();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<PaginatedResponse<ActorResponse>>('/actors?limit=500')
      .then((result) => {
        if (!cancelled) setActors(result.data);
      })
      .catch(() => {
        if (!cancelled) setActors([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return actors.filter((a) => {
      if (typeFilter !== ALL && a.type !== typeFilter) return false;
      if (taxonomyId) {
        const taxIds = new Set<string>();
        if (a.mainTaxonomy?.id) taxIds.add(a.mainTaxonomy.id);
        for (const t of a.taxonomies ?? []) taxIds.add(t.id);
        if (!taxIds.has(taxonomyId)) return false;
      }
      if (countryId) {
        const primary = (a.addresses ?? []).find((addr) => addr.isPrimary);
        if (!primary || primary.country.id !== countryId) return false;
      }
      return true;
    });
  }, [actors, typeFilter, taxonomyId, countryId]);

  const plottableCount = filtered.filter((a) => {
    const p = (a.addresses ?? []).find((addr) => addr.isPrimary);
    return !!p && !!p.latitude && !!p.longitude;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/actors" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToActors')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold flex items-center gap-2">
            <MapIcon className="h-6 w-6" />
            {t('title')}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('filterType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allTypes')}</SelectItem>
              <SelectItem value={ActorType.ORGANIZATION}>Organization</SelectItem>
              <SelectItem value={ActorType.INDIVIDUAL}>Individual</SelectItem>
              <SelectItem value={ActorType.VIRTUAL}>Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <TaxonomyTreeSelect
            tree={tree}
            value={taxonomyId}
            onSelect={(id) => setTaxonomyId(id)}
            placeholder={t('filterTaxonomy')}
            noneLabel={t('allTaxonomies')}
          />
        </div>
        <div className="w-64">
          <CountryCombobox
            countries={countries}
            value={countryId}
            onSelect={(id) => setCountryId(id)}
            placeholder={t('filterCountry')}
          />
        </div>
      </div>

      {loading ? (
        <MapSkeleton />
      ) : plottableCount === 0 ? (
        <ActorMapEmpty />
      ) : (
        <ActorsMap actors={filtered} viewActorLabel={t('viewActor')} />
      )}
    </div>
  );
}
