import dotenv from "dotenv";

export async function configManager() {
    dotenv.config();
    const config = {
        DCTK: process.env.DCTK,
        BHUD: process.env.BHUD,
        BHPD: process.env.BHPD,
        SGOT: process.env.SGOT,
        TWPT: process.env.TWPT,
        TWHT: process.env.TWHT,
        TWHA: process.env.TWHA,
        TWHC: process.env.TWHC
    };
    return config;
}
