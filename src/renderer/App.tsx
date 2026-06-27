import { AlertTriangle, Archive, Bell, CheckCircle2, Clock3, Pause, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_STATUS } from '../shared/constants';
import type { AccountSummary, AppSettings, DashboardData, MessageDecision, SaveSettingsInput, SignalboxStatus } from '../shared/types';

const navItems = ['Inbox Overview', 'Accounts', 'Cleanup Queue', 'Important Alerts', 'Pending Delete', 'Sender Rules', 'Audit Log', 'Settings'];

const DEFAULT_SETTINGS: AppSettings = {
  googleOAuth: {
    clientId: '',
    redirectUri: 'http://127.0.0.1:49327/oauth/google/callback',
    hasClientSecret: false
  },
  ollama: {
    enabled: false,
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3.1'
  }
};

type SettingsFormState = SaveSettingsInput;

export function App() {
  const [status, setStatus] = useState<SignalboxStatus>(DEFAULT_STATUS);
  const [dashboard, setDashboard] = useState<DashboardData>({
    decisions: [],
    metrics: {
      important: 0,
      autoArchived: 0,
      reviewRequired: 0,
      pendingDelete: 0
    }
  });
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('Inbox Overview');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    googleOAuth: {
      clientId: '',
      clientSecret: '',
      redirectUri: DEFAULT_SETTINGS.googleOAuth.redirectUri
    },
    ollama: DEFAULT_SETTINGS.ollama
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    void window.signalbox?.getStatus().then(setStatus);
    void window.signalbox?.getDashboard().then(setDashboard);
    void window.signalbox?.listAccounts().then(setAccounts);
    void window.signalbox?.getSettings().then((nextSettings) => {
      setSettings(nextSettings);
      setSettingsForm({
        googleOAuth: {
          clientId: nextSettings.googleOAuth.clientId,
          clientSecret: '',
          redirectUri: nextSettings.googleOAuth.redirectUri
        },
        ollama: nextSettings.ollama
      });
    });
  }, []);

  const syncNow = async () => {
    const next = await window.signalbox?.syncNow();
    if (next) setStatus(next);
    window.setTimeout(() => {
      void window.signalbox?.getDashboard().then(setDashboard);
    }, 500);
  };

  const toggleAutomation = async () => {
    const next = await window.signalbox?.toggleAutomation();
    if (next) setStatus(next);
  };

  const connectAccount = async () => {
    setAccountMessage('Opening Google consent...');
    const result = await window.signalbox?.connectGoogleAccount();
    if (!result) {
      setAccountMessage('Desktop integration is unavailable in browser preview.');
      return;
    }

    if (!result.ok) {
      setAccountMessage(result.error);
      return;
    }

    setAccounts((current) => {
      const withoutExisting = current.filter((account) => account.email !== result.account.email);
      return [...withoutExisting, result.account];
    });
    setAccountMessage(`Connected ${result.account.email}.`);
  };

  const saveSettings = async () => {
    setSettingsMessage('Saving settings...');
    const saved = await window.signalbox?.saveSettings({
      googleOAuth: {
        clientId: settingsForm.googleOAuth.clientId.trim(),
        clientSecret: settingsForm.googleOAuth.clientSecret?.trim(),
        redirectUri: settingsForm.googleOAuth.redirectUri.trim()
      },
      ollama: {
        enabled: settingsForm.ollama.enabled,
        baseUrl: settingsForm.ollama.baseUrl.trim(),
        model: settingsForm.ollama.model.trim()
      }
    });

    if (!saved) {
      setSettingsMessage('Desktop integration is unavailable in browser preview.');
      return;
    }

    setSettings(saved);
    setSettingsForm({
      googleOAuth: {
        clientId: saved.googleOAuth.clientId,
        clientSecret: '',
        redirectUri: saved.googleOAuth.redirectUri
      },
      ollama: saved.ollama
    });
    setSettingsMessage('Settings saved.');
  };

  const updateGoogleOAuth = (field: keyof SettingsFormState['googleOAuth'], value: string) => {
    setSettingsForm((current) => ({
      ...current,
      googleOAuth: {
        ...current.googleOAuth,
        [field]: value
      }
    }));
  };

  const updateOllama = (field: keyof SettingsFormState['ollama'], value: string | boolean) => {
    setSettingsForm((current) => ({
      ...current,
      ollama: {
        ...current.ollama,
        [field]: value
      }
    }));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Signalbox</strong>
            <span>Local inbox intelligence</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <button className={item === activeView ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveView(item)}>
              {item}
            </button>
          ))}
        </nav>

        <section className="account-panel" aria-label="Account status">
          {accounts.length === 0 ? (
            <p className="account-empty">No Gmail accounts connected.</p>
          ) : (
            accounts.map((account) => (
              <div className="account-row" key={account.id}>
                <span>{account.email}</span>
                <CheckCircle2 size={16} />
              </div>
            ))
          )}
          <button className="secondary-button" onClick={connectAccount}>
            Connect Account
          </button>
          {accountMessage ? <p className="account-message">{accountMessage}</p> : null}
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeView}</h1>
            <p>
              {activeView === 'Settings'
                ? 'Configure local Gmail access and the Ollama model Signalbox will use for ambiguous messages.'
                : `Safe automation is active across ${status.connectedAccounts} Gmail accounts. Last sync ${status.lastSyncLabel}.`}
            </p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={syncNow}>
              <RefreshCw size={17} />
              Sync Now
            </button>
            <button className="icon-button" onClick={toggleAutomation}>
              <Pause size={17} />
              {status.automationState === 'running' ? 'Pause Automation' : 'Resume Automation'}
            </button>
          </div>
        </header>

        {activeView === 'Settings' ? (
          <SettingsView
            form={settingsForm}
            hasClientSecret={settings.googleOAuth.hasClientSecret}
            message={settingsMessage}
            onGoogleOAuthChange={updateGoogleOAuth}
            onOllamaChange={updateOllama}
            onSave={saveSettings}
          />
        ) : (
          <>
            <section className="metric-strip" aria-label="Inbox status">
              <Metric icon={<Bell size={18} />} label="Important" value={dashboard.metrics.important.toString()} tone="red" />
              <Metric icon={<Archive size={18} />} label="Auto-Archived" value={dashboard.metrics.autoArchived.toString()} tone="green" />
              <Metric icon={<AlertTriangle size={18} />} label="Review Required" value={dashboard.metrics.reviewRequired.toString()} tone="amber" />
              <Metric icon={<Trash2 size={18} />} label="Pending Delete" value={dashboard.metrics.pendingDelete.toString()} tone="slate" />
            </section>

            <section className="content-grid">
              <div className="panel queue-panel">
                <div className="panel-header">
                  <div>
                    <h2>Latest Decisions</h2>
                    <p>Recommendations stay reversible. Delete always requires review.</p>
                  </div>
                  <span className="status-pill">
                    <ShieldCheck size={15} />
                    Safe mode
                  </span>
                </div>

                <table className="message-table">
                  <thead>
                    <tr>
                      <th>Sender</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.decisions.length === 0 ? (
                      <tr>
                        <td className="empty-row" colSpan={5}>
                          Connect Gmail and run Sync Now to populate decisions.
                        </td>
                      </tr>
                    ) : (
                      dashboard.decisions.map((decision) => (
                        <tr key={decision.id}>
                          <td>
                            <strong>{decision.sender}</strong>
                            <span>{decision.account}</span>
                          </td>
                          <td>
                            <strong>{decision.subject}</strong>
                            <span>{decision.reason}</span>
                          </td>
                          <td>
                            <CategoryLabel category={decision.category} />
                          </td>
                          <td>{Math.round(decision.confidence * 100)}%</td>
                          <td>
                            <ActionLabel action={decision.recommendedAction} status={decision.actionStatus} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <aside className="panel side-panel">
                <div className="panel-header compact">
                  <h2>Automation</h2>
                  <span className={status.automationState === 'running' ? 'live-dot' : 'paused-dot'} />
                </div>
                <div className="rule-list">
                  <Rule icon={<Archive size={17} />} title="Archive allowed" detail="Newsletters and promotions above 88% confidence." />
                  <Rule icon={<Bell size={17} />} title="Alert immediately" detail="Security, finance, travel, and trusted personal senders." />
                  <Rule icon={<Trash2 size={17} />} title="Delete blocked" detail="Messages enter Pending Delete until approved." />
                  <Rule icon={<Clock3 size={17} />} title="Ollama fallback" detail="Ambiguous messages are classified locally before review." />
                </div>
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function SettingsView({
  form,
  hasClientSecret,
  message,
  onGoogleOAuthChange,
  onOllamaChange,
  onSave
}: {
  form: SettingsFormState;
  hasClientSecret: boolean;
  message: string | null;
  onGoogleOAuthChange: (field: keyof SettingsFormState['googleOAuth'], value: string) => void;
  onOllamaChange: (field: keyof SettingsFormState['ollama'], value: string | boolean) => void;
  onSave: () => void;
}) {
  return (
    <section className="settings-layout">
      <div className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h2>Google OAuth</h2>
            <p>Signalbox stores the client secret in macOS Keychain and keeps only non-secret metadata in its local database.</p>
          </div>
          <span className={hasClientSecret ? 'status-pill' : 'status-pill neutral'}>
            <ShieldCheck size={15} />
            {hasClientSecret ? 'Secret saved' : 'Secret missing'}
          </span>
        </div>
        <div className="settings-form">
          <label className="field">
            <span>Client ID</span>
            <input value={form.googleOAuth.clientId} onChange={(event) => onGoogleOAuthChange('clientId', event.target.value)} />
          </label>
          <label className="field">
            <span>Client Secret</span>
            <input
              type="password"
              value={form.googleOAuth.clientSecret ?? ''}
              placeholder={hasClientSecret ? 'Leave blank to keep saved secret' : ''}
              onChange={(event) => onGoogleOAuthChange('clientSecret', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Redirect URI</span>
            <input value={form.googleOAuth.redirectUri} onChange={(event) => onGoogleOAuthChange('redirectUri', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h2>Local Ollama</h2>
            <p>These settings prepare the local model path for the next classifier slice.</p>
          </div>
        </div>
        <div className="settings-form">
          <label className="toggle-row">
            <input type="checkbox" checked={form.ollama.enabled} onChange={(event) => onOllamaChange('enabled', event.target.checked)} />
            <span>Enable Ollama classification</span>
          </label>
          <label className="field">
            <span>Base URL</span>
            <input value={form.ollama.baseUrl} onChange={(event) => onOllamaChange('baseUrl', event.target.value)} />
          </label>
          <label className="field">
            <span>Model</span>
            <input value={form.ollama.model} onChange={(event) => onOllamaChange('model', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="icon-button primary" onClick={onSave}>
          <Save size={17} />
          Save Settings
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </section>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function CategoryLabel({ category }: { category: MessageDecision['category'] }) {
  return <span className={`category ${category}`}>{category}</span>;
}

function ActionLabel({ action, status }: { action: MessageDecision['recommendedAction']; status?: MessageDecision['actionStatus'] }) {
  return <span className={`action ${action}`}>{status ? `${action} · ${status}` : action}</span>;
}

function Rule({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rule">
      <div className="rule-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}
