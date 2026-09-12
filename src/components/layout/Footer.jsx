import { Link } from 'react-router-dom'
import { Asterisk, Instagram, Play } from '../../assets/icons/Icons'
import { publicNavigation, resourceNavigation } from '../../data/navigation'
import './layout.css'

function FooterLinks({ links, title }) {
  return (
    <div className="footer-column">
      <h2 className="footer-column__title">{title}</h2>
      <ul className="footer-column__links">
        {links.map((link) => <li key={`${title}-${link.label}`}><Link to={link.to}>{link.label}</Link></li>)}
      </ul>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div>
          <p className="site-footer__brand">Learn to Learn</p>
          <p className="site-footer__description">Aprender inglês é transformar a forma como você interage com o mundo.</p>
          <div aria-label="Redes sociais" className="site-footer__socials">
            <span title="Instagram"><Instagram size={18} /></span>
            <span title="Vídeos"><Play size={18} /></span>
            <span title="Learn to Learn"><Asterisk size={18} /></span>
          </div>
        </div>
        <FooterLinks links={publicNavigation} title="Navegação" />
        <FooterLinks links={resourceNavigation} title="Recursos" />
        <div className="footer-column">
          <h2 className="footer-column__title">Institucional</h2>
          <p className="site-footer__institutional">Learn to Learn, earthling.</p>
          <span className="site-footer__dot" aria-hidden="true" />
        </div>
      </div>
    </footer>
  )
}
