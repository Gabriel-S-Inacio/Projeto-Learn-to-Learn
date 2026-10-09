import { NavLink } from 'react-router-dom'
import { publicNavigation } from '../../data/navigation'
import { useAuth } from '../../context/AuthContext'

export default function MobileNav({ isOpen, onNavigate }) {
  const { status, user, signOut } = useAuth()
  if (!isOpen) return null

  return (
    <div className="mobile-nav" id="mobile-navigation">
      <nav aria-label="Navegação mobile" className="mobile-nav__inner">
        {publicNavigation.map((item) => (
          <NavLink className="mobile-nav__link" key={item.to} onClick={onNavigate} to={item.to}>
            {item.label}
          </NavLink>
        ))}
        {status === 'authenticated' ? (
          <>
            <NavLink className="mobile-nav__link" onClick={onNavigate} to={user.role === 'ADMIN' ? '/admin/agenda' : '/minhas-aulas'}>{user.role === 'ADMIN' ? 'Administração' : 'Minhas aulas'}</NavLink>
            <NavLink className="mobile-nav__link" onClick={onNavigate} to="/minha-conta">Minha conta</NavLink>
          </>
        ) : <NavLink className="mobile-nav__link" onClick={onNavigate} to="/login">Entrar</NavLink>}
        {status === 'authenticated' && <button className="mobile-nav__logout" onClick={() => { void signOut(); onNavigate() }} type="button">Sair</button>}
        <NavLink className="mobile-nav__cta" onClick={onNavigate} to="/agendar">Agendar aula</NavLink>
      </nav>
    </div>
  )
}
