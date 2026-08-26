import { Router } from 'express';
import {
  byLocation,
  byPincode,
  create,
  getById,
  remove,
  update,
} from '../controllers/zone.controller';

export const zoneRouter = Router();

zoneRouter.post('/', create);
zoneRouter.get('/by-pincode/:pincode', byPincode);
zoneRouter.get('/by-location', byLocation);
zoneRouter.get('/:zoneId', getById);
zoneRouter.patch('/:zoneId', update);
zoneRouter.delete('/:zoneId', remove);
