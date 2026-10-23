import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import Icon from './Icon'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: '今日', icon: 'home', end: true },
  { to: '/plan', label: '计划', icon: 'compass' },
  { to: '/progress', label: '进度', icon: 'chart' },
  { to: '/account', label: '账号', icon: 'user' },
]

const isActive = (pathname, item) =>
  item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)

export default function Layout({ children, wide = false }) {
  const { profile, dueCount, streak } = useApp()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="app-shell">
      <div className="aurora" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <span>C</span>
            </span>
            <span className="brand-text">
              <b>CETPass</b>
              <small>词频 · 记忆引擎</small>
            </span>
          </Link>

          <nav className="topnav">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`topnav-item ${isActive(pathname, item) ? 'active' : ''}`}
              >
                {item.label}
                {item.to === '/' && dueCount > 0 && <i className="nav-dot" />}
              </Link>
            ))}
          </nav>

          <div className="topbar-right">
            <span className="pill streak" title="连续学习天数">
              <Icon name="flame" size={15} />
              {streak} 天
            </span>
            <Link to="/account" className="profile-chip" aria-label="账号">
              <Avatar name={profile?.name} gradient={profile?.gradient} size={32} />
              <span>{profile?.name}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className={`app-main ${wide ? 'wide' : ''}`}>{children}</main>

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-item ${isActive(pathname, item) ? 'active' : ''}`}
          >
            <span className="bottom-icon">
              <Icon name={item.icon} size={20} />
              {item.to === '/' && dueCount > 0 && <i className="nav-dot" />}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
