export class AnalyticsService {
  #analyticsRepository;

  constructor({ analyticsRepository }) {
    this.#analyticsRepository = analyticsRepository;
  }

  async getWeeklyDashboard({ days = 7 } = {}) {
    return this.#analyticsRepository.getWeeklySalesAnalytics({ days });
  }
}
