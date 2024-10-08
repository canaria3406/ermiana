import dotenv from 'dotenv';

export async function configManager() {
  dotenv.config();
  const config = {
    DCTK: process.env.DCTK,
    DCID: process.env.DCID,
    DCWH: process.env.DCWH,
    BHUD: process.env.BHUD,
    BHPD: process.env.BHPD,
  };
  return config;
}
