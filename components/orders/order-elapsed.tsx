"use client"
import { useEffect, useState } from "react"

export function OrderElapsed({ createdAt, deliveredAt, completed = false }: { createdAt: string; deliveredAt?: string | null; completed?: boolean }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const initial = window.setTimeout(update, 0)
    const timer = !completed ? window.setInterval(update, 1000) : undefined
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [completed])
  const end = deliveredAt ? Date.parse(deliveredAt) : completed ? null : now
  const seconds = end === null ? null : Math.max(0, Math.floor((end - Date.parse(createdAt)) / 1000))
  const value = seconds === null || !Number.isFinite(seconds) ? "—" : [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, "0")).join(":")
  return <span className="tabular-nums">{completed ? "إجمالي الوقت" : "الوقت منذ الطلب"}: <bdi>{value}</bdi></span>
}
