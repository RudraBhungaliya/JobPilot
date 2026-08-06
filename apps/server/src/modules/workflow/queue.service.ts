import applicationRepository from "../application/application.repository.js";

class QueueService {
    async getPendingApplications(
        limit : number,
    ){
        const applications = await applicationRepository.findPending(
            limit,
        );
        return applications;
    }

    async markCompleted(
        applicationId: string,
    ) {
        return applicationRepository.update(
            applicationId,
            {
                status: "SUBMITTED",
            },
        );
    }

    async markRunning(
        applicationId : string,
    ){
        return applicationRepository.update(
        applicationId, 
        {
            status : "RUNNING",
        },
    );
    }

    async markFailed(
        applicationId : string,
        reason : string,
    ){
        return applicationRepository.update(
            applicationId,
            {
                status: "FAILED",
                failureReason: reason,
            },
        );
    }
}

export default new QueueService();