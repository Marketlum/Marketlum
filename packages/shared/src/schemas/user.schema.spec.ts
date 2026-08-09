import { createUserSchema, updateUserSchema } from './user.schema';
import { UserType } from '../enums/user-type.enum';

const human = { email: 'a@b.co', name: 'Alice', password: 'password123' };
const agent = { email: 'bot@b.co', name: 'Bot', type: 'agent' };

describe('createUserSchema (spec 025 refinements)', () => {
  it('accepts a human with a password and defaults the type', () => {
    const parsed = createUserSchema.parse(human);
    expect(parsed.type).toBe(UserType.HUMAN);
  });

  it('accepts an agent without a password', () => {
    const parsed = createUserSchema.parse(agent);
    expect(parsed.type).toBe(UserType.AGENT);
    expect(parsed.password).toBeUndefined();
  });

  it('accepts an agent with an actor link', () => {
    const parsed = createUserSchema.parse({ ...agent, actorId: '2e9b1a30-0000-4000-8000-000000000001' });
    expect(parsed.actorId).toBeTruthy();
  });

  it('rejects an agent with a password', () => {
    const result = createUserSchema.safeParse({ ...agent, password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects a human without a password', () => {
    const result = createUserSchema.safeParse({ email: 'a@b.co', name: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects a human with an actor link', () => {
    const result = createUserSchema.safeParse({
      ...human,
      actorId: '2e9b1a30-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema (spec 025 immutability)', () => {
  it('accepts name/email/avatar/actor updates', () => {
    expect(updateUserSchema.safeParse({ name: 'New', actorId: null }).success).toBe(true);
  });

  it('rejects a type change', () => {
    expect(updateUserSchema.safeParse({ type: 'human' }).success).toBe(false);
  });

  it('rejects a password sneaked into a profile update', () => {
    expect(updateUserSchema.safeParse({ password: 'x'.repeat(8) }).success).toBe(false);
  });
});
