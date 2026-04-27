const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-flash-latest']
const REQUEST_TIMEOUT_MS = 25000
const MAX_ATTEMPTS_PER_MODEL = 1

const isRetryableError = (message) =>
  message.includes('Timeout') ||
  message.includes('NetworkError') ||
  message.includes('Failed to fetch')

const callGemini = async (apiKey, model, prompt) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, topP: 0.1, topK: 1 },
        }),
        signal: controller.signal,
      },
    )

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = payload?.error?.message || payload?.error?.status || `HTTP ${response.status}`
      const err = new Error(msg)
      err.status = response.status
      throw err
    }

    const candidate = payload?.candidates?.[0]
    const parts = candidate?.content?.parts
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('').trim()
      : ''

    if (!text) {
      const finishReason = candidate?.finishReason || 'UNKNOWN'
      const blockReason = payload?.promptFeedback?.blockReason || 'NONE'
      throw new Error(`Empty narrative response (finishReason=${finishReason}, blockReason=${blockReason})`)
    }

    return { text, model }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Timeout')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing VITE_GEMINI_API_KEY on server' })
  }

  const prompt = req.body?.prompt
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' })
  }

  let lastError = null
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      try {
        const result = await callGemini(apiKey, model, prompt)
        return res.status(200).json(result)
      } catch (error) {
        lastError = error
        const message = error?.message || String(error)
        if (!isRetryableError(message) || attempt === MAX_ATTEMPTS_PER_MODEL) break
      }
    }
  }

  return res.status(lastError?.status || 502).json({
    error: lastError?.message || 'Narrative generation failed',
  })
}
