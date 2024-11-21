import { Request, Response, NextFunction } from 'express';

export const paymentErrorHandler = (
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error.name === 'PaystackError') {
    return res.status(400).json({
      status: 'error',
      message: 'Payment processing error',
      error: error.message
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(422).json({
      status: 'error',
      message: 'Invalid payment information',
      error: error.message
    });
  }

  next(error);
}; 