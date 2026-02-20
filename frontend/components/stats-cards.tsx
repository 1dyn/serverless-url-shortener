"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link2, MousePointerClick, Users } from "lucide-react"
import type { LinkiveStats } from "@/hooks/use-linkive-data"

interface StatsCardsProps {
  stats: LinkiveStats
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

const statItems = [
  {
    key: "linksToday" as const,
    label: "Links shortened today",
    icon: Link2,
  },
  {
    key: "totalClicks" as const,
    label: "Total clicks across Linkive",
    icon: MousePointerClick,
  },
  {
    key: "activeUsers" as const,
    label: "Active users right now",
    icon: Users,
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <>
      {statItems.map((item) => (
        <Card
          key={item.key}
          className="border-border/60 bg-card/80 backdrop-blur-sm"
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <item.icon className="size-4 text-primary" />
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {formatNumber(stats[item.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
