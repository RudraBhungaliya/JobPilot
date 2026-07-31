import resumeRepository from "../resume/resume.repository.js";

class ATSRepository {
    async getResume(id: string) {
        return resumeRepository.findById(id);
    }
}

export default new ATSRepository();