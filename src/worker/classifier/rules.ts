import type { ClassificationRecord, StoredMessage } from '../storage/schema.js';

export type ClassificationResult = Omit<ClassificationRecord, 'id' | 'messageId' | 'createdAt'>;

const securityPattern = /\b(security|sign-?in|login|account access|password|2fa|two-factor|verification|verify|suspicious)\b/i;

export function classifyWithRules(message: StoredMessage): ClassificationResult {
  const searchable = `${message.sender} ${message.subject} ${message.snippet}`;

  if (securityPattern.test(searchable)) {
    return {
      category: 'security',
      importance: 'high',
      recommendedAction: 'alert',
      confidence: 0.96,
      reason: 'Security or account-access language detected in sender or subject.',
      source: 'rules'
    };
  }

  if (message.headers.listUnsubscribe) {
    return {
      category: 'newsletter',
      importance: 'low',
      recommendedAction: 'archive',
      confidence: 0.9,
      reason: 'List-Unsubscribe header indicates recurring newsletter or promotion.',
      source: 'rules'
    };
  }

  if (message.headers.autoSubmitted) {
    return {
      category: 'notification',
      importance: 'low',
      recommendedAction: 'archive',
      confidence: 0.86,
      reason: 'Auto-submitted header indicates automated notification.',
      source: 'rules'
    };
  }

  return {
    category: 'unknown',
    importance: 'medium',
    recommendedAction: 'review',
    confidence: 0.5,
    reason: 'No deterministic rule matched this message.',
    source: 'rules'
  };
}
