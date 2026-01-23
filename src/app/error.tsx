'use client'

import { ErrorFallback } from '@/components/error-boundary'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <ErrorFallback error={error} reset={reset} />
      </body>
    </html>
  )
}
