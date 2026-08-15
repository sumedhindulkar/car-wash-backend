import { Router } from 'express';
import { list, update } from '../controllers/service.controller';

export const serviceRouter = Router();

serviceRouter.get('/', list);
serviceRouter.patch('/:id', update);
