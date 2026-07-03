import { describe, expect, it } from 'vitest';
import { canAccessAction } from './ActionQueueService.js';

describe('ActionQueueService authorization policy', () => {
  const action = { id: 10, actor_user_id: 42 };

  it('allows the owning actor', () => {
    expect(canAccessAction(action, { actorUserId: 42 })).toBe(true);
  });

  it('denies cross-user access', () => {
    expect(canAccessAction(action, { actorUserId: 7 })).toBe(false);
  });

  it('does not treat a missing actor as read-all', () => {
    expect(canAccessAction(action, { actorUserId: null })).toBe(false);
  });

  it('allows explicitly scoped service actors', () => {
    expect(canAccessAction(action, { actorUserId: null, isServiceActor: true })).toBe(true);
  });
});
