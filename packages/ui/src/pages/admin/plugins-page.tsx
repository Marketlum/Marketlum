'use client';

import { useEffect, useState } from 'react';
import { Puzzle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '../../lib/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { usePlugins } from '../../plugins/plugin-registry';
import { PluginSettingsForm } from '../../plugins/plugin-settings-form';

interface PluginListEntry {
  id: string;
  name: string;
  version: string;
  marketlumCoreVersion: string;
  hasSettings: boolean;
}

export function PluginsPage() {
  const t = useTranslations('plugins');
  const webPlugins = usePlugins();
  const [entries, setEntries] = useState<PluginListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PluginListEntry[]>('/plugins')
      .then(setEntries)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-2xl md:text-3xl font-bold">
        <Puzzle className="h-6 w-6 md:h-8 md:w-8" />
        {t('title')}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{t('description')}</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const web = webPlugins.find((w) => w.id === entry.id);
            return (
              <Card key={entry.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {entry.name}
                    <Badge variant="secondary">v{entry.version}</Badge>
                  </CardTitle>
                  <CardDescription>{entry.id}</CardDescription>
                </CardHeader>
                {entry.hasSettings && (
                  <CardContent>
                    {web?.SettingsComponent ? (
                      <web.SettingsComponent />
                    ) : web?.settingsSchema ? (
                      <PluginSettingsForm pluginId={entry.id} schema={web.settingsSchema} />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('noUi')}</p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
