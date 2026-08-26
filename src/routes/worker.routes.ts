import { Router } from 'express';
import { create, getByIdentifier, update } from '../controllers/worker.controller';

export const workerRouter = Router();

workerRouter.post('/', create);
workerRouter.patch('/:identifier', update);
workerRouter.get('/:identifier', getByIdentifier);
