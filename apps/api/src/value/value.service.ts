import { Injectable } from '@nestjs/common';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, In } from 'typeorm';
import { Value, ValueType, ValueParentType } from './entities/value.entity';
import { ValueStream } from 'src/value_streams/entities/value_stream.entity';
import { Agent } from 'src/agents/entities/agent.entity';
import { FileUpload } from 'src/files/entities/file-upload.entity';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

interface SeedNode {
  name: string;
  description?: string;
  type: ValueType;
  parentType: ValueParentType;
  children?: SeedNode[];
}

const DEFAULT_SEED_DATA: SeedNode[] = [
  // SOFTWARE PRODUCTS HIERARCHY
  {
    name: 'Enterprise Software Suite',
    description: 'Complete enterprise software ecosystem',
    type: ValueType.PRODUCT,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      {
        name: 'Customer Relationship Management',
        description: 'CRM platform for managing customer interactions',
        type: ValueType.PRODUCT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Contact Management Module', description: 'Manage customer contacts and profiles', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Sales Pipeline Tracker', description: 'Track and manage sales opportunities', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Email Marketing Integration', description: 'Integrated email campaign management', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Customer Analytics Dashboard', description: 'Real-time customer insights', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Human Resources Platform',
        description: 'Complete HR management solution',
        type: ValueType.PRODUCT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Recruitment Module', description: 'Applicant tracking and hiring', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Payroll System', description: 'Automated payroll processing', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Performance Review Tool', description: 'Employee performance management', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Time & Attendance Tracker', description: 'Employee time tracking', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Benefits Administration', description: 'Employee benefits management', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Financial Management System',
        description: 'Enterprise financial operations',
        type: ValueType.PRODUCT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'General Ledger', description: 'Core accounting functionality', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Accounts Payable', description: 'Vendor payment management', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Accounts Receivable', description: 'Customer billing and collections', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Financial Reporting', description: 'Automated financial reports', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
          { name: 'Budget Planning Tool', description: 'Budget creation and tracking', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
        ],
      },
    ],
  },
  // PROFESSIONAL SERVICES HIERARCHY
  {
    name: 'Professional Services',
    description: 'Expert consulting and implementation services',
    type: ValueType.SERVICE,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      {
        name: 'Implementation Services',
        description: 'Software deployment and configuration',
        type: ValueType.SERVICE,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Requirements Analysis', description: 'Business requirements gathering', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'System Configuration', description: 'Initial system setup', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Data Migration', description: 'Legacy data transfer', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Integration Setup', description: 'Third-party integrations', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'User Acceptance Testing', description: 'UAT support and guidance', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Go-Live Support', description: 'Launch day assistance', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Training Services',
        description: 'User education and enablement',
        type: ValueType.SERVICE,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Administrator Training', description: 'System admin education', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'End User Training', description: 'Regular user training', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Train-the-Trainer Program', description: 'Internal trainer certification', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Custom Workshop Development', description: 'Tailored training content', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Consulting Services',
        description: 'Strategic business consulting',
        type: ValueType.SERVICE,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Process Optimization', description: 'Business process improvement', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Digital Transformation Strategy', description: 'Technology roadmap planning', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Change Management', description: 'Organizational change support', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Best Practices Review', description: 'Industry benchmarking', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Support Services',
        description: 'Ongoing technical assistance',
        type: ValueType.SERVICE,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Basic Support (Email)', description: 'Email-based assistance', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Premium Support (24/7)', description: 'Round-the-clock phone support', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Dedicated Account Manager', description: 'Personal support contact', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
          { name: 'Quarterly Business Review', description: 'Regular strategy sessions', type: ValueType.SERVICE, parentType: ValueParentType.PART_OF },
        ],
      },
    ],
  },
  // PARTNERSHIP & RELATIONSHIPS HIERARCHY
  {
    name: 'Strategic Partnerships',
    description: 'Business partnership ecosystem',
    type: ValueType.RELATIONSHIP,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      {
        name: 'Technology Partners',
        description: 'Technical integration partnerships',
        type: ValueType.RELATIONSHIP,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Cloud Infrastructure Partnership', description: 'AWS/Azure/GCP partnerships', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Security Vendor Alliance', description: 'Cybersecurity integrations', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Analytics Provider Partnership', description: 'BI tool integrations', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Payment Gateway Partnership', description: 'Payment processing integrations', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Channel Partners',
        description: 'Sales and distribution network',
        type: ValueType.RELATIONSHIP,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Reseller Network', description: 'Authorized resellers', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'System Integrator Partners', description: 'SI partner ecosystem', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Referral Partners', description: 'Lead generation network', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'OEM Partnerships', description: 'White-label arrangements', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Community Relationships',
        description: 'Community and ecosystem engagement',
        type: ValueType.RELATIONSHIP,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Developer Community', description: 'Developer ecosystem', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'User Groups', description: 'Customer communities', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Industry Associations', description: 'Trade organization memberships', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
          { name: 'Academic Partnerships', description: 'University collaborations', type: ValueType.RELATIONSHIP, parentType: ValueParentType.PART_OF },
        ],
      },
    ],
  },
  // RIGHTS & LICENSES HIERARCHY
  {
    name: 'Intellectual Property Portfolio',
    description: 'IP assets and licensing rights',
    type: ValueType.RIGHT,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      {
        name: 'Software Licenses',
        description: 'Software usage rights',
        type: ValueType.RIGHT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Perpetual License', description: 'One-time purchase license', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Subscription License', description: 'Monthly/annual subscription', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Enterprise Site License', description: 'Unlimited user license', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Developer License', description: 'Development/testing rights', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Academic License', description: 'Educational institution pricing', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Patents',
        description: 'Protected inventions',
        type: ValueType.RIGHT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Data Processing Algorithm Patent', description: 'Core algorithm protection', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'UI/UX Design Patents', description: 'Interface design protection', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Machine Learning Model Patent', description: 'AI/ML innovations', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Security Protocol Patent', description: 'Security method protection', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Trademarks',
        description: 'Brand identity protection',
        type: ValueType.RIGHT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Product Name Trademarks', description: 'Product brand names', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Logo Trademarks', description: 'Visual brand elements', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Tagline Trademarks', description: 'Marketing slogans', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
        ],
      },
      {
        name: 'Data Rights',
        description: 'Data usage and ownership rights',
        type: ValueType.RIGHT,
        parentType: ValueParentType.PART_OF,
        children: [
          { name: 'Customer Data Processing Rights', description: 'GDPR-compliant data processing', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Third-Party Data License', description: 'External data usage rights', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'Analytics Data Rights', description: 'Aggregated analytics usage', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
          { name: 'API Data Access Rights', description: 'API usage terms', type: ValueType.RIGHT, parentType: ValueParentType.PART_OF },
        ],
      },
    ],
  },
  // ADDITIONAL PRODUCTS
  {
    name: 'Mobile Applications',
    description: 'Mobile app product line',
    type: ValueType.PRODUCT,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      { name: 'iOS Enterprise App', description: 'iPhone/iPad application', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'Android Enterprise App', description: 'Android application', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'Mobile SDK', description: 'Mobile development kit', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'Offline Sync Module', description: 'Offline data synchronization', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
    ],
  },
  {
    name: 'API Platform',
    description: 'Developer API ecosystem',
    type: ValueType.PRODUCT,
    parentType: ValueParentType.ON_TOP_OF,
    children: [
      { name: 'REST API', description: 'RESTful web services', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'GraphQL API', description: 'GraphQL query interface', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'Webhooks System', description: 'Event notification system', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'API Documentation Portal', description: 'Interactive API docs', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
      { name: 'API Rate Limiting Service', description: 'Usage management', type: ValueType.PRODUCT, parentType: ValueParentType.PART_OF },
    ],
  },
];

