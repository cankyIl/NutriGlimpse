export const conditions = {
  cardiovascular: 'Heart health / high LDL',
  diabetes: 'Type 2 diabetes / prediabetes',
  hypertension: 'Hypertension',
  celiac: 'Celiac disease',
  ckd: 'Chronic kidney disease',
  masld: 'Fatty liver / MASLD',
  weight: 'Weight management',
  sibo: 'SIBO',
} as const;
export type Condition = keyof typeof conditions;
export const healthFocuses = { generalFitness: 'General Fitness', noConcern: 'No Concern', ...conditions } as const;
export type HealthFocus = keyof typeof healthFocuses;
export const genders = { female: 'Female', male: 'Male', nonBinary: 'Non-binary', unspecified: 'Prefer not to say' } as const;
export type Gender = keyof typeof genders;
export function isCondition(value: HealthFocus): value is Condition { return Object.hasOwn(conditions, value); }
export function hasValidHealthFocus(profile: Pick<Profile, 'primary' | 'conditions'>): boolean {
  return isCondition(profile.primary) ? profile.conditions.includes(profile.primary)
    : profile.primary === 'generalFitness' || (profile.primary === 'noConcern' && profile.conditions.length === 0);
}
export const restrictions = {
  vegetarian: 'Vegetarian', eggFree: 'Exclude eggs', dairyFree: 'Exclude dairy',
  halal: 'Halal', kosher: 'Kosher', glutenFree: 'Gluten-free',
} as const;
export type Restriction = keyof typeof restrictions;
export type EvidenceStatus = 'verified' | 'conflict' | 'unverified';
export type Rating = 'Good fit' | 'Neutral' | 'Limit' | 'Poor fit';
export type AssessmentLabel = Rating | 'Restriction conflict' | 'Insufficient information';
export interface Profile {
  eatingPreferences?: string;
  foodPreferences?: string;
  bodyMeasurements?: import('./weightContext.ts').BodyMeasurements;
  weightContextConsent?: {version: 'weight-context-ai-2026-10-16.1'; acceptedAt: string};
  revision: number;
  age: number;
  gender?: Gender;
  pregnancy: 'pregnant' | 'not-pregnant' | 'unspecified';
  primary: HealthFocus;
  conditions: Condition[];
  intent: 'prevention' | 'management' | 'both';
  restrictions: Restriction[];
}
export interface Product {
  id: string;
  name: string;
  variant: string;
  category: string;
  form: 'packaged' | 'fresh';
  serving: string;
  servingGrams: number | null;
  ingredients: string | null;
  nutrients: { calories: number | null; fiber: number | null; saturatedFat: number | null; sodium: number | null; sugars: number | null };
  compliance: Record<Restriction, EvidenceStatus>;
  retailers: string[];
  source: { id: string; title: string; version: string; synthetic: true };
  illustration: 'oats' | 'granola' | 'apple';
  fixtureRating: Rating | null;
}
export interface Assessment {
  productId: string;
  label: AssessmentLabel;
  reason: string;
  conflicts: Restriction[];
  unknown: Restriction[];
  missing: string[];
  primary: HealthFocus;
  profileRevision: number;
  portion: number;
  ruleVersion: 'synthetic-ui-1';
  synthetic: true;
  contextNotes: string[];
}
export interface SavedScan {
  id: string;
  kind: 'product';
  createdAt: string;
  product: Product;
  assessment: Assessment;
  profile: Profile;
}
export interface LabMeasurement {
  analyte: 'total' | 'ldl' | 'hdl' | 'triglycerides' | 'apob' | 'lpa';
  rawValue: string;
  unit: string;
  comparator: '<' | '>' | '=';
}
export interface ConfirmedPanel {
  id: string;
  testDate: string | null;
  confirmed: boolean;
  importedAt: string;
  measurements: LabMeasurement[];
}
export type ReportJob =
  | { status: 'ready' | 'in-flight' | 'failed' | 'outcome-unknown' }
  | { status: 'save-pending'; result: string }
  | { status: 'completed'; result: string };
export interface PrivateSnapshot { version: 1; profile: Profile; scans: SavedScan[] }
export interface PrivateRepository {
  read(): Promise<PrivateSnapshot | null>;
  write(snapshot: PrivateSnapshot): Promise<void>;
  clear(): Promise<void>;
}
