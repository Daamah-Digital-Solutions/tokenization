import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from './errorHandler';

export function notFound(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

export default notFound;