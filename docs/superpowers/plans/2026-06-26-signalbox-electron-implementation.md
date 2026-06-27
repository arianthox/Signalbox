# Signalbox Electron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Signalbox, a local Electron desktop app that connects multiple Gmail accounts, safely cleans personal inbox noise, uses local Ollama classification for ambiguous email, and sends native tray notifications for important messages.

**Architecture:** Electron owns desktop integration: tray/menu bar, native notifications, app lifecycle, OAuth callback windows, secure token access, and IPC. A React/Vite renderer provides the dashboard, while a Node worker layer handles Gmail sync, Ollama classification, policy decisions, SQLite persistence, and Gmail actions. The first version favors safe automation: labels and archive are allowed automatically; deletion/trash requires review.

**Tech Stack:** Electron, React, Vite, TypeScript, SQLite, Drizzle ORM or better-sqlite3, Gmail API, Google OAuth 2.0, Ollama HTTP API, Vitest, Playwright, electron-builder.

---

## Product Scope

### Included In V1

- Multiple Gmail account connections via OAuth.
- Local message sync for recent inbox mail.
- Deterministic rules classifier.
- Optional Ollama classifier for ambiguous messages.
- Safe automation for labels, archive, and important alerts.
- Review queues for pending delete/trash and uncertain messages.
- Native macOS tray/menu bar app.
- Native desktop notifications for important messages and account errors.
- Local SQLite audit log and feedback memory.

### Deferred

- Permanent deletion automation.
- Auto-unsubscribe.
- Sending replies.
- Cloud hosting.
- Mobile app.
- Model fine-tuning.
- Cross-device sync.

---

## Proposed Project Layout

```text
Signalbox/
  package.json
  electron-builder.yml
  vite.config.ts
  tsconfig.json
  docs/
    superpowers/
      specs/
      plans/
  src/
    main/
      app.ts
      tray.ts
      notifications.ts
      oauth.ts
      ipc.ts
      workerHost.ts
    preload/
      index.ts
    renderer/
      main.tsx
      App.tsx
      routes/
        Dashboard.tsx
        Accounts.tsx
        CleanupQueue.tsx
        ImportantAlerts.tsx
        PendingDelete.tsx
        SenderRules.tsx
        AuditLog.tsx
        Settings.tsx
      components/
        AppShell.tsx
        MessageTable.tsx
        StatusBadge.tsx
        ActionButton.tsx
    worker/
      index.ts
      gmail/
        client.ts
        sync.ts
        normalize.ts
        actions.ts
      classifier/
        rules.ts
        ollama.ts
        classify.ts
        schema.ts
      policy/
        policyEngine.ts
        thresholds.ts
      storage/
        db.ts
        schema.ts
        repositories.ts
      feedback/
        feedbackService.ts
      alerts/
        alertService.ts
      settings/
        settingsService.ts
    shared/
      types.ts
      constants.ts
  tests/
    unit/
    integration/
    e2e/
```

---

## Safety Policy

Allowed automatically:

- Apply local/Gmail labels.
- Archive high-confidence newsletters, promotions, and low-value notifications.
- Mark read only for trusted low-value senders.
- Send native notifications for high-confidence important/security messages.

Require review:

- Trash/delete.
- Any action on a first-time sender with low or medium confidence.
- Suppressing possible important messages.
- Any classification where Ollama returns invalid JSON or confidence below threshold.

Never in V1:

- Permanent delete.
- Auto-unsubscribe.
- Send mail.
- Train/fine-tune on full email bodies.

---

## Task 1: Scaffold Electron + React + TypeScript App

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main/app.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

- [ ] Create the Electron/Vite app structure.
- [ ] Add scripts: `dev`, `build`, `test`, `test:e2e`, `lint`, `package`.
- [ ] Start Electron with a renderer window in development.
- [ ] Expose a minimal preload API.
- [ ] Verify `npm run dev` opens the desktop app.
- [ ] Commit: `feat: scaffold electron desktop app`.

