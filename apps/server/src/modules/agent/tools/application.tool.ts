import applicationService from "../../application/application.service.js";

class ApplicationTool {
    async getApplication(
        id : string,
    ){
        return applicationService.getApplication(id);
    }

    async getApplications(
        userId: string,
    ) {
        return applicationService.getApplications(
            userId,
        );
    }

    async createApplication(
        userId: string,
        data: Parameters<
            typeof applicationService.createApplication
        >[1],
    ) {
        return applicationService.createApplication(
            userId,
            data,
        );
    }

    async updateApplication(
        id: string,
        data: Parameters<
            typeof applicationService.updateApplication
        >[1],
    ) {
        return applicationService.updateApplication(
            id,
            data,
        );
    }

    async deleteApplication(
        id: string,
    ) {
        return applicationService.deleteApplication(
            id,
        );
    }
}

export default new ApplicationTool();