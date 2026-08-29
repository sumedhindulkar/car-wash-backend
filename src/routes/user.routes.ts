import { Router } from 'express';
import { create, remove, update } from '../controllers/user.controller';
import { authenticate, verifyToken } from '../middleware/authenticate';

export const userRouter = Router();

userRouter.post('/', verifyToken, create);
userRouter.patch('/:id', authenticate, update);
userRouter.delete('/:id', authenticate, remove);
