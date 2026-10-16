import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useViewerKey } from '@/features/auth/session-store'
import type { WalletProvider } from '@/features/wallets/types'
import { toApiError, type ApiError } from '@/lib/api/errors'
import type { DecimalString } from '@/lib/money'
import { usePlaceOrder, useRequestQuote } from './api'
import type { CheckoutQuote, CollectorDetails, Order } from './types'

const ATTEMPT_STORAGE_KEY = 'kurio.checkout.attempt'

export interface CheckoutRequest {
  networkId: string
  expectedTotalEth: DecimalString
  walletProvider: WalletProvider
  collector: CollectorDetails
}

/** One payment attempt: the reviewed quote and the idempotency key sent with every retry of it. */
interface Attempt {
  viewer: string
  idempotencyKey: string
  quote: CheckoutQuote
  request: CheckoutRequest
}

function readAttempt(viewer: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_STORAGE_KEY)
    const attempt = raw ? (JSON.parse(raw) as Attempt) : null
    return attempt?.viewer === viewer && attempt.request ? attempt : null
  } catch {
    return null
  }
}

function saveAttempt(attempt: Attempt | null) {
  if (attempt) sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(attempt))
  else sessionStorage.removeItem(ATTEMPT_STORAGE_KEY)
}

/** The request may have reached the server: the order could exist, so the same key must be reused. */
const isUncertain = (error: ApiError) => error.isNetworkError || (error.status !== null && error.status >= 500)

/**
 * Review-then-pay flow: asks the API to revalidate prices, stock, coupon and fees, waits for the
 * user to accept any change, then places the order with an idempotency key that survives
 * double clicks, timeouts and reloads until the outcome is known.
 */
export function useCheckout({ onPlaced }: { onPlaced: (order: Order) => void }) {
  const viewer = useViewerKey()
  const queryClient = useQueryClient()
  const requestQuote = useRequestQuote()
  const placeOrder = usePlaceOrder()
  const busy = useRef(false)
  const [pendingReview, setPendingReview] = useState<{ quote: CheckoutQuote; request: CheckoutRequest } | null>(null)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [unresolved, setUnresolved] = useState(() => readAttempt(viewer))

  const remember = (attempt: Attempt | null) => {
    saveAttempt(attempt)
    setUnresolved(attempt)
  }

  const place = async (attempt: Attempt) => {
    remember(attempt)
    try {
      const order = await placeOrder.mutateAsync({
        idempotencyKey: attempt.idempotencyKey,
        quoteId: attempt.quote.id,
        walletProvider: attempt.request.walletProvider,
        collector: attempt.request.collector,
      })
      remember(null)
      onPlaced(order)
    } catch (cause) {
      const apiError = toApiError(cause)
      if (isUncertain(apiError)) {
        setError({ message: apiError.message, retryable: true })
        return
      }
      remember(null)
      setError({ message: apiError.message, retryable: false })
      void queryClient.invalidateQueries({ queryKey: ['cart', viewer] })
    }
  }

  const run = async (task: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setError(null)
    try {
      await task()
    } finally {
      busy.current = false
    }
  }

  const submit = (request: CheckoutRequest) =>
    run(async () => {
      const previous = readAttempt(viewer)
      if (previous && previous.quote.networkId === request.networkId) {
        await place(previous)
        return
      }
      let quote: CheckoutQuote
      try {
        quote = await requestQuote.mutateAsync({
          networkId: request.networkId,
          expectedTotalEth: request.expectedTotalEth,
        })
      } catch (cause) {
        const apiError = toApiError(cause)
        setError({ message: apiError.message, retryable: isUncertain(apiError) })
        void queryClient.invalidateQueries({ queryKey: ['cart', viewer] })
        return
      }
      if (quote.changes.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ['cart', viewer] })
        setPendingReview({ quote, request })
        return
      }
      await place({ viewer, idempotencyKey: crypto.randomUUID(), quote, request })
    })

  /** Re-sends an attempt whose outcome is unknown; the server answers with the order if it exists. */
  const resume = () =>
    run(async () => {
      const previous = readAttempt(viewer)
      if (previous) await place(previous)
    })

  const acceptReview = () =>
    run(async () => {
      if (!pendingReview) return
      const { quote, request } = pendingReview
      setPendingReview(null)
      await place({ viewer, idempotencyKey: crypto.randomUUID(), quote, request })
    })

  return {
    submit,
    resume,
    hasUnresolvedAttempt: unresolved !== null,
    acceptReview,
    dismissReview: () => setPendingReview(null),
    pendingReview: pendingReview?.quote ?? null,
    error,
    submitting: requestQuote.isPending || placeOrder.isPending,
  }
}
