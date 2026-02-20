"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import type { AiInsight } from "@/hooks/use-linkive-data"

interface AiInsightCardProps {
  insight: AiInsight
}

export function AiInsightCard({ insight }: AiInsightCardProps) {
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-card/80 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background:
            "radial-gradient(ellipse at top left, oklch(0.55 0.2 270), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            Linkive AI Insight
          </span>
          <Badge
            variant="outline"
            className="border-primary/30 text-xs text-primary"
          >
            {insight.confidence}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-3">
        <Badge
          variant="secondary"
          className="w-fit bg-primary/10 text-xs text-primary"
        >
          {insight.category}
        </Badge>
        <p className="text-sm leading-relaxed text-foreground/90">
          {insight.text}
        </p>
      </CardContent>
    </Card>
  )
}
