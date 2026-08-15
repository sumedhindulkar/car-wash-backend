import { Router } from 'express';
import { healthRouter } from './health.routes';
import { serviceRouter } from './service.routes';
import { userRouter } from './user.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/users', userRouter);
router.use('/services', serviceRouter);
