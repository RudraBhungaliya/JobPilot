import applicationRepository from "./application.repository.js";

import type {
    CreateApplicationDTO,
    UpdateApplicationDTO,
} from "./application.validators.js";

class ApplicationService {
    async createApplication(
        userId: string,
        data: CreateApplicationDTO,
    ) {
        return applicationRepository.create(userId, data);
    }

    async getApplications(userId: string) {
        return applicationRepository.findByUser(userId);
    }

    async getApplication(id: string) {
        return applicationRepository.findById(id);
    }

    async updateApplication(
        id: string,
        data: UpdateApplicationDTO,
    ) {
        return applicationRepository.update(id, data);
    }

    async deleteApplication(id: string) {
        return applicationRepository.delete(id);
    }
}

export default new ApplicationService();