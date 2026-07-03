import type { NextApiRequest, NextApiResponse } from 'next';
import packageJson from '../../package.json';

export default function handler(_request: NextApiRequest, response: NextApiResponse) {
  response.status(200).json({
    status: 'ok',
    component: 'frontend',
    version: process.env.AGAPORNIS_FRONTEND_VERSION || packageJson.version,
    checkedAt: new Date().toISOString(),
  });
}
