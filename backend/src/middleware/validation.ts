import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: error.errors[0]?.message || 'Dados inválidos'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };
}; 