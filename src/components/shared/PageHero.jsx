import EditorialHeading from '../ui/EditorialHeading'
import Eyebrow from '../ui/Eyebrow'
import './shared.css'

export default function PageHero({ align = 'left', aside, children, className = '', description, eyebrow, title }) {
  return (
    <section className={`page-hero page-hero--${align} ${aside ? 'page-hero--split' : ''} ${className}`.trim()}>
      <div className="page-hero__inner">
        <div className="page-hero__copy soft-reveal">
          <Eyebrow>{eyebrow}</Eyebrow>
          <EditorialHeading as="h1" className="page-hero__title" size="display">{title}</EditorialHeading>
          {description && <p className="page-hero__description">{description}</p>}
          {children}
        </div>
        {aside && <div className="page-hero__aside soft-reveal-delay">{aside}</div>}
      </div>
    </section>
  )
}
