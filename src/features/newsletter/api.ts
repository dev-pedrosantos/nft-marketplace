import { apiClient } from '@/lib/api/client'

export async function subscribeToNewsletter(email: string) {
  await apiClient.post('/newsletter/subscriptions', { email })
}