Acceptance:

- App opens on macOS.
- Renderer displays a dashboard shell.
- Main/preload/renderer TypeScript compile successfully.

---

## Task 2: Add Tray, App Menu, And Native Notifications

**Files:**
- Create: `src/main/tray.ts`
- Create: `src/main/notifications.ts`
- Modify: `src/main/app.ts`

- [ ] Add macOS tray/menu bar icon.
- [ ] Add tray menu items: `Open Dashboard`, `Sync Now`, `Pause Automation`, `Quit`.
- [ ] Keep the app alive when the dashboard window closes.
- [ ] Add native notification helper.
- [ ] Add a development-only `Test Notification` tray menu item.
- [ ] Verify clicking the notification opens the dashboard.
- [ ] Commit: `feat: add tray and notifications`.

Acceptance:

- App can run primarily from tray/menu bar.
- Notifications are native macOS notifications.
- Dashboard can be hidden and reopened.

---

## Task 3: Add SQLite Storage

**Files:**
- Create: `src/worker/storage/db.ts`
- Create: `src/worker/storage/schema.ts`
- Create: `src/worker/storage/repositories.ts`
- Create: `src/shared/types.ts`
- Create: `tests/unit/storage.test.ts`

- [ ] Add SQLite dependency and migration approach.
- [ ] Create tables: `accounts`, `messages`, `classifications`, `actions`, `feedback`, `sender_preferences`, `audit_log`, `settings`.
- [ ] Store database under macOS app support directory.
- [ ] Add repository methods for account, message, classification, action, and audit records.
- [ ] Write unit tests for inserting and querying messages and audit records.
- [ ] Commit: `feat: add local sqlite storage`.

Acceptance:

- DB initializes on app startup.
- Tests prove messages and audit records persist.
- No Gmail token secrets are stored in plain text SQLite.

---

## Task 4: Implement Secure Account Token Storage

**Files:**
- Create: `src/main/oauth.ts`
- Create: `src/worker/settings/settingsService.ts`
- Modify: `src/worker/storage/schema.ts`
- Create: `tests/unit/accounts.test.ts`

- [ ] Use macOS Keychain through a library such as `keytar`.
- [ ] Store only account metadata in SQLite.
- [ ] Store OAuth refresh/access tokens in Keychain per account email.
- [ ] Add token read/write/delete helpers.
- [ ] Add tests around account metadata behavior with token storage mocked.
- [ ] Commit: `feat: add secure account token storage`.

Acceptance:

- Removing an account deletes its Keychain token entry.
- SQLite does not contain raw access or refresh tokens.

---

## Task 5: Implement Gmail OAuth Flow

**Files:**
- Modify: `src/main/oauth.ts`
- Modify: `src/main/ipc.ts`
- Create: `src/worker/gmail/client.ts`
- Modify: `src/renderer/routes/Accounts.tsx`
- Create: `tests/integration/oauth.test.ts`

- [ ] Add Google OAuth client configuration.
- [ ] Open OAuth consent in system browser or Electron child window.
- [ ] Capture localhost callback or custom protocol callback.
- [ ] Exchange code for tokens.
- [ ] Fetch Gmail profile email.
- [ ] Persist account metadata and tokens.
- [ ] Show connected account in Accounts view.
- [ ] Commit: `feat: connect gmail accounts with oauth`.

Acceptance:

- User can connect at least two Gmail accounts.
- App displays account email, sync status, and connection health.

---

## Task 6: Sync Recent Gmail Messages

**Files:**
- Create: `src/worker/gmail/sync.ts`
- Create: `src/worker/gmail/normalize.ts`
- Modify: `src/worker/gmail/client.ts`
- Modify: `src/worker/storage/repositories.ts`
- Create: `tests/unit/normalize.test.ts`
- Create: `tests/integration/sync.test.ts`

