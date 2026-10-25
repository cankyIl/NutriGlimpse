#!/usr/bin/env python3
"""Read only: summarize temporary Beta 0 timing data; never prints product/profile data."""
import argparse,json,sqlite3
from pathlib import Path
from datetime import datetime,timezone
from zoneinfo import ZoneInfo

def difference(end,start):
    if end is None or start is None or end < start:return None
    return end-start

def summarize(client,server):
    marks=client['marks'];req=server.get('request',{});provider=server.get('provider',{})
    return {
      'shutter_to_photo_preview_layout_ms':marks.get('photoPreviewLayoutMs'),
      'shutter_to_identity_preview_ms':marks.get('identityPreviewMs'),
      'shutter_to_identity_preview_layout_ms':marks.get('identityPreviewLayoutMs'),
      'camera_ms':marks.get('captureMs'),
      'native_preparation_ms':marks.get('preparationMs'),
      'ocr_ms_overlaps_barcode_jpeg':marks.get('ocrMs'),
      'barcode_jpeg_ms_overlaps_ocr':marks.get('barcodeJpegMs'),
      'shutter_to_photo_ready_ms':marks.get('photoReadyMs'),
      'photo_ready_to_upload_start_ms':difference(marks.get('uploadStartMs'),marks.get('photoReadyMs')),
      'server_body_receipt_ms':req.get('body_received'),
      'server_validation_dispatch_ms':provider.get('model_dispatch'),
      'ai_first_text_ms':difference(provider.get('model_first_text'),provider.get('model_dispatch')),
      'ai_first_checked_product_ms':difference(provider.get('first_result'),provider.get('model_dispatch')),
      'ai_full_review_ms':difference(provider.get('model_complete'),provider.get('model_dispatch')),
      'network_and_client_parse_residual_ms':difference(difference(marks.get('firstResultMs'),marks.get('uploadStartMs')),req.get('first_result')),
      'first_result_to_card_layout_ms':difference(marks.get('firstCardLayoutMs'),marks.get('firstResultMs')),
      'shutter_to_first_card_layout_ms':marks.get('firstCardLayoutMs'),
      'shutter_to_third_alternative_ms':marks.get('thirdAlternativeMs'),
      'shutter_to_completion_ms':marks.get('completedMs'),
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int,default=2)
    parser.add_argument('--database',default='/path/to/NutriGlimpse/.tools/beta-diagnostics/events.sqlite')
    args=parser.parse_args()
    if not 1<=args.limit<=20:parser.error('limit must be 1-20')
    path=Path(args.database).resolve()
    db=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
    try:
      cutoff=int(datetime.now(timezone.utc).timestamp()*1000)-7*86400000
      reports=db.execute("SELECT at,trace,payload FROM events WHERE at >= ? AND json_extract(payload,'$.kind')='scan_client_timing' ORDER BY id DESC LIMIT ?",(cutoff,args.limit)).fetchall()
      results=[]
      for at,trace,payload in reports:
        client=json.loads(payload);server={}
        for row, in db.execute("SELECT payload FROM events WHERE trace=? AND json_extract(payload,'$.kind')='scan_server_timing' ORDER BY id",(trace,)):
          event=json.loads(row);server.setdefault(event['clock'],{}).setdefault(event['stage'],event['elapsedMs'])
        results.append({'finished_eastern':datetime.fromtimestamp(at/1000,ZoneInfo('America/New_York')).isoformat(),'trace':trace,'build':client['build'],'outcome':client['outcome'],'durations':summarize(client,server)})
      print(json.dumps({'scans':results,'notes':['Layout is a rendering proxy, not exact screen-pixel presentation.','Network residual combines outbound/return transit and client parsing; one-way upload is not separately measured.','OCR and barcode/JPEG overlap; do not add them.','Null means unmeasured, incomplete or incompatible timing.']},indent=2))
    finally:db.close()
if __name__=='__main__':main()
