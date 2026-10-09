import { Link } from 'react-router-dom'
import { Instagram, TikTok } from '../../assets/icons/Icons'
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
            <a
              aria-label="Instagram"
              href="https://www.instagram.com/dougtheteacher/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Instagram size={18} />
            </a>
            <a
              aria-label="TikTok"
              href="https://www.tiktok.com/@dougtheteacher"
              rel="noopener noreferrer"
              target="_blank"
            >
              <TikTok size={18} />
            </a>
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
