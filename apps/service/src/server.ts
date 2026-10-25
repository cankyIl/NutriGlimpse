import {GROCERY_CONSENT,groceryRequestSchema} from '../../../packages/core/src/groceryReview.ts';
import {GroceryProviderError} from './groceryReviewProvider.ts';
import {createNewsSelectionRoute} from './newsSelectionRoute.ts';
import {shelfGridRoute} from './shelfGridRoute.ts';
import {DUAL_FOOD_CONSENT,dualFoodRequestSchema,activePhotoModels} from '../../../packages/core/src/dualAiFoodReview.ts';
import {availabilityRequestSchema,legacyAvailabilityResultSchema} from '../../../packages/core/src/nearbyAvailability.ts';
import {createScanTimingInbox,createServerScanTimer} from './scanTiming.ts';
import {newTrace,recordDiagnostic,type BetaDiagnostics} from './betaDiagnostics.ts';
import {AI_FOOD_CONSENT,aiFoodRequestSchema,type AiPhotoPreview} from '../../../packages/core/src/aiFoodReview.ts';
import {photoIdentitySchema} from '../../../packages/core/src/productPhoto.ts';
import {PRODUCT_PHOTO_CONSENT,PRODUCT_PHOTO_MODEL,PHOTO_MAX_BODY,productPhotoRequestSchema} from '../../../packages/core/src/productPhoto.ts';
import {ProductPhotoError,type ProductPhotoProvider} from './productPhotoProvider.ts';
import {PHOTO_ASSESSMENT_CONSENT,photoAssessmentRequestSchema} from '../../../packages/core/src/photoAssessment.ts';
import {legacyFood,v2Food,type PublicFood} from '../../../packages/core/src/publicFood.ts';
import {REAL_REPORT_MAX_BODY_BYTES, RealReportError, disabledReportCapabilities, realReportRequestSchema, type RealReportProvider} from './realReportProvider.ts';
import {REAL_REPORT_CONSENT_VERSION} from '../../../packages/core/src/realReportEvidence.ts';
import {catalogAttribution,catalogCreditsHtml,catalogDownload} from './catalogPublication.ts';
import {comparisonGroups,catalogCandidateLimit} from '../../../packages/core/src/comparisonGroups.ts';
import type { PublicDatabase } from './publicDatabase.ts';
import { normalizeBarcode } from '../../../packages/core/src/barcode.ts';
import type { RuleDistribution } from './rulePublication.ts';
import { createServer } from 'node:http';
import {products} from '../../../packages/core/src/fixtures.ts';
import {readiness} from '../../../packages/core/src/privacy.ts';

