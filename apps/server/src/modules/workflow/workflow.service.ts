import workflowEngine from "./workflow.engine.js";
import retryService from "./retry.service.js";

import type {
    RetryWorkflowDTO,
    StartWorkflowDTO,
} from "./workflow.validators.js";

class WorkflowService {
    async start (
        dto : StartWorkflowDTO,
    ){
        const batchSize = dto.batchSize ?? 10;

        await workflowEngine.execute(
            batchSize,
        );

        return {
            success : true,
            message : "Workflow execution started",
        };
    }

    async retry (
        dto : RetryWorkflowDTO,
    ){
        return retryService.retry(
            dto.applicationId,
        );
    }
}

export default new WorkflowService();