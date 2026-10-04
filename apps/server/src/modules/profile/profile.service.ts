import profileRepository from "./profile.repository.js";

import type {
    CreateProfileDTO,
    UpdateProfileDTO,
} from "./profile.validators.js";

class ProfileService {
    async createProfile(
        userId: string,
        data: CreateProfileDTO,
    ) {
        return profileRepository.create(
            userId,
            data,
        );
    }

    async getProfile(
        userId: string,
    ) {
        try {
            return await profileRepository.findByUserId(
                userId,
            );
        } catch {
            return null;
        }
    }

    async updateProfile(
        userId: string,
        data: UpdateProfileDTO,
    ) {
        return profileRepository.update(
            userId,
            data,
        );
    }

    async deleteProfile(
        userId: string,
    ) {
        return profileRepository.delete(
            userId,
        );
    }
}

export default new ProfileService();