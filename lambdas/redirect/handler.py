import json
import boto3
import os
import time
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
urls_table = dynamodb.Table(os.environ.get('URLS_TABLE', 'urls'))
clicks_table = dynamodb.Table(os.environ.get('CLICKS_TABLE', 'clicks'))

def lambda_handler(event, context):
    # Path parameter에서 requestId 추출
    request_id = (
        event.get("requestContext", {}).get("requestId")
        or context.aws_request_id
        or "unknown"
    )

    start_time = time.time()
    
    try:
        # Path parameter에서 shortId 추출
        short_id = event.get('pathParameters', {}).get('shortId')
        
        # GET /favicon.ico 요청
        if short_id == "favicon.ico":
            return {
                "statusCode": 204
            }


        if not short_id:
            log_event(
                level="WARN",
                log_type="ACCESS",
                message="Missing shortId",
                statusCode=400,
                requestId=request_id
            )
            return create_response(400, {'error': 'Short ID is required'})
        
        # DynamoDB에서 URL 조회
        response = urls_table.get_item(Key={'shortId': short_id})
        item = response.get('Item')
        
        if not item:
            log_event(
                level="WARN",
                log_type="ACCESS",
                message="Short URL not found",
                shortId=short_id,
                statusCode=404,
                requestId=request_id
            )
            return create_response(404, {'error': 'URL not found'})
        
        original_url = item.get('originalUrl')
        
        # 클릭 로그 저장 (비동기로 처리하면 더 좋음)
        log_click(short_id, event)
        
        # 클릭 카운트 증가
        urls_table.update_item(
            Key={'shortId': short_id},
            UpdateExpression='SET clickCount = if_not_exists(clickCount, :zero) + :inc',
            ExpressionAttributeValues={':zero': 0, ':inc': 1}
        )
        
        # Access 로그
        latency_ms = int((time.time() - start_time) * 1000)

        log_event(
            level="INFO",
            log_type="ACCESS",
            message="Redirect success",
            requestId=request_id,
            shortId=short_id,
            statusCode=301,
            latencyMs=latency_ms
        )

        # 301 리다이렉트
        return {
            'statusCode': 301,
            'headers': {
                'Location': original_url,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            'body': ''
        }
        
    except Exception as e:
        log_event(
            level="ERROR",
            log_type="ERROR",
            message="Unhandled exception",
            errorType=type(e).__name__,
            errorMessage=str(e),
            shortId=short_id,
            requestId=request_id
        )
        return create_response(500, {'error': 'Internal server error'})

def log_click(short_id, event):
    """클릭 이벤트 로깅"""
    try:
        # 요청 정보 추출
        headers = event.get('headers', {})
        request_context = event.get('requestContext', {})
        
        click_item = {
            'shortId': short_id,
            'timestamp': datetime.utcnow().isoformat(),
            'ip': hash_ip(request_context.get('identity', {}).get('sourceIp', '')),
            'userAgent': headers.get('User-Agent', headers.get('user-agent', '')),
            'referer': headers.get('Referer', headers.get('referer', 'direct'))
        }
        
        clicks_table.put_item(Item=click_item)
    except Exception as e:
        print(f"Failed to log click: {str(e)}")

def hash_ip(ip):
    """IP 주소 해시 처리 (개인정보 보호)"""
    import hashlib
    if not ip:
        return 'unknown'
    return hashlib.sha256(ip.encode()).hexdigest()[:16]

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body)
    }

def log_event(level, log_type, message, **kwargs):
    log = {
        "level": level,               # INFO | ERROR
        "type": log_type,             # ACCESS | ERROR | PERFORMANCE
        "message": message,
        "service": "url-shortener",
        "function": os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
        "timestamp": int(time.time() * 1000)
    }
    log.update(kwargs)
    print(json.dumps(log))