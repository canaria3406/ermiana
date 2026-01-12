import dotenv from 'dotenv';

export async function configManager() {
  dotenv.config();
  const config = {
    DCTK: process.env.DCTK,
    DCID: process.env.DCID,
    DCWH: process.env.DCWH,
    BHUD: process.env.BHUD,
    BHPD: process.env.BHPD,
    API_PORT: process.env.API_PORT || 3000,
    API_URL: process.env.API_URL || 'http://localhost:3000',
  };
  return config;
}
