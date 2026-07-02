import { matchPluginRoute } from './match';
import type { PluginRoute } from './types';

const Component = () => null;

function route(slug: string): PluginRoute {
  return { slug, Component };
}

describe('matchPluginRoute', () => {
  it('matches an exact slug with empty params', () => {
    const routes = [route('platforms')];
    const match = matchPluginRoute('platforms', routes);
    expect(match?.route.slug).toBe('platforms');
    expect(match?.params).toEqual({});
  });

  it('matches a :param segment and captures its value', () => {
    const routes = [route('platforms/:id')];
    const match = matchPluginRoute('platforms/123e4567', routes);
    expect(match?.route.slug).toBe('platforms/:id');
    expect(match?.params).toEqual({ id: '123e4567' });
  });

  it('prefers an exact match over a pattern match regardless of order', () => {
    const routes = [route('platforms/:id'), route('platforms/new')];
    const match = matchPluginRoute('platforms/new', routes);
    expect(match?.route.slug).toBe('platforms/new');
    expect(match?.params).toEqual({});
  });

  it('does not match when segment counts differ', () => {
    const routes = [route('platforms/:id')];
    expect(matchPluginRoute('platforms', routes)).toBeUndefined();
    expect(matchPluginRoute('platforms/a/b', routes)).toBeUndefined();
  });

  it('captures multiple params', () => {
    const routes = [route('platforms/:platformId/streams/:streamId')];
    const match = matchPluginRoute('platforms/p1/streams/s1', routes);
    expect(match?.params).toEqual({ platformId: 'p1', streamId: 's1' });
  });

  it('requires static segments to match exactly', () => {
    const routes = [route('platforms/:id')];
    expect(matchPluginRoute('agreements/123', routes)).toBeUndefined();
  });

  it('returns the first matching pattern in registration order', () => {
    const a = route('items/:id');
    const b = route('items/:code');
    const match = matchPluginRoute('items/42', [a, b]);
    expect(match?.route).toBe(a);
  });

  it('decodes URI-encoded captured segments', () => {
    const routes = [route('platforms/:id')];
    const match = matchPluginRoute('platforms/a%20b', routes);
    expect(match?.params).toEqual({ id: 'a b' });
  });

  it('returns undefined for empty route lists', () => {
    expect(matchPluginRoute('platforms', [])).toBeUndefined();
  });
});
