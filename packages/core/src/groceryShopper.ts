import {z} from 'zod';
import {bodyMeasurementsSchema} from './weightContext.ts';
import {selectCurrentPanel} from './reports.ts';
import type {PanelRecord,BetaSnapshot} from './beta.ts';
import type {Profile} from './types.ts';
export const GROCERY_SHOPPER_LEGACY_CONSENT='grocery-shopper-google-2026-10-25.1' as const;
export const GROCERY_SHOPPER_CONSENT='grocery-shopper-google-openai-2026-10-25.1' as const;
import {preferenceText} from './preferenceText.ts';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v&&d.getTime()<=Date.now();});
const measurement=z.object({analyte:z.enum(['total','ldl','hdl','triglycerides','apob','lpa']),rawValue:z.string().regex(/^\d+(\.\d+)?$/).max(20),unit:z.enum(['mg/dL','mmol/L','nmol/L','g/L']),comparator:z.enum(['<','>','='])}).strict()
 .refine(m=>m.analyte==='lpa'?['mg/dL','nmol/L'].includes(m.unit):m.analyte==='apob'?['mg/dL','g/L'].includes(m.unit):['mg/dL','mmol/L'].includes(m.unit));
export const groceryShopperSchema=z.object({
 consentVersion:z.enum([GROCERY_SHOPPER_CONSENT,GROCERY_SHOPPER_LEGACY_CONSENT]),age:z.number().int().min(21).max(120),
 gender:z.enum(['female','male','nonBinary']).optional(),pregnancy:z.enum(['pregnant','not-pregnant']).optional(),
 intent:z.enum(['prevention','management','both']).optional(),
 eatingPreferences:preferenceText.optional(),foodPreferences:preferenceText.optional(),
 bodyMeasurements:bodyMeasurementsSchema.optional(),
 lipidPanel:z.object({testDate:date,measurements:z.array(measurement).min(1).max(6)}).strict().refine(p=>new Set(p.measurements.map(m=>m.analyte)).size===p.measurements.length).optional()
}).strict();
export type GroceryShopper=z.infer<typeof groceryShopperSchema>;
/** Explicit opt-in, minimal fields, current resolved real panel only. No IDs, raw reports or inferred diagnoses. */
export function groceryShopper(profile:Profile,panels:readonly PanelRecord[]=[],choice?:BetaSnapshot['panelChoice'],now=Date.now()):GroceryShopper{
 const selected=selectCurrentPanel(panels.filter(p=>p.synthetic===false&&p.confirmed),choice);
 const panel=selected.unresolved.length===0?selected.panel:null;
 const measurements=profile.bodyMeasurements,measuredAt=measurements?Date.parse(measurements.recordedAt):NaN;
 return groceryShopperSchema.parse({consentVersion:GROCERY_SHOPPER_CONSENT,age:profile.age,
  ...(profile.gender&&profile.gender!=='unspecified'?{gender:profile.gender}:{}),
  ...(profile.pregnancy!=='unspecified'?{pregnancy:profile.pregnancy}:{}),intent:profile.intent,
  ...(profile.eatingPreferences?.trim()?{eatingPreferences:profile.eatingPreferences.trim()}:{}),
  ...(profile.foodPreferences?.trim()?{foodPreferences:profile.foodPreferences.trim()}:{}),
  ...(measurements&&measuredAt<=now?{bodyMeasurements:measurements}:{}),
  ...(panel?.testDate&&Date.parse(panel.testDate+'T00:00:00Z')<=now?{lipidPanel:{testDate:panel.testDate,measurements:panel.measurements.map(({analyte,rawValue,unit,comparator})=>({analyte,rawValue,unit,comparator}))}}:{})
 });
}
