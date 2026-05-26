import { faker } from '@faker-js/faker';
import { ValueInstancesService } from '../../value-instances/value-instances.service';
import { ValueType } from '@marketlum/shared';

interface ValueInstanceDeps {
  values: Array<{ id: string; name: string; type: ValueType }>;
  agents: Array<{ id: string; name: string }>;
}

interface InstanceDef {
  code: string;
  name: string;
  purpose: string;
  version?: string;
  // Absolute ISO date so the seed is reproducible regardless of run date.
  expiresAt?: string;
  // Looked up by name against the seeded values; must reference a non-CURRENCY
  // value (PRODUCT / RIGHT / RELATIONSHIP / SERVICE).
  valueName: string;
  // Looked up by name against the seeded agents. `null` means leave the field
  // unset — used when the counterparty is outside the seeded org (e.g. a TSO,
  // an OEM, or a state certifier we do not model).
  fromAgent: string | null;
  toAgent: string | null;
}

// Battery and grid-storage instances. Each row is a specific, realistic
// "thing" in the value chain — a serialized pack, a granted patent, a signed
// offtake — not a category. The mix is deliberately weighted toward PRODUCT /
// RIGHT / RELATIONSHIP because currency "instances" do not carry meaning in
// this domain (a USD is a USD).
const INSTANCES: InstanceDef[] = [
  // ===== PRODUCT instances — serialized units, batches, deployed systems =====
  {
    code: 'bat_pack_2025_eu_042',
    name: 'Battery Pack BAT-2025-EU-042',
    purpose: 'Serialized 250 kWh pack delivered for the Munich-Süd commissioning slot',
    version: 'PACK-v2.1',
    valueName: 'Battery Pack',
    fromAgent: 'Acme Corp',
    toAgent: 'TechNova Solutions',
  },
  {
    code: 'cell_batch_2025_w08',
    name: 'Cell Batch 2025-W08-12k',
    purpose: 'Twelve-thousand-cell production batch from week 08, routed into module assembly',
    version: 'Batch 2025-W08',
    valueName: 'Battery Cell',
    fromAgent: 'Acme Corp',
    toAgent: 'Acme Corp',
  },
  {
    code: 'cathode_lot_2025_q1_a',
    name: 'Cathode Lot 2025-Q1-NMC811-A',
    purpose: 'Quarterly NMC811 active-material lot feeding the EU cell line',
    version: 'Lot Q1-A',
    valueName: 'Cathode Material',
    fromAgent: 'Acme Corp',
    toAgent: 'Acme Corp',
  },
  {
    code: 'recycled_cathode_lot_2025_r018',
    name: 'Recycled Cathode Lot 2025-R-018',
    purpose: 'Hydromet-recovered cathode powder cycled back into Q2 cell production',
    version: 'Lot R-018',
    valueName: 'Recycled Cathode Material',
    fromAgent: 'GreenLeaf Partners',
    toAgent: 'Acme Corp',
  },
  {
    code: 'cabinet_isc_2025_berlin_07',
    name: 'Cabinet ISC-2025-Berlin-07',
    purpose: 'Behind-the-meter storage cabinet shipped to the Berlin pilot rooftop site',
    version: 'CAB-v1.3',
    valueName: 'Industrial Storage Cabinet',
    fromAgent: 'Acme Corp',
    toAgent: 'GreenLeaf Partners',
  },
  {
    code: 'gsa_bavaria_01',
    name: 'Bavaria-01 Grid Array',
    purpose: 'First 18 MWh containerized array deployed under the Bavaria storage initiative',
    version: 'GSA-2025-01',
    valueName: 'Grid-Scale Storage Array',
    fromAgent: 'Acme Corp',
    toAgent: null,
  },

  // ===== RIGHT instances — granted certificates, patents, licenses, permits =====
  {
    code: 'un38_3_cert_acme_2024_001',
    name: 'UN 38.3 Certificate ACME-2024-001',
    purpose: 'Type-approval certificate covering Cell, Module, and Pack for road and air transport',
    version: 'Rev 2024-A',
    expiresAt: '2029-11-30T00:00:00.000Z',
    valueName: 'UN 38.3 Type Approval',
    fromAgent: null,
    toAgent: 'Acme Corp',
  },
  {
    code: 'patent_ep_3456789',
    name: 'Patent EP3456789 — Cathode Family A',
    purpose: 'Granted European patent covering the proprietary NMC811 process route',
    version: 'EP3456789-B1',
    expiresAt: '2044-04-15T00:00:00.000Z',
    valueName: 'Cathode Chemistry Patent Family',
    fromAgent: null,
    toAgent: 'Acme Corp',
  },
  {
    code: 'bms_license_2025_eu_042',
    name: 'BMS Firmware License 2025-EU-042',
    purpose: 'Per-pack firmware license bound to BAT-2025-EU-042 via the Master BMS serial',
    version: 'BMS-FW-3.4',
    expiresAt: '2035-12-31T00:00:00.000Z',
    valueName: 'BMS Firmware License',
    fromAgent: 'TechNova Solutions',
    toAgent: 'Acme Corp',
  },
  {
    code: 'grid_permit_bavaria_01',
    name: 'Bavaria-01 Grid Connection Permit',
    purpose: 'Site-specific connection permit issued by the local TSO for the Bavaria-01 array',
    version: 'GOP-2025-BAV-01',
    expiresAt: '2030-06-30T00:00:00.000Z',
    valueName: 'Grid Operator Connection Permit',
    fromAgent: null,
    toAgent: 'Acme Corp',
  },

  // ===== RELATIONSHIP instances — signed contracts, memberships =====
  {
    code: 'northstar_oem_partnership',
    name: 'NorthStar Mobility OEM Partnership',
    purpose: 'Co-development and supply MSA for NorthStar\'s next-gen commercial-EV platform',
    version: 'MSA 2025',
    expiresAt: '2030-12-31T00:00:00.000Z',
    valueName: 'Strategic OEM Partnership',
    fromAgent: 'Acme Corp',
    toAgent: null,
  },
  {
    code: 'salar_lithium_offtake_2025',
    name: 'Salar Lithium Offtake 2025-2030',
    purpose: 'Five-year offtake of battery-grade lithium carbonate from the Atacama operation',
    version: 'Offtake 2025-A',
    expiresAt: '2030-12-31T00:00:00.000Z',
    valueName: 'Lithium Supply Agreement',
    fromAgent: null,
    toAgent: 'Acme Corp',
  },
  {
    code: 'eu_battery_compliance_4421',
    name: 'EU Battery Compliance Network Membership #4421',
    purpose: 'Annual membership in the EU-wide take-back compliance scheme for industrial batteries',
    version: '2025 renewal',
    expiresAt: '2026-12-31T00:00:00.000Z',
    valueName: 'Recycler Network Membership',
    fromAgent: null,
    toAgent: 'GreenLeaf Partners',
  },
  {
    code: 'solid_state_consortium_2025',
    name: 'Solid-State Cell Consortium — 2025 Cohort',
    purpose: 'Pre-competitive consortium with three universities focused on sulfide electrolytes',
    version: '2025 cohort',
    expiresAt: '2027-06-30T00:00:00.000Z',
    valueName: 'Research Consortium Membership',
    fromAgent: 'Sarah Palmer',
    toAgent: 'Acme Corp',
  },
];

