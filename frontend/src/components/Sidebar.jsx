import { useState } from 'react'

const MODES = [
  { id: 'general',   icon: '◈', label: 'General',       color: 'var(--accent)' },
  { id: 'cve',       icon: '⚠', label: 'CVE Explainer', color: 'var(--danger)' },
  { id: 'log',       icon: '📋', label: 'Log Analyzer',  color: 'var(--accent2)' },
  { id: 'codevuln',  icon: '🔍', label: 'Code Auditor',  color: 'var(--warn)' },
]

export default function Sidebar({
  conversations, activeId, onSelect, onNew, onDelete, onRename,
  mode, onModeChange, model, models, onModelChange, endpoint, onEndpointChange, onRefreshModels, status
}) {
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal]     = useState('')

  function startEdit(e, conv) {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditVal(conv.title)
  }

  function commitEdit(id) {
    if (editVal.trim()) onRename(id, editVal.trim())
    setEditingId(null)
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>◈</span>
        <span style={styles.logoText}>OLLAMA UI</span>
      </div>

      {/* Endpoint */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>ENDPOINT</div>
        <div style={styles.endpointRow}>
          <div style={{...styles.statusDot, background: status === 'online' ? 'var(--accent)' : status === 'error' ? 'var(--danger)' : 'var(--muted)', boxShadow: status === 'online' ? '0 0 6px var(--accent)' : status === 'error' ? '0 0 6px var(--danger)' : 'none'}} />
          <input
            style={styles.endpointInput}
            value={endpoint}
            onChange={e => onEndpointChange(e.target.value)}
            placeholder="http://localhost:11434"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Model */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>MODEL</div>
        <div style={styles.modelRow}>
          <select style={styles.modelSelect} value={model} onChange={e => onModelChange(e.target.value)}>
            {models.length === 0
              ? <option value="">— no models —</option>
              : models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)
            }
          </select>
          <button style={styles.refreshBtn} onClick={onRefreshModels} title="Refresh models">⟳</button>
        </div>
      </div>

      {/* Mode */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>MODE</div>
        <div style={styles.modeGrid}>
          {MODES.map(m => (
            <button
              key={m.id}
              style={{...styles.modeBtn, ...(mode === m.id ? {...styles.modeBtnActive, borderColor: m.color, color: m.color} : {})}}
              onClick={() => onModeChange(m.id)}
            >
              <span>{m.icon}</span>
              <span style={{fontSize: '0.65rem', marginTop: 2}}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chats */}
      <div style={styles.section}>
        <div style={styles.chatHeader}>
          <div style={styles.sectionLabel}>CHATS</div>
          <button style={styles.newBtn} onClick={onNew}>+ New</button>
        </div>
        <div style={styles.chatList}>
          {conversations.length === 0 && (
            <div style={{color: 'var(--muted)', fontSize: '0.72rem', padding: '8px 0', fontFamily: 'IBM Plex Mono, monospace'}}>no conversations yet</div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              style={{...styles.chatItem, ...(activeId === conv.id ? styles.chatItemActive : {})}}
              onClick={() => onSelect(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  style={styles.editInput}
                  value={editVal}
                  autoFocus
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={() => commitEdit(conv.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={styles.chatTitle} className="truncate">{conv.title}</span>
                  <div style={styles.chatActions}>
                    <span style={styles.actionBtn} onClick={e => startEdit(e, conv)} title="Rename">✎</span>
                    <span style={styles.actionBtn} onClick={e => { e.stopPropagation(); onDelete(conv.id); }} title="Delete">✕</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100%',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    gap: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid var(--border)',
  },
  logoIcon: { color: 'var(--accent)', fontSize: '1.1rem' },
  logoText: {
    fontFamily: 'Archivo Black, sans-serif',
    fontSize: '0.85rem',
    letterSpacing: '0.12em',
    color: 'var(--text)',
  },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.58rem',
    letterSpacing: '0.15em',
    color: 'var(--muted)',
    marginBottom: 7,
  },
  endpointRow: { display: 'flex', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, transition: 'all .3s' },
  endpointInput: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 8px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    color: 'var(--text)',
    outline: 'none',
    width: 0,
  },
  modelRow: { display: 'flex', gap: 6 },
  modelSelect: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 8px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
    width: 0,
  },
  refreshBtn: {
    background: 'var(--surface2)',
    border: 'none',
    borderRadius: 6,
    padding: '5px 8px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all .2s',
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  modeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 6px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all .18s',
    fontFamily: 'IBM Plex Mono, monospace',
  },
  modeBtnActive: {
    background: 'var(--surface)',
  },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  newBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border2)',
    borderRadius: 5,
    padding: '3px 8px',
    color: 'var(--text)',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    transition: 'all .18s',
  },
  chatList: { display: 'flex', flexDirection: 'column', gap: 2 },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background .15s',
    gap: 6,
  },
  chatItemActive: { background: 'var(--surface2)', border: '1px solid var(--border)' },
  chatTitle: { fontSize: '0.72rem', color: 'var(--text)', flex: 1 },
  chatActions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: { color: 'var(--muted)', fontSize: '0.72rem', cursor: 'pointer', padding: '0 2px' },
  editInput: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--accent)',
    borderRadius: 4,
    padding: '3px 6px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.7rem',
    color: 'var(--text)',
    outline: 'none',
    width: 0,
  },
}
