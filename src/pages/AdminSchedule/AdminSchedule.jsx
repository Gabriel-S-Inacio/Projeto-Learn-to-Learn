import Button from '../../components/ui/Button'
import './AdminSchedule.css'

export default function AdminSchedule() {
  return (
    <main className="admin-gate">
      <section aria-labelledby="admin-gate-title" className="admin-gate__content">
        <h1 id="admin-gate-title">Entre para continuar</h1>
        <p>O painel do professor exige autenticação.</p>
        <Button type="button">Entrar</Button>
        <span className="sr-only">REFERENCE GAP — AUTHENTICATED ADMIN DASHBOARD</span>
      </section>
    </main>
  )
}
