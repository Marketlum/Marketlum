import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Agent } from '../agents/entities/agent.entity';
import { User } from '../users/entities/user.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Tension } from '../tensions/entities/tension.entity';
import { SearchQuery, SearchResult, SearchResponse } from '@marketlum/shared';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Value)
    private readonly valuesRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstancesRepository: Repository<ValueInstance>,
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(ValueStream)
    private readonly valueStreamsRepository: Repository<ValueStream>,
    @InjectRepository(Tension)
    private readonly tensionsRepository: Repository<Tension>,
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const { q, limit } = query;

    const [values, valueInstances, agents, users, valueStreams, tensions] = await Promise.all([
      this.valuesRepository.query(
        `SELECT id, 'value' as type, name, purpose as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "values"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
      this.valueInstancesRepository.query(
        `SELECT id, 'value_instance' as type, name, purpose as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "value_instances"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
      this.agentsRepository.query(
        `SELECT id, 'agent' as type, name, purpose as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "agents"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
      this.usersRepository.query(
        `SELECT id, 'user' as type, name, email as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "users"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
      this.valueStreamsRepository.query(
        `SELECT id, 'value_stream' as type, name, purpose as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "value_streams"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
      this.tensionsRepository.query(
        `SELECT id, 'tension' as type, name, "currentContext" as subtitle,
                ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
         FROM "tensions"
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [q, limit],
      ),
    ]);

    const allResults: SearchResult[] = [...values, ...valueInstances, ...agents, ...users, ...valueStreams, ...tensions]
      .map((r) => ({
        id: r.id,
        type: r.type as SearchResult['type'],
        name: r.name,
        subtitle: r.subtitle,
        rank: parseFloat(r.rank),
      }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    return {
      data: allResults,
      meta: {
        total: allResults.length,
        limit,
        query: q,
      },
    };
  }
}
