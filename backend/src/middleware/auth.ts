import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../types';

// Extender o Request interface para adicionar userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const auth = (
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token de acesso requerido'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

export const authMiddleware = auth;