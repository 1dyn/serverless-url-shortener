"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Activity } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { TrafficPoint } from "@/hooks/use-linkive-data"

interface TrafficChartProps {
  data: TrafficPoint[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value.toLocaleString()} clicks
      </p>
    </div>
  )
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="size-4 text-primary" />
          Global Pulse &mdash; Last 12 Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.03 260)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "oklch(0.65 0.03 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(0.65 0.03 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="oklch(0.55 0.2 270)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "oklch(0.55 0.2 270)",
                  stroke: "oklch(0.55 0.2 270 / 0.3)",
                  strokeWidth: 6,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
