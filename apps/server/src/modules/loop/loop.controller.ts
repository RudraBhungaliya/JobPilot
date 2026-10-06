import type { Request, Response } from "express";
import loopService from "./loop.service.js";
import loopExecutionEngine from "./loop-execution.engine.js";
import { prisma } from "@jobpilot/database";

export class LoopController {
  private async getUserId(req: Request): Promise<string> {
    const headerUserId = req.headers["x-user-id"] as string;
    if (headerUserId) return headerUserId;
    const user = await prisma.user.findFirst();
    if (!user) {
      const newUser = await prisma.user.create({
        data: {
          email: "candidate@jobpilot.io",
          password: "password123",
        },
      });
      return newUser.id;
    }
    return user.id;
  }

  create = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loop = await loopService.createLoop(userId, req.body);
      return res.status(201).json({
        success: true,
        data: loop,
        message: "Job search loop created successfully.",
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to create job search loop.",
      });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loops = await loopService.getLoops(userId);
      return res.json({
        success: true,
        data: loops,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch job search loops.",
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const loop = await loopService.getLoopById(userId, loopId);
      return res.json({
        success: true,
        data: loop,
      });
    } catch (err: any) {
      return res.status(404).json({
        success: false,
        message: err.message || "Loop not found.",
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const loop = await loopService.updateLoop(userId, loopId, req.body);
      return res.json({
        success: true,
        data: loop,
        message: "Loop updated successfully.",
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to update loop.",
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await loopService.deleteLoop(userId, loopId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to delete loop.",
      });
    }
  };

  run = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await loopService.runLoop(userId, loopId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to execute loop run.",
      });
    }
  };

  runDue = async (_req: Request, res: Response) => {
    try {
      const results = await loopExecutionEngine.executeDueLoops();
      return res.json({
        success: true,
        data: results,
        message: `Processed ${results.length} due search loop(s).`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to process due loops.",
      });
    }
  };

  getEngineStatus = async (_req: Request, res: Response) => {
    try {
      const status = loopExecutionEngine.getStatus();
      return res.json({
        success: true,
        data: status,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to get engine status.",
      });
    }
  };

  matchJobs = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const persistApplications = req.body?.persistApplications !== false;
      const matches = await loopService.matchLoopJobs(userId, loopId, { persistApplications });
      return res.json({
        success: true,
        data: matches,
        count: matches.length,
        message: `Matched and ranked ${matches.length} jobs for loop.`,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to match loop jobs.",
      });
    }
  };

  getMatches = async (req: Request, res: Response) => {
    try {
      const userId = await this.getUserId(req);
      const loopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const matches = await loopService.getLoopMatches(userId, loopId);
      return res.json({
        success: true,
        data: matches,
        count: matches.length,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to fetch loop matches.",
      });
    }
  };
}

export default new LoopController();

