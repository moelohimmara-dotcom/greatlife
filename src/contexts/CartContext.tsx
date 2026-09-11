import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface CartItem {
  name: string
  price: string
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  add: (name: string, price: string) => void
  remove: (name: string) => void
  setQty: (name: string, qty: number) => void
  clear: () => void
  count: number
  totalNum: number
  totalLabel: string
}

const CartContext = createContext<CartContextValue | null>(null)
export const useCart = () => useContext(CartContext)!

const STORAGE_KEY = 'greatlife-cart'

export function parsePrice(price: string): number {
  return Number(String(price).replace(/[^\d]/g, '')) || 0
}

export function formatFG(num: number): string {
  return num.toLocaleString('fr-FR').replace(/\u202f/g, ' ')
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as CartItem[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items])

  const add = useCallback((name: string, price: string) => {
    setItems(prev => {
      const found = prev.find(i => i.name === name)
      if (found) return prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { name, price, qty: 1 }]
    })
  }, [])

  const remove = useCallback((name: string) => {
    setItems(prev => prev.filter(i => i.name !== name))
  }, [])

  const setQty = useCallback((name: string, qty: number) => {
    setItems(prev => qty <= 0
      ? prev.filter(i => i.name !== name)
      : prev.map(i => i.name === name ? { ...i, qty } : i)
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const totalNum = items.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0)
  const totalLabel = formatFG(totalNum)

  const value: CartContextValue = { items, add, remove, setQty, clear, count, totalNum, totalLabel }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
