import {foodSchema,type PublicFood} from '../../../../packages/core/src/publicFood';
import {photoAssessmentResponseSchema,type PhotoAssessmentResult} from '../../../../packages/core/src/photoAssessment';
// Verified public facts and their bounded assessment cross routes in memory; no images/profile or disk writes.
let selected:{token:string;food:PublicFood;assessment?:PhotoAssessmentResult;expires:number}|null=null;
export const confirmedPhotoFood={
 put(token:string,food:PublicFood,assessment?:PhotoAssessmentResult){selected={token,food:foodSchema.parse(food),...(assessment?{assessment:photoAssessmentResponseSchema.parse(assessment)}:{}),expires:Date.now()+10*60*1000};},
 get(token:string){if(!selected||selected.expires<Date.now()){selected=null;return null;}return selected.token===token?selected.food:null;},
 assessment(token:string){return this.get(token)?selected?.assessment:undefined;},
 clear(){selected=null;},
};
