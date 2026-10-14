import type { Request, Response } from "express";
import analyticsService from "./analytics.service.js";

export class AnalyticsController {
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const data = await analyticsService.getOverview(userId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load overview analytics" });
    }
  }

  async getFunnel(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const data = await analyticsService.getFunnel(userId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load funnel analytics" });
    }
  }

  async getConversions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const overview = await analyticsService.getOverview(userId);
      res.status(200).json({
        success: true,
        data: { rates: overview.conversionRates },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load conversion analytics" });
    }
  }

  async getSources(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const data = await analyticsService.getSourcesAndTiers(userId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load source analytics" });
    }
  }

  async getFailures(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const data = await analyticsService.getFailures(userId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load failure analytics" });
    }
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const requestedDays = req.query.days === undefined ? 14 : Number(req.query.days);
      if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 365) {
        res.status(400).json({ success: false, message: "days must be an integer from 1 to 365" });
        return;
      }
      const days = requestedDays;
      const data = await analyticsService.getActivity(userId, days);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "Failed to load activity time-series" });
    }
  }

  async recordEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { type, applicationId, companyName, notes, metadata } = req.body;

      const allowedTypes = ["INTERVIEW_INVITE", "OFFER_RECEIVED", "REJECTION_RECEIVED"];
      if (!allowedTypes.includes(type)) {
        res.status(400).json({ success: false, message: "A supported interaction event type is required" });
        return;
      }

      const audit = await analyticsService.recordEvent(userId, {
        type,
        applicationId,
        companyName,
        notes,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: "Interaction event recorded successfully",
        data: audit,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message || "Failed to record event" });
    }
  }
}

const analyticsController = new AnalyticsController();
export default analyticsController;
