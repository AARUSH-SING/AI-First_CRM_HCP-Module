import type { InteractionFormState } from '../store/interactionSlice'

export type AiLogRequest = {
  message: string
  currentForm: InteractionFormState
}

export type AiLogResponse = {
  extracted: Partial<InteractionFormState>
  summary: string
  suggestedFollowUps: string[]
}

export async function aiLogInteraction(payload: AiLogRequest): Promise<AiLogResponse> {
  const res = await fetch('http://localhost:8000/ai/log-interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }

  return (await res.json()) as AiLogResponse
}

