"use client"

export function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-1/2 -left-1/4 h-[800px] w-[800px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "oklch(0.45 0.2 270)" }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[600px] w-[600px] rounded-full opacity-15 blur-[100px]"
        style={{ background: "oklch(0.5 0.18 290)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[500px] w-[700px] rounded-full opacity-10 blur-[120px]"
        style={{ background: "oklch(0.5 0.15 250)" }}
      />
    </div>
  )
}
