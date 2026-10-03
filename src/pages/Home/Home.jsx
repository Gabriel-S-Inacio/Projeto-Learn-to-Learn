import { ArrowRight, ArrowUpRight } from '../../assets/icons/Icons'
import heroStudy from '../../assets/images/hero-study.jpg'
import ContentCard from '../../components/shared/ContentCard'
import CtaBanner from '../../components/shared/CtaBanner'
import MethodCard from '../../components/shared/MethodCard'
import LeadCapture from '../../components/shared/LeadCapture'
import Button from '../../components/ui/Button'
import EditorialHeading from '../../components/ui/EditorialHeading'
import Eyebrow from '../../components/ui/Eyebrow'
import { benefits, homeContents, methodSteps } from '../../data/content'
import { trackEvent } from '../../services/analyticsService'
import './Home.css'

export default function Home() {
  return (
    <main className="site-main">
      <section className="home-hero">
        <div className="home-hero__copy soft-reveal">
          <Eyebrow>Inglês para a vida real</Eyebrow>
          <h1 className="home-hero__title">
            Você não precisa decorar inglês. <span className="text-marker">Precisa aprender</span> a aprender.
          </h1>
          <p className="home-hero__description">
            Construa autonomia, confiança e repertório para usar o idioma no mundo real — no seu ritmo e com método.
          </p>
          <div className="home-hero__actions">
            <Button onClick={() => void trackEvent('cta_clicked', { metadata: { cta: 'schedule_primary', location: 'home_hero' } }).catch(() => undefined)} to="/agendar">Começar minha jornada <ArrowRight size={17} /></Button>
            <Button to="/metodo" variant="outline">Conhecer o método</Button>
          </div>
        </div>

        <div className="home-visual soft-reveal-delay">
          <div className="home-visual__backdrop" />
          <span className="home-visual__sun" />
          <img alt="Pessoa estudando com caderno em uma mesa" className="home-visual__image" src={heroStudy} />
          <div className="progress-card">
            <p className="progress-card__label">Seu próximo passo</p>
            <p className="progress-card__title">Comece simples.</p>
            <div className="progress-card__row">
              <span className="progress-card__track"><span /></span>
              <span>2 de 5</span>
            </div>
          </div>
          <span className="leaf-orbit" aria-hidden="true" />
        </div>
      </section>

      <section className="benefits-band container container--medium" aria-label="Princípios de aprendizagem">
        <h2 className="benefits-band__title">Fluência não é perfeição. <span className="text-marker">É funcionalidade.</span></h2>
        <div className="benefits-band__items">
          {benefits.map(({ icon: Icon, title }) => (
            <div className="benefit" key={title}><span><Icon size={19} /></span><p>{title}</p></div>
          ))}
        </div>
      </section>

      <section className="home-method container section-space">
        <div className="home-section-heading">
          <Eyebrow>O método</Eyebrow>
          <EditorialHeading>Aprender muda quando o método faz sentido.</EditorialHeading>
        </div>
        <div className="home-card-grid">
          {methodSteps.map((step) => <MethodCard {...step} key={step.title} variant="interactive" />)}
        </div>
      </section>

      <section className="manifesto-split">
        <div className="manifesto-split__quote">
          <span aria-hidden="true">“</span>
          <p>Confiança não vem antes da prática. Ela é consequência da prática.</p>
          <i aria-hidden="true" />
        </div>
        <div className="manifesto-split__copy">
          <Eyebrow>Manifesto</Eyebrow>
          <EditorialHeading size="medium">A ideia não é depender de um professor para sempre.</EditorialHeading>
          <p>Nosso propósito é oferecer ferramentas, clareza e prática para que você siga aprendendo por conta própria, com autonomia e direção.</p>
          <Button to="/sobre" variant="text">Ler o manifesto <ArrowRight size={15} /></Button>
        </div>
      </section>

      <section className="home-contents container section-space">
        <div className="home-contents__heading">
          <div><Eyebrow>Conteúdos</Eyebrow><EditorialHeading>Inglês que conversa<br />com a sua vida.</EditorialHeading></div>
          <Button to="/conteudos" variant="text">Ver todos os conteúdos <ArrowRight size={16} /></Button>
        </div>
        <div className="home-content-grid">
          {homeContents.map((item) => <ContentCard {...item} key={item.title} />)}
        </div>
      </section>

      <LeadCapture />

      <CtaBanner
        description="Ele começa quando você decide dar o próximo passo."
        eyebrow="Uma prática de cada vez"
        title="Seu inglês não começa quando você estiver pronto."
      />
    </main>
  )
}
