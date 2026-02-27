import json
import boto3
import os
import time
from datetime import datetime, timedelta, timezone
from collections import Counter
from urllib.parse import urlparse

from boto3.dynamodb.conditions import Key

# -----------------------------
# AWS clients / tables
# -----------------------------
dynamodb = boto3.resource("dynamodb")

URLS_TABLE_NAME = os.environ.get("URLS_TABLE", "urls")
CLICKS_TABLE_NAME = os.environ.get("CLICKS_TABLE", "clicks")
TRENDS_TABLE_NAME = os.environ.get("TRENDS_TABLE", "trends")

urls_table = dynamodb.Table(URLS_TABLE_NAME)
clicks_table = dynamodb.Table(CLICKS_TABLE_NAME)
trends_table = dynamodb.Table(TRENDS_TABLE_NAME)

# Bedrock (optional)
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID")
BEDROCK_ENABLED = os.environ.get("BEDROCK_ENABLED", "true").lower() == "true"
BEDROCK_MIN_CLICKS = int(os.environ.get("BEDROCK_MIN_CLICKS", "20"))  # 비용 절감용 threshold

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION"),
)

KST = timezone(timedelta(hours=9))


# -----------------------------
# Lambda Entrypoint
# -----------------------------
def lambda_handler(event, context):
    request_id = getattr(context, "aws_request_id", "unknown")

    now_kst = datetime.now(tz=KST)
    analysis_date = now_kst.strftime("%Y-%m-%d")

    log_event(
        level="INFO",
        log_type="PERFORMANCE",
        message="Analyze job started (low-cost)",
        requestId=request_id,
        analysisDate=analysis_date,
        urlsTable=URLS_TABLE_NAME,
        clicksTable=CLICKS_TABLE_NAME,
        trendsTable=TRENDS_TABLE_NAME,
    )

    try:
        # 1) 저비용 집계(최근 7일, clicks는 query only)
        stats = collect_weekly_low_cost(now_kst, days=7)

        # 2) 인사이트(조건부 Bedrock)
        insights = build_insights(stats)

        # 3) trends 테이블 저장 (기존 type 유지: weekly_summary)
        result_obj = {
            "stats": stats,
            "insights": insights,
            "periodDays": 7,
        }

        trends_table.put_item(
            Item={
                "analysisDate": analysis_date,       # PK
                "type": "weekly_summary",            # SK (기존과 맞춤)
                "createdAt": datetime.utcnow()
                .replace(tzinfo=timezone.utc)
                .isoformat()
                .replace("+00:00", "Z"),
                "result": json.dumps(result_obj, ensure_ascii=False),
                "source": "low_cost_query",
            }
        )

        log_event(
            level="INFO",
            log_type="ACCESS",
            message="Analyze result saved to trends",
            requestId=request_id,
            analysisDate=analysis_date,
            trendType="weekly_summary",
            totalUrls=stats.get("totalUrls", 0),
            totalClicks=stats.get("totalClicks", 0),
            bedrockUsed=insights.get("_bedrockUsed", False) if isinstance(insights, dict) else False,
        )
        return create_response(200, {
                    "analysisDate": analysis_date,
                    "type": "weekly_summary",
                    **result_obj,
                }, event)

    except Exception as e:
        log_event(
            level="ERROR",
            log_type="ERROR",
            message="Analyze job failed",
            requestId=request_id,
            analysisDate=analysis_date,
            error=str(e),
        )
        return create_response(500, {"error": str(e)}, event)


