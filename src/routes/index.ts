import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { bookingRouter } from './booking.routes';
import { customerRouter } from './customer.routes';
import { healthRouter } from './health.routes';
import { planRouter } from './plan.routes';
import { serviceRouter } from './service.routes';
import { userRouter } from './user.routes';
import { workerRouter } from './worker.routes';
import { zoneRouter } from './zone.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/users', userRouter);
router.use('/customers', customerRouter);
router.use('/services', authenticate, serviceRouter);
router.use('/plans', authenticate, planRouter);
router.use('/zones', authenticate, zoneRouter);
router.use('/workers', authenticate, workerRouter);
router.use('/bookings', authenticate, bookingRouter);
