export class AnalyticsController {
  #analyticsService;

  constructor({ analyticsService }) {
    this.#analyticsService = analyticsService;
  }

  getWeeklyStats = async (req, res, next) => {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const stats = await this.#analyticsService.getWeeklyDashboard({ days });
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
