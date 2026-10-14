import { Router } from "express";
import authMiddleware from "../auth/auth.middleware.js";
import notificationController from "./notification.controller.js";
import emailService from "./email.service.js";

const router = Router();

router.use(authMiddleware);

// Test email dispatch requires authenticated, caller-supplied content.
router.post("/test-email", async (req, res) => {
    try {
        const { candidateName, jobTitle, companyName, reason, actionUrl } = req.body;
        const targetEmail = req.user.email;
        if (![candidateName, jobTitle, companyName, reason, actionUrl].every((value) => typeof value === "string" && value.trim())) {
            return res.status(400).json({ success: false, message: "Candidate name, job title, company, reason, and action URL are required." });
        }
        
        const result = await emailService.sendHumanInterventionAlert({
            to: targetEmail,
            candidateName,
            jobTitle,
            companyName,
            actionUrl,
            reason,
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

router.get("/", notificationController.getNotifications.bind(notificationController));
router.post("/", notificationController.createNotification.bind(notificationController));
router.get("/unread-count", notificationController.getUnreadCount.bind(notificationController));
router.patch("/read-all", notificationController.markAllRead.bind(notificationController));
router.patch("/:id/read", notificationController.markRead.bind(notificationController));
router.get("/:id", notificationController.getNotification.bind(notificationController));
router.delete("/:id", notificationController.delete.bind(notificationController));

export default router;
