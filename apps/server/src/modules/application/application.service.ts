import applicationRepository from "./application.repository.js";
import { eventEmitter } from "../../core/events/index.js";

import type {
    CreateApplicationDTO,
    UpdateApplicationDTO,
} from "./application.validators.js";

class ApplicationService {
    async createApplication(userId: string, data: CreateApplicationDTO) {
        return applicationRepository.create(userId, data);
    }

    async getApplications(userId: string) {
        return applicationRepository.findByUser(userId);
    }

    async getApplication(id: string) {
        return applicationRepository.findById(id);
    }

    async updateApplication(id: string, data: UpdateApplicationDTO) {
        const updated = await applicationRepository.update(id, data);

        // Push a real-time status change event if the status changed
        if (data.status) {
            eventEmitter.emit({
                type: "application.status_changed",
                userId: updated.userId,
                applicationId: updated.id,
                status: updated.status,
                jobId: updated.jobId,
                timestamp: new Date().toISOString(),
            });
        }

        return updated;
    }

    async deleteApplication(id: string) {
        return applicationRepository.delete(id);
    }

    // Returns an existing active application or creates a new one.
    // Prevents duplicate submissions for the same user/job pair.
    async findOrCreate(
        userId: string,
        data: CreateApplicationDTO,
    ) {
        const existing = await applicationRepository.findByUserAndJob(
            userId,
            data.jobId,
        );

        if (existing) {
            // If already submitted, skip to avoid double-applying
            if (existing.status === "SUBMITTED" || existing.status === "RUNNING") {
                return { application: existing, created: false, skipped: true };
            }

            return { application: existing, created: false, skipped: false };
        }

        const application = await applicationRepository.create(userId, data);

        return { application, created: true, skipped: false };
    }
}

export default new ApplicationService();