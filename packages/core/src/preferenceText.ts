import {z} from 'zod';
export const preferenceText=z.string().trim().max(300).refine(v=>!/[\u0000-\u001f\u007f]/.test(v));
