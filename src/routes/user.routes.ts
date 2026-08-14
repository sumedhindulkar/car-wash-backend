import { Router } from 'express';
import { create, remove, update } from '../controllers/user.controller';

export const userRouter = Router();

userRouter.post('/', create);
userRouter.patch('/:id', update);
userRouter.delete('/:id', remove);
