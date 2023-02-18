import dotenv from 'dotenv';

export async function configManager() {
    dotenv.config();
    const config = {
        DCTK: process.env.DCTK,
        BHUD: process.env.BHUD,
        BHPD: process.env.BHPD
    };
    return config;
}