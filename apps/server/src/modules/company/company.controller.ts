import type { Request, Response } from "express";

import companyService from "./company.service.js";
import {
    createCompanySchema,
    updateCompanySchema,
}   from "./company.validators.js";

class CompanyController {
    async create(
        req : Request, 
        res : Response,
    ){
        const data = createCompanySchema.parse(req.body);
        const company = await companyService.createCompany(req.user.id, data);

        return res.status(201).json({
            success : true,
            data : company,
        });
    }

      async getAll(req: Request, res: Response) {
        const companies = await companyService.getCompanies();

        return res.status(200).json({
            success: true,
            data: companies,
        });
    }

    async getOne(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const company = await companyService.getCompany(id);

        return res.status(200).json({
            success: true,
            data: company,
        });
    }

    async update(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const body = updateCompanySchema.parse(req.body);

        const company = await companyService.updateCompany(
            id,
            body
        );

        return res.status(200).json({
            success: true,
            data: company,
        });
    }

    async delete(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await companyService.deleteCompany(id);

        return res.sendStatus(204);
    }
}

export default new CompanyController();