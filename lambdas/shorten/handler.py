import json
import boto3
import os
import time
from datetime import datetime
import random
import string

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('URLS_TABLE', 'urls'))

# 중복 shortId로 인한 단축 코드 재생성 최대 횟수
MAX_RETRIES = 3

def lambda_handler(event, context):
    # Path parameter에서 requestId 추출
    request_id = (
        event.get("requestContext", {}).get("requestId")
        or context.aws_request_id
        or "unknown"
    )

    start_time = time.time()

    try:
        # 요청 body 파싱
        body = json.loads(event.get('body', '{}'))
        original_url = body.get('url')
        title = body.get('title', '')
        
        # URL 유효성 검사
        if not original_url:
            log_event(
                level="WARN",
                log_type="ACCESS",
                message="Missing URL in request body",
                statusCode=400,
                requestId=request_id
            )
            return create_response(400, {'error': 'URL is required'})
        
        if not original_url.startswith(('http://', 'https://')):
            original_url = 'https://' + original_url
        
        # DynamoDB에 저장
        item = {
            'originalUrl': original_url,
            'title': title,
            'createdAt': datetime.utcnow().isoformat(),
            'clickCount': 0
        }
        
        # 충돌 발생 시 재시도 로직
        for retry_count in range(MAX_RETRIES):
            short_id = generate_short_id() # 단축 코드 생성
            item['shortId'] = short_id

            try:
                table.put_item(
                    Item=item,
                    ConditionExpression='attribute_not_exists(shortId)'
                )
                break
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                log_event(
                    level="WARN",
                    log_type="ACCESS",
                    message="ShortId collision occurred",
                    requestId=request_id,
                    attempt=retry_count + 1
                )
                continue
        else:
            log_event(
                level="ERROR",
                log_type="ERROR",
                message="Failed to generate unique shortId after retries",
                requestId=request_id,
                retryLimit=MAX_RETRIES
            )
            return create_response(500, {'error': 'Failed to generate unique short ID'})
        
        # 응답 - BASE URL: API Gateway 주소
        base_url = os.environ.get('BASE_URL', 'https://your-api-id.execute-api.region.amazonaws.com/prod')
        short_url = f"{base_url}/{short_id}"
        
        return create_response(200, {
            'shortId': short_id,
            'shortUrl': short_url,
            'originalUrl': original_url
        })
        
    except Exception as e:
        log_event(
            level="ERROR",
            log_type="ERROR",
            message="Unhandled exception in shorten",
            requestId=request_id,
            errorType=type(e).__name__,
            errorMessage=str(e)
        )
        return create_response(500, {'error': 'Internal server error'})

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }

# Base62 기반 랜덤 문자열 생성 함수
def generate_short_id(length = 7):
    chars = string.ascii_letters + string.digits # 총 62자
    return ''.join(random.choice(chars) for _ in range(length))

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