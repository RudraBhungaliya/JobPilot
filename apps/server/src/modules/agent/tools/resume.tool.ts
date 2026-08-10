import resumeService from "../../resume/resume.service.js";

class ResumeTool {
    async getResumes(
        userId : string,
    ){
        return resumeService.getResume(userId);
    }

    async getResume(
        id : string,
    ){
        return resumeService.getResume(id);
    }

    async deleteResume(
        id: string,
    ) {
        return resumeService.deleteResume(
            id,
        );
    }
}

export default new ResumeTool();

