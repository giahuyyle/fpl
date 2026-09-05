import type { BadgeStyle } from '../api/squadApi'

const palettes: Record<BadgeStyle, { accent: string; fill: string }> = {
  'classic-purple': { accent: '#00ff87', fill: '#37003c' },
  'pink-purple': { accent: '#37003c', fill: '#e90052' },
  'cyan-purple': { accent: '#37003c', fill: '#04f5ff' },
  'green-navy': { accent: '#081c35', fill: '#00a66f' },
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'S'
}

export function SquadBadge({ className = 'size-24', name, style }: { className?: string; name: string; style: BadgeStyle }) {
  const palette = palettes[style]
  return <svg aria-label={`${name} badge`} className={className} role="img" viewBox="0 0 100 112">
    <path d="M50 4 92 20v34c0 27-17 45-42 54C25 99 8 81 8 54V20L50 4Z" fill={palette.fill} stroke={palette.accent} strokeWidth="6" />
    <path d="M50 18 79 29v24c0 18-10 31-29 39-19-8-29-21-29-39V29l29-11Z" fill="none" opacity=".35" stroke="white" strokeWidth="3" />
    <text dominantBaseline="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="27" fontWeight="900" textAnchor="middle" x="50" y="55">{initials(name)}</text>
  </svg>
}
