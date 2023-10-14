import dotenv from "dotenv";

export async function configManager() {
    dotenv.config();
    const config = {
        DCTK: process.env.DCTK,
        BHUD: process.env.BHUD,
        BHPD: process.env.BHPD,
        TWPT: process.env.TWPT,
        TWHT: process.env.TWHT,
        TWHA: process.env.TWHA,
        TWHC: process.env.TWHC,
        NHCC: process.env.NHCC,
        NHCT: process.env.NHCT
    };
    return config;
}
