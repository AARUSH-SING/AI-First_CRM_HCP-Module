import React, { useMemo, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { Search, Send, Summarize } from '@mui/icons-material'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import { aiLogInteraction } from './api/ai'
import {
  addMaterial,
  addSample,
  mergeFromAi,
  removeMaterial,
  removeSample,
  type InteractionFormState,
  type InteractionType,
  resetForm,
  setField,
  type Sentiment,
} from './store/interactionSlice'
import { useAppDispatch, useAppSelector } from './store/hooks'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.75 }}>
      {children}
    </Typography>
  )
}

export default function App() {
  const dispatch = useAppDispatch()
  const form = useAppSelector((s) => s.interaction)

  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<
    { role: 'assistant' | 'user'; text: string }[]
  >([
    {
      role: 'assistant',
      text:
        'Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.',
    },
  ])
  const [isLogging, setIsLogging] = useState(false)
  const [lastSummary, setLastSummary] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const sentimentOptions = useMemo(
    () =>
      [
        { key: 'positive' as const, label: 'Positive', icon: <SentimentSatisfiedAltIcon /> },
        { key: 'neutral' as const, label: 'Neutral', icon: <SentimentNeutralIcon /> },
        { key: 'negative' as const, label: 'Negative', icon: <SentimentDissatisfiedIcon /> },
      ] as const,
    [],
  )

  const onSet =
    <K extends keyof InteractionFormState>(key: K) =>
    (value: InteractionFormState[K]) =>
      dispatch(setField({ key, value }))

  async function onChatLog() {
    const message = chatInput.trim()
    if (!message || isLogging) return

    setLastError(null)
    setLastSummary(null)
    setIsLogging(true)
    setChatInput('')
    setChatHistory((h) => [...h, { role: 'user', text: message }])

    try {
      const res = await aiLogInteraction({ message, currentForm: form })
      dispatch(mergeFromAi({ ...res.extracted, aiSuggestedFollowUps: res.suggestedFollowUps }))
      setLastSummary(res.summary)
      setChatHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text:
            res.summary ||
            'Captured. I updated the form fields I could infer from your message.',
        },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to log via AI.'
      setLastError(msg)
      setChatHistory((h) => [
        ...h,
        { role: 'assistant', text: 'I hit an error logging that. Please try again.' },
      ])
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: 'rgba(255,255,255,0.85)', color: 'text.primary', backdropFilter: 'blur(8px)' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              Log HCP Interaction
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI-first field rep workflow (structured or conversational)
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={() => dispatch(resetForm())}>
            Reset
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 3, flex: 1, display: 'flex' }} maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            gap: 2.5,
            flex: 1,
            alignItems: 'flex-start',
            '@media (max-width: 1100px)': { flexDirection: 'column' },
          }}
        >
          {/* Left: structured form */}
          <Paper
            elevation={0}
            sx={{
              flex: '1 1 70%',
              minWidth: 0,
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Structured Interaction Form
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 2 }}>
                <Box>
                  <FieldLabel>HCP Name</FieldLabel>
                  <TextField
                    fullWidth
                    value={form.hcpName}
                    onChange={(e) => onSet('hcpName')(e.target.value)}
                    placeholder="Search or select HCP..."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                <Box>
                  <FieldLabel>Interaction Type</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    value={form.interactionType}
                    onChange={(e) => onSet('interactionType')(e.target.value as InteractionType)}
                  >
                    {(['Meeting', 'Call', 'Email', 'Virtual'] as InteractionType[]).map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <FieldLabel>Date</FieldLabel>
                  <TextField
                    type="date"
                    fullWidth
                    value={form.date}
                    onChange={(e) => onSet('date')(e.target.value)}
                  />
                </Box>
                <Box>
                  <FieldLabel>Time</FieldLabel>
                  <TextField
                    type="time"
                    fullWidth
                    value={form.time}
                    onChange={(e) => onSet('time')(e.target.value)}
                  />
                </Box>
                <Box>
                  <FieldLabel>Attendees</FieldLabel>
                  <TextField
                    fullWidth
                    value={form.attendees}
                    onChange={(e) => onSet('attendees')(e.target.value)}
                    placeholder="Enter names or search..."
                  />
                </Box>
              </Box>

              <Box>
                <FieldLabel>Topics Discussed</FieldLabel>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={form.topicsDiscussed}
                  onChange={(e) => onSet('topicsDiscussed')(e.target.value)}
                  placeholder="Capture key scientific exchange points, objections, questions, and decision drivers..."
                />
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="text"
                    startIcon={<Summarize />}
                    onClick={() =>
                      setChatHistory((h) => [
                        ...h,
                        {
                          role: 'assistant',
                          text:
                            'Voice note summarization is mocked in this UI. In production, this would require explicit consent capture and an audio → text → LLM pipeline.',
                        },
                      ])
                    }
                  >
                    Summarize from Voice Note (Requires Consent)
                  </Button>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Materials Shared
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const label = window.prompt('Add material (e.g., Product X brochure)')
                        if (label) dispatch(addMaterial(label))
                      }}
                    >
                      Search/Add
                    </Button>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {form.materialsShared.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        None yet
                      </Typography>
                    ) : (
                      form.materialsShared.map((m) => (
                        <Chip key={m} label={m} onDelete={() => dispatch(removeMaterial(m))} />
                      ))
                    )}
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Samples Distributed
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const label = window.prompt('Add sample (e.g., Product X 10mg starter pack)')
                        if (label) dispatch(addSample(label))
                      }}
                    >
                      Add Sample
                    </Button>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {form.samplesDistributed.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        None yet
                      </Typography>
                    ) : (
                      form.samplesDistributed.map((s) => (
                        <Chip key={s} label={s} onDelete={() => dispatch(removeSample(s))} />
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl>
                  <FormLabel sx={{ mb: 1, fontWeight: 700 }}>
                    Observed/Inferred HCP Sentiment
                  </FormLabel>
                  <RadioGroup
                    row
                    value={form.sentiment}
                    onChange={(e) => onSet('sentiment')(e.target.value as Sentiment)}
                  >
                    {sentimentOptions.map((o) => (
                      <FormControlLabel
                        key={o.key}
                        value={o.key}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {o.icon}
                            <span>{o.label}</span>
                          </Box>
                        }
                      />
                    ))}
                  </RadioGroup>
                </FormControl>

                <Box>
                  <FieldLabel>Outcomes</FieldLabel>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    value={form.outcomes}
                    onChange={(e) => onSet('outcomes')(e.target.value)}
                    placeholder="E.g., HCP agreed to trial Product X in eligible patients; asked for safety data slide..."
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <FieldLabel>Follow-up Actions</FieldLabel>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    value={form.followUpActions}
                    onChange={(e) => onSet('followUpActions')(e.target.value)}
                    placeholder="Rep-entered follow-ups..."
                  />
                </Box>

                <Box>
                  <FieldLabel>AI Suggested Follow-ups</FieldLabel>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.25, bgcolor: 'rgba(24, 128, 255, 0.04)' }}
                  >
                    <List dense disablePadding>
                      {form.aiSuggestedFollowUps.map((s) => (
                        <ListItem key={s} sx={{ py: 0.25 }}>
                          <ListItemText
                            primary={<Typography variant="body2">{s}</Typography>}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  {lastSummary ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Last AI summary: {lastSummary}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            </Stack>
          </Paper>

          {/* Right: sticky chat */}
          <Paper
            elevation={0}
            sx={{
              flex: '0 0 30%',
              width: { xs: '100%', md: '30%' },
              minWidth: 320,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              position: 'sticky',
              top: 88,
              alignSelf: 'flex-start',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              AI Assistant: Log interaction via chat
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Uses Groq (default: llama-3.3-70b-versatile; set GROQ_MODEL) via LangGraph to extract
              structured fields.
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Box
              sx={{
                height: 360,
                overflow: 'auto',
                pr: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {chatHistory.map((m, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    bgcolor: m.role === 'user' ? 'rgba(0,0,0,0.02)' : 'rgba(24, 128, 255, 0.05)',
                    borderColor: m.role === 'user' ? 'divider' : 'rgba(24, 128, 255, 0.25)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {m.role === 'user' ? 'You' : 'AI'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {lastError ? (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {lastError}
              </Typography>
            ) : null}

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void onChatLog()
                  }
                }}
                placeholder="Describe interaction..."
              />
              <IconButton
                color="primary"
                onClick={() => void onChatLog()}
                disabled={isLogging || !chatInput.trim()}
              >
                <Send />
              </IconButton>
            </Box>

            <Button
              sx={{ mt: 1 }}
              fullWidth
              variant="contained"
              onClick={() => void onChatLog()}
              disabled={isLogging || !chatInput.trim()}
            >
              {isLogging ? 'Logging…' : 'Log'}
            </Button>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

