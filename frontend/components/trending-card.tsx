"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Flame } from "lucide-react"
import type { TrendingItem } from "@/hooks/use-linkive-data"

interface TrendingCardProps {
  trending: TrendingItem[]
}

function formatClicks(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function TrendingCard({ trending }: TrendingCardProps) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Flame className="size-4 text-primary" />
          Top 5 Trending
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {trending.map((item) => (
          <div
            key={item.rank}
            className="flex items-center gap-3"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
              {item.rank}
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {item.topic}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatClicks(item.clicks)}
            </span>
            <Badge
              variant={item.change >= 0 ? "default" : "secondary"}
              className={`gap-0.5 text-xs ${
                item.change >= 0
                  ? "bg-primary/15 text-primary border-primary/20"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {item.change >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(item.change)}%
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
