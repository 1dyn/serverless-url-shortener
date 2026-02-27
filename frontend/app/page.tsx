"use client"

import { MeshBackground } from "@/components/mesh-background"
import { HeroSection } from "@/components/hero-section"
import { useLinkiveData } from "@/hooks/use-linkive-data"
import { StatsDashboard } from "@/components/stats-dashboard"
import { useState, useEffect } from "react"
import { TrendsDashboard } from "@/components/trends-dashboard"

export default function Home() {
    const [mode, setMode] = useState<"shorten" | "analytics">("shorten")
    const [analyticsTab, setAnalyticsTab] = useState<"single" | "overall">("single")
    const {
        shortenUrl,
        shortenedUrl,
        isShortening,
        fetchStats,
        statsResult,
        isLoadingStats,
        statsError,
        fetchTrendsLatest,
        trendsResult,
        isLoadingTrends,
        trendsError,
    } = useLinkiveData()

    useEffect(() => {
        if (mode === "analytics" && analyticsTab === "overall") {
            fetchTrendsLatest()
        }
    }, [mode, analyticsTab])

    return (
        <div className="relative min-h-screen bg-background">
            <MeshBackground />

            <div className="relative z-10">
                <HeroSection
                    mode={mode}
                    setMode={setMode}
                    onShorten={shortenUrl}
                    onViewAnalytics={fetchStats}
                    shortenedUrl={shortenedUrl}
                    isShortening={isShortening}
                    isLoadingStats={isLoadingStats}
                />

                {mode === "analytics" && (
                  <section className="mx-auto max-w-6xl px-4 pb-6 md:px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setAnalyticsTab("single")}
                        className={`rounded-full px-4 py-2 text-sm ${
                          analyticsTab === "single"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        단일 분석
                      </button>
                      
                      <button
                        onClick={() => setAnalyticsTab("overall")}
                        className={`rounded-full px-4 py-2 text-sm ${
                          analyticsTab === "overall"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        전체(AI) 분석
                      </button>
                    </div>
                  </section>
                )}

                {mode === "analytics" && analyticsTab === "single" && (statsResult || statsError || isLoadingStats) && (
                  <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
                    <StatsDashboard
                      loading={isLoadingStats}
                      error={statsError}
                      data={statsResult}
                    />
                  </section>
                )}

                {mode === "analytics" && analyticsTab === "overall" && (trendsResult || trendsError || isLoadingTrends) && (
                  <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
                    <TrendsDashboard
                      loading={isLoadingTrends}
                      error={trendsError}
                      data={trendsResult}
                    />
                  </section>
                )}
            </div>
        </div>
    )
}