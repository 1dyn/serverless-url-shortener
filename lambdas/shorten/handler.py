import json
import boto3
import os
from datetime import datetime
import random
import string

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('URLS_TABLE', 'urls'))

# 중복 shortId로 인한 단축 코드 재생성 최대 횟수
MAX_RETRIES = 3

def lambda_handler(event, context):
    try:
        # 요청 body 파싱
        body = json.loads(event.get('body', '{}'))
        original_url = body.get('url')
        title = body.get('title', '')
        
        # URL 유효성 검사
        if not original_url:
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
        for _ in range(MAX_RETRIES):
            short_id = generate_short_id() # 단축 코드 생성
            item['shortId'] = short_id

            try:
                table.put_item(
                    Item=item,
                    ConditionExpression='attribute_not_exists(shortId)'
                )
                break
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                continue
        else:
            print('Failed to generate unique short Id after retries') # CloudWatch용 로그
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
        print(f"Error: {str(e)}")
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