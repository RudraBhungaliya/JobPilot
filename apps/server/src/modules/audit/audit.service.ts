import auditRepository from "./audit.repository.js";

import type {
    CreateAuditLogDTO,
    AuditLogListDTO,
} from "./audit.validators.js";

class AuditService {
    async create(
        userId: string,
        data: CreateAuditLogDTO,
    ) {
        return auditRepository.create({
            userId,
            ...data,
        });
    }

    async getLogs(
        userId: string,
        options: AuditLogListDTO,
    ) {
        return auditRepository.findByUser(
            userId,
            options,
        );
    }

    async getLog(
        userId: string,
        id: string,
    ) {
        return auditRepository.findById(
            id,
            userId,
        );
    }

    async getApplicationLogs(
        userId: string,
        applicationId: string,
    ) {
        return auditRepository.findByApplication(
            applicationId,
            userId,
        );
    }

    async getAgentRunLogs(
        userId: string,
        agentRunId: string,
    ) {
        return auditRepository.findByAgentRun(
            agentRunId,
            userId,
        );
    }
}

export default new AuditService();