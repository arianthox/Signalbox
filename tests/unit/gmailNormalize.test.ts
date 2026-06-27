import { describe, expect, it } from 'vitest';
import { normalizeGmailMessage } from '../../src/worker/gmail/normalize';

describe('normalizeGmailMessage', () => {
  it('extracts sender, recipients, subject, labels, snippet, and useful headers', () => {
    expect(
      normalizeGmailMessage({
        id: 'gmail_123',
        threadId: 'thread_123',
        labelIds: ['INBOX', 'CATEGORY_PROMOTIONS'],
        snippet: 'Weekly launch digest',
        internalDate: '1782486000000',
        payload: {
          headers: [
            { name: 'From', value: 'Product Hunt <hello@producthunt.com>' },
            { name: 'To', value: 'personal@gmail.com' },
            { name: 'Subject', value: 'Today in tech' },
            { name: 'List-Unsubscribe', value: '<https://example.com/unsubscribe>' },
            { name: 'Auto-Submitted', value: 'auto-generated' }
          ]
        }
      })
    ).toEqual({
      gmailMessageId: 'gmail_123',
      gmailThreadId: 'thread_123',
      sender: 'Product Hunt <hello@producthunt.com>',
      recipients: 'personal@gmail.com',
      subject: 'Today in tech',
      snippet: 'Weekly launch digest',
      receivedAt: '2026-06-26T15:00:00.000Z',
      labels: ['INBOX', 'CATEGORY_PROMOTIONS'],
      headers: {
        autoSubmitted: true,
        listUnsubscribe: true
      }
    });
  });

  it('uses safe defaults for missing optional fields', () => {
    expect(
      normalizeGmailMessage({
        id: 'gmail_456',
        threadId: 'thread_456',
        internalDate: '1782486000000',
        payload: {
          headers: []
        }
      })
    ).toEqual({
      gmailMessageId: 'gmail_456',
      gmailThreadId: 'thread_456',
      sender: '',
      recipients: '',
      subject: '',
      snippet: '',
      receivedAt: '2026-06-26T15:00:00.000Z',
      labels: [],
      headers: {
        autoSubmitted: false,
        listUnsubscribe: false
      }
    });
  });
});
