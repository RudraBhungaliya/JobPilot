import jobRepository from "./job.repository.js";

import type {
    CreateJobDTO,
    UpdateJobDTO,
} from "./job.validators.js";

class JobService {
    async createJob(
        userId : string,
        data : CreateJobDTO,
    ){
        return jobRepository.create(userId, data);
    }

    async getJobs(
        userId : string,
    ){
        return jobRepository.findAllbyUser(userId);
    }

    async getJob(
        id : string,
    ){
        return jobRepository.findById(id);
    }

    async updateJob(
        id : string,
        data : UpdateJobDTO,
    ){
        return jobRepository.update(id, data);
    }

    async deleteJob(
        id : string,
    ){
        return jobRepository.delete(id);
    }
}

export default new JobService();