@Injectable()
export class ValueService {
  constructor(
    @InjectRepository(Value)
    private valueRepository: TreeRepository<Value>,

    @InjectRepository(ValueStream)
    private valueStreamRepository: TreeRepository<ValueStream>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,

    @InjectRepository(FileUpload)
    private fileUploadRepository: Repository<FileUpload>,
  ) {}

  async create(createValueDto: CreateValueDto) {
    const value = this.valueRepository.create(createValueDto);

    if (createValueDto.parentId) {
      const parent = await this.valueRepository.findOneBy({ id: createValueDto.parentId });

      if (!parent) {
        throw new Error('Parent value not found.');
      }

      value.parent = parent;
    }
    if (createValueDto.streamId) {
      const stream = await this.valueStreamRepository.findOneBy({ id: createValueDto.streamId });

      if (!stream) {
        throw new Error('Value stream not found.');
      }

      value.stream = stream;
    }

    if (createValueDto.agentId) {
      const agent = await this.agentRepository.findOneBy({ id: createValueDto.agentId });

      if (!agent) {
        throw new Error('Agent not found.');
      }

      value.agent = agent;
    }

    if (createValueDto.fileIds && createValueDto.fileIds.length > 0) {
      const files = await this.fileUploadRepository.findBy({ id: In(createValueDto.fileIds) });
      value.files = files;
    }

    return this.valueRepository.save(value);
  }

