import { SystemSettingsService } from '../../system-settings/system-settings.service';

interface ValueRef {
  id: string;
  name: string;
}

export async function seedSystemSettings(
  service: SystemSettingsService,
  deps: { values: ValueRef[]; presentationCurrencyName?: string },
) {
  const presentationCurrencyName = deps.presentationCurrencyName ?? 'USD';
  const presentationCurrency = deps.values.find((v) => v.name === presentationCurrencyName);
  if (!presentationCurrency) return null;
  await service.setPresentationCurrency(presentationCurrency.id);
  return { presentationCurrencyId: presentationCurrency.id };
}
