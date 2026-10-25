import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import PrivateInput from '../../modules/private-input';
import { fingerprintReportSource } from '../../../../packages/core/src/reportImports';
import { requirePersonalCapture } from '../../../../packages/core/src/captureGate';
export const inputAdapter = {
 createSessionAsync:()=>PrivateInput.createSessionAsync(),
 cancelSession:(id:string)=>PrivateInput.cancelSession(id),
 disposeSessionAsync:(id:string)=>PrivateInput.disposeSessionAsync(id),
 createSyntheticImageAsync:(id:string)=>PrivateInput.createSyntheticImageAsync(id),
 createSyntheticPdfAsync:(id:string)=>PrivateInput.createSyntheticPdfAsync(id),
 inspectAsync:(id:string,uri:string,mime:string)=>PrivateInput.inspectAsync(id,uri,mime),
 renderTextAsync:(id:string,page:number,lines:string[])=>PrivateInput.renderTextAsync(id,page,lines),
 fingerprintSourceAsync:async(uri:string)=>{
  const file=new File(uri);
  if(!file.exists||file.size<=0||file.size>20*1024*1024)throw Error('Unsupported source size.');
  return fingerprintReportSource(await file.bytes());
 },
};
/** Adapter is intentionally unreachable until verified release configuration replaces the hard gate. */
export async function requestPersonalInput(kind:'camera'|'document'){
 requirePersonalCapture();
 if(kind==='camera'){
  const permission=await ImagePicker.requestCameraPermissionsAsync();
  if(!permission.granted)throw Error('Camera permission denied.');
  const picked=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:false,exif:false,base64:false,quality:1});
  if(picked.canceled)return null;
  return validatePicked(picked.assets[0].uri,picked.assets[0].mimeType??'image/jpeg');
 }
 const picked=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','application/pdf'],multiple:false,copyToCacheDirectory:true});
 if(picked.canceled)return null;
 return validatePicked(picked.assets[0].uri,picked.assets[0].mimeType??'');
}
function validatePicked(uri:string,mime:string){
 const file=new File(uri);
 const discard=()=>{if(uri.startsWith(Paths.cache.uri)&&file.exists)file.delete();};
 if(!uri.startsWith(Paths.cache.uri)||!['image/jpeg','image/png','application/pdf'].includes(mime)||!file.exists||file.size<=0||file.size>20*1024*1024){discard();throw Error('Unsupported private input.');}
 return {uri,mime,discard};
}
