import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAuthAction } from './[action]';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleAuthAction(req, res, 'register');
}
