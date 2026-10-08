import { useCallback, useEffect, useState } from 'react'
import { Clock, LogIn } from '../../assets/icons/Icons'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Eyebrow from '../../components/ui/Eyebrow'
import StatePanel from '../../components/ui/StatePanel'
import { useAuth } from '../../context/AuthContext'
import { cancelBooking, getMyBookings, rescheduleBooking } from '../../services/bookingService'
import { getAvailableSlots } from '../../services/scheduleService'
import { canChangeBooking, formatScheduleDate, formatShortDate, formatTime } from '../../utils/dateTime'
import './MyLessons.css'

const typeLabels = {
  TRIAL: 'Aula experimental',
  REGULAR: 'Aula regular',
}

const statusLabels = {
  BOOKED: 'Confirmada',
  COMPLETED: 'Concluída',
}

export default function MyLessons() {
  const { status: authStatus, user } = useAuth()
  const [lessons, setLessons] = useState({ data: [], status: 'loading', error: null })
  const [dialog, setDialog] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [newSlotId, setNewSlotId] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const loadLessons = useCallback(async () => {
    if (authStatus !== 'authenticated' || user.role !== 'STUDENT') return
    setLessons((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await getMyBookings()
      setLessons({ data, status: data.length ? 'ready' : 'empty', error: null })
    } catch (error) {
      setLessons({ data: [], status: 'error', error })
    }
  }, [authStatus, user])

  useEffect(() => { void loadLessons() }, [loadLessons])

  async function openReschedule(lesson) {
    setFeedback(null)
    setBusy(true)
    try {
      const slots = await getAvailableSlots()
      setAvailableSlots(slots)
      setNewSlotId(slots[0] ? String(slots[0].id) : '')
      setDialog({ type: 'reschedule', lesson })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function confirmAction() {
    setBusy(true)
    try {
      if (dialog.type === 'cancel') {
        await cancelBooking(dialog.lesson.bookingId)
        setFeedback({ tone: 'success', message: 'A reserva foi cancelada e o horário voltou à agenda.' })
      } else {
        await rescheduleBooking(dialog.lesson.bookingId, Number(newSlotId))
        setFeedback({ tone: 'success', message: 'A aula foi remarcada com sucesso.' })
      }
      setDialog(null)
      await loadLessons()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
      setDialog(null)
      await loadLessons()
    } finally {
      setBusy(false)
    }
  }

  const upcoming = lessons.data.filter((lesson) => lesson.status === 'BOOKED' && new Date(lesson.startsAt) > new Date())
  const history = lessons.data.filter((lesson) => lesson.status === 'COMPLETED')

  return (
    <main className="site-main lessons-page">
      <section className="lessons-hero container container--narrow">
        <Eyebrow>Área do aluno</Eyebrow>
        <h1>Minhas aulas</h1>
        <p>Aqui ficam os encontros que você já confirmou e os próximos passos da sua jornada.</p>
      </section>
      <section className="lessons-content container container--narrow">
        {feedback && <p className={`lessons-feedback lessons-feedback--${feedback.tone}`} role="status">{feedback.message}</p>}
        {authStatus === 'loading' && <StatePanel title="Carregando sua área..."><span className="schedule-spinner" /></StatePanel>}
        {authStatus === 'anonymous' && <StatePanel icon={LogIn} title="Entre para ver suas aulas." tone="muted"><Button to="/login?redirect=/minhas-aulas">Entrar na minha conta</Button></StatePanel>}
        {authStatus === 'authenticated' && user.role === 'ADMIN' && <StatePanel title="Esta é uma conta administrativa." tone="muted"><Button to="/admin/agenda">Abrir agenda administrativa</Button></StatePanel>}
        {authStatus === 'authenticated' && user.role === 'STUDENT' && lessons.status === 'loading' && <StatePanel title="Carregando suas aulas..."><span className="schedule-spinner" /></StatePanel>}
        {authStatus === 'authenticated' && user.role === 'STUDENT' && lessons.status === 'error' && <StatePanel title="Não foi possível carregar suas aulas." tone="error"><p>{lessons.error?.message}</p><Button onClick={() => void loadLessons()} type="button">Tentar novamente</Button></StatePanel>}
        {authStatus === 'authenticated' && user.role === 'STUDENT' && lessons.status !== 'loading' && lessons.status !== 'error' && !upcoming.length && <StatePanel icon={Clock} title="Nenhuma próxima aula." tone="dashed"><p>Escolha um horário disponível para começar sua jornada.</p><Button to="/agendar">Ver agenda</Button></StatePanel>}
        {authStatus === 'authenticated' && user.role === 'STUDENT' && upcoming.length > 0 && (
          <div className="lessons-list">
            <h2>Próximas aulas</h2>
            {upcoming.map((lesson) => {
              const canChange = canChangeBooking(lesson.startsAt)
              return (
                <article className="lesson-card" key={lesson.bookingId}>
                  <div className="lesson-card__date"><span>{formatShortDate(lesson.startsAt)}</span><strong>{formatTime(lesson.startsAt)}</strong></div>
                  <div className="lesson-card__meta"><span>{typeLabels[lesson.type || 'TRIAL']}</span><small>{lesson.durationMinutes} minutos · {statusLabels[lesson.status]}</small></div>
                  {lesson.type !== 'REGULAR' && (
                    <div className="lesson-card__actions">
                      <Button disabled={!canChange || busy} onClick={() => void openReschedule(lesson)} type="button" variant="outline">Remarcar</Button>
                      <Button disabled={!canChange || busy} onClick={() => setDialog({ type: 'cancel', lesson })} type="button" variant="danger">Cancelar</Button>
                    </div>
                  )}
                  {lesson.type !== 'REGULAR' && !canChange && <p className="lesson-card__rule">Alterações encerradas: faltam menos de 24 horas.</p>}
                </article>
              )
            })}
          </div>
        )}
        {authStatus === 'authenticated' && user.role === 'STUDENT' && lessons.status !== 'loading' && lessons.status !== 'error' && (
          <div className="lessons-list lessons-history">
            <h2>Histórico de aulas</h2>
            {!history.length && <StatePanel title="Nenhuma aula concluída ainda." tone="dashed" />}
            {history.map((lesson) => (
              <article className="lesson-card lesson-card--history" key={lesson.bookingId}>
                <div className="lesson-card__date"><span>{formatShortDate(lesson.startsAt)}</span><strong>{formatTime(lesson.startsAt)}</strong></div>
                <div className="lesson-card__meta"><span>{typeLabels[lesson.type || 'TRIAL']}</span><small>{lesson.durationMinutes} minutos · {statusLabels[lesson.status]}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>

      {dialog?.type === 'cancel' && (
        <ConfirmDialog busy={busy} confirmLabel="Cancelar aula" onCancel={() => setDialog(null)} onConfirm={() => void confirmAction()} title="Cancelar esta reserva?">
          <p>{formatScheduleDate(dialog.lesson.startsAt)}, às {formatTime(dialog.lesson.startsAt)}.</p>
          <p>Cancelamentos são permitidos até 24 horas antes da aula. O horário ficará disponível novamente.</p>
        </ConfirmDialog>
      )}
      {dialog?.type === 'reschedule' && (
        <ConfirmDialog busy={busy || !newSlotId} confirmLabel="Confirmar remarcação" onCancel={() => setDialog(null)} onConfirm={() => void confirmAction()} title="Escolha o novo horário">
          <p className="reschedule-current"><strong>Horário atual</strong><br />{formatScheduleDate(dialog.lesson.startsAt)}, às {formatTime(dialog.lesson.startsAt)}</p>
          {availableSlots.length ? <div className="form-field"><label htmlFor="new-slot">Novo horário</label><select id="new-slot" onChange={(event) => setNewSlotId(event.target.value)} value={newSlotId}>{availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{formatScheduleDate(slot.startsAt)} — {formatTime(slot.startsAt)}</option>)}</select></div> : <p>Nenhum novo horário está disponível.</p>}
          <p>Remarcações são permitidas até 24 horas antes da aula.</p>
        </ConfirmDialog>
      )}
    </main>
  )
}
