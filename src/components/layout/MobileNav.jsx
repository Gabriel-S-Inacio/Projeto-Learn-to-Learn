import { NavLink } from 'react-router-dom'
import { publicNavigation } from '../../data/navigation'

export default function MobileNav({ isOpen, onNavigate }) {
  if (!isOpen) return null

  return (
    <div className="mobile-nav" id="mobile-navigation">
      <nav aria-label="Navegação mobile" className="mobile-nav__inner">
        {publicNavigation.map((item) => (
          <NavLink className="mobile-nav__link" key={item.to} onClick={onNavigate} to={item.to}>
            {item.label}
          </NavLink>
        ))}
        <NavLink className="mobile-nav__cta" onClick={onNavigate} to="/agendar">Agendar aula</NavLink>
      </nav>
    </div>
  )
}
