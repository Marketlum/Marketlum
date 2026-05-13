import { SystemSettingsService } from '../../system-settings/system-settings.service';

interface ValueRef {
  id: string;
  name: string;
}

export async function seedSystemSettings(
  service: SystemSettingsService,
  deps: { values: ValueRef[]; baseValueName?: string },
) {
  const baseValueName = deps.baseValueName ?? 'USD';
  const base = deps.values.find((v) => v.name === baseValueName);
  if (!base) return null;
  await service.setBaseValue(base.id);
  return { baseValueId: base.id };
}
