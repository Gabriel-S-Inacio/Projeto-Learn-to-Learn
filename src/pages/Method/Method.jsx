import { ArrowRight } from '../../assets/icons/Icons'
import MethodCard from '../../components/shared/MethodCard'
import PageHero from '../../components/shared/PageHero'
import QuotePanel from '../../components/shared/QuotePanel'
import Button from '../../components/ui/Button'
import EditorialHeading from '../../components/ui/EditorialHeading'
import Eyebrow from '../../components/ui/Eyebrow'
import { methodPillarIcons, methodSteps } from '../../data/content'
import './Method.css'

export default function Method() {
  return (
    <main className="site-main">
      <PageHero
        description="O Learn to Learn English organiza a aprendizagem em experiências de compreensão, prática e uso. O objetivo é você saber como seguir evoluindo, dentro e fora da aula."
        eyebrow="Método"
        title={<>Aprender inglês é construir <span className="text-marker">autonomia</span>, não dependência.</>}
      />

      <section className="method-pillars">
        <div className="method-pillars__grid container">
          {methodSteps.map((step, index) => <MethodCard {...step} icon={methodPillarIcons[index]} key={step.title} text={step.longText} variant="accent" />)}
        </div>
      </section>

      <section className="method-concept container">
        <QuotePanel eyebrow="Uma nova referência">
          Fluência não é falar sem errar. É conseguir comunicar o que importa.
        </QuotePanel>
        <div className="method-concept__copy">
          <Eyebrow>Uma aprendizagem com sentido</Eyebrow>
          <EditorialHeading>Menos ansiedade, mais encontro com a língua.</EditorialHeading>
          <p>Você não precisa esperar estar preparado para começar. A confiança é construída em pequenas tentativas, com repertório crescente e espaço para errar.</p>
          <Button to="/como-funciona">Ver como funciona <ArrowRight size={16} /></Button>
        </div>
      </section>
    </main>
  )
}
