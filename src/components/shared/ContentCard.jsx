import { ArrowRight } from '../../assets/icons/Icons'
import { Link } from 'react-router-dom'
import './shared.css'

export default function ContentCard({ icon: Icon, label, title, tone = 'soft', to = '/conteudos' }) {
  return (
    <Link className="content-card" to={to}>
      <div className={`content-card__visual content-card__visual--${tone}`}>
        <span className="content-card__icon"><Icon size={27} /></span>
        <span className="content-card__dot" />
      </div>
      <div className="content-card__copy">
        <div>
          <p className="content-card__label">{label}</p>
          <h3 className="content-card__title">{title}</h3>
        </div>
        <span className="content-card__arrow"><ArrowRight size={15} /></span>
      </div>
    </Link>
  )
}
