import json
import boto3
import uuid
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('URLS_TABLE', 'urls'))

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
            return create_response(400, {'error': 'Invalid URL format'})
        
        # 단축 코드 생성 (UUID 앞 8자리)
        short_id = str(uuid.uuid4())[:8]
        
        # DynamoDB에 저장
        item = {
            'shortId': short_id,
            'originalUrl': original_url,
            'title': title,
            'createdAt': datetime.utcnow().isoformat(),
            'clickCount': 0
        }
        
        table.put_item(Item=item)
        
        # 응답
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