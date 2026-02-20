"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link2, ArrowRight, Copy, Check } from "lucide-react"

interface HeroSectionProps {
  onShorten: (url: string) => void
  shortenedUrl: string | null
  isShortening: boolean
}

export function HeroSection({
  onShorten,
  shortenedUrl,
  isShortening,
}: HeroSectionProps) {
  const [url, setUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onShorten(url)
  }

  const handleCopy = async () => {
    if (!shortenedUrl) return
    await navigator.clipboard.writeText(shortenedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          URL 단축 서비스. AI 분석을 곁들인
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Link2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Paste your long URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 border-border/60 bg-secondary/50 pl-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30"
            required
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isShortening}
          className="h-12 gap-2 bg-primary px-6 text-primary-foreground shadow-[0_0_20px_oklch(0.55_0.2_270/0.3)] transition-shadow hover:bg-primary/90 hover:shadow-[0_0_30px_oklch(0.55_0.2_270/0.45)]"
        >
          {isShortening ? (
            <>
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Shortening
            </>
          ) : (
            <>
              Shorten
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {shortenedUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-5 py-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="font-mono text-sm text-primary">{shortenedUrl}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            className="text-primary hover:bg-primary/20 hover:text-primary"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="sr-only">{copied ? "Copied" : "Copy link"}</span>
          </Button>
        </div>
      )}
    </section>
  )
}
