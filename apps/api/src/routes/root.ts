import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  return res.json({ message: 'Hello API' });
});

export default router;