  async update(id: string, updateValueDto: UpdateValueDto) {
    const { fileIds, ...rest } = updateValueDto;

    // Update basic fields
    if (Object.keys(rest).length > 0) {
      await this.valueRepository.update(id, rest);
    }

    // Handle files if provided
    if (fileIds !== undefined) {
      const value = await this.valueRepository.findOne({
        where: { id },
        relations: ['files'],
      });

      if (value) {
        if (fileIds.length > 0) {
          const files = await this.fileUploadRepository.findBy({ id: In(fileIds) });
          value.files = files;
        } else {
          value.files = [];
        }
        await this.valueRepository.save(value);
      }
    }

    return this.findOne(id);
  }

  findAll(): Promise<Value[]> {
    return this.valueRepository.findTrees({ relations: ["stream", "agent"] });
  }

  async paginate(options: IPaginationOptions): Promise<Pagination<Value>> {
    const queryBuilder = this.valueRepository
      .createQueryBuilder('value')
      .leftJoinAndSelect('value.stream', 'stream')
      .leftJoinAndSelect('value.agent', 'agent')
      .leftJoinAndSelect('value.parent', 'parent')
      .leftJoinAndSelect('value.files', 'files')
      .orderBy('value.name', 'ASC');

    return paginate<Value>(queryBuilder, options);
  }

  findFlat(streamId: string): Promise<Value[]> {
    return this.valueRepository.find({ where: {"stream": {"id": streamId}} });
  }

  async findOne(id: string): Promise<Value | null> {
    return await this.valueRepository.findOne({ where: {"id": id}, relations: ["parent", "stream", "agent", "files"] });
  }

  async remove(id: string): Promise<void> {
    await this.valueRepository.delete(id);
  }

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    const createNodes = async (nodes: SeedNode[], parent?: Value) => {
      for (const node of nodes) {
        // Check if already exists (by name and parentId)
        const existing = await this.findByNameAndParent(node.name, parent?.id || null);

        let value: Value;
        if (existing) {
          skipped++;
          value = existing;
        } else {
          value = this.valueRepository.create({
            name: node.name,
            description: node.description,
            type: node.type,
            parentType: node.parentType,
          });
          if (parent) {
            value.parent = parent;
          }
          value = await this.valueRepository.save(value);
          inserted++;
        }

        if (node.children) {
          await createNodes(node.children, value);
        }
      }
    };

    await createNodes(DEFAULT_SEED_DATA);

    return { inserted, skipped };
  }

  private async findByNameAndParent(name: string, parentId: string | null): Promise<Value | null> {
    const queryBuilder = this.valueRepository.createQueryBuilder('value');
    queryBuilder.where('LOWER(value.name) = LOWER(:name)', { name });

    if (parentId) {
      queryBuilder.andWhere('value.parentId = :parentId', { parentId });
    } else {
      queryBuilder.andWhere('value.parentId IS NULL');
    }

    return queryBuilder.getOne();
  }
}
