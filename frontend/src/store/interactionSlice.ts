import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type Sentiment = 'positive' | 'neutral' | 'negative'

export type InteractionType = 'Meeting' | 'Call' | 'Email' | 'Virtual'

export type InteractionFormState = {
  hcpName: string
  interactionType: InteractionType
  date: string
  time: string
  attendees: string
  topicsDiscussed: string
  materialsShared: string[]
  samplesDistributed: string[]
  sentiment: Sentiment
  outcomes: string
  followUpActions: string
  aiSuggestedFollowUps: string[]
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)

const initialState: InteractionFormState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: todayIso(),
  time: nowTime(),
  attendees: '',
  topicsDiscussed: '',
  materialsShared: [],
  samplesDistributed: [],
  sentiment: 'neutral',
  outcomes: '',
  followUpActions: '',
  aiSuggestedFollowUps: [
    'Schedule follow-up meeting in 2 weeks',
    'Send Product X clinical reprint and dosing guide',
    'Confirm sample request volume and delivery date',
  ],
}

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    setField<K extends keyof InteractionFormState>(
      state: InteractionFormState,
      action: PayloadAction<{ key: K; value: InteractionFormState[K] }>,
    ) {
      state[action.payload.key] = action.payload.value
    },
    mergeFromAi(state: InteractionFormState, action: PayloadAction<Partial<InteractionFormState>>) {
      return { ...state, ...action.payload }
    },
    addMaterial(state: InteractionFormState, action: PayloadAction<string>) {
      if (!state.materialsShared.includes(action.payload)) {
        state.materialsShared.push(action.payload)
      }
    },
    removeMaterial(state: InteractionFormState, action: PayloadAction<string>) {
      state.materialsShared = state.materialsShared.filter((m) => m !== action.payload)
    },
    addSample(state: InteractionFormState, action: PayloadAction<string>) {
      if (!state.samplesDistributed.includes(action.payload)) {
        state.samplesDistributed.push(action.payload)
      }
    },
    removeSample(state: InteractionFormState, action: PayloadAction<string>) {
      state.samplesDistributed = state.samplesDistributed.filter((s) => s !== action.payload)
    },
    resetForm() {
      return initialState
    },
  },
})

export const {
  setField,
  mergeFromAi,
  addMaterial,
  removeMaterial,
  addSample,
  removeSample,
  resetForm,
} = interactionSlice.actions

export default interactionSlice.reducer

