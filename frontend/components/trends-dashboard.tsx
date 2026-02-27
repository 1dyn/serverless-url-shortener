"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"

type TrendsResponse = {
  stats: {
    totalUrls: number
    totalClicks: number
    topUrls: { shortId: string; clicks: number }[]
    topDomains: { domain: string; count: number }[]
    traffic: {
      clicksByDay: Record<string, number>
      clicksByHour: Record<string, number>
      peakHour: string
    }
    acquisition: {
      topReferers: { referer: string; clicks: number }[]
    }
    window?: {
      startIso?: string
      endIso?: string
      days?: number
    }
  }
  insights: any
  periodDays: number
}

interface TrendsDashboardProps {
  loading: boolean
  error: string | null
  data: TrendsResponse | null
}

function parseInsights(insights: any): { summary?: string; nextActions?: string[] } {
  if (!insights) return {}

  // 이미 구조화돼 있으면 그대로 사용
  if (typeof insights === "object" && (insights.summary || insights.nextActions)) {
    return {
      summary: insights.summary,
      nextActions: Array.isArray(insights.nextActions) ? insights.nextActions : [],
    }
  }

  // Bedrock 결과가 raw 문자열로 온 경우 (```json ... ``` 형태)
  const raw = typeof insights === "object" ? insights.raw : insights
  if (typeof raw !== "string") return {}

  // 코드펜스 제거
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    const obj = JSON.parse(cleaned)
    return {
      summary: obj.summary,
      nextActions: Array.isArray(obj.nextActions) ? obj.nextActions : [],
    }
  } catch {
    // JSON 파싱이 안되면 그냥 텍스트로 summary에 넣어줌
    return { summary: cleaned }
  }
}

function toDaySeries(map: Record<string, number>) {
  return Object.entries(map || {}).map(([date, clicks]) => ({ date, clicks }))
}

function toHourSeries(map: Record<string, number>) {
  // 0~23 모두 채워서 그래프가 안정적으로 보이게
  const base = Array.from({ length: 24 }, (_, h) => ({
    hour: String(h),
    clicks: 0,
  }))

  for (const [h, v] of Object.entries(map || {})) {
    const idx = Number(h)
    if (!Number.isNaN(idx) && idx >= 0 && idx < 24) base[idx].clicks = v
  }
  return base
}

function getPrimaryColorCssValue() {
  // shadcn/tailwind 기준: CSS 변수 --primary가 잡혀있으면 그 값을 읽어서 recharts 색으로 씁니다.
  if (typeof window === "undefined") return "hsl(var(--primary))"
  const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
  return v ? `hsl(${v})` : "hsl(var(--primary))"
}

export function TrendsDashboard({ loading, error, data }: TrendsDashboardProps) {
  const [primary, setPrimary] = React.useState("hsl(var(--primary))")

  React.useEffect(() => {
    setPrimary(getPrimaryColorCssValue())
  }, [])

  if (loading) {
    return <div className="text-center text-muted-foreground">전체 분석 불러오는 중...</div>
  }
  if (error) {
    return <div className="text-center text-red-500">{error}</div>
  }
  if (!data) return null

  const s = data.stats
  const daySeries = toDaySeries(s.traffic?.clicksByDay || {})
  const hourSeries = toHourSeries(s.traffic?.clicksByHour || {})

  const parsed = parseInsights(data.insights)
  const insightSummary = parsed.summary
  const nextActions = parsed.nextActions ?? []

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="text-sm text-muted-foreground">총 URL 수</div>
          <div className="mt-1 text-3xl font-semibold">{s.totalUrls}</div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="text-sm text-muted-foreground">총 클릭 수</div>
          <div className="mt-1 text-3xl font-semibold">{s.totalClicks}</div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="text-sm text-muted-foreground">피크 시간</div>
          <div className="mt-1 text-3xl font-semibold">{s.traffic?.peakHour ?? "-"}</div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="text-sm text-muted-foreground">최다 유입</div>
          <div className="mt-1 text-3xl font-semibold">
            {s.acquisition?.topReferers?.[0]?.referer ?? "-"}
          </div>
        </div>
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
          <div className="mb-4 text-sm font-medium text-foreground">일자별 클릭수</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
          <div className="mb-4 text-sm font-medium text-foreground">시간대별 클릭수</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="clicks" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 리스트 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
          <div className="mb-4 text-sm font-medium text-foreground">Top URL</div>
          <div className="space-y-3">
            {(s.topUrls || []).slice(0, 8).map((u) => (
              <div key={u.shortId} className="flex items-center justify-between">
                <div className="font-mono text-sm text-foreground">{u.shortId}</div>
                <div className="text-sm text-muted-foreground">{u.clicks}</div>
              </div>
            ))}
            {!s.topUrls?.length && <div className="text-sm text-muted-foreground">데이터가 없습니다.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
          <div className="mb-4 text-sm font-medium text-foreground">Top 도메인</div>
          <div className="space-y-3">
            {(s.topDomains || []).slice(0, 8).map((d) => (
              <div key={d.domain} className="flex items-center justify-between">
                <div className="text-sm text-foreground">{d.domain || "unknown"}</div>
                <div className="text-sm text-muted-foreground">{d.count}</div>
              </div>
            ))}
            {!s.topDomains?.length && <div className="text-sm text-muted-foreground">데이터가 없습니다.</div>}
          </div>
        </div>
      </div>

      {/* 유입 */}
      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
        <div className="mb-4 text-sm font-medium text-foreground">유입 경로</div>
        <div className="space-y-3">
          {(s.acquisition?.topReferers || []).slice(0, 10).map((r) => (
            <div key={r.referer} className="flex items-center justify-between">
              <div className="text-sm text-foreground">{r.referer}</div>
              <div className="text-sm text-muted-foreground">{r.clicks}</div>
            </div>
          ))}
          {!s.acquisition?.topReferers?.length && (
            <div className="text-sm text-muted-foreground">데이터가 없습니다.</div>
          )}
        </div>
      </div>

      {/* AI 인사이트 */}
      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-6">
        <div className="mb-3 text-sm font-medium text-foreground">AI 인사이트</div>

        {insightSummary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{insightSummary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">인사이트가 없습니다.</p>
        )}

        {nextActions.length > 0 && (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {nextActions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}