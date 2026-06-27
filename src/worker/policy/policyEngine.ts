import type { ActionRecord, ClassificationRecord } from '../storage/schema.js';

export type PolicyAction = Pick<ActionRecord, 'action' | 'status' | 'automatic' | 'reason'>;

export function decidePolicy(classification: ClassificationRecord): PolicyAction {
  if (classification.recommendedAction === 'alert' && classification.confidence >= 0.9) {
    return {
      action: 'alert',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence important message should notify immediately.'
    };
  }

  if (
    classification.recommendedAction === 'archive' &&
    classification.confidence >= 0.88 &&
    classification.category !== 'important' &&
    classification.category !== 'security'
  ) {
    return {
      action: 'archive',
      status: 'planned',
      automatic: true,
      reason: 'High-confidence low-risk cleanup can be archived safely.'
    };
  }

  return {
    action: 'review',
    status: 'pending_review',
    automatic: false,
    reason: 'Decision requires user review before any mailbox-changing action.'
  };
}
