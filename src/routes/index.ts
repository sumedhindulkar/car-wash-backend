import { Router } from 'express';
import { healthRouter } from './health.routes';
import { planRouter } from './plan.routes';
import { serviceRouter } from './service.routes';
import { userRouter } from './user.routes';
import { workerRouter } from './worker.routes';
import { zoneRouter } from './zone.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/users', userRouter);
router.use('/services', serviceRouter);
router.use('/plans', planRouter);
router.use('/zones', zoneRouter);
router.use('/workers', workerRouter);