- [ ] Fetch latest inbox messages per account.
- [ ] Normalize Gmail payloads into local message records.
- [ ] Extract sender, recipients, subject, snippet, internal date, Gmail labels, thread ID, and useful headers.
- [ ] Deduplicate by account ID and Gmail message ID.
- [ ] Track last sync timestamp per account.
- [ ] Add manual `Sync Now` IPC event from tray and dashboard.
- [ ] Commit: `feat: sync recent gmail messages`.

Acceptance:

- Sync can be run repeatedly without duplicate messages.
- Latest messages appear in dashboard.

---

## Task 7: Add Rules Classifier

**Files:**
- Create: `src/worker/classifier/rules.ts`
- Create: `src/worker/classifier/schema.ts`
- Create: `src/worker/classifier/classify.ts`
- Create: `tests/unit/rulesClassifier.test.ts`

- [ ] Define classification result type with `category`, `importance`, `recommendedAction`, `confidence`, and `reason`.
- [ ] Classify unsubscribe-header messages as newsletter/promotion candidates.
- [ ] Classify security/account-access subjects as important/security.
- [ ] Classify trusted senders from `sender_preferences`.
- [ ] Classify obvious automated mail using `Auto-Submitted` and `Precedence` headers.
- [ ] Return `unknown` when rules are insufficient.
- [ ] Commit: `feat: add deterministic email classifier`.

Acceptance:

- Unit tests cover newsletter, security alert, trusted sender, automated notification, and unknown cases.

---

## Task 8: Add Ollama Classifier

**Files:**
- Create: `src/worker/classifier/ollama.ts`
- Modify: `src/worker/classifier/classify.ts`
- Modify: `src/worker/settings/settingsService.ts`
- Create: `tests/unit/ollamaClassifier.test.ts`

- [ ] Add settings for Ollama base URL and model name.
- [ ] Build minimized prompt input from email metadata and snippet.
- [ ] Require strict JSON response.
- [ ] Validate JSON shape before trusting output.
- [ ] Fall back to `needs_review` on invalid JSON, timeout, or low confidence.
- [ ] Do not send full body content in V1.
- [ ] Commit: `feat: add local ollama classification`.

Acceptance:

- Ollama errors never block sync.
- Invalid model output enters review queue.
- Ambiguous messages can be enriched by local model classification.

---

## Task 9: Implement Safe Policy Engine

**Files:**
- Create: `src/worker/policy/policyEngine.ts`
- Create: `src/worker/policy/thresholds.ts`
- Create: `tests/unit/policyEngine.test.ts`

- [ ] Convert classification results into allowed actions.
- [ ] Allow automatic archive only for high-confidence low-risk categories.
- [ ] Allow automatic labels for all confident categories.
- [ ] Require review for trash/delete.
- [ ] Require review for first-time sender automation unless confidence is very high and action is only label.
- [ ] Always alert high-confidence important/security messages.
- [ ] Commit: `feat: add safe automation policy engine`.

Acceptance:

- Tests prove deletion is never automatic.
- Tests prove important messages are alerted, not archived.
- Tests prove low-confidence results require review.

---

## Task 10: Apply Gmail Actions And Audit Log

**Files:**
- Create: `src/worker/gmail/actions.ts`
- Modify: `src/worker/storage/repositories.ts`
- Create: `tests/unit/auditLog.test.ts`
- Create: `tests/integration/gmailActions.test.ts`

- [ ] Implement label creation and label application.
- [ ] Implement archive by removing `INBOX`.
- [ ] Implement mark-read.
- [ ] Implement pending-delete queue without automatic trash.
- [ ] Record every action decision in `audit_log`.
- [ ] Expose action status to dashboard.
- [ ] Commit: `feat: apply safe gmail actions with audit log`.

Acceptance:

- Every action has an audit entry.
- Archive/label actions can be traced back to classifier and policy reason.

---

## Task 11: Build Dashboard Views

