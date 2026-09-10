import React from 'react'

export function Separator(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{ height: 1, width: '100%', background: 'currentColor', opacity: 0.1, ...props.style }}
    />
  )
}
