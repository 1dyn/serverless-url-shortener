"use client"

import { useState, useCallback } from "react"

export interface StatsResponse {
    shortId: string
    originalUrl: string
    title?: string
    totalClicks: number
    period: string
    stats: {
        clicksByHour: Record<string, number> | Record<number, number>
        clicksByDay: Record<string, number>
        clicksByReferer: Record<string, number>
        peakHour: number | null
        topReferer: string | null
    }
}

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
  }
  insights: any
  periodDays: number
}

// 필요하면 여기만 수정
const SHORTEN_URL = "https://api.linkive.cloud/shorten"
const STATS_BASE_URL = "https://api.linkive.cloud/stats"
const TRENDS_URL = "https://api.linkive.cloud/trends"

export function useLinkiveData() {
    const [shortenedUrl, setShortenedUrl] = useState<string | null>(null)
    const [isShortening, setIsShortening] = useState(false)

    const [statsResult, setStatsResult] = useState<StatsResponse | null>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(false)
    const [statsError, setStatsError] = useState<string | null>(null)

    const [trendsResult, setTrendsResult] = useState<TrendsResponse | null>(null)
    const [isLoadingTrends, setIsLoadingTrends] = useState(false)
    const [trendsError, setTrendsError] = useState<string | null>(null)

    const shortenUrl = useCallback(async (url: string) => {
        if (!url.trim()) return

        try {
            setIsShortening(true)
            setShortenedUrl(null)

            const response = await fetch(SHORTEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            })

            if (!response.ok) throw new Error("Failed to shorten URL")
            const data = await response.json()

            setShortenedUrl(data.shortUrl)
        } catch (error) {
            console.error("Shorten error:", error)
            alert("URL shortening failed")
        } finally {
            setIsShortening(false)
        }
    }, [])

    const fetchStats = useCallback(async (shortId: string) => {
        const id = shortId.trim()
        if (!id) return

        try {
            setIsLoadingStats(true)
            setStatsError(null)
            setStatsResult(null)

            const response = await fetch(
                `${STATS_BASE_URL}/${encodeURIComponent(id)}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            )

            if (response.status === 404) {
                throw new Error("URL not found")
            }
            if (!response.ok) {
                throw new Error("Failed to fetch stats")
            }

            const data = (await response.json()) as StatsResponse
            setStatsResult(data)
        } catch (error: any) {
            console.error("Stats error:", error)
            const msg =
                error?.message === "URL not found"
                    ? "해당 단축 URL을 찾을 수 없습니다."
                    : "통계 조회에 실패했습니다."
            setStatsError(msg)
        } finally {
            setIsLoadingStats(false)
        }
    }, [])

    const fetchTrendsLatest = async () => {
        setIsLoadingTrends(true)
        setTrendsError(null)

        try {
            // const res = await fetch(TRENDS_URL)
            const res = await fetch(TRENDS_URL)
            if (!res.ok) throw new Error(`Trends API failed: ${res.status}`)
            const json = await res.json()
            setTrendsResult(json)
        } catch (e: any) {
            setTrendsError(e.message ?? "전체 분석을 불러오지 못했습니다.")
            setTrendsResult(null)
        } finally {
            setIsLoadingTrends(false)
        }
    }

    return {
        shortenUrl,
        shortenedUrl,
        isShortening,

        fetchStats,
        statsResult,
        isLoadingStats,
        statsError,

        trendsResult,
        isLoadingTrends,
        trendsError,
        fetchTrendsLatest,
    }
}