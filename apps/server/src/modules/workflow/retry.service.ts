import applicationRepository from "../application/application.repository.js";

class RetryService {
    async retry(
        applicationId : string,
    ){
        const application = await applicationRepository.findById(
            applicationId,
        );

        if(!application){
            throw new Error(
                "Application not found",
            );
        }

        return applicationRepository.update(
            applicationId,
            {
                status : "QUEUED",
                attempts : application.attempts + 1,
            },
        );
    }
}

export default new RetryService();
