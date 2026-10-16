import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/pages/checkout/checkout-page'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})
