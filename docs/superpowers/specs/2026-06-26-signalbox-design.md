# Signalbox Design Spec

## Purpose

Signalbox is a local macOS desktop app for personal inbox cleanup and important email detection across multiple Gmail accounts. It runs quietly from the tray/menu bar, reduces low-value inbox noise through safe automation, and alerts the user when important mail arrives.

## Product Positioning

Signalbox is not a full email client. It is an inbox operations assistant focused on:

- Cleaning newsletters, promotions, automated notifications, and repeated low-value senders.
- Detecting security, finance, travel, medical, job/client, family, and other time-sensitive messages.
- Learning from user decisions without giving a local model authority to make irreversible changes.

## Platform

Signalbox will be an Electron desktop app for macOS.

Electron is selected because it provides mature support for:

- Tray/menu bar behavior.
- Native notifications.
- Rich React dashboard UI.
- Background processing while the dashboard window is closed.
- OAuth callback handling.
- Local packaging through electron-builder.

## Architecture

Signalbox has three major runtime areas:

1. Electron main process
   - Owns app lifecycle, tray/menu, native notifications, OAuth windows, secure token access, and IPC.

2. React renderer
   - Provides dashboard screens for accounts, cleanup queue, important alerts, pending delete, sender rules, audit log, and settings.

3. Local worker layer
   - Handles Gmail sync, message normalization, deterministic classification, Ollama-assisted classification, policy decisions, Gmail actions, SQLite persistence, feedback memory, and alert routing.

## Data Flow

```text
Gmail account
  -> OAuth token refresh
  -> recent message sync
  -> message normalization
  -> deterministic rules classifier
  -> Ollama classifier for ambiguous messages
  -> safe policy engine
  -> Gmail action, review queue, or native notification
  -> audit log and feedback memory
```

## Gmail Integration

Signalbox connects to multiple Gmail accounts using OAuth 2.0. It uses Gmail API scopes for reading, modifying labels, archiving, and managing labels.

Recommended scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.labels
```

OAuth refresh and access tokens must be stored in macOS Keychain. SQLite stores account metadata only.

## Classification

Classification is hybrid:

- Rules first for transparent, deterministic decisions.
- Ollama second for ambiguous messages.
- Policy engine last to decide what actions are allowed.

Rules should handle:

- Known trusted senders.
- Sender/domain preferences.
- Gmail labels.
- `List-Unsubscribe` headers.
- `Auto-Submitted` headers.
- Security/account-access language.
- Repeated newsletter and promotion patterns.

Ollama receives minimized message context only:

- Sender.
- Subject.
- Snippet.
- Selected headers.
- Existing Gmail labels.
- Prior sender decisions.

Full message bodies are deferred for v1.

Expected Ollama output:

```json
{
  "category": "newsletter",
  "importance": "low",
  "recommendedAction": "archive",
  "confidence": 0.91,
  "reason": "Recurring promotional digest with unsubscribe header"
}
```

Invalid JSON, low confidence, or model timeout must place the message into review.

## Safety Policy

Allowed automatically:

- Apply labels.
- Archive high-confidence newsletters, promotions, and low-value notifications.
- Mark read for trusted low-value senders.
- Notify for high-confidence important or security messages.

Require review:

- Trash/delete.
- First-time sender automation with low or medium confidence.
- Suppressing possible important messages.
- Low-confidence or invalid Ollama results.

Never in v1:

- Permanent delete.
- Auto-unsubscribe.
- Send replies.
- Fine-tune a model on full email bodies.

## Dashboard

Dashboard views:

- Dashboard overview.
- Accounts.
- Cleanup queue.
- Important alerts.
- Pending delete.
- Sender rules.
- Audit log.
- Settings.

Primary user actions:

- Approve archive.
- Keep in inbox.
- Mark important.
- Mark junk.
- Trust sender.
- Block or downgrade sender.
- Pause/resume automation.
- Sync now.

## Notifications

Signalbox sends native macOS notifications for:

- Important/security messages.
- OAuth/account sync failures.
- Optional cleanup summaries.

Clicking a notification should open the relevant dashboard view.

## Persistence

Use local SQLite for:

- Accounts metadata.
- Messages.
- Classifications.
- Actions.
- Feedback.
- Sender preferences.
- Audit log.
- Settings.

Use macOS Keychain for:

- Gmail OAuth tokens.

## MVP Success Criteria

- User can connect at least two Gmail accounts.
- Signalbox syncs recent inbox messages from each account.
- Obvious newsletters/promotions can be labeled and archived automatically.
- Important/security messages produce native notifications.
- Deletion is never automatic.
- User can review uncertain and pending-delete messages.
- User decisions affect future classifications.
- Every automated decision is visible in the audit log.
- Tray/menu bar app remains active after closing the dashboard window.

## Deferred Work

- Auto-unsubscribe.
- Permanent deletion.
- Cloud sync.
- Mobile companion app.
- Public distribution and notarization.
- Fine-tuning or training custom models.
- Non-Gmail providers.
