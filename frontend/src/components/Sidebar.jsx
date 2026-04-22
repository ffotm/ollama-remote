import { useState } from 'react'

const MODES = [
  { id: 'general',   icon: '◈', label: 'General',       color: '#00d4aa' },
  { id: 'cve',       icon: '⚠', label: 'CVE Explainer', color: '#ff4d6d' },
  { id: 'log',       icon: '📋', label: 'Log Analyzer',  color: '#ffb347' },
  { id: 'codevuln',  icon: '🔍', label: 'Code Auditor',  color: '#0097ff' },
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
          <div style={{...styles.statusDot, background: status === 'online' ? '#39d353' : status === 'error' ? '#ff4d6d' : '#4d6070', boxShadow: status === 'online' ? '0 0 6px #39d353' : status === 'error' ? '0 0 6px #ff4d6d' : 'none'}} />
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
            <div style={{color: '#4d6070', fontSize: '0.72rem', padding: '8px 0', fontFamily: 'IBM Plex Mono, monospace'}}>no conversations yet</div>
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
    background: '#0d1117',
    borderRight: '1px solid #1c2733',
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
    borderBottom: '1px solid #1c2733',
  },
  logoIcon: { color: '#00d4aa', fontSize: '1.1rem' },
  logoText: {
    fontFamily: 'Archivo Black, sans-serif',
    fontSize: '0.85rem',
    letterSpacing: '0.12em',
    color: '#cdd9e5',
  },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.58rem',
    letterSpacing: '0.15em',
    color: '#4d6070',
    marginBottom: 7,
  },
  endpointRow: { display: 'flex', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, transition: 'all .3s' },
  endpointInput: {
    flex: 1,
    background: '#080b0f',
    border: '1px solid #1c2733',
    borderRadius: 6,
    padding: '5px 8px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    color: '#cdd9e5',
    outline: 'none',
    width: 0,
  },
  modelRow: { display: 'flex', gap: 6 },
  modelSelect: {
    flex: 1,
    background: '#080b0f',
    border: '1px solid #1c2733',
    borderRadius: 6,
    padding: '5px 8px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    color: '#cdd9e5',
    outline: 'none',
    cursor: 'pointer',
    width: 0,
  },
  refreshBtn: {
    background: '#1c2733',
    border: 'none',
    borderRadius: 6,
    padding: '5px 8px',
    color: '#768fa0',
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
    background: '#080b0f',
    border: '1px solid #1c2733',
    borderRadius: 6,
    color: '#4d6070',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all .18s',
    fontFamily: 'IBM Plex Mono, monospace',
  },
  modeBtnActive: {
    background: '#0d1117',
  },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  newBtn: {
    background: '#00d4aa22',
    border: '1px solid #00d4aa44',
    borderRadius: 5,
    padding: '3px 8px',
    color: '#00d4aa',
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
  chatItemActive: { background: '#111820', border: '1px solid #1c2733' },
  chatTitle: { fontSize: '0.72rem', color: '#cdd9e5', flex: 1 },
  chatActions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: { color: '#4d6070', fontSize: '0.72rem', cursor: 'pointer', padding: '0 2px' },
  editInput: {
    flex: 1,
    background: '#080b0f',
    border: '1px solid #00d4aa',
    borderRadius: 4,
    padding: '3px 6px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.7rem',
    color: '#cdd9e5',
    outline: 'none',
    width: 0,
  },
}
