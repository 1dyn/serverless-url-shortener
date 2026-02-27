import json
import boto3
import os
from datetime import datetime, timedelta, timezone
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
trends_table = dynamodb.Table(os.environ.get("TRENDS_TABLE", "trends"))

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }

def lambda_handler(event, context):
    # 옵션: /trends/latest?type=weekly_summary
    qs = (event or {}).get("queryStringParameters") or {}
    trend_type = qs.get("type", "weekly_summary")

    # 최신 날짜부터 역순으로 14일 정도만 훑어서 찾기 (저비용 & 충분히 빠름)
    today = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=9))).date()

    for i in range(0, 30):  # 최근 30일 내에서만 찾기
        d = today - timedelta(days=i)
        analysis_date = d.strftime("%Y-%m-%d")

        try:
            res = trends_table.get_item(
                Key={"analysisDate": analysis_date, "type": trend_type}
            )
            item = res.get("Item")
            if not item:
                continue

            # result는 JSON string으로 저장했으니 파싱
            result_raw = item.get("result")
            if isinstance(result_raw, str):
                try:
                    result = json.loads(result_raw)
                except Exception:
                    result = {"raw": result_raw}
            else:
                result = result_raw

            # 프론트가 바로 쓰기 좋게 result만 반환
            return _resp(200, result)

        except Exception as e:
            return _resp(500, {"error": str(e)})

    return _resp(404, {"error": f"Latest trends not found (type={trend_type})"})