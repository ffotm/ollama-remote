'use client'

import { useState, useEffect } from 'react'

const COLOR_PALETTES = [
  {
    id: 1,
    name: 'Ocean Dream',
    colors: ['#0A2463', '#247BA0', '#B2DBBF', '#FF3C38', '#FFD700'],
  },
  {
    id: 2,
    name: 'Sunset',
    colors: ['#FF6B6B', '#FFA07A', '#FFD700', '#FF8C00', '#DC143C'],
  },
  {
    id: 3,
    name: 'Forest',
    colors: ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D'],
  },
  {
    id: 4,
    name: 'Midnight',
    colors: ['#0F0E14', '#2A2734', '#454158', '#6C5B7B', '#8B7BA8'],
  },
  {
    id: 5,
    name: 'Pastel',
    colors: ['#FFB3BA', '#FFCCCB', '#FFFFBA', '#BAE1FF', '#E0BBE4'],
  },
  {
    id: 6,
    name: 'Cyberpunk',
    colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'],
  },
  {
    id: 7,
    name: 'Nature',
    colors: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  },
  {
    id: 8,
    name: 'Monochrome',
    colors: ['#1A1A1A', '#404040', '#808080', '#C0C0C0', '#FFFFFF'],
  },
  {
    id: 9,
    name: 'Tropical',
    colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#06FFA5'],
  },
  {
    id: 10,
    name: 'Deep Purple',
    colors: ['#2D1B69', '#5B2C6F', '#AB63FA', '#C77DFF', '#E0AAFF'],
  },
  {
    id: 11,
    name: 'Cherry Blossom',
    colors: ['#D81159', '#FF006E', '#FFBE0B', '#FB5607', '#8338EC'],
  },
  {
    id: 12,
    name: 'Northern Lights',
    colors: ['#00A4CC', '#0E7C86', '#190482', '#491D8D', '#11698E'],
  },
  {
    id: 13,
    name: 'Warm Peachy',
    colors: ['#FF6B35', '#F7931E', '#FDB833', '#F8A500', '#FCB900'],
  },
  {
    id: 14,
    name: 'Cool Blues',
    colors: ['#0066CC', '#3399FF', '#00D4FF', '#00FFFF', '#66FFFF'],
  },
  {
    id: 15,
    name: 'Autumn',
    colors: ['#8B4513', '#CD853F', '#DAA520', '#FF8C00', '#FF6347'],
  },
  {
    id: 16,
    name: 'Neon Pink',
    colors: ['#FF10F0', '#FF006E', '#FB5607', '#FFBE0B', '#FF006E'],
  },
]

