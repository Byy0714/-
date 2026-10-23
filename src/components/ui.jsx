import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon'

export function Avatar({ name = '', gradient, size = 38, style, className = '' }) {
  const initials = useMemo(() => {
    if (!name) return '?'
    if (/[\u4e00-\u9fa5]/.test(name)) return name.slice(0, 1)
    return name.slice(0, 2).toUpperCase()
  }, [name])
  return (
    <span
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.38),
        background: gradient || 'linear-gradient(135deg,#7C6CFF,#38C8FF)',
        ...style,
      }}
    >
      {initials}
    </span>
  )
}

export function Ring({
  value = 0,
  size = 132,
  stroke = 9,
  color = '#7C6CFF',
  color2 = '#38C8FF',
  label,
  children,
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`ring-${size}-${Math.round(value)}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${size}-${Math.round(value)})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-inner">{children || <b>{label ?? `${value}%`}</b>}</div>
    </div>
  )
}

export function ProgressBar({ value = 0, color, color2, className = '', slim = false }) {
  return (
    <div className={`progress ${slim ? 'slim' : ''} ${className}`}>
      <span
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color
            ? `linear-gradient(90deg, ${color}, ${color2 || color})`
            : undefined,
        }}
      />
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 460 }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="关闭">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      className={`toggle ${checked ? 'on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  )
}

export function LevelTag({ level, meta }) {
  return (
    <span className={`level-tag level-${level}`} style={{ '--lv': meta.color }}>
      {meta.name}
    </span>
  )
}

export function Confetti({ count = 42 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 1.8 + Math.random() * 1.6,
        color: ['#7C6CFF', '#38C8FF', '#FF6FA5', '#FFC65C', '#3BE0A9'][i % 5],
        rotate: Math.random() * 220,
        size: 6 + Math.random() * 7,
      })),
    [count]
  )
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export function ToastHost({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="toast-ic">
            <Icon name={t.icon} />
          </span>
          <div className="grow">
            <b>{t.title}</b>
            {t.message && <span>{t.message}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** 轻量数字滚动动画 */
export function CountUp({ value = 0, duration = 520, className = '' }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    let frame
    const start = performance.now()
    const from = display
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className={className}>{display}</span>
}
