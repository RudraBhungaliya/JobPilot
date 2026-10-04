import { Router } from "express";
import authMiddleware from "../auth/auth.middleware.js";
import notificationController from "./notification.controller.js";
import emailService from "./email.service.js";

const router = Router();

// Test email dispatch (supports open or authenticated testing)
router.post("/test-email", async (req, res) => {
    try {
        const { email, candidateName, jobTitle, companyName, reason } = req.body;
        const targetEmail = email || req.user?.email || "candidate@jobpilot.ai";
        
        const result = await emailService.sendHumanInterventionAlert({
            to: targetEmail,
            candidateName: candidateName || "Developer",
            jobTitle: jobTitle || "Senior Software Engineer (India Hub)",
            companyName: companyName || "Stripe",
            actionUrl: "https://jobpilot.ai/verify/session-live-01",
            reason: reason || "Security Checkpoint / CAPTCHA verification required",
            verificationType: "Cloudflare Turnstile / CAPTCHA",
            jobLocation: "Bengaluru, India",
            salaryDollar: "$75,000 - $125,000 / yr (62 - 105 LPA)",
        });

        return res.status(200).json({
            success: true,
            message: `Human intervention alert sent successfully to ${targetEmail}`,
            data: result,
        });
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to dispatch email",
        });
    }
});

router.use(authMiddleware);

router.get("/", notificationController.getNotifications.bind(notificationController));
router.post("/", notificationController.createNotification.bind(notificationController));
router.get("/unread-count", notificationController.getUnreadCount.bind(notificationController));
router.patch("/read-all", notificationController.markAllRead.bind(notificationController));
router.patch("/:id/read", notificationController.markRead.bind(notificationController));
router.get("/:id", notificationController.getNotification.bind(notificationController));
router.delete("/:id", notificationController.delete.bind(notificationController));

export default router;