# -----------------------------
# Core analytics (low-cost)
# -----------------------------
def collect_weekly_low_cost(now_kst: datetime, days: int = 7):
    """
    저비용 주간 분석:
    - urls: scan (MVP)
    - clicks: shortId별 query (PK=shortId, SK=timestamp ISO string)
    - 집계: topUrls, topDomains, traffic(clicksByDay/hour/peakHour), acquisition(topReferers)
    """
    start_kst = now_kst - timedelta(days=days)
    end_kst = now_kst

    # clicks 테이블 timestamp는 UTC ISO(Z)로 저장되는 것으로 가정 (예: 2026-02-26T16:27:57.123Z)
    start_iso = to_utc_z_iso(start_kst)
    end_iso = to_utc_z_iso(end_kst)

    urls = scan_all_items(urls_table)
    total_urls = len(urls)

    # shortId -> originalUrl/domain 매핑
    url_map = {}
    domain_map = {}
    for u in urls:
        sid = u.get("shortId") or u.get("shortId".lower())  # 혹시 필드명이 다르면 대비
        if not sid:
            continue
        orig = u.get("originalUrl") or ""
        url_map[sid] = orig
        domain_map[sid] = extract_domain(orig)

    total_clicks = 0
    clicks_by_day = Counter()   # YYYY-MM-DD
    clicks_by_hour = Counter()  # "0".."23"
    referers = Counter()
    short_counter = Counter()
    domain_counter = Counter()

    # 비용 절감 포인트: clicks는 scan 금지, shortId별 query만
    for sid in url_map.keys():
        items = query_clicks_by_shortid(sid, start_iso, end_iso)

        if not items:
            continue

        short_counter[sid] += len(items)
        total_clicks += len(items)
        domain_counter[domain_map.get(sid, "unknown")] += len(items)

        for c in items:
            ts = c.get("timestamp")
            if not ts:
                continue

            dt = parse_iso_utc(ts)  # UTC datetime
            # UI 표시용은 KST 기준으로 집계하는 게 자연스러움
            dt_kst = dt.astimezone(KST)

            clicks_by_day[dt_kst.strftime("%Y-%m-%d")] += 1
            clicks_by_hour[str(dt_kst.hour)] += 1

            ref = (c.get("referer") or "").strip() or "direct"
            referers[normalize_referer(ref)] += 1

    peak_hour = "-"
    if clicks_by_hour:
        peak_hour = clicks_by_hour.most_common(1)[0][0]

    # top lists
    top_urls = [
        {"shortId": sid, "clicks": int(cnt)}
        for sid, cnt in short_counter.most_common(10)
    ]
    top_domains = [
        {"domain": d, "count": int(cnt)}
        for d, cnt in domain_counter.most_common(10)
    ]
    top_referers = [
        {"referer": r, "clicks": int(cnt)}
        for r, cnt in referers.most_common(10)
    ]

    # dict 정렬(보기 좋게)
    clicks_by_day_sorted = dict(sorted(clicks_by_day.items()))
    clicks_by_hour_sorted = dict(sorted(clicks_by_hour.items(), key=lambda x: int(x[0])))

    return {
        "totalUrls": int(total_urls),
        "totalClicks": int(total_clicks),
        "topUrls": top_urls,
        "topDomains": top_domains,
        # 확장 필드(프론트에서 필요하면 바로 사용 가능)
        "traffic": {
            "clicksByDay": clicks_by_day_sorted,
            "clicksByHour": clicks_by_hour_sorted,
            "peakHour": peak_hour,
        },
        "acquisition": {
            "topReferers": top_referers,
        },
        "window": {
            "startIso": start_iso,
            "endIso": end_iso,
            "days": days,
        },
    }


def query_clicks_by_shortid(short_id: str, start_iso: str, end_iso: str):
    """
    clicks 테이블 Query:
    PK=shortId, SK=timestamp(ISO string)
    """
    resp = clicks_table.query(
        KeyConditionExpression=Key("shortId").eq(short_id) & Key("timestamp").between(start_iso, end_iso),
        ProjectionExpression="shortId, #ts, referer",
        ExpressionAttributeNames={"#ts": "timestamp"},
    )
    return resp.get("Items", [])


