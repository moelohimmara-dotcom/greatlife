import React, { useState } from 'react'

interface SelectProps {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false)
  const items: { value: string; label: string }[] = []

  React.Children.forEach(children, (child, i) => {
    if (i === 1 && React.isValidElement(child)) {
      React.Children.forEach((child.props as any).children, (item) => {
        if (React.isValidElement(item) && (item.props as any).value) {
          items.push({ value: (item.props as any).value, label: (item.props as any).children })
        }
      })
    }
  })

  const current = items.find(i => i.value === value)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', cursor: 'pointer', background: 'inherit',
          border: 'inherit', borderRadius: 'inherit', padding: 'inherit',
          fontSize: 'inherit', fontFamily: 'inherit',
        }}
      >
        <span>{current?.label || 'Choisir...'}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)', padding: 4, overflow: 'hidden',
            }}
          >
            {items.map(item => (
              <div
                key={item.value}
                onClick={() => { onValueChange(item.value); setOpen(false) }}
                style={{
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  background: item.value === value ? 'rgba(45,90,39,0.08)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = item.value === value ? 'rgba(45,90,39,0.08)' : 'transparent' }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function SelectTrigger({ children, style, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return <button type="button" style={style} {...props}>{children}</button>
}

export function SelectValue() {
  return null
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <div data-value={value} data-label={children as string} style={{ display: 'none' }}>{children}</div>
}
