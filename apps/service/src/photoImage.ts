import {PHOTO_MAX_BYTES} from '../../../packages/core/src/productPhoto.ts';
/** Bounded JPEG framing/dimension validation; discard EXIF, GPS, comments and other APP metadata.
 * Does not write files or decode attacker-controlled pixels. OpenAI still validates the JPEG stream. */
export function cleanProductJpeg(base64:string, limits:{maxBytes?:number;maxDimension?:number;width?:number;height?:number}={}):string{
 const data=Buffer.from(base64,'base64');
 if(data.length<12||data.length>(limits.maxBytes??PHOTO_MAX_BYTES)||data.toString('base64')!==base64||data.readUInt16BE(0)!==0xffd8)throw Error('INVALID_PRODUCT_IMAGE');
 const parts:Buffer[]=[data.subarray(0,2)];let p=2,frame=false,scans=0;
 while(p<data.length){
  const start=p;if(data[p++]!==255)throw Error('INVALID_PRODUCT_IMAGE');
  while(data[p]===255)p++;
  const marker=data[p++];
  if(marker===0xd9){if(!frame||!scans||p!==data.length)throw Error('INVALID_PRODUCT_IMAGE');parts.push(Buffer.from([255,217]));return Buffer.concat(parts).toString('base64');}
  if(!marker||marker===0xd8||marker>=0xd0&&marker<=0xd7||p+2>data.length)throw Error('INVALID_PRODUCT_IMAGE');
  const length=data.readUInt16BE(p),end=p+length;if(length<2||end>data.length)throw Error('INVALID_PRODUCT_IMAGE');
  if([0xc0,0xc1,0xc2].includes(marker)){
   if(frame||length<8||data[p+2]!==8)throw Error('INVALID_PRODUCT_IMAGE');
   const h=data.readUInt16BE(p+3),w=data.readUInt16BE(p+5),channels=data[p+7];
   if(w<16||h<16||w>(limits.maxDimension??1600)||h>(limits.maxDimension??1600)||(limits.width!==undefined&&w!==limits.width)||(limits.height!==undefined&&h!==limits.height)||![1,3].includes(channels)||length!==8+3*channels)throw Error('INVALID_PRODUCT_IMAGE');frame=true;
  }else if(marker>=0xc0&&marker<=0xcf&&![0xc4].includes(marker))throw Error('INVALID_PRODUCT_IMAGE');
  if(!(marker>=0xe0&&marker<=0xef)&&marker!==0xfe)parts.push(data.subarray(start,end));
  p=end;
  if(marker===0xda){
   if(!frame||++scans>16)throw Error('INVALID_PRODUCT_IMAGE');
   const begin=p;
   while(p<data.length){
    if(data[p]!==255){p++;continue;}
    const next=data[p+1];if(next===0||next>=0xd0&&next<=0xd7){p+=2;continue;}break;
   }
   parts.push(data.subarray(begin,p));
  }
 }
 throw Error('INVALID_PRODUCT_IMAGE');
}
