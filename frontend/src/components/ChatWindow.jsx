import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

const MODE_LABELS = {
  general:  { label: 'General',       color: 'var(--accent)' },
  cve:      { label: 'CVE Explainer', color: 'var(--danger)' },
  log:      { label: 'Log Analyzer',  color: 'var(--accent2)' },
  codevuln: { label: 'Code Auditor',  color: 'var(--warn)' },
}

function CopyBtn({ text }) {
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {})
  }
  return (
    <button onClick={copy} style={styles.copyBtn} title="Copy">
      ⎘
    </button>
  )
}

function CodeBlock({ children, className }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div style={styles.codeWrap}>
      <div style={styles.codeBar}>
        <span style={styles.codeLang}>{className?.replace('language-', '') || 'code'}</span>
        <CopyBtn text={code} />
      </div>
      <pre style={styles.pre}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

export default function ChatWindow({ messages, streaming, mode, model }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const modeInfo = MODE_LABELS[mode] || MODE_LABELS.general

  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>◈</div>
        <div style={styles.emptyTitle}>Ready</div>
        <div style={styles.emptyMode} className="mono">
          <span style={{...styles.modeBadge, borderColor: modeInfo.color, color: modeInfo.color}}>
            {modeInfo.label}
          </span>
          {model && <span style={styles.modelBadge}>{model}</span>}
        </div>
        <div style={styles.emptyHint}>Start typing below, or attach a file with 📎</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {messages.map((msg, i) => (
        <div key={msg.id || i} style={{...styles.msgRow, ...(msg.role === 'user' ? styles.userRow : {})}}>
          <div style={msg.role === 'user' ? styles.userLabel : styles.aiLabel} className="mono">
            {msg.role === 'user' ? 'you' : `${model || 'assistant'}`}
          </div>
          <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
            {msg.role === 'user' ? (
              <span style={styles.userText}>{msg.content}</span>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    if (inline) return <code style={styles.inlineCode} className={className} {...props}>{children}</code>
                    return <CodeBlock className={className}>{children}</CodeBlock>
                  },
                  pre({ children }) { return <>{children}</> },
                  table({ children }) { return <div style={styles.tableWrap}><table style={styles.table}>{children}</table></div> },
                  th({ children }) { return <th style={styles.th}>{children}</th> },
                  td({ children }) { return <td style={styles.td}>{children}</td> },
                  blockquote({ children }) { return <blockquote style={styles.blockquote}>{children}</blockquote> },
                  strong({ children }) { return <strong style={{color: 'var(--text)'}}>{children}</strong> },
                  a({ href, children }) { return <a href={href} target="_blank" rel="noreferrer" style={{color: 'var(--accent2)'}}>{children}</a> },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      ))}

      {streaming && (
        <div style={styles.msgRow}>
          <div style={styles.aiLabel} className="mono">{model || 'assistant'}</div>
          <div style={styles.aiBubble}>
            <div style={styles.thinking}>
              <span style={styles.dot} />
              <span style={{...styles.dot, animationDelay: '.2s'}} />
              <span style={{...styles.dot, animationDelay: '.4s'}} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); opacity: .3; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 28px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: 'var(--muted)',
    userSelect: 'none',
  },
  emptyIcon: { fontSize: '2.2rem', color: 'var(--accent2)' },
  emptyTitle: { fontFamily: 'Archivo Black, sans-serif', fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '0.03em' },
  emptyMode: { display: 'flex', gap: 8, alignItems: 'center' },
  modeBadge: { border: '1px solid', borderRadius: 4, padding: '2px 8px', fontSize: '0.65rem', letterSpacing: '0.1em' },
  modelBadge: { background: 'var(--surface2)', borderRadius: 4, padding: '2px 8px', fontSize: '0.65rem', color: 'var(--text)' },
  emptyHint: { fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' },

  msgRow: { display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 'min(860px, 90%)', alignSelf: 'flex-start', width: 'fit-content' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  aiLabel: { fontSize: '0.6rem', color: 'var(--accent2)', letterSpacing: '0.12em', paddingLeft: 2, textTransform: 'uppercase' },
  userLabel: { fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.12em', paddingRight: 2, textTransform: 'uppercase' },

  userBubble: {
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    border: '1px solid rgba(147, 197, 253, 0.45)',
    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
    borderRadius: '16px 16px 6px 16px',
    padding: '10px 14px',
    maxWidth: 'min(720px, 85vw)',
  },
  aiBubble: {
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    boxShadow: '0 12px 24px rgba(2, 6, 23, 0.25)',
    borderRadius: '6px 16px 16px 16px',
    padding: '12px 16px',
    lineHeight: 1.7,
    fontSize: '0.85rem',
    maxWidth: 'min(720px, 85vw)',
  },
  userText: { fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#eff6ff' },

  inlineCode: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '1px 5px',
    borderRadius: 4,
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.8em',
    color: 'var(--accent)',
  },
  codeWrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    margin: '10px 0',
  },
  codeBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 12px',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
  },
  codeLang: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  copyBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '2px 6px',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    transition: 'all .15s',
  },
  pre: {
    padding: '14px',
    overflowX: 'auto',
    fontSize: '0.8rem',
    lineHeight: 1.6,
    margin: 0,
    fontFamily: 'IBM Plex Mono, monospace',
  },
  tableWrap: { overflowX: 'auto', margin: '10px 0' },
  table: { borderCollapse: 'collapse', fontSize: '0.8rem', width: '100%' },
  th: { padding: '6px 12px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'var(--text)' },
  td: { padding: '6px 12px', borderBottom: '1px solid var(--border)' },
  blockquote: { borderLeft: '3px solid var(--accent)', paddingLeft: 12, color: 'var(--muted)', margin: '8px 0' },

  thinking: { display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' },
  dot: {
    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
    display: 'inline-block',
    animation: 'bounce .9s infinite',
  },
}