export async function seedValueInstances(
  service: ValueInstancesService,
  deps: ValueInstanceDeps,
) {
  const valuesByName = new Map(deps.values.map((v) => [v.name, v]));
  const agentsByName = new Map(deps.agents.map((a) => [a.name, a]));

  const instances: Array<{ id: string; name: string; valueId: string }> = [];

  for (const def of INSTANCES) {
    const value = valuesByName.get(def.valueName);
    if (!value) {
      throw new Error(
        `Value instance seeder: value "${def.valueName}" not found (referenced by "${def.code}")`,
      );
    }
    if (value.type === ValueType.CURRENCY) {
      throw new Error(
        `Value instance seeder: refusing to create an instance of currency "${def.valueName}"`,
      );
    }

    const fromAgent = def.fromAgent ? agentsByName.get(def.fromAgent) : null;
    const toAgent = def.toAgent ? agentsByName.get(def.toAgent) : null;

    const instance = await service.create({
      code: def.code,
      name: def.name,
      purpose: def.purpose,
      description: faker.lorem.paragraph(),
      version: def.version,
      expiresAt: def.expiresAt,
      valueId: value.id,
      fromAgentId: fromAgent?.id ?? null,
      toAgentId: toAgent?.id ?? null,
    });
    instances.push({ id: instance.id, name: instance.name, valueId: value.id });
  }

  return instances;
}
