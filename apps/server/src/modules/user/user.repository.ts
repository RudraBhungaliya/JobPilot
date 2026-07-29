import { prisma } from "@jobpilot/database";

class UserRepository {
    async findById(id : string){
        return prisma.user.findUnique({
            where : {
                id,
            },
        });
    }

    async update(
        id : string,
        data : {
            email ?: string;
            password ?: string;
        }
    ){
        return prisma.user.update({
            where : {
                id,
            },
            data, 
        });
    }

    async delete(id: string) {
        return prisma.user.delete({
            where: {
                id,
            },
        });
    } 
};

export default new UserRepository();
