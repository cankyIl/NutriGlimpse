import {Linking,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {groceryUrl} from '../../../../packages/core/src/groceryReview';
export function SearchAttribution({html}:{html:string|null}){
 if(!html)return null;
 const document='<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data: https://www.gstatic.com https://www.google.com;">'+html;
 return <View accessibilityLabel="Google Search suggestions" style={{height:150}}>
  <WebView source={{html:document}} originWhitelist={['*']} javaScriptEnabled={false} domStorageEnabled={false} incognito sharedCookiesEnabled={false} cacheEnabled={false} allowFileAccess={false} mixedContentMode="never" setSupportMultipleWindows={false}
   onShouldStartLoadWithRequest={request=>{
    if(request.url==='about:blank')return true;
    if(request.navigationType==='click'&&groceryUrl.safeParse(request.url).success)void Linking.openURL(request.url).catch(()=>{});
    return false;
   }} style={{backgroundColor:'transparent'}}/>
 </View>;
}
