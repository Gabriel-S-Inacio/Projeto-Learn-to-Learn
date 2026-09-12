import { LogIn } from '../../assets/icons/Icons'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import StatePanel from '../../components/ui/StatePanel'
import './MyLessons.css'

export default function MyLessons() {
  return (
    <main className="site-main lessons-page">
      <section className="lessons-hero container container--narrow">
        <Eyebrow>Área do aluno</Eyebrow>
        <h1>Minhas aulas</h1>
        <p>Aqui ficam os encontros que você já confirmou e os próximos passos da sua jornada.</p>
      </section>
      <section className="lessons-content container container--narrow">
        <StatePanel icon={LogIn} title="Entre para ver suas aulas." tone="muted">
          <Button type="button">Entrar na minha conta</Button>
        </StatePanel>
      </section>
    </main>
  )
}