import type { IntakeKind } from '../../../packages/core/src/intake.ts';
export interface ServiceOptions { groceryReviews?: import('./groceryReviewProvider.ts').GroceryProvider; webReviews?: import('./webPhotoProvider.ts').WebPhotoProvider; shelfGrids?: import("./shelfGridProvider.ts").ShelfGridProvider; dualReviews?: import('./dualPhotoProvider.ts').DualPhotoProvider; availability?: ReturnType<typeof import('./nearbyAvailability.ts').createNearbyAvailability>; scanTimingEnabled?:boolean; diagnostics?:BetaDiagnostics; accessMode?: 'open-beta'; news?:()=>ReturnType<typeof import('./foodNews.ts').readFoodNews>; newsPool?:()=>ReturnType<typeof import('./foodNews.ts').readNewsPool>; aiReviews?: import('./aiFoodReviewProvider.ts').AiReviewProvider; cardSources?: ReturnType<typeof import('./productCardSources.ts').createProductCardSources>; photoAssessments?: import('./photoAssessmentProvider.ts').PhotoAssessmentProvider; productPhotos?: ProductPhotoProvider; labelEvidence?: (food:PublicFood)=>PublicFood['glutenEvidence']; realReports?: RealReportProvider; offLookup?: (barcode:string,refreshEvidence?:boolean)=>Promise<void>; directory?: import('../../../packages/core/src/storeDetection.ts').StoreDirectory; authorize?: (header: string | undefined) => boolean; catalog?: PublicDatabase; fictional?: (kind:IntakeKind)=>Promise<unknown>; rules?: RuleDistribution; catalogBurst?: number; refillPerSecond?: number; now?: () => number }
/** A bounded global limiter retains no client identifiers, addresses or request payloads. */
export function createAppServer(options: ServiceOptions = {}) {
  const scanTimingInbox=createScanTimingInbox(options.diagnostics,options.scanTimingEnabled===true);
  const openBeta = options.accessMode === 'open-beta';
  let activeAvailabilityRequests=0; let activeShelfRequests=0;
  let activeDownloads=0; let activePhotoRequests=0; let activeMediaRequests=0;
  const capacity = options.catalogBurst ?? 60;
  const rate = options.refillPerSecond ?? 1;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000 || !Number.isFinite(rate) || rate <= 0 || rate > 100)
    throw new Error('Invalid service limits.');
  const now = options.now ?? (() => performance.now());
  let tokens = capacity; let updated = now();
  const take = () => {
    const current = now();
    tokens = Math.min(capacity, tokens + Math.max(0, current - updated) * rate / 1000);
    updated = current;
    if (tokens < 1) return false;
    tokens--; return true;
  };
  const newsSelectionRoute=createNewsSelectionRoute(()=>options.newsPool?.().edition,take);
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    const trace=request.method==='POST'&&['/v3/photos/recognize','/v4/photos/recognize','/v5/photos/recognize','/v6/photos/recognize','/v3/photos/media','/v3/photos/sources'].includes(request.url??'')?newTrace():undefined;
    const scanTimer=createServerScanTimer(options.scanTimingEnabled===true&&['/v3/photos/recognize','/v4/photos/recognize','/v5/photos/recognize','/v6/photos/recognize'].includes(request.url??''),options.diagnostics,trace??'', 'request');
    if(trace&&['/v3/photos/recognize','/v4/photos/recognize','/v5/photos/recognize','/v6/photos/recognize'].includes(request.url??''))scanTimingInbox.register(trace);
    const requestStarted=Date.now();let diagnosticFinished=false;
    const operation=request.url?.endsWith('/media')?'media':request.url?.endsWith('/sources')?'sources':'recognize';
    if(trace){response.setHeader('X-Grocery-Trace-Id',trace);recordDiagnostic(options.diagnostics,trace,{kind:'request',operation,phase:'started'});}
    const finishDiagnostic=(status:number,value?:unknown)=>{if(!trace||diagnosticFinished)return;diagnosticFinished=true;
      const code=value&&typeof value==='object'&&'code' in value&&typeof value.code==='string'?value.code:undefined;
      recordDiagnostic(options.diagnostics,trace,{kind:'request',operation,phase:'finished',status,code,elapsedMs:Date.now()-requestStarted});
    };
    response.once('close',()=>finishDiagnostic(response.writableEnded?response.statusCode:499));
    const send = (status: number, value: unknown, close = false) => {
      finishDiagnostic(status,value);
      if (close) response.setHeader('Connection', 'close');
      response.writeHead(status); response.end(JSON.stringify(value));
    };
    const origin=request.headers.origin;
    const browserOrigins=['http://localhost:8081','http://localhost:18081','http://127.0.0.1:18081'];
    if(origin){
      if(!browserOrigins.includes(origin))return send(403,{code:'ORIGIN_NOT_ALLOWED'},true);
      response.setHeader('Access-Control-Allow-Origin',origin);
      response.setHeader('Vary','Origin');
    }
    if(request.method==='OPTIONS'){
      if(!origin||!['GET','POST'].includes(String(request.headers['access-control-request-method']))||String(request.headers['access-control-request-headers']??'').toLowerCase().split(',').some(h=>h.trim()&&!['authorization', 'content-type'].includes(h.trim())))return send(403,{code:'PREFLIGHT_NOT_ALLOWED'},true);
      if(!take())return send(429,{code:'RATE_LIMITED'});
      response.setHeader('Access-Control-Allow-Methods','GET, POST');
      response.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
      response.writeHead(204);response.end();return;
    }
    // TEMPORARY BETA-0: bounded write-only timing reports, separate from scan admission.
    if(scanTimingInbox.handle(request,response))return;
    // Public ODbL directory: no user coordinates, credentials or personal records.
    if(request.url==='/v1/stores/directory'&&['GET','HEAD'].includes(request.method??'')){
      if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
      if(!take())return send(429,{code:'RATE_LIMITED'});
      return options.directory?send(200,options.directory):send(503,{code:'STORE_DIRECTORY_UNAVAILABLE'});
    }
    if(newsSelectionRoute(request,response))return;
    if(request.url==='/v1/news/daily'||request.url==='/v2/news/daily'){
      if(!['GET','HEAD'].includes(request.method??''))return send(405,{code:'METHOD_NOT_ALLOWED'},true);
      if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
      if(!take())return send(429,{code:'RATE_LIMITED'});
      try{const news=request.url==='/v2/news/daily'?options.newsPool?.():options.news?.();if(!news)return send(503,{code:'NEWS_UNAVAILABLE'});
        response.setHeader('ETag',news.etag);response.setHeader('Cache-Control','public, max-age=900');
        if(request.headers['if-none-match']===news.etag){response.writeHead(304);response.end();return;}
        response.writeHead(200);response.end(request.method==='HEAD'?undefined:JSON.stringify(news.edition));return;
      }catch{return send(503,{code:'NEWS_UNAVAILABLE'});}
    }
    // Public source image metadata only. Private beta diagnostics are never exported here.
    if(request.url==='/v1/catalog/media'&&['GET','HEAD'].includes(request.method??'')){
      if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
      if(!take())return send(429,{code:'RATE_LIMITED'});
      if(!options.catalog)return send(503,{code:'CATALOG_UNAVAILABLE'});
      return send(200,{schemaVersion:1,attribution:'Open Food Facts',databaseLicense:'ODbL-1.0',imageLicense:'CC-BY-SA-3.0',products:options.catalog.mediaProducts()});
    }
    // The licensed catalog and credits are available without a tester account.
    if(['/v1/catalog/export','/v2/catalog/export','/v3/catalog/export','/v1/catalog/attribution','/v2/catalog/attribution','/data-sources'].includes(request.url??'')&&['GET','HEAD'].includes(request.method??'')){
      if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
      if(!take())return send(429,{code:'RATE_LIMITED'});
      if(request.url==='/data-sources'){response.setHeader('Content-Type','text/html; charset=utf-8');response.writeHead(200);response.end(request.method==='HEAD'?undefined:catalogCreditsHtml);return;}
      if(request.url==='/v1/catalog/attribution'||request.url==='/v2/catalog/attribution')return send(200,catalogAttribution);
      if(!options.catalog)return send(503,{code:'CATALOG_UNAVAILABLE'});
      try{if(activeDownloads>=2){response.setHeader('Retry-After','5');return send(429,{code:'DOWNLOAD_BUSY'});}activeDownloads++;let released=false;const release=()=>{if(!released){released=true;activeDownloads--;}};response.once('finish',release);response.once('close',release);const output=catalogDownload(options.catalog,request.url==='/v3/catalog/export'?3:request.url==='/v2/catalog/export'?2:1);response.setHeader('Content-Disposition','attachment; filename="grocery-product-catalog.json"');response.writeHead(200);response.end(request.method==='HEAD'?undefined:output);return;}catch{return send(503,{code:'CATALOG_UNAVAILABLE'});}
    }
    // Opening the beta does not implicitly expose future admin, upload or rule routes.
    const betaPath=request.url??'';
    const publicBetaRoute=betaPath==='/v1/shelf/grids'||betaPath==='/health'||/^\/v[12]\/availability\/search$/.test(betaPath)||
      /^\/v[123456]\/photos\/(capabilities|recognize)$/.test(betaPath)||/^\/v3\/photos\/(sources|media)$/.test(betaPath)||
      /^\/v1\/reports\/(capabilities|extract)$/.test(betaPath)||
      /^\/v1\/fictional\/extract\/(product|receipt|report)$/.test(betaPath)||
      /^\/v[123]\/catalog\/(sources|coverage|samples|search\/[^?]+|foods\/[^?]+|barcodes\/[^?]+|comparable\/[^?]+)$/.test(betaPath);
    if(openBeta&&!publicBetaRoute)return send(404,{code:'NOT_FOUND'},true);
    if(!openBeta && options.authorize && !options.authorize(request.headers.authorization)) {
      response.setHeader('WWW-Authenticate','Bearer');
      return send(401,{code:'TESTER_ACCESS_REQUIRED'},true);
    }

    if(betaPath==='/v1/shelf/grids'){if(!take()||activeShelfRequests>=2)return send(429,{code:'RATE_LIMITED'},true);activeShelfRequests++;let released=false;const release=()=>{if(!released){released=true;activeShelfRequests--;}};response.once('finish',release);response.once('close',release);shelfGridRoute(request,response,options.shelfGrids);return;}
    if(/^\/v[12]\/availability\/search$/.test(betaPath)){
      if(!openBeta&&!options.authorize)return send(401,{code:'TESTER_ACCESS_REQUIRED'},true);
      if(request.method!=='POST')return send(405,{code:'METHOD_NOT_ALLOWED'},true);
      if(!options.availability)return send(503,{code:'AVAILABILITY_UNAVAILABLE'},true);
      if(!take()||activeAvailabilityRequests>=6)return send(429,{code:'AVAILABILITY_BUSY'},true);
      if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(request.headers['content-type']??''))||request.headers['content-encoding'])return send(415,{code:'INVALID_CONTENT_TYPE'},true);
      const length=request.headers['content-length'];if(length&&(!/^\d+$/.test(length)||Number(length)>2048))return send(413,{code:'REQUEST_TOO_LARGE'},true);
      activeAvailabilityRequests++;const controller=new AbortController();let chunks:Buffer[]=[],size=0,done=false;
      const finish=(status:number,value:unknown)=>{if(done)return;done=true;activeAvailabilityRequests--;chunks=[];clearTimeout(timer);if(!response.destroyed)send(status,value);};
      const timer=setTimeout(()=>{controller.abort();finish(408,{code:'AVAILABILITY_TIMED_OUT'});},20000);
      response.once('close',()=>{controller.abort();finish(499,{code:'CANCELLED'});});
      request.once('error',()=>{controller.abort();finish(400,{code:'INVALID_REQUEST'});});
      request.on('data',(chunk:Buffer)=>{if(done)return;size+=chunk.length;if(size>2048){controller.abort();finish(413,{code:'REQUEST_TOO_LARGE'});request.resume();return;}chunks.push(chunk);});
      request.once('end',()=>{if(done)return;let input;try{input=availabilityRequestSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}catch{finish(400,{code:'INVALID_AVAILABILITY_REQUEST'});return;}chunks=[];
        void options.availability!.lookup(input,controller.signal,betaPath==='/v2/availability/search').then(value=>{try{finish(200,betaPath==='/v1/availability/search'?legacyAvailabilityResultSchema.parse({...value,schemaVersion:1}):value);}catch{finish(503,{code:'AVAILABILITY_UNAVAILABLE'});}},()=>finish(503,{code:'AVAILABILITY_UNAVAILABLE'}));});return;
    }
    if(['/v3/photos/sources','/v3/photos/media'].includes(betaPath)){
      if(!openBeta&&!options.authorize)return send(401,{code:'TESTER_ACCESS_REQUIRED'},true);
      if(request.method!=='POST')return send(405,{code:'METHOD_NOT_ALLOWED'},true);
      if(!options.cardSources)return send(503,{code:'SOURCE_LOOKUP_UNAVAILABLE'},true);
      if(!take()||activeMediaRequests>=4)return send(429,{code:'PHOTO_BUSY'},true);
      if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(request.headers['content-type']??''))||request.headers['content-encoding'])return send(415,{code:'INVALID_CONTENT_TYPE'},true);
      const length=request.headers['content-length'];if(length&&(!/^\d+$/.test(length)||Number(length)>4096))return send(413,{code:'REQUEST_TOO_LARGE'},true);
      activeMediaRequests++;const controller=new AbortController();let text='',size=0,done=false;
      const finish=(status:number,value:unknown)=>{if(done)return;done=true;activeMediaRequests--;text='';clearTimeout(timer);if(!response.destroyed)send(status,value);};
      const timer=setTimeout(()=>{controller.abort();finish(408,{code:'SOURCE_TIMED_OUT'});},32000);
      response.once('close',()=>{controller.abort();finish(499,{code:'CANCELLED'});});
      request.once('error',()=>{controller.abort();finish(400,{code:'INVALID_REQUEST'});});
      request.on('data',(chunk:Buffer)=>{if(done)return;size+=chunk.length;if(size>4096){controller.abort();finish(413,{code:'REQUEST_TOO_LARGE'});request.resume();return;}text+=chunk.toString('utf8');});
      request.once('end',()=>{if(done)return;let identity;try{identity=photoIdentitySchema.parse(JSON.parse(text));}catch{finish(400,{code:'INVALID_IDENTITY'});return;}text='';
        void options.cardSources![betaPath.endsWith('/media')?'media':'sources'](identity,controller.signal,trace).then(value=>finish(200,value),()=>finish(503,{code:'SOURCE_LOOKUP_UNAVAILABLE'}));});return;
    }
    // Single product photos only; admission/consent and size limits precede paid dispatch.
    if(['/v1/photos/capabilities','/v1/photos/recognize','/v2/photos/capabilities','/v2/photos/recognize','/v3/photos/capabilities','/v3/photos/recognize','/v4/photos/capabilities','/v5/photos/capabilities','/v6/photos/capabilities','/v4/photos/recognize','/v5/photos/recognize','/v6/photos/recognize'].includes(request.url??'')){
      const groceryMode=request.url!.startsWith('/v6/');
      const webMode=groceryMode||request.url!.startsWith('/v5/');
      const dualMode=webMode||request.url!.startsWith('/v4/');
      const aiMode=request.url!.startsWith('/v3/')||dualMode;
      const assessmentMode=request.url!.startsWith('/v2/')||aiMode;
      const consentVersion=groceryMode?GROCERY_CONSENT:dualMode?DUAL_FOOD_CONSENT:aiMode?AI_FOOD_CONSENT:assessmentMode?PHOTO_ASSESSMENT_CONSENT:PRODUCT_PHOTO_CONSENT;
      const schema=groceryMode?groceryRequestSchema:dualMode?dualFoodRequestSchema:aiMode?aiFoodRequestSchema:assessmentMode?photoAssessmentRequestSchema:productPhotoRequestSchema;
      if(!openBeta&&!options.authorize)return send(401,{code:'TESTER_ACCESS_REQUIRED'},true);
      if(request.url?.endsWith('/capabilities')&&request.method==='GET'){
        if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
        if(!take())return send(429,{code:'RATE_LIMITED'});
        return send(200,{schemaVersion:groceryMode?6:webMode?5:dualMode?4:aiMode?3:assessmentMode?2:1,available:(groceryMode?options.groceryReviews:webMode?options.webReviews:dualMode?options.dualReviews:aiMode?options.aiReviews:assessmentMode?options.photoAssessments:options.productPhotos)?.available()??false,consentVersion,...((dualMode||webMode)?{models:groceryMode?['gemini-3.5-flash-lite']:activePhotoModels}:{model:PRODUCT_PHOTO_MODEL})});
      }
      if(!request.url?.endsWith('/recognize')||request.method!=='POST')return send(405,{code:'METHOD_NOT_ALLOWED'},true);
      const provider=groceryMode?options.groceryReviews:webMode?options.webReviews:dualMode?options.dualReviews:aiMode?options.aiReviews:assessmentMode?options.photoAssessments:options.productPhotos;
      if(!provider)return send(503,{code:'PHOTO_PROCESSING_DISABLED'},true);
      const recognize=(input:unknown,signal:AbortSignal,onProgress?:(value:unknown)=>void,trace?:string,onIdentity?:(value:AiPhotoPreview)=>void)=>groceryMode?options.groceryReviews!.recognize(input,signal,onProgress,trace,onIdentity):webMode?options.webReviews!.recognize(input,signal,onProgress,trace,onIdentity):dualMode?options.dualReviews!.recognize(input,signal,onProgress,trace,onIdentity):aiMode?options.aiReviews!.recognize(input,signal,onProgress,trace,onIdentity):assessmentMode?options.photoAssessments!.recognize(input,signal):options.productPhotos!.recognize(input,signal);
      if(!take()||activePhotoRequests>=2)return send(429,{code:'PHOTO_BUSY'},true);
      if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(request.headers['content-type']??''))||(request.headers['content-encoding']&&request.headers['content-encoding']!=='identity'))return send(415,{code:'INVALID_PHOTO_CONTENT_TYPE'},true);
      const length=request.headers['content-length'];
      if(length&&(!/^\d+$/.test(length)||Number(length)>PHOTO_MAX_BODY))return send(413,{code:'PHOTO_REQUEST_TOO_LARGE'},true);
      activePhotoRequests++;
      const controller=new AbortController();let chunks:Buffer[]=[],bytes=0,finished=false,released=false;
      const release=()=>{if(!released){released=true;activePhotoRequests--;}};
      const identityStreaming=aiMode&&request.headers.accept==='application/x-ndjson; preview=identity';
      const streaming=identityStreaming||(aiMode&&request.headers.accept==='application/x-ndjson');
      const streamEvent=(type:string,value:unknown)=>{if(response.destroyed||response.writableEnded)return;if(!response.headersSent){response.setHeader('Content-Type','application/x-ndjson; charset=utf-8');response.setHeader('Cache-Control','no-store, no-transform');response.setHeader('X-Accel-Buffering','no');response.writeHead(200);response.flushHeaders();}response.write(JSON.stringify({type,...(type==='error'?value as object:{result:value})})+'\n');};
      const finish=(status:number,value:unknown,close=false)=>{if(finished)return;finished=true;scanTimer('response_sent');finishDiagnostic(status,value);chunks=[];clearTimeout(timer);release();if(!response.destroyed&&!response.writableEnded){if(streaming&&(status===200||response.headersSent)){streamEvent(status===200?'result':'error',value);response.end();}else send(status,value,close);}};
      const abort=()=>{controller.abort();chunks=[];clearTimeout(timer);release();};
      // Covers slow body uploads and a stalled provider. There is no retry queue.
      const timer=setTimeout(()=>{abort();finish(408,{code:'PHOTO_TIMED_OUT'},true);},webMode?105000:assessmentMode?90000:45000);
      request.once('aborted',abort);request.once('error',()=>{abort();finish(400,{code:'INVALID_PRODUCT_IMAGE'},true);});
      response.once('close',()=>{if(!response.writableEnded)abort();});
      request.on('data',(chunk:Buffer)=>{
        if(finished||controller.signal.aborted)return;bytes+=chunk.length;
        if(bytes>PHOTO_MAX_BODY){abort();finish(413,{code:'PHOTO_REQUEST_TOO_LARGE'},true);request.resume();return;}chunks.push(chunk);
      });
      request.once('end',()=>{
        if(finished||controller.signal.aborted)return;
        scanTimer('body_received');
        let input:{consentVersion:string;imageBase64:string};
        try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));chunks=[];
          if(body?.consentVersion!==consentVersion){finish(400,{code:'PHOTO_CONSENT_REQUIRED'});return;}
          input=schema.parse(body);
        }catch{finish(400,{code:'INVALID_PRODUCT_IMAGE'});return;}
        scanTimer('provider_start');
        void recognize(input,controller.signal,streaming?value=>{if(!finished&&!controller.signal.aborted){scanTimer('first_result');streamEvent('progress',value);}}:undefined,trace,identityStreaming?identity=>{if(!finished&&!controller.signal.aborted)streamEvent('identity',identity);}:undefined).then(value=>{input.imageBase64='';if(!controller.signal.aborted)finish(200,value);},error=>{
          input.imageBase64='';if(controller.signal.aborted)return;
          const code=error instanceof ProductPhotoError||error instanceof GroceryProviderError?error.code:'PHOTO_OUTCOME_UNKNOWN';
          finish(code==='PHOTO_BUSY'?429:code==='INVALID_PRODUCT_IMAGE'?400:503,{code});
        });
      });return;
    }
    // A separately configured, typed report route. No raw documents, images, OCR or profile fields.
    const reportPath = request.url === '/v1/reports/extract';
    const reportCapabilities = request.url === '/v1/reports/capabilities';
    if ((reportPath || reportCapabilities) && !openBeta && !options.authorize) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      return send(401, {code: 'TESTER_ACCESS_REQUIRED'}, true);
    }
    if (reportCapabilities && ['GET', 'HEAD'].includes(request.method ?? '')) {
      if (request.headers['transfer-encoding'] || (request.headers['content-length'] && request.headers['content-length'] !== '0'))
        return send(400, {code: 'REQUEST_BODY_NOT_ALLOWED'}, true);
      if (!take()) return send(429, {code: 'RATE_LIMITED'});
      return send(200, options.realReports?.capabilities() ?? disabledReportCapabilities());
    }
    if (reportPath && request.method === 'POST') {
      const provider = options.realReports;
      if (!provider) return send(503, {code: 'REPORT_PROCESSING_DISABLED'}, true);
      if (!take()) return send(429, {code: 'RATE_LIMITED'}, true);
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const contentLength = request.headers['content-length'];
      if (!/^application\/json(?:;\s*charset=utf-8)?$/.test(contentType) ||
          (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity'))
        return send(415, {code: 'INVALID_REPORT_CONTENT_TYPE'}, true);
      if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > REAL_REPORT_MAX_BODY_BYTES))
        return send(413, {code: 'REPORT_REQUEST_TOO_LARGE'}, true);
      const controller = new AbortController();
      let chunks: Buffer[] = [];
      let bytes = 0;
      let finished = false;
      const finish = (status: number, value: unknown, close = false) => {
        if (finished) return;
        finished = true; chunks = [];
        if (!response.destroyed && !response.writableEnded) send(status, value, close);
      };
      const abort = () => {controller.abort(); chunks = [];};
      request.once('aborted', abort);
      response.once('close', () => {if (!response.writableEnded) abort();});
      request.once('error', () => {abort(); finish(400, {code: 'INVALID_REPORT_EVIDENCE'}, true);});
      request.on('data', (chunk: Buffer) => {
        if (finished || controller.signal.aborted) return;
        bytes += chunk.byteLength;
        if (bytes > REAL_REPORT_MAX_BODY_BYTES) {abort(); finish(413, {code: 'REPORT_REQUEST_TOO_LARGE'}, true); request.resume(); return;}
        chunks.push(chunk);
      });
      request.once('end', () => {
        if (finished || controller.signal.aborted) return;
        let input: ReturnType<typeof realReportRequestSchema.parse>;
        try {
          const text = new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks));
          chunks = [];
          const json: unknown = JSON.parse(text);
          if (json && typeof json === 'object' && (!('consentVersion' in json) || json.consentVersion !== REAL_REPORT_CONSENT_VERSION)) {
            finish(400, {code: 'CONSENT_REQUIRED'}); return;
          }
          input = realReportRequestSchema.parse(json);
        } catch {finish(400, {code: 'INVALID_REPORT_EVIDENCE'}); return;}
        void provider.extract(input.evidence, controller.signal).then(result => {
          if (!controller.signal.aborted) finish(200, {schemaVersion: 1, result});
        }, error => {
          if (controller.signal.aborted) return;
          const code = error instanceof RealReportError ? error.code : 'REPORT_OUTCOME_UNKNOWN';
          finish(code === 'REPORT_BUSY' ? 429 : 503, {code});
        });
      });
      return;
    }
    // Only fixed built-in fixture identifiers; reject all content before reading a body.
    const fixture=/^\/v1\/fictional\/extract\/(product|receipt|report)$/.exec(request.url??'');
    if(request.method==='POST'&&fixture){
      if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return send(400,{code:'REQUEST_BODY_NOT_ALLOWED'},true);
      if(!options.fictional)return send(503,{code:'FICTIONAL_BACKEND_DISABLED'});
      if(!take())return send(429,{code:'RATE_LIMITED'});
      const origin=request.headers.origin;
      if(origin&&!['http://localhost:8081','http://localhost:18081','http://127.0.0.1:18081'].includes(origin))return send(403,{code:'ORIGIN_NOT_ALLOWED'});
      if(origin)response.setHeader('Access-Control-Allow-Origin',origin);
      void options.fictional(fixture[1] as IntakeKind).then(value=>{if(!response.destroyed)send(200,value);},()=>{if(!response.destroyed)send(503,{code:'FICTIONAL_EXTRACTION_UNAVAILABLE'});});
      return;
    }
    // Reject personal processing before reading any request body, regardless of URL or headers.
    if (request.method === 'POST') return send(503, { code: 'PERSONAL_PROCESSING_DISABLED', message: 'Personal upload and analysis routes are not enabled.' }, true);
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD');
      return send(405, { code: 'METHOD_NOT_ALLOWED' }, true);
    }
    const version=request.url?.startsWith('/v3/catalog/')?3:request.url?.startsWith('/v2/catalog/')?2:1;
    const project=(food:PublicFood)=>version===1?legacyFood(food):{...(version===2?v2Food(food):food),glutenEvidence:options.labelEvidence?.(food)??{status:'unverified',reason:'Reviewed product evidence is not available.',frontLabelText:null,allergenStatement:null,sources:[],proof:null}};
    const path = (request.url ?? '').replace(/^\/v[23]\/catalog\//,'/v1/catalog/');
    if (path.length > 2048 || !path.startsWith('/') || path.startsWith('//') || /[?#\\\s]/.test(path))
      return send(400, { code: 'INVALID_REQUEST_TARGET' }, true);
    if (request.headers['transfer-encoding'] || (request.headers['content-length'] && request.headers['content-length'] !== '0'))
      return send(400, { code: 'REQUEST_BODY_NOT_ALLOWED' }, true);
    if (path === '/health') return send(200, { status: 'ok', ...readiness });
    if (path === '/v1/rules/current') {
      if (!take()) return send(429, { code: 'RATE_LIMITED' });
      const envelope = options.rules?.current();
      if (!envelope) return send(503, { code: 'REVIEWED_RULES_UNAVAILABLE' });
      response.writeHead(200); response.end(envelope); return;
    }
    if(path==='/v1/catalog/sources'||path==='/v1/catalog/coverage'||path.startsWith('/v1/catalog/search/')||path.startsWith('/v1/catalog/foods/')||path.startsWith('/v1/catalog/barcodes/')||path.startsWith('/v1/catalog/comparable/')){
      if(!take())return send(429,{code:'RATE_LIMITED'});
      if(!options.catalog)return send(503,{code:'CATALOG_UNAVAILABLE'});
      try{
        if(path.startsWith('/v1/catalog/comparable/')){
 const group=path.slice('/v1/catalog/comparable/'.length);
 if(!(comparisonGroups as readonly string[]).includes(group))return send(400,{code:'INVALID_COMPARISON_GROUP'});
 return send(200,{schemaVersion:version,synthetic:false,foods:options.catalog.comparable(group).map(project),limit:catalogCandidateLimit});
 }
        if(path==='/v1/catalog/sources')return send(200,{sources:options.catalog.sources()});
        if(path==='/v1/catalog/coverage')return send(200,{coverage:options.catalog.coverage(),scope:'Imported records only; not comprehensive grocery coverage'});
        if(path.startsWith('/v1/catalog/search/')){
          let term:string;
          try{term=decodeURIComponent(path.slice('/v1/catalog/search/'.length));if(term.trim().length<2||term.length>80||/[\u0000-\u001f\u007f]/.test(term))throw new Error();}catch{return send(400,{code:'INVALID_SEARCH'});}
          return send(200,{schemaVersion:version,synthetic:false,foods:options.catalog.search(term).map(project),limit:20,coverage:'cached records only'});
        }
        const record=/^\/v1\/catalog\/foods\/(usda|off)\/([A-Za-z0-9-]{1,40})$/.exec(path);
        if(record){const food=options.catalog.byId(record[1],record[2]);return food?send(200,{schemaVersion:version,synthetic:false,food:project(food)}):send(404,{code:'FOOD_NOT_CACHED'});}
        const barcode=/^\/v1\/catalog\/barcodes\/(\d{8}|\d{12}|\d{13}|\d{14})$/.exec(path);
        if(!barcode||!normalizeBarcode(barcode[1]))return send(400,{code:'INVALID_CATALOG_LOOKUP'});
        const reply=()=>{if(!response.destroyed){try{send(200,{schemaVersion:version,synthetic:false,foods:options.catalog!.byBarcode(barcode[1]).map(project),coverage:'validated cached records; provider coverage may be incomplete; no stock or certification claim',attribution:catalogAttribution});}catch{send(503,{code:'CATALOG_UNAVAILABLE'});}}};
        if(options.offLookup){void options.offLookup(barcode[1],version>=2).then(reply,reply);return;}
        reply();return;
      }catch{return send(503,{code:'CATALOG_UNAVAILABLE'});}
    }
    if (path === '/v1/catalog/samples') {
      if (!take()) {
        response.setHeader('Retry-After', String(Math.ceil(1 / rate)));
        return send(429, { code: 'RATE_LIMITED' });
      }
      return send(200, { schemaVersion: '1', synthetic: true, products });
    }
    send(404, { code: 'NOT_FOUND' });
  });
  server.maxConnections = 64;
  server.maxRequestsPerSocket = 100;
  server.keepAliveTimeout = 5000;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    else socket.destroy();
  });
  return server;
}
