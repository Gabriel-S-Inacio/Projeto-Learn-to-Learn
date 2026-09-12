import { ArrowRight } from '../../assets/icons/Icons'
import Button from '../ui/Button'
import Eyebrow from '../ui/Eyebrow'
import './shared.css'

export default function CtaBanner({ description, eyebrow, title, to = '/agendar' }) {
  return (
    <section className="cta-banner">
      <Eyebrow light>{eyebrow}</Eyebrow>
      <h2 className="cta-banner__title">{title}</h2>
      {description && <p className="cta-banner__description">{description}</p>}
      <Button to={to} variant="light">Quero aprender a aprender <ArrowRight size={17} /></Button>
    </section>
  )
}
