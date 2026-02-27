"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link2, ArrowRight, Copy, Check, BarChart3 } from "lucide-react"

interface HeroSectionProps {
    mode: "shorten" | "analytics"
    setMode: (m: "shorten" | "analytics") => void
    onShorten: (url: string) => void
    onViewAnalytics: (shortId: string) => void
    shortenedUrl: string | null
    isShortening: boolean
    isLoadingStats?: boolean
}

function extractShortId(input: string): string | null {
    const value = input.trim()
    if (!value) return null

    if (!value.includes("://")) {
        return value.replace(/^\/+|\/+$/g, "")
    }

    try {
        const u = new URL(value)
        const parts = u.pathname.split("/").filter(Boolean)
        if (parts.length === 0) return null
        return parts[parts.length - 1]
    } catch {
        return null
    }
}

export function HeroSection({
    mode,
    setMode,
    onShorten,
    onViewAnalytics,
    shortenedUrl,
    isShortening,
    isLoadingStats = false,
}: HeroSectionProps) {
    const [shortenInput, setShortenInput] = useState("")
    const [analyticsInput, setAnalyticsInput] = useState("")
    const [copied, setCopied] = useState(false)
    const inputValue = mode === "shorten" ? shortenInput : analyticsInput
    const setInputValue = mode === "shorten" ? setShortenInput : setAnalyticsInput

    const switchMode = (next: "shorten" | "analytics") => {
        setMode(next)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (mode === "shorten") {
            onShorten(inputValue)
        } else {
            const shortId = extractShortId(inputValue)
            if (!shortId) return
            onViewAnalytics(shortId)
        }
    }

    const handleViewAnalytics = () => {
        const shortId = extractShortId(inputValue)
        if (!shortId) return
        onViewAnalytics(shortId)
    }

    const handleQuickAnalytics = () => {
        if (!shortenedUrl) return

        const shortId = extractShortId(shortenedUrl)
        if (!shortId) return

        setMode("analytics")        // 분석 탭으로 전환
        setAnalyticsInput(shortenedUrl)       // 입력창에 단축 URL 넣기(사용자에게도 보이게)
        onViewAnalytics(shortId)    // 바로 분석 호출
    }

    const handleCopy = async () => {
        if (!shortenedUrl) return
        await navigator.clipboard.writeText(shortenedUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const canViewAnalytics =
        mode === "analytics" &&
        !!extractShortId(analyticsInput) &&
        !isLoadingStats

    return (
        <section className="relative flex flex-col items-center gap-8 px-4 pt-32 pb-16 text-center md:pt-40 md:pb-24">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">
                    Live analytics dashboard
                </span>
            </div>

            <div className="flex flex-col items-center gap-4">
                <h1 className="text-balance text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
                    Linkive
                </h1>
                <p className="max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
                    URL 단축 및 데이터·AI 분석 서비스
                </p>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-full bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => switchMode("shorten")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  mode === "shorten"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                단축
              </button>
              
              <button
                type="button"
                onClick={() => switchMode("analytics")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  mode === "analytics"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                분석
              </button>
            </div>
            <form onSubmit={handleSubmit} className="w-full max-w-xl">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Link2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={mode === "shorten" ? "원본 URL을 입력하세요" : "단축 URL 또는 shortId를 입력하세요"}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="h-12 border-border/60 bg-secondary/50 pl-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        disabled={mode === "shorten" ? isShortening : isLoadingStats}
                        className="h-12 gap-2 bg-primary px-6 text-primary-foreground"
                    >
                        {mode === "shorten"
                            ? isShortening
                                ? "단축 중..."
                                : "단축하기"
                            : isLoadingStats
                                ? "분석 중..."
                                : "분석하기"}
                    </Button>
                </div>
            </form>

            {mode === "shorten" && shortenedUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-5 py-3">
                    <span className="font-mono text-sm text-primary">{shortenedUrl}</span>
                    <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                    
                    <Button variant="ghost" size="sm" onClick={handleQuickAnalytics} className="gap-2">
                        <BarChart3 className="size-4" />
                        바로 분석하기
                    </Button>
                </div>
            )}
        </section>
    )
}