import type { Request, Response } from "express";

import atsService from "./ats.service.js";
import { analyzeResumeSchema } from "./ats.validators.js";

class ATSController {
  async analyze(req: Request, res: Response) {
    const body = analyzeResumeSchema.parse(req.body);

    const report = await atsService.analyzeResume(body.resumeId);

    return res.status(200).json({
      success: true,
      data: report,
    });
  }
}

export default new ATSController();
