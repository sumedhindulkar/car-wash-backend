import { Router } from 'express';
import { create, getByIdentifier, update } from '../controllers/customer.controller';

export const customerRouter = Router();

customerRouter.post('/', create);
customerRouter.patch('/:identifier', update);
customerRouter.get('/:identifier', getByIdentifier);
