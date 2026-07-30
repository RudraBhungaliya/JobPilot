import resumeRepository from "./resume.repository.js";
import type { UploadResumeDTO } from "./resume.validators.js";

class ResumeService {
    async createResume(userId: string,
        dto: UploadResumeDTO,
        fileUrl: string,
        originalName: string
    ) {
        return resumeRepository.create({
            title : dto.title,
            user : {
                connect : {
                    id : userId,
                },
            },
            fileUrl,
            originalName,
        });
    }

    async getResume(id : string){
        return resumeRepository.findById(id);
    }

    async getUserResumes(userId : string){
        return resumeRepository.findByUserId(userId);
    }
    async deleteResume(id : string){
        return resumeRepository.delete(id);
    }
}

export default new ResumeService();