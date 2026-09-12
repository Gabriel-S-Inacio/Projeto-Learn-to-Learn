import { ArrowRight, Heart, Lightbulb, Quote } from '../../assets/icons/Icons'
import PageHero from '../../components/shared/PageHero'
import Button from '../../components/ui/Button'
import EditorialHeading from '../../components/ui/EditorialHeading'
import Eyebrow from '../../components/ui/Eyebrow'
import './About.css'

export default function About() {
  return (
    <main className="site-main">
      <PageHero
        aside={<p className="about-hero__aside">O Learn to Learn English nasceu da vontade de transformar a experiência de quem já estudou muito, mas ainda não se sente capaz de usar o idioma no mundo real.</p>}
        eyebrow="Sobre"
        title={<>Ensinar inglês é, antes de tudo, ajudar alguém a <span className="text-marker">continuar aprendendo.</span></>}
      />

      <section className="values-section">
        <div className="values-grid container">
          <article className="value-card"><Heart /><h2>Missão</h2><p>Transformar a forma como as pessoas aprendem inglês, com consciência, prática e autonomia.</p></article>
          <article className="value-card"><Lightbulb /><h2>Visão</h2><p>Formar aprendizes independentes e mostrar que inglês é uma habilidade possível para qualquer pessoa.</p></article>
          <article className="value-card value-card--quote"><Quote /><p>“Quem evita errar evita aprender.”</p><span /></article>
        </div>
      </section>

      <section className="teacher-section container">
        <div className="teacher-portrait" aria-label="Representação gráfica do professor Douglas" role="img">
          <span className="teacher-portrait__shape" />
          <div className="teacher-portrait__label"><small>Professor</small><strong>Douglas</strong></div>
          <span className="teacher-portrait__initial">D</span>
        </div>
        <div className="teacher-section__copy">
          <Eyebrow>Douglas, The Teacher</Eyebrow>
          <EditorialHeading>Um professor para a sua autonomia.</EditorialHeading>
          <p>Douglas acredita que o objetivo de uma aula não é fazer com que o aluno dependa do professor para sempre. É oferecer estratégia, clareza e coragem para que o próximo passo seja cada vez mais seu.</p>
          <p>Com mais de 15 anos ensinando, ele transformou essa experiência em uma proposta que coloca o aprendiz no centro da jornada.</p>
          <Button to="/agendar">Conhecer Douglas em aula <ArrowRight size={16} /></Button>
        </div>
      </section>
    </main>
  )
}
