import { ArrowUpRight, Wand } from '../../assets/icons/Icons'
import PageHero from '../../components/shared/PageHero'
import Button from '../../components/ui/Button'
import EditorialHeading from '../../components/ui/EditorialHeading'
import Eyebrow from '../../components/ui/Eyebrow'
import { contentCategories } from '../../data/content'
import './Contents.css'

export default function Contents() {
  return (
    <main className="site-main">
      <PageHero
        description="Mais do que listas de assuntos, você encontra recursos para observar, praticar e usar inglês com autonomia em sua própria vida."
        eyebrow="Conteúdos"
        title={<>O que você aprende <span className="text-marker">continua</span> com você.</>}
      />

      <section className="category-grid container">
        {contentCategories.map(({ description, icon: Icon, items, title }, index) => (
          <article className="category-card" key={title}>
            <span className="category-card__dot" />
            <span className="category-card__icon"><Icon size={26} /></span>
            <p className="category-card__index">0{index + 1}</p>
            <h2>{title}</h2>
            <p className="category-card__description">{description}</p>
            <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="curiosity">
        <div className="curiosity__inner">
          <div className="curiosity__copy">
            <Eyebrow>Curiosidade como motor</Eyebrow>
            <EditorialHeading>Tudo pode se tornar uma ferramenta de aprendizagem.</EditorialHeading>
            <p>Jogos, filmes, música, sua profissão, um hobby: quando o conteúdo dialoga com o que importa para você, há mais espaço para explorar e continuar.</p>
            <Button to="/agendar" variant="text">Quero encontrar meu caminho <ArrowUpRight size={17} /></Button>
          </div>
          <div className="curiosity__insight"><Wand size={42} /><p>Seu interesse também é material de aula.</p></div>
        </div>
      </section>
    </main>
  )
}
