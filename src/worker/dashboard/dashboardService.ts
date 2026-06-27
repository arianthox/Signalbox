import type { DashboardData, DashboardMetrics } from '../../shared/types.js';
import type { SignalboxRepository } from '../storage/repositories.js';

export class DashboardService {
  constructor(private readonly repository: SignalboxRepository) {}

  getDashboard(): DashboardData {
    const decisions = this.repository.listDecisionRows();
    return {
      decisions,
      metrics: calculateMetrics(decisions)
    };
  }
}

function calculateMetrics(decisions: DashboardData['decisions']): DashboardMetrics {
  return {
    important: decisions.filter((decision) => decision.recommendedAction === 'alert').length,
    autoArchived: decisions.filter((decision) => decision.recommendedAction === 'archive' && decision.actionStatus === 'applied').length,
    reviewRequired: decisions.filter((decision) => decision.recommendedAction === 'review' || decision.actionStatus === 'pending_review').length,
    pendingDelete: decisions.filter((decision) => decision.recommendedAction === 'review' && decision.category === 'unknown').length
  };
}
