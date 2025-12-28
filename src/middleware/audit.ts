import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export async function logAudit(actorId: string, action: string, entity: string, entityId: string, meta?: any) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta: meta ? JSON.stringify(meta) : null } });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}

export function audit(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // run the handler
    try {
      await next();
    } finally {
      try {
        const actor = (req as any).user?.sub || 'system';
        const entityId = (req as any).params?.id || (res as any).locals?.entityId || '';
        logAudit(actor, action, entity, entityId, { body: req.body });
      } catch (err) {
        console.error('Audit middleware failure', err);
      }
    }
  };
}
