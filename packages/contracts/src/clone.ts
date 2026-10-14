import { z } from 'zod';
export const FullCloneStatusSchema=z.strictObject({used:z.boolean(),activatedRound:z.number().int().min(1).max(5).nullable(),
  expiresAfterRound:z.number().int().min(1).max(5).nullable(),active:z.boolean()
}).refine(s=>s.used ? s.activatedRound!==null && s.expiresAfterRound===Math.min(s.activatedRound+1,5)
  : s.activatedRound===null && s.expiresAfterRound===null && !s.active,'Original once-only activation and fixed expiry');
export type FullCloneStatus=z.infer<typeof FullCloneStatusSchema>;