**Files:**
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/components/AppShell.tsx`
- Create: `src/renderer/components/MessageTable.tsx`
- Create: `src/renderer/components/StatusBadge.tsx`
- Create: `src/renderer/components/ActionButton.tsx`
- Create: route files under `src/renderer/routes/`
- Modify: `src/main/ipc.ts`
- Create: `tests/e2e/dashboard.spec.ts`

- [ ] Build navigation for Dashboard, Accounts, Cleanup Queue, Important Alerts, Pending Delete, Sender Rules, Audit Log, and Settings.
- [ ] Show sync health and automation status.
- [ ] Show message rows with sender, subject, account, category, confidence, recommended action, and reason.
- [ ] Add approve/keep/mark important/mark junk controls.
- [ ] Add sender rule controls.
- [ ] Commit: `feat: build inbox management dashboard`.

Acceptance:

- User can inspect all automated and pending decisions from the UI.
- User can approve or override recommendations.

---

## Task 12: Add Feedback Learning Loop

**Files:**
- Create: `src/worker/feedback/feedbackService.ts`
- Modify: `src/worker/classifier/classify.ts`
- Modify: `src/worker/storage/repositories.ts`
- Modify: `src/renderer/routes/SenderRules.tsx`
- Create: `tests/unit/feedbackService.test.ts`

- [ ] Record feedback for keep, archive, important, junk, false positive, and false negative.
- [ ] Promote repeated decisions into sender preferences.
- [ ] Include prior sender decisions in Ollama prompt context.
- [ ] Allow user to edit sender preferences.
- [ ] Commit: `feat: learn from inbox feedback`.

Acceptance:

- Repeated user decisions affect future classification.
- Sender preferences are visible and editable.

---

## Task 13: Add Background Scheduler

**Files:**
- Create: `src/worker/index.ts`
- Modify: `src/main/workerHost.ts`
- Modify: `src/main/tray.ts`
- Modify: `src/renderer/routes/Settings.tsx`
- Create: `tests/unit/scheduler.test.ts`

- [ ] Run sync/classify/policy loop on configurable interval.
- [ ] Add pause/resume automation.
- [ ] Add per-account sync error handling.
- [ ] Surface background status in tray tooltip and dashboard.
- [ ] Commit: `feat: add background inbox scheduler`.

Acceptance:

- App continues syncing while dashboard window is closed.
- User can pause automation from tray.

---

## Task 14: Package For macOS

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json`
- Create: `docs/local-development.md`
- Create: `docs/google-oauth-setup.md`

- [ ] Configure app name and bundle ID.
- [ ] Configure macOS icon.
- [ ] Configure hardened runtime settings if distribution is needed.
- [ ] Document Google OAuth setup.
- [ ] Document Ollama setup.
- [ ] Build local `.dmg` or `.zip`.
- [ ] Commit: `chore: package macos desktop app`.

Acceptance:

- App can be installed locally.
- User can follow docs to connect Gmail and Ollama.

---

## Verification Checklist

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:e2e` passes for dashboard basics.
- [ ] Connect two Gmail accounts.
- [ ] Sync recent messages from both accounts.
- [ ] Confirm Ollama unavailable state is handled gracefully.
- [ ] Confirm high-confidence newsletter can be auto-archived.
- [ ] Confirm important/security email sends native notification.
- [ ] Confirm delete/trash is never automatic.
- [ ] Confirm every automated action has an audit log entry.
- [ ] Confirm tray remains active after closing dashboard.

---

## Suggested Build Order

1. Scaffold Electron app.
2. Add tray and notifications.
3. Add SQLite.
4. Add OAuth and account storage.
5. Add Gmail sync.
6. Add rules classifier.
7. Add Ollama classifier.
8. Add policy engine.
9. Add Gmail actions and audit.
10. Add dashboard.
11. Add feedback learning.
12. Add background scheduler.
13. Package for macOS.

This order produces useful checkpoints early and keeps risky Gmail actions behind tests and explicit policy boundaries.
