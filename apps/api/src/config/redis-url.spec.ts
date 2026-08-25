import { parseRedisUrl } from './redis-url';

describe('parseRedisUrl', () => {
  it('parses host port password', () => {
    expect(parseRedisUrl('redis://:secret@127.0.0.1:6380/0')).toEqual({
      host: '127.0.0.1',
      port: 6380,
      password: 'secret',
      db: 0,
    });
  });

  it('defaults port 6379', () => {
    expect(parseRedisUrl('redis://localhost').port).toBe(6379);
  });
});
