import { apiFetch } from './client'

export const contactApi = {
  send: (name: string, email: string, message: string) =>
    apiFetch<{ success: boolean }>('/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, message }),
    }),
}
