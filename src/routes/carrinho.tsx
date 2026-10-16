import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/pages/cart/cart-page'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})
