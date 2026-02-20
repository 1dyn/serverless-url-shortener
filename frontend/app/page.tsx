"use client"

import { MeshBackground } from "@/components/mesh-background"
import { HeroSection } from "@/components/hero-section"
import { StatsCards } from "@/components/stats-cards"
import { TrendingCard } from "@/components/trending-card"
import { AiInsightCard } from "@/components/ai-insight-card"
import { TrafficChart } from "@/components/traffic-chart"
import { useLinkiveData } from "@/hooks/use-linkive-data"

export default function Home() {
  const { analytics, shortenUrl, shortenedUrl, isShortening } =
    useLinkiveData()

  return (
    <div className="relative min-h-screen bg-background">
      <MeshBackground />

      <div className="relative z-10">
        {/* Hero */}
        <HeroSection
          onShorten={shortenUrl}
          shortenedUrl={shortenedUrl}
          isShortening={isShortening}
        />

        {/* Dashboard */}
        <section
          id="dashboard"
          className="mx-auto max-w-6xl px-4 pb-20 md:px-6"
        >
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Public Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time data across the Linkive network. Refreshes every 30s.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Stats row */}
            <StatsCards stats={analytics.stats} />

            {/* AI Insight - spans 2 columns */}
            <div className="md:col-span-2">
              <AiInsightCard insight={analytics.aiInsight} />
            </div>

            {/* Trending */}
            <TrendingCard trending={analytics.trending} />

            {/* Traffic Chart - spans full width */}
            <div className="md:col-span-2 lg:col-span-3">
              <TrafficChart data={analytics.trafficData} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Linkive &mdash; Smart URL shortener with AI-powered insights.
          </p>
        </footer>
      </div>
    </div>
  )
}