export default function ColorPalette({ onColorSelect }) {
  const [selectedPalette, setSelectedPalette] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [copied, setCopied] = useState(false)
  const [customColors, setCustomColors] = useState([])

  const currentPalette = COLOR_PALETTES[selectedPalette]
  const allColors = [...currentPalette.colors, ...customColors]

  function handleColorClick(color) {
    setSelectedColor(color)
    onColorSelect?.(color)
  }

  function copyToClipboard(color) {
    navigator.clipboard.writeText(color)
    setCopied(color)
    setTimeout(() => setCopied(null), 1500)
  }

  function addCustomColor() {
    const newColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase()}`
    setCustomColors([...customColors, newColor])
    handleColorClick(newColor)
  }

  function handleSelectColor(color) {
    handleColorClick(color)
    applyTheme(color)
  }

  function applyTheme(color) {
    const root = document.documentElement

    // Convert hex to RGB for rgba calculations
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 }
    }

    // Lighten/darken helper
    const adjustBrightness = (hex, percent) => {
      let num = parseInt(hex.slice(1), 16)
      let r = Math.max(0, Math.min(255, (num >> 16) + percent))
      let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent))
      let b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent))
      return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    }

    // Apply all theme variables at once
    const light50 = adjustBrightness(color, 90)
    const light30 = adjustBrightness(color, 50)
    const light10 = adjustBrightness(color, 20)
    const dark10 = adjustBrightness(color, -15)
    const dark20 = adjustBrightness(color, -25)
    const dark30 = adjustBrightness(color, -35)
    const dark40 = adjustBrightness(color, -50)
    const dark50 = adjustBrightness(color, -70)

    // Primary colors
    root.style.setProperty('--accent', color)
    root.style.setProperty('--danger', color)
    root.style.setProperty('--accent2', dark20)
    root.style.setProperty('--warn', dark10)
    root.style.setProperty('--green', dark30)

    // Border colors
    root.style.setProperty('--border', dark40)
    root.style.setProperty('--border2', dark30)

    // Muted/secondary colors
    root.style.setProperty('--muted', dark10)
    root.style.setProperty('--muted2', dark20)

    // Background colors - scaled from the base color
    root.style.setProperty('--bg', light50)
    root.style.setProperty('--surface', light30)
    root.style.setProperty('--surface2', light10)
    root.style.setProperty('--bg-main', light50)

    // Store selection
    localStorage.setItem('selectedThemeColor', color)
  }

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedThemeColor')
    if (saved) {
      applyTheme(saved)
      setSelectedColor(saved)
    }
  }, [])

  return (
    <div style={styles.container}>
      {/* Palettes Grid */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>PALETTES</div>
        <div style={styles.paletteGrid}>
          {COLOR_PALETTES.map((palette, idx) => (
            <button
              key={palette.id}
              style={{
                ...styles.paletteItem,
                ...(selectedPalette === idx ? styles.paletteItemActive : {}),
              }}
              onClick={() => {
                setSelectedPalette(idx)
                // Auto-select first color in new palette
                handleSelectColor(palette.colors[0])
              }}
              title={palette.name}
            >
              {palette.colors.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.palettePreview,
                    backgroundColor: color,
                  }}
                />
              ))}
            </button>
          ))}
        </div>
      </div>

      {/* Current Palette */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>{currentPalette.name.toUpperCase()}</div>
        <div style={styles.colorGrid}>
          {allColors.map((color, idx) => (
            <div
              key={idx}
              style={{
                ...styles.colorCard,
                ...(selectedColor === color ? styles.colorCardActive : {}),
              }}
              onClick={() => handleSelectColor(color)}
              title="Click to select"
            >
              <div
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: color,
                  boxShadow: selectedColor === color ? `0 0 0 2px var(--accent)` : 'none',
                }}
              />
              <div
                style={{
                  ...styles.colorLabel,
                  fontSize: '0.65rem',
                }}
              >
                {color}
              </div>
              <button
                style={styles.copyBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(color)
                }}
                title="Copy to clipboard"
              >
                {copied === color ? '✓' : '⧉'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Color Adder */}
      <div style={styles.section}>
        <button
          style={styles.addBtn}
          onClick={addCustomColor}
        >
          + Add Random Color
        </button>
      </div>

      {/* Selected Color Display */}
      {selectedColor && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>SELECTED</div>
          <div style={styles.selectedColorContainer}>
            <div
              style={{
                ...styles.selectedColorSwatch,
                backgroundColor: selectedColor,
              }}
            />
            <div style={styles.selectedColorInfo}>
              <div style={styles.selectedColorValue}>{selectedColor}</div>
              <button
                style={styles.copyBtnLarge}
                onClick={() => copyToClipboard(selectedColor)}
              >
                {copied === selectedColor ? 'Copied!' : 'Copy Value'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.58rem',
    letterSpacing: '0.15em',
    color: 'var(--muted)',
    marginBottom: 4,
  },
  // Palettes
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
  },
  paletteItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gap: 2,
    padding: 4,
    background: 'var(--bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all .2s',
    height: 60,
    overflow: 'hidden',
  },
  paletteItemActive: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px rgba(var(--accent-rgb), 0.3)',
  },
  palettePreview: {
    borderRadius: 3,
    transition: 'transform .2s',
  },
  // Colors
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 6,
  },
  colorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    background: 'var(--bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all .2s',
  },
  colorCardActive: {
    background: 'var(--surface2)',
  },
  colorSwatch: {
    width: '100%',
    height: 50,
    borderRadius: 6,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    transition: 'box-shadow .2s',
    cursor: 'pointer',
  },
  colorLabel: {
    fontFamily: 'IBM Plex Mono, monospace',
    color: 'var(--text)',
    textAlign: 'center',
  },
  copyBtn: {
    background: 'var(--surface)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 4,
    padding: '3px 8px',
    color: 'var(--muted)',
    fontSize: '0.6rem',
    cursor: 'pointer',
    transition: 'all .2s',
    width: '100%',
  },
  // Selected
  selectedColorContainer: {
    display: 'flex',
    gap: 10,
    padding: 12,
    background: 'var(--bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--accent)',
    borderRadius: 6,
  },
  selectedColorSwatch: {
    width: 80,
    height: 80,
    borderRadius: 6,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    flexShrink: 0,
  },
  selectedColorInfo: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  selectedColorValue: {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.9rem',
    color: 'var(--text)',
    fontWeight: 'bold',
  },
  copyBtnLarge: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    color: 'white',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    transition: 'all .2s',
    fontWeight: 'bold',
  },
  // Add button
  addBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'white',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.7rem',
    cursor: 'pointer',
    transition: 'all .2s',
    fontWeight: 'bold',
  },
}
