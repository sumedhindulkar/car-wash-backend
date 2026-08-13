import express from 'express';
import { API_PREFIX } from './constants/api';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { router } from './routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(API_PREFIX, router);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
