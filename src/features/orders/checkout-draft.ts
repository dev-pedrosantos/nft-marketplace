const DRAFT_STORAGE_KEY = 'kurio.checkout.draft'

/** What the collector filled in on the checkout, kept for the tab so an expired session can resume it. */
export interface CheckoutDraft<Values> {
  userId: string
  values: Values
  selectedWalletId: string | null
  useOtherWallet: boolean
}

export function readCheckoutDraft<Values>(userId: string): CheckoutDraft<Values> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    const draft = raw ? (JSON.parse(raw) as CheckoutDraft<Values>) : null
    return draft?.userId === userId && draft.values ? draft : null
  } catch {
    return null
  }
}

export function saveCheckoutDraft<Values>(draft: CheckoutDraft<Values>) {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY)
}
