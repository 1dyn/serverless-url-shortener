"use client"

import type { StatsResponse } from "@/hooks/use-linkive-data"

import {
    ResponsiveContainer,
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts"

type StatsApiResponse = {
    shortId: string
    originalUrl: string
    title?: string
    totalClicks: number
    period: string
    stats: {
        clicksByDay: Record<string, number>
        clicksByHour: Record<string, number>
        clicksByReferer: Record<string, number>
        peakHour?: number
        topReferer?: string
    }
}

function toDaySeries(clicksByDay: Record<string, number>) {
    return Object.entries(clicksByDay || {})
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => a.date.localeCompare(b.date))
}

function toHourSeries(clicksByHour: Record<string, number>) {
    const map = clicksByHour || {}
    return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        clicks: Number(map[String(hour)] ?? 0),
    }))
}

function toRefererList(clicksByReferer: Record<string, number>) {
    return Object.entries(clicksByReferer || {})
        .map(([referer, clicks]) => ({ referer, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
}

export function StatsDashboard({
    loading,
    error,
    data,
}: {
    loading: boolean
    error: string | null
    data: StatsResponse | null
}) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
                <p className="text-sm text-muted-foreground">분석 불러오는중...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
                <p className="text-sm text-red-400">{error}</p>
            </div>
        )
    }

    if (!data) return null

    const daySeries = toDaySeries(data.stats?.clicksByDay ?? {})
    const hourSeries = toHourSeries(data.stats?.clicksByHour ?? {})
    const referers = toRefererList(data.stats?.clicksByReferer ?? {})

    const peakHour = data.stats?.peakHour
    const topReferer = data.stats?.topReferer

    return (
            <div className="space-y-6">
                {/* 요약 카드 */}
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                        <p className="text-xs text-muted-foreground">원본 URL</p>
                        <p className="mt-2 break-all text-sm text-foreground">{data.originalUrl}</p>
                    </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                    <p className="text-xs text-muted-foreground">단축 코드</p>
                    <p className="mt-2 font-mono text-sm text-foreground">{data.shortId}</p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                    <p className="text-xs text-muted-foreground">총 클릭 수</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{data.totalClicks}</p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                    <p className="text-xs text-muted-foreground">기간</p>
                    <p className="mt-2 text-sm text-foreground">{data.period}</p>

                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {typeof peakHour === "number" && <div>피크 시간: {peakHour}시</div>}
                        {topReferer && <div>최다 유입: {topReferer}</div>}
                    </div>
                </div>
            </div>

          {/* 차트 2개 */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                    <p className="text-sm font-medium text-foreground">일자별 클릭수</p>
                        <div className="mt-4 h-64">
                            {daySeries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={daySeries}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="clicks" stroke="var(--primary)" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                    <p className="text-sm font-medium text-foreground">시간대별 클릭수</p>
                    <div className="mt-4 h-64">
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

            {/* referer 리스트 */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
                <div className="flex items-end justify-between gap-4">
                    <p className="text-sm font-medium text-foreground">유입 경로별 클릭수</p>
                    <p className="text-xs text-muted-foreground">
                        항목 {referers.length}개
                    </p>
                </div>

            <div className="mt-4 divide-y divide-border/40">
                {referers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
                    ) : (
                        referers.map((r) => (
                            <div key={r.referer} className="flex items-center justify-between py-3">
                                <span className="text-sm text-foreground">{r.referer}</span>
                                <span className="text-sm font-medium text-foreground">{r.clicks}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}