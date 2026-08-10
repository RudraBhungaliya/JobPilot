import profileService from "../../profile/profile.service.js";

class ProfileTool {
    async getProfile(
        userId : string,
    ){
        return profileService.getProfile(userId);
    }
}

export default new ProfileTool();