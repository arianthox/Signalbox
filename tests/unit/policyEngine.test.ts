import { describe, expect, it } from 'vitest';
import type { ClassificationRecord } from '../../src/worker/storage/schema';
import { decidePolicy } from '../../src/worker/policy/policyEngine';

const baseClassification: ClassificationRecord = {
  id: 'class_1',
  messageId: 'msg_1',
  category: 'newsletter',
  importance: 'low',
  confidence: 0.93,
  recommendedAction: 'archive',
  reason: 'Recurring newsletter',
  source: 'rules',
  createdAt: '2026-06-26T15:00:00.000Z'
};

describe('decidePolicy', () => {
  it('allows automatic archive for high-confidence low-risk cleanup', () => {
    expect(decidePolicy(baseClassification)).toEqual({
      action: 'archive',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence low-risk cleanup can be archived safely.'
    });
  });

  it('requires review for low-confidence cleanup', () => {
    expect(decidePolicy({ ...baseClassification, confidence: 0.72 })).toEqual({
      action: 'review',
      status: 'pending_review',
      automatic: false,
      reason: 'Decision requires user review before any mailbox-changing action.'
    });
  });

  it('alerts important high-confidence messages instead of archiving', () => {
    expect(
      decidePolicy({
        ...baseClassification,
        category: 'security',
        importance: 'high',
        confidence: 0.97,
        recommendedAction: 'alert'
      })
    ).toEqual({
      action: 'alert',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence important message should notify immediately.'
    });
  });

  it('never plans delete automatically', () => {
    expect(
      decidePolicy({
        ...baseClassification,
        recommendedAction: 'review',
        confidence: 0.99
      })
    ).toEqual({
      action: 'review',
      status: 'pending_review',
      automatic: false,
      reason: 'Decision requires user review before any mailbox-changing action.'
    });
  });
});
