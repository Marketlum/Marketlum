import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentType } from '../agents/entities/agent.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Value } from '../value/entities/value.entity';
import { ValueStream } from '../value_streams/entities/value_stream.entity';
import { User } from '../users/entities/user.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Account } from '../ledger/entities/account.entity';
import { Transaction } from '../ledger/entities/transaction.entity';
import { Geography } from '../geographies/entities/geography.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { Channel } from '../channels/entities/channel.entity';

export interface DashboardStats {
  agents: {
    total: number;
    byType: {
      individual: number;
      organization: number;
      virtual: number;
    };
    withLocation: number;
  };
  agreements: {
    total: number;
    open: number;
    completed: number;
  };
  values: {
    total: number;
    byType: {
      product: number;
      service: number;
      relationship: number;
      right: number;
    };
  };
  valueStreams: {
    total: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  files: {
    total: number;
    totalSizeBytes: number;
  };
  ledger: {
    accounts: number;
    transactions: number;
    verifiedTransactions: number;
  };
  geographies: {
    total: number;
  };
  taxonomies: {
    total: number;
  };
  channels: {
    total: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Agreement)
    private agreementRepository: Repository<Agreement>,
    @InjectRepository(Value)
    private valueRepository: Repository<Value>,
    @InjectRepository(ValueStream)
    private valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FileUpload)
    private fileRepository: Repository<FileUpload>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Geography)
    private geographyRepository: Repository<Geography>,
    @InjectRepository(Taxonomy)
    private taxonomyRepository: Repository<Taxonomy>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    // Agent stats
    const [
      agentTotal,
      agentsByType,
      agentsWithLocation,
    ] = await Promise.all([
      this.agentRepository.count(),
      this.agentRepository
        .createQueryBuilder('agent')
        .select('agent.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('agent.type')
        .getRawMany(),
      this.agentRepository
        .createQueryBuilder('agent')
        .where('agent.latitude IS NOT NULL AND agent.longitude IS NOT NULL')
        .getCount(),
    ]);

    const agentTypeMap = agentsByType.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count, 10);
      return acc;
    }, {} as Record<string, number>);

    // Agreement stats
    const [agreementTotal, agreementOpen] = await Promise.all([
      this.agreementRepository.count(),
      this.agreementRepository
        .createQueryBuilder('agreement')
        .where('agreement.completedAt IS NULL')
        .getCount(),
    ]);

    // Value stats
    const [valueTotal, valuesByType] = await Promise.all([
      this.valueRepository.count(),
      this.valueRepository
        .createQueryBuilder('value')
        .select('value.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('value.type')
        .getRawMany(),
    ]);

    const valueTypeMap = valuesByType.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count, 10);
      return acc;
    }, {} as Record<string, number>);

    // Value streams
    const valueStreamTotal = await this.valueStreamRepository.count();

    // User stats
    const [userTotal, userActive] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
    ]);

    // File stats
    const fileStats = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(file.sizeBytes), 0)', 'totalSize')
      .getRawOne();

    // Ledger stats
    const [accountCount, transactionCount, verifiedCount] = await Promise.all([
      this.accountRepository.count(),
      this.transactionRepository.count(),
      this.transactionRepository.count({ where: { verified: true } }),
    ]);

    // Other counts
    const [geographyCount, taxonomyCount, channelCount] = await Promise.all([
      this.geographyRepository.count(),
      this.taxonomyRepository.count(),
      this.channelRepository.count(),
    ]);

    return {
      agents: {
        total: agentTotal,
        byType: {
          individual: agentTypeMap[AgentType.INDIVIDUAL] || 0,
          organization: agentTypeMap[AgentType.ORGANIZATION] || 0,
          virtual: agentTypeMap[AgentType.VIRTUAL] || 0,
        },
        withLocation: agentsWithLocation,
      },
      agreements: {
        total: agreementTotal,
        open: agreementOpen,
        completed: agreementTotal - agreementOpen,
      },
      values: {
        total: valueTotal,
        byType: {
          product: valueTypeMap['product'] || 0,
          service: valueTypeMap['service'] || 0,
          relationship: valueTypeMap['relationship'] || 0,
          right: valueTypeMap['right'] || 0,
        },
      },
      valueStreams: {
        total: valueStreamTotal,
      },
      users: {
        total: userTotal,
        active: userActive,
        inactive: userTotal - userActive,
      },
      files: {
        total: parseInt(fileStats.total, 10),
        totalSizeBytes: parseInt(fileStats.totalSize, 10) || 0,
      },
      ledger: {
        accounts: accountCount,
        transactions: transactionCount,
        verifiedTransactions: verifiedCount,
      },
      geographies: {
        total: geographyCount,
      },
      taxonomies: {
        total: taxonomyCount,
      },
      channels: {
        total: channelCount,
      },
    };
  }
}