# -----------------------------
# Insights (conditional Bedrock)
# -----------------------------
def build_insights(stats: dict):
    """
    비용 절감 + 안정성:
    - 클릭 수가 적으면 Bedrock 호출 안 함
    - Bedrock 출력은 summary + nextActions(최대 3개)만
    - 코드펜스/마크다운 제거 후 JSON 파싱
    - 파싱 실패해도 summary로 텍스트라도 내려줌(프론트 깨짐 방지)
    """
    total_clicks = int(stats.get("totalClicks", 0))

    if not BEDROCK_ENABLED or not BEDROCK_MODEL_ID:
        return {
            "_bedrockUsed": False,
            "summary": "AI 인사이트 기능이 비활성화되어 있습니다.",
            "nextActions": [],
        }

    if total_clicks < BEDROCK_MIN_CLICKS:
        return {
            "_bedrockUsed": False,
            "summary": f"최근 7일 클릭 수가 {total_clicks}회로 적어, 확실한 패턴을 도출하기 어렵습니다.",
            "nextActions": [
                "UTM 파라미터를 붙여 유입 출처를 더 정확히 수집해보세요.",
                "SNS/검색/커뮤니티 등 1~2개 채널에 집중 배포 후 반응을 비교해보세요.",
            ],
        }

    # ✅ Bedrock 호출 (짧게 강제해서 잘림 방지)
    prompt = f"""
당신은 데이터 기반 성장 분석가입니다.
아래 지표를 바탕으로 한국어로 "요약"과 "다음 액션"만 작성하세요.
과장 없이, 짧고 명확하게.

[요약 지표]
- 총 URL 수: {stats.get("totalUrls")}
- 총 클릭 수: {stats.get("totalClicks")}
- 피크 시간: {stats.get("traffic", {}).get("peakHour")}
- 일자별 클릭: {json.dumps(stats.get("traffic", {}).get("clicksByDay", {}), ensure_ascii=False)}
- 시간대별 클릭: {json.dumps(stats.get("traffic", {}).get("clicksByHour", {}), ensure_ascii=False)}
- Top URLs: {json.dumps(stats.get("topUrls", [])[:5], ensure_ascii=False)}
- Top Domains: {json.dumps(stats.get("topDomains", [])[:5], ensure_ascii=False)}
- Top Referers: {json.dumps(stats.get("acquisition", {}).get("topReferers", [])[:5], ensure_ascii=False)}

[출력 형식]
- 반드시 "JSON만" 출력
- 코드펜스(```) / 마크다운 / 설명문 금지
- 키는 아래 2개만 사용 (추가 금지)
- summary는 2문장 이내
- nextActions는 3개만

{{
  "summary": "2문장 이내",
  "nextActions": ["짧은 문장 1", "짧은 문장 2", "짧은 문장 3"]
}}
""".strip()

    request_body = {
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        # ✅ 토큰 낮게: 비용↓ + 잘림↓
        "inferenceConfig": {"maxTokens": 300, "temperature": 0.2},
    }

    resp = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(request_body),
    )

    response_body = json.loads(resp["body"].read())
    content_list = response_body.get("output", {}).get("message", {}).get("content", [])
    text_block = next((item for item in content_list if "text" in item), None)
    text = (text_block["text"].strip() if text_block else "")

    # ✅ 코드펜스 제거
    cleaned = text.strip()
    if cleaned.lower().startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    # ✅ JSON 파싱 + 필요한 키만 추출
    try:
        obj = json.loads(cleaned)
        summary = (obj.get("summary") or "").strip()
        next_actions = obj.get("nextActions")
        if not isinstance(next_actions, list):
            next_actions = []
        next_actions = [str(x).strip() for x in next_actions if str(x).strip()][:3]

        return {
            "_bedrockUsed": True,
            "summary": summary,
            "nextActions": next_actions,
        }
    except Exception:
        # 파싱 실패해도 프론트가 보기 좋게: summary만 텍스트로
        # (너무 길면 잘라서 저장)
        fallback = cleaned
        if len(fallback) > 500:
            fallback = fallback[:500] + "…"
        return {
            "_bedrockUsed": True,
            "summary": fallback,
            "nextActions": [],
        }


# -----------------------------
# DynamoDB scan helper (urls only)
# -----------------------------
def scan_all_items(table):
    items = []
    last_key = None
    while True:
        kwargs = {}
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        resp = table.scan(**kwargs)
        items.extend(resp.get("Items", []))
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break
    return items


# -----------------------------
# Time helpers
# -----------------------------
def to_utc_z_iso(dt_kst: datetime) -> str:
    """
    KST datetime -> UTC ISO string ending with Z
    """
    dt_utc = dt_kst.astimezone(timezone.utc)
    # 밀리초까지 필요 없으면 timespec="seconds"로 줄여도 됨
    return dt_utc.isoformat().replace("+00:00", "Z")


def parse_iso_utc(s: str) -> datetime:
    ss = s.strip()
    if ss.endswith("Z"):
        ss = ss.replace("Z", "+00:00")
    dt = datetime.fromisoformat(ss)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# -----------------------------
# URL helpers
# -----------------------------
def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        return (parsed.netloc or "unknown").lower()
    except Exception:
        return "unknown"


def normalize_referer(ref: str) -> str:
    ref = ref.strip()
    if ref == "direct":
        return "direct"
    try:
        p = urlparse(ref)
        if p.netloc:
            return p.netloc.lower()
    except Exception:
        pass
    return ref.lower()


# -----------------------------
# Logging
# -----------------------------
def log_event(level, log_type, message, **kwargs):
    log = {
        "level": level,
        "type": log_type,
        "message": message,
        "service": "url-shortener",
        "function": os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
        "timestamp": int(time.time() * 1000),
    }
    log.update(kwargs)
    print(json.dumps(log, ensure_ascii=False))

def create_response(status_code, body, event=None):
    # 허용할 Origin 목록 (배포/로컬)
    allowed_origins = {
        "https://linkive.cloud",
        "https://www.linkive.cloud",
        "http://localhost:3000",
    }

    origin = None
    if event:
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")

    allow_origin = origin if origin in allowed_origins else "https://linkive.cloud"

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Headers": "content-type,authorization",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }