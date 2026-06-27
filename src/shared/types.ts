export type AutomationState = 'running' | 'paused';

export type SignalboxStatus = {
  automationState: AutomationState;
  connectedAccounts: number;
  importantAlerts: number;
  reviewRequired: number;
  lastSyncLabel: string;
};

export type MessageDecision = {
  id: string;
  account: string;
  sender: string;
  subject: string;
  category: 'important' | 'newsletter' | 'promotion' | 'notification' | 'security' | 'unknown';
  confidence: number;
  recommendedAction: 'alert' | 'archive' | 'label' | 'review';
  actionStatus?: 'planned' | 'pending_review' | 'applied' | 'failed';
  reason: string;
  receivedAt: string;
};

export type DashboardMetrics = {
  important: number;
  autoArchived: number;
  reviewRequired: number;
  pendingDelete: number;
};

export type DashboardData = {
  decisions: MessageDecision[];
  metrics: DashboardMetrics;
};

export type AccountSummary = {
  id: string;
  email: string;
  displayName: string | null;
  syncState: 'idle' | 'syncing' | 'error';
  connectedAt: string;
  lastSyncAt: string | null;
};

export type ConnectAccountResult =
  | {
      ok: true;
      account: AccountSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type AppSettings = {
  googleOAuth: {
    clientId: string;
    redirectUri: string;
    hasClientSecret: boolean;
  };
  ollama: {
    enabled: boolean;
    baseUrl: string;
    model: string;
  };
};

export type SaveSettingsInput = {
  googleOAuth: {
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
  };
  ollama: AppSettings['ollama'];
};
