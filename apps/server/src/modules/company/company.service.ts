import companyRepository from "./company.repository.js";

import type {
    CreateCompanyDTO,
    UpdateCompanyDTO,
} from "./company.validators.js";

class CompanyService {
    async createCompany(
        userId: string,
        data : CreateCompanyDTO,
    ){
        return companyRepository.create(userId, data);
    }

    async getCompanies() {
        return companyRepository.findAll();
    }

    async getCompany(id: string) {
        return companyRepository.findById(id);
    }

    async updateCompany(
        id: string,
        data: UpdateCompanyDTO,
    ) {
        return companyRepository.update(id, data);
    }

    async deleteCompany(id: string) {
        return companyRepository.delete(id);
    }
}

export default new CompanyService();