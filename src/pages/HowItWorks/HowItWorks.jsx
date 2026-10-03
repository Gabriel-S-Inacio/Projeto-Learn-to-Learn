import { ArrowRight, Sparkles } from '../../assets/icons/Icons'
import PageHero from '../../components/shared/PageHero'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import { journeyIcons, methodSteps } from '../../data/content'
import './HowItWorks.css'

export default function HowItWorks() {
  return (
    <main className="site-main">
      <PageHero
        align="center"
        description="Cada aula é uma parte de um sistema simples: perceber, experimentar e usar. Sem atalhos milagrosos, com direção real."
        eyebrow="Como funciona"
        title={<>Três movimentos para fazer o inglês <span className="text-marker">ficar com você.</span></>}
      />

      <section className="journey container container--narrow">
        <div className="journey__line" aria-hidden="true" />
        {methodSteps.map(({ index, longText, subtitle, title }, itemIndex) => {
          const Icon = journeyIcons[itemIndex]
          return (
          <article className={`journey-card ${itemIndex % 2 ? 'journey-card--right' : ''}`} key={title}>
            <div className="journey-card__body">
              <span className="journey-card__index">{index}</span>
              <h2>{title}</h2>
              <p className="journey-card__subtitle">{subtitle}</p>
              <p className="journey-card__text">{longText}</p>
            </div>
            <span className="journey-card__icon"><Icon size={21} /></span>
          </article>
          )
        })}
      </section>

      <section className="journey-cta">
        <div className="journey-cta__inner">
          <div><Eyebrow light>Primeiro passo</Eyebrow><h2>A sua jornada pode começar agora.</h2></div>
          <Button to="/agendar" variant="accent">Agendar uma aula <Sparkles size={17} /><ArrowRight size={16} /></Button>
        </div>
      </section>
    </main>
  )
}
