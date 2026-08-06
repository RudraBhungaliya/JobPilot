import queueService from "./queue.service.js";

class SchedulerService{
    async schedule(
        batchSize : number,
    ){
        return queueService.getPendingApplications(
            batchSize,
        );
    }
}

export default new SchedulerService();