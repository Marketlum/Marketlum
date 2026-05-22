import { faker } from '@faker-js/faker';
import { ValuesService } from '../../values/values.service';
import { ValueType, ValueLifecycleStage, ValueParentType } from '@marketlum/shared';

interface ValueDeps {
  taxonomies: { all: Array<{ id: string; name: string }> };
  agents: Array<{ id: string; name: string }>;
  valueStreams: { all: Array<{ id: string; name: string; code: string }> };
}

interface ValueDef {
  code: string;
  name: string;
  type: ValueType;
  purpose: string;
  lifecycleStage: ValueLifecycleStage;
  abstract?: boolean;
  parentCode?: string;
  parentType?: ValueParentType;
  // Coarse routing: which seeded value-stream code and agent name to attach.
  // null means "leave the field unset" (used for fiat currencies, which no
  // single agent owns).
  valueStream: string;
  agent: string | null;
}

// Battery and grid-storage value chain. Order matters: every value's
// parentCode (if set) must reference a value defined earlier so the seeder
// can look up the parent id during a single forward pass.
const VALUES: ValueDef[] = [
  // ===== Currencies (used by invoices, recurring flows, exchange rates) =====
  { code: 'usd', name: 'USD', type: ValueType.CURRENCY, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Reserve currency for international transactions',
    valueStream: 'backoffice_operations', agent: null },
  { code: 'eur', name: 'EUR', type: ValueType.CURRENCY, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Eurozone currency',
    valueStream: 'backoffice_operations', agent: null },
  { code: 'pln', name: 'PLN', type: ValueType.CURRENCY, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Polish sovereign currency',
    valueStream: 'backoffice_operations', agent: null },
  { code: 'gbp', name: 'GBP', type: ValueType.CURRENCY, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Sterling, the currency of the United Kingdom',
    valueStream: 'backoffice_operations', agent: null },
  { code: 'btc', name: 'BTC', type: ValueType.CURRENCY, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Peer-to-peer electronic cash; settlement option for cross-border deals',
    valueStream: 'backoffice_operations', agent: null },

  // ===== Core product chain: Cell → Module → Pack → Cabinet → Array =====
  // Each link is on_top_of its predecessor, so the chain appears in the
  // network graph. Each one also has its own part_of subtree (components),
  // which feeds the circle-packing composition view on the right.

  // -- Battery Cell (root) and its components --
  { code: 'battery_cell', name: 'Battery Cell', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Atomic energy-storage unit; the smallest sellable building block',
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'cathode_material', name: 'Cathode Material', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'NMC811 cathode active material',
    parentCode: 'battery_cell', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'anode_material', name: 'Anode Material', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Graphite-silicon composite anode',
    parentCode: 'battery_cell', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'electrolyte', name: 'Electrolyte', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Lithium-salt organic electrolyte solution',
    parentCode: 'battery_cell', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'separator_film', name: 'Separator Film', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Polymeric ion-permeable separator',
    parentCode: 'battery_cell', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'cell_casing', name: 'Cell Casing', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Prismatic aluminum cell enclosure',
    parentCode: 'battery_cell', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },

  // -- Battery Module (on_top_of Battery Cell) and its components --
  { code: 'battery_module', name: 'Battery Module', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'A serially-connected stack of cells with shared thermal management',
    parentCode: 'battery_cell', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'cell_stack', name: 'Cell Stack', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Twelve cells in series, busbar-welded',
    parentCode: 'battery_module', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'module_housing', name: 'Module Housing', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Mechanical enclosure with mounting interfaces',
    parentCode: 'battery_module', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'thermal_management_plate', name: 'Thermal Management Plate', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Aluminum cold plate with liquid cooling channels',
    parentCode: 'battery_module', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'module_bms_slice', name: 'Module BMS Slice', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Per-module cell-voltage and temperature monitor',
    parentCode: 'battery_module', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'TechNova Solutions' },

  // -- Battery Pack (on_top_of Battery Module) and its components --
  { code: 'battery_pack', name: 'Battery Pack', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Fully assembled, monitored, and protected battery system',
    parentCode: 'battery_module', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'pack_enclosure', name: 'Pack Enclosure', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'IP67-rated steel enclosure with venting',
    parentCode: 'battery_pack', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'pack_wiring_harness', name: 'Pack Wiring Harness', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Low-voltage signaling and high-voltage power distribution',
    parentCode: 'battery_pack', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'master_bms', name: 'Master BMS', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Pack-level battery management computer and CAN gateway',
    parentCode: 'battery_pack', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'TechNova Solutions' },
  { code: 'pack_cooling_system', name: 'Pack Cooling System', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Glycol loop, pump, and heat-exchanger plate',
    parentCode: 'battery_pack', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'hv_connector', name: 'HV Connector', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'High-voltage shielded interlocked connector',
    parentCode: 'battery_pack', parentType: ValueParentType.PART_OF,
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },

  // -- Industrial Storage Cabinet (on_top_of Battery Pack) and its components --
  { code: 'industrial_storage_cabinet', name: 'Industrial Storage Cabinet', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Floor-standing energy storage cabinet for behind-the-meter use',
    parentCode: 'battery_pack', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'cabinet_frame', name: 'Cabinet Frame', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Welded steel chassis with seismic anchoring points',
    parentCode: 'industrial_storage_cabinet', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'power_conversion_system', name: 'Power Conversion System', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Bidirectional inverter converting DC pack output to AC',
    parentCode: 'industrial_storage_cabinet', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'fire_suppression_system', name: 'Fire Suppression System', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Aerosol-based fire suppression with thermal detectors',
    parentCode: 'industrial_storage_cabinet', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'cabinet_climate_controller', name: 'Cabinet Climate Controller', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Internal HVAC for thermal regulation in extreme climates',
    parentCode: 'industrial_storage_cabinet', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },

  // -- Grid-Scale Storage Array (on_top_of Industrial Storage Cabinet) --
  { code: 'grid_scale_storage_array', name: 'Grid-Scale Storage Array', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Containerized multi-megawatt-hour storage block for utilities',
    parentCode: 'industrial_storage_cabinet', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'container_frame', name: 'Container Frame', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: '40-foot ISO container with reinforced floor and fire walls',
    parentCode: 'grid_scale_storage_array', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'site_cooling_system', name: 'Site Cooling System', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Dry-cooler and chilled-water loop sized for full-power discharge',
    parentCode: 'grid_scale_storage_array', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },
  { code: 'grid_connection_module', name: 'Grid Connection Module', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Medium-voltage transformer, switchgear, and protection relays',
    parentCode: 'grid_scale_storage_array', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },

  // -- Site Installation Service (on_top_of Grid-Scale Storage Array) --
  // Closes the chain: a service that sits on top of the largest product.
  { code: 'site_installation', name: 'Site Installation & Commissioning', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Turnkey installation and commissioning at the customer site',
    parentCode: 'grid_scale_storage_array', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'industrial_implementation', agent: 'James Liu' },
  { code: 'civil_works_coordination', name: 'Civil Works Coordination', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Foundation, fencing, and access-road readiness with local contractors',
    parentCode: 'site_installation', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'James Liu' },
  { code: 'electrical_commissioning', name: 'Electrical Commissioning', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'High-voltage termination, energization sequence, and witness testing',
    parentCode: 'site_installation', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'grid_code_compliance_testing', name: 'Grid Code Compliance Testing', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Reactive-power, frequency-response, and ride-through verification',
    parentCode: 'site_installation', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },

  // ===== Engineering Services (abstract umbrella) =====
  { code: 'battery_engineering_services', name: 'Battery Engineering Services', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    abstract: true,
    purpose: 'Umbrella for paid engineering engagements outside of standard installs',
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'cell_chemistry_consulting', name: 'Cell Chemistry Consulting', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Chemistry selection, cycle-life modeling, and degradation analysis',
    parentCode: 'battery_engineering_services', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Sarah Palmer' },
  { code: 'pack_design_service', name: 'Pack Design Service', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Mechanical, thermal, and electrical pack design for OEMs',
    parentCode: 'battery_engineering_services', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'bms_calibration_service', name: 'BMS Calibration Service', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'State-of-charge and state-of-health algorithm tuning per chemistry',
    parentCode: 'battery_engineering_services', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },

  // ===== Operations & Maintenance (abstract umbrella) =====
  { code: 'operations_maintenance', name: 'Operations & Maintenance', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    abstract: true,
    purpose: 'Ongoing service offerings for deployed systems',
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'remote_monitoring', name: 'Remote Monitoring', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: '24/7 telemetry-driven monitoring with alerting and weekly reports',
    parentCode: 'operations_maintenance', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'TechNova Solutions' },
  { code: 'field_service_dispatch', name: 'Field Service Dispatch', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'On-call engineer dispatch with contracted response times',
    parentCode: 'operations_maintenance', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'James Liu' },
  { code: 'annual_inspection', name: 'Annual Inspection', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Scheduled inspection, torque checks, thermal imaging, and reporting',
    parentCode: 'operations_maintenance', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'James Liu' },
  { code: 'performance_warranty_service', name: 'Performance Warranty Service', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Throughput and round-trip-efficiency guarantee with annual settlement',
    parentCode: 'operations_maintenance', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'Acme Corp' },

  // ===== Training Academy =====
  { code: 'training_academy', name: 'Training Academy', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Hands-on technical training for installers and operators',
    valueStream: 'people', agent: 'TechNova Solutions' },
  { code: 'installer_certification_course', name: 'Installer Certification Course', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Five-day course covering safe installation and lock-out / tag-out',
    parentCode: 'training_academy', parentType: ValueParentType.PART_OF,
    valueStream: 'people', agent: 'TechNova Solutions' },
  { code: 'safety_awareness_program', name: 'Safety Awareness Program', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Online refresher modules with annual recertification',
    parentCode: 'training_academy', parentType: ValueParentType.PART_OF,
    valueStream: 'people', agent: 'TechNova Solutions' },

  // ===== End-of-Life Recycling (and the products and relationships built on top of it) =====
  { code: 'end_of_life_recycling', name: 'End-of-Life Recycling', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Take-back and material recovery for spent packs',
    valueStream: 'industrial_implementation', agent: 'GreenLeaf Partners' },
  { code: 'battery_collection_logistics', name: 'Battery Collection Logistics', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'UN-compliant reverse logistics for damaged and end-of-life packs',
    parentCode: 'end_of_life_recycling', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'GreenLeaf Partners' },
  { code: 'shredding_sorting', name: 'Shredding & Sorting', type: ValueType.SERVICE, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Mechanical disassembly, shredding, and material stream separation',
    parentCode: 'end_of_life_recycling', parentType: ValueParentType.PART_OF,
    valueStream: 'industrial_implementation', agent: 'GreenLeaf Partners' },
  { code: 'recycled_cathode_material', name: 'Recycled Cathode Material', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Recovered cathode powder ready for cell-grade reprocessing',
    parentCode: 'end_of_life_recycling', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'batteries_manufacturing', agent: 'GreenLeaf Partners' },

  // ===== Research and legacy products (network leaves that show lifecycle variety) =====
  { code: 'solid_state_cell', name: 'Solid-State Cell', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.IDEA,
    purpose: 'Next-generation solid-electrolyte cell, currently in R&D',
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'nimh_battery_cell', name: 'NiMH Battery Cell', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.LEGACY,
    purpose: 'Legacy nickel-metal-hydride chemistry retained for service spares only',
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },
  { code: 'lead_acid_battery_cell', name: 'Lead-Acid Battery Cell', type: ValueType.PRODUCT, lifecycleStage: ValueLifecycleStage.LEGACY,
    purpose: 'Legacy chemistry used in starter-battery accounts that are winding down',
    valueStream: 'batteries_manufacturing', agent: 'Acme Corp' },

  // ===== Rights (patents, licenses, certifications) =====
  { code: 'cathode_chemistry_patent', name: 'Cathode Chemistry Patent Family', type: ValueType.RIGHT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Granted patents covering the proprietary NMC811 process route',
    valueStream: 'licensing_ecosystem', agent: 'Acme Corp' },
  { code: 'recycling_process_ip', name: 'Recycling Process IP', type: ValueType.RIGHT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Pending patents covering the hydrometallurgical recovery route',
    valueStream: 'licensing_ecosystem', agent: 'GreenLeaf Partners' },
  { code: 'un38_3_type_approval', name: 'UN 38.3 Type Approval', type: ValueType.RIGHT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Transportation safety certification covering Cell, Module, and Pack',
    valueStream: 'licensing_ecosystem', agent: 'Acme Corp' },
  { code: 'bms_firmware_license', name: 'BMS Firmware License', type: ValueType.RIGHT, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Per-pack license to ship the proprietary BMS firmware',
    parentCode: 'battery_pack', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'licensing_ecosystem', agent: 'TechNova Solutions' },
  { code: 'grid_operator_connection_permit', name: 'Grid Operator Connection Permit', type: ValueType.RIGHT, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Per-site permit issued by the local TSO to inject into the grid',
    parentCode: 'grid_scale_storage_array', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'licensing_ecosystem', agent: 'Acme Corp' },

  // ===== Relationships =====
  { code: 'strategic_oem_partnership', name: 'Strategic OEM Partnership', type: ValueType.RELATIONSHIP, lifecycleStage: ValueLifecycleStage.STABLE,
    abstract: true,
    purpose: 'Long-term co-development and supply relationship with vehicle OEMs',
    valueStream: 'market_development', agent: 'Acme Corp' },
  { code: 'lithium_supply_agreement', name: 'Lithium Supply Agreement', type: ValueType.RELATIONSHIP, lifecycleStage: ValueLifecycleStage.STABLE,
    purpose: 'Multi-year offtake securing battery-grade lithium carbonate',
    valueStream: 'market_development', agent: 'Acme Corp' },
  { code: 'recycler_network_membership', name: 'Recycler Network Membership', type: ValueType.RELATIONSHIP, lifecycleStage: ValueLifecycleStage.BETA,
    purpose: 'Membership in the regional take-back compliance scheme',
    parentCode: 'end_of_life_recycling', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'market_development', agent: 'GreenLeaf Partners' },
  { code: 'research_consortium_membership', name: 'Research Consortium Membership', type: ValueType.RELATIONSHIP, lifecycleStage: ValueLifecycleStage.ALPHA,
    purpose: 'Academic consortium for pre-competitive solid-state cell research',
    parentCode: 'solid_state_cell', parentType: ValueParentType.ON_TOP_OF,
    valueStream: 'market_development', agent: 'Sarah Palmer' },
];

export async function seedValues(service: ValuesService, deps: ValueDeps) {
  const agentsByName = new Map(deps.agents.map((a) => [a.name, a]));
  const valueStreamsByCode = new Map(deps.valueStreams.all.map((vs) => [vs.code, vs]));
  const taxonomies = deps.taxonomies.all;
  const idByCode = new Map<string, string>();

  const values: Array<{ id: string; name: string; type: ValueType }> = [];

  for (let i = 0; i < VALUES.length; i++) {
    const def = VALUES[i];
    const agent = def.agent ? agentsByName.get(def.agent) : null;
    const valueStream = valueStreamsByCode.get(def.valueStream);
    // Spread taxonomies across the values so the sample data exercises the
    // taxonomy join; pick deterministically by index for repeatable seeds.
    const taxonomy = taxonomies[i % taxonomies.length];

    const created = await service.create({
      code: def.code,
      name: def.name,
      type: def.type,
      purpose: def.purpose,
      description: faker.lorem.paragraph(),
      lifecycleStage: def.lifecycleStage,
      abstract: def.abstract ?? false,
      mainTaxonomyId: taxonomy?.id,
      agentId: agent?.id,
      valueStreamId: valueStream?.id,
      parentId: def.parentCode ? idByCode.get(def.parentCode) : undefined,
      parentType: def.parentType,
    });

    idByCode.set(def.code, created.id);
    values.push({ id: created.id, name: created.name, type: def.type });
  }

  return values;
}
