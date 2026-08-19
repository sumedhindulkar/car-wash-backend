import { Router } from 'express';
import { preview, verify } from '../controllers/plan.controller';

export const planRouter = Router();

planRouter.post('/preview', preview);
planRouter.post('/verify', verify);
