import { useEffect, useState } from 'react'
import { Clock, LogIn, Sparkles } from '../../assets/icons/Icons'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import StatePanel from '../../components/ui/StatePanel'
import { getAvailableSlots } from '../../services/scheduleService'
import './Schedule.css'

export default function Schedule() {
  const [schedule, setSchedule] = useState({ data: [], error: null, status: 'loading' })

  useEffect(() => {
    let active = true
    getAvailableSlots()
      .then((data) => active && setSchedule({ data, error: null, status: data.length ? 'available' : 'empty' }))
      .catch((error) => active && setSchedule({ data: [], error, status: 'error' }))
    return () => { active = false }
  }, [])

  return (
    <main className="site-main schedule-page">
      <section className="schedule-hero container">
        <Eyebrow>Agendamento</Eyebrow>
        <h1>Escolha um horário para <span className="text-marker">começar.</span></h1>
        <p>Encontre um encontro que caiba na sua semana. A confirmação fica disponível imediatamente na sua área.</p>
      </section>

      <section className="auth-notice container">
        <div className="auth-notice__message">
          <span><Sparkles size={19} /></span>
          <div><strong>Entre para reservar seu horário.</strong><p>Você pode consultar a agenda agora; a reserva exige uma conta de aluno.</p></div>
        </div>
        <Button to="/minhas-aulas"><LogIn size={16} /> Entrar</Button>
      </section>

      <section className="schedule-content container">
        {schedule.status === 'loading' && <StatePanel title="Carregando horários..."><span className="schedule-spinner" /></StatePanel>}
        {schedule.status === 'error' && <StatePanel title="Não foi possível carregar os horários." tone="error"><p>Tente novamente em instantes.</p></StatePanel>}
        {schedule.status === 'empty' && (
          <StatePanel icon={Clock} title="Novos horários em breve." tone="dashed">
            <p>A agenda de Douglas será publicada aqui. Enquanto isso, você pode conhecer o método e se preparar para o primeiro encontro.</p>
            <Button to="/metodo">Conhecer o método</Button>
          </StatePanel>
        )}
        {schedule.status === 'available' && (
          <div className="schedule-grid" data-reference-gap="available-schedule-state">
            {/* REFERENCE GAP — AVAILABLE SCHEDULE STATE */}
            {schedule.data.map((slot) => <article className="schedule-slot" key={slot.id}><p>{slot.label}</p><Button disabled>Reservar</Button></article>)}
          </div>
        )}
      </section>
    </main>
  )
}
