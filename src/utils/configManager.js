import dotenv from 'dotenv';

export async function configManager() {
  dotenv.config();
  const config = {
    DCTK: process.env.DCTK,
    DCID: process.env.DCID,
    BHUD: process.env.BHUD,
    BHPD: process.env.BHPD,
    NHTK: process.env.NHTK,
  };
  return config;
}
