import { NextResponse } from "next/server"

const TRENDS_LATEST_URL = "https://linkive.cloud/trends"

export async function GET() {
    try {
        const res = await fetch(TRENDS_LATEST_URL, { cache: "no-store" })

        const text = await res.text()
        return new NextResponse(text, {
            status: res.status,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Failed to fetch trends" },
            { status: 500 }
        )
    }
}