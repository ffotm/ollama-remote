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
        <div style={styles.emptyGlow} />
        <div style={styles.emptyIcon}>◎</div>
        <div style={styles.emptyTitle}>Your AI Workspace Is Ready</div>
        <div style={styles.emptyMode} className="mono">
          <span style={{...styles.modeBadge, borderColor: modeInfo.color, color: modeInfo.color}}>
            {modeInfo.label}
          </span>
          {model && <span style={styles.modelBadge}>{model}</span>}
        </div>
        <div style={styles.emptyHint}>Ask anything, attach context, and stream answers in real time.</div>
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
                  a({ href, children }) { return <a href={href} target="_blank" rel="noreferrer" style={{color: 'var(--accent)'}}>{children}</a> },
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
    padding: '28px clamp(14px, 3vw, 34px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
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
    textAlign: 'center',
    position: 'relative',
    animation: 'reveal-up .4s ease',
  },
  emptyGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: '50%',
    background: 'var(--accent-bg-glow)',
    filter: 'blur(1px)',
    zIndex: -1,
  },
  emptyIcon: { fontSize: '2.3rem', color: 'var(--accent)', lineHeight: 1, animation: 'pulse-ring 1.8s ease-out infinite' },
  emptyTitle: { fontFamily: 'Archivo Black, sans-serif', fontSize: '1.25rem', color: 'var(--text)', letterSpacing: '0.03em' },
  emptyMode: { display: 'flex', gap: 8, alignItems: 'center' },
  modeBadge: { border: '1px solid', borderRadius: 999, padding: '4px 10px', fontSize: '0.62rem', letterSpacing: '0.12em', background: 'var(--surface-glass-48)' },
  modelBadge: { background: 'var(--surface2)', borderRadius: 999, padding: '4px 10px', fontSize: '0.62rem', color: 'var(--text)', border: '1px solid var(--border)' },
  emptyHint: { fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', maxWidth: 460, lineHeight: 1.5 },

  msgRow: { display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 900, alignSelf: 'flex-start', width: '100%', animation: 'reveal-up .26s ease' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  aiLabel: { fontSize: '0.6rem', color: 'var(--accent)', letterSpacing: '0.12em', paddingLeft: 4, textTransform: 'uppercase' },
  userLabel: { fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.12em', paddingRight: 4, textTransform: 'uppercase' },

  userBubble: {
    background: 'linear-gradient(145deg, rgba(var(--accent-rgb), 0.14), rgba(var(--accent2-rgb), 0.08))',
    border: '1px solid var(--accent-border-mid)',
    borderRadius: '18px 18px 6px 18px',
    padding: '11px 14px',
    maxWidth: '78%',
    boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.15)',
  },
  aiBubble: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px 18px 18px 18px',
    padding: '13px 16px',
    lineHeight: 1.7,
    fontSize: '0.85rem',
    boxShadow: 'var(--shadow-soft)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
  },
  userText: { fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--chat-user-text)' },

  inlineCode: {
    background: 'var(--accent-bg-soft)',
    border: '1px solid rgba(var(--accent-rgb), 0.18)',
    padding: '1px 5px',
    borderRadius: 6,
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.8em',
    color: 'var(--accent)',
  },
  codeWrap: {
    background: 'var(--code-surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    margin: '10px 0',
  },
  codeBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    background: 'var(--surface2)',
    borderBottom: '1px solid var(--border)',
  },
  codeLang: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  copyBtn: {
    background: 'var(--surface-glass-72)',
    border: '1px solid var(--border)',
    borderRadius: 6,
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
  th: { padding: '6px 12px', background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'var(--text)' },
  td: { padding: '6px 12px', borderBottom: '1px solid var(--border)' },
  blockquote: { borderLeft: '3px solid var(--accent)', paddingLeft: 12, color: 'var(--muted)', margin: '8px 0' },

  thinking: { display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' },
  dot: {
    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
    display: 'inline-block',
    animation: 'bounce .9s infinite',
  },
}
