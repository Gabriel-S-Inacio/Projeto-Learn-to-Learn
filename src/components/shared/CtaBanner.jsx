import { ArrowRight } from '../../assets/icons/Icons'
import Button from '../ui/Button'
import Eyebrow from '../ui/Eyebrow'
import './shared.css'
import { trackEvent } from '../../services/analyticsService'

export default function CtaBanner({ description, eyebrow, title, to = '/agendar' }) {
  return (
    <section className="cta-banner">
      <Eyebrow light>{eyebrow}</Eyebrow>
      <h2 className="cta-banner__title">{title}</h2>
      {description && <p className="cta-banner__description">{description}</p>}
      <Button onClick={() => void trackEvent('cta_clicked', { metadata: { cta: 'schedule_secondary', location: 'cta_banner' } }).catch(() => undefined)} to={to} variant="light">Quero aprender a aprender <ArrowRight size={17} /></Button>
    </section>
  )
}
