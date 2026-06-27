import { describe, expect, it } from 'vitest';
import { classifyWithRules } from '../../src/worker/classifier/rules';
import type { StoredMessage } from '../../src/worker/storage/schema';

const baseMessage: StoredMessage = {
  id: 'msg_1',
  accountId: 'acct_personal',
  gmailMessageId: 'gmail_1',
  gmailThreadId: 'thread_1',
  sender: 'Unknown <unknown@example.com>',
  recipients: 'personal@gmail.com',
  subject: 'Hello',
  snippet: 'Just checking in',
  receivedAt: '2026-06-26T15:00:00.000Z',
  labels: ['INBOX'],
  headers: {
    autoSubmitted: false,
    listUnsubscribe: false
  },
  createdAt: '2026-06-26T15:01:00.000Z',
  updatedAt: '2026-06-26T15:01:00.000Z'
};

describe('classifyWithRules', () => {
  it('classifies account security language as important security alert', () => {
    expect(
      classifyWithRules({
        ...baseMessage,
        sender: 'GitHub <noreply@github.com>',
        subject: 'Security alert: new sign-in from macOS'
      })
    ).toEqual({
      category: 'security',
      importance: 'high',
      recommendedAction: 'alert',
      confidence: 0.96,
      reason: 'Security or account-access language detected in sender or subject.',
      source: 'rules'
    });
  });

  it('classifies unsubscribe-header mail as newsletter cleanup', () => {
    expect(
      classifyWithRules({
        ...baseMessage,
        sender: 'Product Hunt <hello@producthunt.com>',
        subject: 'Today in tech',
        headers: {
          autoSubmitted: false,
          listUnsubscribe: true
        }
      })
    ).toEqual({
      category: 'newsletter',
      importance: 'low',
      recommendedAction: 'archive',
      confidence: 0.9,
      reason: 'List-Unsubscribe header indicates recurring newsletter or promotion.',
      source: 'rules'
    });
  });

  it('classifies auto-submitted mail as low-priority notification', () => {
    expect(
      classifyWithRules({
        ...baseMessage,
        sender: 'Linear <notifications@linear.app>',
        subject: 'Daily workspace digest',
        headers: {
          autoSubmitted: true,
          listUnsubscribe: false
        }
      })
    ).toEqual({
      category: 'notification',
      importance: 'low',
      recommendedAction: 'archive',
      confidence: 0.86,
      reason: 'Auto-submitted header indicates automated notification.',
      source: 'rules'
    });
  });

  it('returns unknown review for messages without enough rule signal', () => {
    expect(classifyWithRules(baseMessage)).toEqual({
      category: 'unknown',
      importance: 'medium',
      recommendedAction: 'review',
      confidence: 0.5,
      reason: 'No deterministic rule matched this message.',
      source: 'rules'
    });
  });
});
