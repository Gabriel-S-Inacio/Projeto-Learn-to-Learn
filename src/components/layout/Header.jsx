import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Close, Menu } from '../../assets/icons/Icons'
import { publicNavigation } from '../../data/navigation'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import MobileNav from './MobileNav'
import './layout.css'
import { trackEvent } from '../../services/analyticsService'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { status, user, signOut } = useAuth()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-logo" to="/">Learn to Learn</Link>

        <nav aria-label="Navegação principal" className="desktop-nav">
          {publicNavigation.map((item) => (
            <NavLink
              className={({ isActive }) => `desktop-nav__link ${isActive ? 'is-active' : ''}`}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="desktop-actions">
          {status === 'authenticated' ? (
            <>
              <Link className="desktop-actions__login" to={user.role === 'ADMIN' ? '/admin/agenda' : '/minhas-aulas'}>{user.name.split(' ')[0]}</Link>
              <button className="desktop-actions__logout" onClick={() => void signOut()} type="button">Sair</button>
            </>
          ) : <Link className="desktop-actions__login" to="/login">Entrar</Link>}
          <Button className="site-header__cta" onClick={() => void trackEvent('cta_clicked', { metadata: { cta: 'schedule_header', location: 'header' } }).catch(() => undefined)} to="/agendar">
            Agendar aula <ArrowUpRight size={15} />
          </Button>
        </div>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          {isMenuOpen ? <Close size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <MobileNav isOpen={isMenuOpen} onNavigate={() => setIsMenuOpen(false)} />
    </header>
  )
}
