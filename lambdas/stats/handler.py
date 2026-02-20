import json
import boto3
import os
import time
from datetime import datetime, timedelta
from collections import defaultdict
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
urls_table = dynamodb.Table(os.environ.get('URLS_TABLE', 'urls'))
clicks_table = dynamodb.Table(os.environ.get('CLICKS_TABLE', 'clicks'))

def lambda_handler(event, context):
    request_id = context.aws_request_id

    log_event(
        level="INFO",
        log_type="ACCESS",
        message="Stats request received",
        requestId=request_id,
        pathParameters=event.get("pathParameters")
    )

    try:
        short_id = event.get('pathParameters', {}).get('shortId')
        
        if not short_id:
            log_event(
                level="WARN",
                log_type="ACCESS",
                message="ShortId missing in stats request",
                requestId=request_id
            )
            return create_response(400, {'error': 'Short ID is required'})
        
        # URL 정보 조회
        url_response = urls_table.get_item(Key={'shortId': short_id})
        url_item = url_response.get('Item')
        
        if not url_item:
            log_event(
                level="INFO",
                log_type="ACCESS",
                message="Stats requested for non-existing shortId",
                requestId=request_id,
                shortId=short_id
            )
            return create_response(404, {'error': 'URL not found'})
        
        # 클릭 로그 조회 (최근 7일)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        query_start = time.time()

        clicks_response = clicks_table.query(
            KeyConditionExpression=Key('shortId').eq(short_id) & Key('timestamp').gte(seven_days_ago)
        )
        clicks = clicks_response.get('Items', [])

        query_duration = int((time.time() - query_start) * 1000)

        # 쿼리 조회시간 로그
        log_event(
            level="INFO",
            log_type="PERFORMANCE",
            message="Click logs queried",
            requestId=request_id,
            shortId=short_id,
            itemCount=len(clicks),
            durationMs=query_duration
        )
        
        # 통계 계산
        stats = calculate_stats(clicks)
        
        log_event(
            level="INFO",
            log_type="ACCESS",
            message="Stats response generated",
            requestId=request_id,
            shortId=short_id,
            period="7d",
            totalClicks=url_item.get('clickCount', 0),
            recentClickCount=len(clicks)
        )
        return create_response(200, {
            'shortId': short_id,
            'originalUrl': url_item.get('originalUrl'),
            'title': url_item.get('title', ''),
            'totalClicks': int(url_item.get('clickCount', 0)),
            'period': '7d',
            'stats': stats
        })
        
    except Exception as e:
        log_event(
            level="ERROR",
            log_type="ERROR",
            message="Unhandled exception in stats lambda",
            requestId=request_id,
            error=str(e)
        )
        return create_response(500, {'error': 'Internal server error'})

def calculate_stats(clicks):
    """클릭 데이터 통계 계산"""
    clicks_by_hour = defaultdict(int)
    clicks_by_day = defaultdict(int)
    clicks_by_referer = defaultdict(int)
    
    for click in clicks:
        timestamp = click.get('timestamp', '')
        referer = click.get('referer', 'direct')
        
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                hour = dt.hour
                day = dt.strftime('%Y-%m-%d')
                
                clicks_by_hour[hour] += 1
                clicks_by_day[day] += 1
            except:
                pass
        
        # 리퍼러 도메인 추출
        referer_domain = extract_domain(referer)
        clicks_by_referer[referer_domain] += 1
    
    return {
        'clicksByHour': dict(clicks_by_hour),
        'clicksByDay': dict(clicks_by_day),
        'clicksByReferer': dict(clicks_by_referer),
        'peakHour': max(clicks_by_hour, key=clicks_by_hour.get) if clicks_by_hour else None,
        'topReferer': max(clicks_by_referer, key=clicks_by_referer.get) if clicks_by_referer else None
    }

def extract_domain(url):
    """URL에서 도메인 추출"""
    if not url or url == 'direct':
        return 'direct'
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc or 'unknown'
    except:
        return 'unknown'

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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