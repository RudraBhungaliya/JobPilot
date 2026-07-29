import userRepository from "./user.repository.js";
import type { UpdateProfileDTO } from "./user.validators.js";

class UserService {
    async getProfile(id: string) {
        return userRepository.findById(id);
    }

    async updateProfile(
        id: string,
        data: UpdateProfileDTO
    ) {
        return userRepository.update(id, data);
    }

    async deleteProfile(id: string) {
        return userRepository.delete(id);
    }
}

export default new UserService();