'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import InputBar from './components/InputBar.jsx'

export default function App() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [streaming, setStreaming]         = useState(false)
  const [models, setModels]               = useState([])
  const [model, setModel]                 = useState('')
  const [mode, setMode]                   = useState('general')
  const [endpoint, setEndpoint]           = useState('http://localhost:11434')
  const [status, setStatus]               = useState('idle')

  // ── LOAD CONVOS ──────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations')
    const data = await res.json()
    setConversations(data)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── LOAD MODELS ──────────────────────────────────────
  const loadModels = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch(`/api/models`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = data.models || []
      setModels(list)
      if (list.length && !model) setModel(list[0].name)
      setStatus('online')
    } catch {
      setStatus('error')
      setModels([])
    }
  }, [model])

  useEffect(() => { loadModels() }, [])

  // ── SELECT CONVERSATION ──────────────────────────────
  async function selectConversation(id) {
    setActiveId(id)
    const res = await fetch(`/api/conversations/${id}/messages`)
    const data = await res.json()
    setMessages(data)
  }

  // ── NEW CONVERSATION ─────────────────────────────────
  async function newConversation() {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' }),
    })
    const data = await res.json()
    await loadConversations()
    await selectConversation(data.id)
  }

  // ── DELETE ───────────────────────────────────────────
  async function deleteConversation(id) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    await loadConversations()
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  // ── RENAME ───────────────────────────────────────────
  async function renameConversation(id, title) {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    await loadConversations()
  }

  // ── SEND ─────────────────────────────────────────────
  async function handleSend({ message, images }) {
    if (!model) { alert('Select a model first'); return }
    if (!activeId) { await newConversation(); return }

    // Optimistically append user message
    const userMsg = { id: Date.now(), role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)

    // Streaming assistant message
    const aiMsg = { id: Date.now() + 1, role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeId,
          model,
          message,
          images: images?.length ? images : undefined,
          mode,
          ollama_base: endpoint,
        }),
      })

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const json = JSON.parse(payload)
            if (json.error) {
              setMessages(prev => prev.map(m => m.id === aiMsg.id
                ? { ...m, content: `⚠ Error: ${json.error}` } : m))
              break
            }
            if (json.token) {
              setMessages(prev => prev.map(m => m.id === aiMsg.id
                ? { ...m, content: m.content + json.token } : m))
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aiMsg.id
        ? { ...m, content: `⚠ Request failed: ${err.message}` } : m))
    }

    setStreaming(false)
    loadConversations() // refresh titles
  }

  // ── AUTO-CREATE CONVERSATION ON FIRST SEND ───────────
  async function handleSendWithAutoCreate(payload) {
    if (!activeId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      })
      const data = await res.json()
      await loadConversations()
      setActiveId(data.id)
      setMessages([])
      // slight delay to let state settle
      await new Promise(r => setTimeout(r, 50))
      await handleSendWithId(data.id, payload)
    } else {
      await handleSend(payload)
    }
  }

  async function handleSendWithId(id, { message, images }) {
    if (!model) { alert('Select a model first'); return }

    const userMsg = { id: Date.now(), role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)

    const aiMsg = { id: Date.now() + 1, role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: id,
          model,
          message,
          images: images?.length ? images : undefined,
          mode,
          ollama_base: endpoint,
        }),
      })

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const json = JSON.parse(payload)
            if (json.token) {
              setMessages(prev => prev.map(m => m.id === aiMsg.id
                ? { ...m, content: m.content + json.token } : m))
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aiMsg.id
        ? { ...m, content: `⚠ Request failed: ${err.message}` } : m))
    }

    setStreaming(false)
    loadConversations()
  }

  return (
    <div style={styles.app}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        mode={mode}
        onModeChange={setMode}
        model={model}
        models={models}
        onModelChange={setModel}
        endpoint={endpoint}
        onEndpointChange={setEndpoint}
        onRefreshModels={loadModels}
        status={status}
      />
      <div style={styles.main}>
        <ChatWindow messages={messages} streaming={streaming} mode={mode} model={model} />
        <InputBar onSend={handleSendWithAutoCreate} disabled={streaming} mode={mode} />
      </div>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
}
