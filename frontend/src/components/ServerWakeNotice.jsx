import { useEffect, useState } from 'react'

const SHOW_AFTER_MS = 3000
const FULL_BAR_SECONDS = 60
const MAX_PROGRESS = 95

export function ServerWakeNotice({ loading }) {
  const [visible, setVisible] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!loading) {
      setVisible(false)
      setSeconds(0)
      return
    }

    const start = Date.now()
    let intervalId = null

    const timeoutId = setTimeout(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
      setVisible(true)
      intervalId = setInterval(() => {
        setSeconds(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    }, SHOW_AFTER_MS)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [loading])

  if (!loading || !visible) return null

  const progress = Math.min((seconds / FULL_BAR_SECONDS) * 100, MAX_PROGRESS)

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400 motion-safe:animate-pulse"
        />
        <p className="flex-1 text-sm text-slate-300">
          Despertando el servidor… (Render gratis tarda hasta ~50 s la primera vez)
        </p>
        <span className="text-sm font-semibold tabular-nums text-indigo-400">{seconds} s</span>
      </div>
      <div
        aria-hidden="true"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-indigo-600 motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default ServerWakeNotice
