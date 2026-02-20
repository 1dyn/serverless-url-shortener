"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export interface LinkiveStats {
  linksToday: number
  totalClicks: number
  activeUsers: number
}

export interface TrendingItem {
  rank: number
  topic: string
  clicks: number
  change: number
}

export interface TrafficPoint {
  time: string
  clicks: number
}

export interface AiInsight {
  text: string
  category: string
  confidence: number
}

export interface LinkiveAnalytics {
  stats: LinkiveStats
  trending: TrendingItem[]
  trafficData: TrafficPoint[]
  aiInsight: AiInsight
}

function generateTrafficData(): TrafficPoint[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const hour = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000)
    const hourStr = hour.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    })
    const base = 800 + Math.random() * 1200
    const peak = i >= 6 && i <= 9 ? 400 : 0
    return {
      time: hourStr,
      clicks: Math.round(base + peak + Math.random() * 200),
    }
  })
}

const AI_INSIGHTS: AiInsight[] = [
  {
    text: "Social media traffic is shifting towards video-content links right now. Short-form video URLs see 3.2x more engagement than static pages.",
    category: "Social Trends",
    confidence: 94,
  },
  {
    text: "E-commerce link clicks surged 47% this week, led by mobile shopping. Optimizing for mobile-first landing pages is key.",
    category: "E-Commerce",
    confidence: 91,
  },
  {
    text: "Developer documentation links are trending up 28% as open-source projects gain momentum in Q1.",
    category: "Tech & Dev",
    confidence: 88,
  },
  {
    text: "Newsletter subscription links show the highest CTR between 9-11 AM EST. Schedule your campaigns accordingly.",
    category: "Email Marketing",
    confidence: 92,
  },
]

const TRENDING_TOPICS: TrendingItem[][] = [
  [
    { rank: 1, topic: "#Tech", clicks: 24891, change: 12.4 },
    { rank: 2, topic: "#Shopping", clicks: 18432, change: 8.7 },
    { rank: 3, topic: "#News", clicks: 15290, change: -2.1 },
    { rank: 4, topic: "#Gaming", clicks: 12847, change: 15.3 },
    { rank: 5, topic: "#Finance", clicks: 9834, change: 5.6 },
  ],
  [
    { rank: 1, topic: "#Shopping", clicks: 26102, change: 14.2 },
    { rank: 2, topic: "#Tech", clicks: 23451, change: 9.1 },
    { rank: 3, topic: "#Health", clicks: 16780, change: 6.8 },
    { rank: 4, topic: "#News", clicks: 14523, change: -1.3 },
    { rank: 5, topic: "#Education", clicks: 11290, change: 18.9 },
  ],
]

function getMockAnalytics(cycleIndex: number): LinkiveAnalytics {
  const baseLinks = 14283
  const baseClicks = 2847592
  const jitter = Math.floor(Math.random() * 50)

  return {
    stats: {
      linksToday: baseLinks + jitter + cycleIndex * 3,
      totalClicks: baseClicks + jitter * 100 + cycleIndex * 312,
      activeUsers: 4821 + Math.floor(Math.random() * 200),
    },
    trending: TRENDING_TOPICS[cycleIndex % TRENDING_TOPICS.length],
    trafficData: generateTrafficData(),
    aiInsight: AI_INSIGHTS[cycleIndex % AI_INSIGHTS.length],
  }
}

export function useLinkiveData() {
  const [analytics, setAnalytics] = useState<LinkiveAnalytics>(
    getMockAnalytics(0)
  )
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null)
  const [isShortening, setIsShortening] = useState(false)
  const cycleRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      cycleRef.current += 1
      setAnalytics(getMockAnalytics(cycleRef.current))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const shortenUrl = useCallback(async (url: string) => {
    if (!url.trim()) return

    try {
      setIsShortening(true)
      setShortenedUrl(null)

      const response = await fetch(
        "https://linkive.cloud/shorten",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to shorten URL")
      }

      const data = await response.json()

      // 🔥 Lambda에서 내려준 shortUrl 그대로 사용
      setShortenedUrl(data.shortUrl)

    } catch (error) {
      console.error("Shorten error:", error)
      alert("URL shortening failed")
    } finally {
      setIsShortening(false)
    }
  }, [])

  return {
    analytics,
    shortenUrl,
    shortenedUrl,
    isShortening,
  }
}
