import { Router } from 'express';
import { availability, create } from '../controllers/booking.controller';

export const bookingRouter = Router();

bookingRouter.get('/availability', availability);
bookingRouter.post('/', create);
