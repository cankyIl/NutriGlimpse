import {File,Paths} from 'expo-file-system';
import {NEWS_POOL_LIMIT} from '../../../../packages/core/src/newsPersonalization';
// Public publisher metadata only. The selected interests and preference stay in the encrypted profile repository.
const file=()=>new File(Paths.cache,'food-news-v2.json');
export const newsCache={get:async()=>{const f=file();return f.exists&&f.size<=NEWS_POOL_LIMIT?await f.text():null;},set:async(value:string)=>{if(value.length>NEWS_POOL_LIMIT)throw Error('News limit');file().write(value);}};
