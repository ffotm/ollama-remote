import { useState, useRef } from 'react'

export default function InputBar({ onSend, disabled, mode }) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const textRef = useRef(null)

  const MODE_HINTS = {
    general:  'Message…',
    cve:      'Enter CVE ID or vulnerability description…',
    log:      'Ask about logs, or attach a log file with 📎…',
    codevuln: 'Paste code or attach a file to audit for vulnerabilities…',
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const results = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        results.push(data)
      } catch {
        results.push({ filename: file.name, type: 'error', content: '' })
      }
    }
    setAttachments(prev => [...prev, ...results])
    setUploading(false)
    e.target.value = ''
  }

  function removeAttach(i) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const msg = text.trim()
    if (!msg && attachments.length === 0) return
    if (disabled) return

    // Build full message: inject text file contents
    const textFiles = attachments.filter(a => a.type === 'text')
    const images = attachments.filter(a => a.type === 'image').map(a => a.content)
    let fullMsg = msg
    if (textFiles.length) {
      fullMsg += '\n\n' + textFiles.map(f => `--- FILE: ${f.filename} ---\n${f.content}\n--- END ---`).join('\n\n')
    }

    onSend({ message: fullMsg, images, displayText: msg, attachments })
    setText('')
    setAttachments([])
    textRef.current?.focus()
  }

  return (
    <div style={styles.wrap}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div style={styles.attachBar}>
          {attachments.map((a, i) => (
            <div key={i} style={styles.chip}>
              {a.type === 'image'
                ? <img src={`data:${a.mimeType};base64,${a.content}`} alt="" style={styles.chipImg} />
                : <span style={styles.chipIcon}>{a.type === 'error' ? '⚠' : '📄'}</span>
              }
              <span style={styles.chipName} className="truncate">{a.filename}</span>
              <button style={styles.chipRm} onClick={() => removeAttach(i)}>✕</button>
            </div>
          ))}
          {uploading && <div style={styles.uploadingChip} className="mono">uploading…</div>}
        </div>
      )}

      {/* Input row */}
      <div style={styles.row}>
        <input type="file" ref={fileRef} multiple style={{display:'none'}}
          accept="image/*,.pdf,.txt,.md,.log,.csv,.json,.js,.py,.ts,.html,.css,.c,.cpp,.go,.rs,.sh,.yaml,.yml"
          onChange={handleFiles}
        />
        <button style={styles.attachBtn} onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file or image">
          📎
        </button>
        <textarea
          ref={textRef}
          style={styles.textarea}
          value={text}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
          }}
          onKeyDown={handleKey}
          placeholder={MODE_HINTS[mode] || MODE_HINTS.general}
          rows={1}
          disabled={disabled}
        />
        <button style={{...styles.sendBtn, opacity: disabled ? .4 : 1}} onClick={submit} disabled={disabled}>
          {disabled ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    borderTop: '1px solid #1c2733',
    background: '#0d1117',
    padding: '10px 16px 14px',
    flexShrink: 0,
  },
  attachBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#111820',
    border: '1px solid #1c2733',
    borderRadius: 20,
    padding: '3px 8px',
    maxWidth: 180,
    fontSize: '0.68rem',
    color: '#cdd9e5',
  },
  chipImg: { width: 18, height: 18, objectFit: 'cover', borderRadius: 3 },
  chipIcon: { fontSize: '0.75rem' },
  chipName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipRm: { background: 'none', border: 'none', color: '#4d6070', cursor: 'pointer', fontSize: '0.7rem', padding: '0 2px', flexShrink: 0 },
  uploadingChip: { fontSize: '0.65rem', color: '#4d6070', alignSelf: 'center' },
  row: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  attachBtn: {
    background: '#111820',
    border: '1px solid #1c2733',
    borderRadius: 8,
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all .15s',
    flexShrink: 0,
    lineHeight: 1,
  },
  textarea: {
    flex: 1,
    background: '#080b0f',
    border: '1px solid #1c2733',
    borderRadius: 10,
    padding: '10px 14px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.83rem',
    color: '#cdd9e5',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.55,
    maxHeight: 180,
    transition: 'border-color .2s',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #00d4aa, #0097ff)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    color: '#fff',
    fontFamily: 'Archivo Black, sans-serif',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'opacity .2s',
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
}
