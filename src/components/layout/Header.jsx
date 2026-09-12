import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Close, Menu } from '../../assets/icons/Icons'
import { publicNavigation } from '../../data/navigation'
import Button from '../ui/Button'
import MobileNav from './MobileNav'
import './layout.css'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

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
          <Link className="desktop-actions__login" to="/minhas-aulas">Entrar</Link>
          <Button className="site-header__cta" to="/agendar">
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
