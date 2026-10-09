import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, LogIn, Sparkles } from '../../assets/icons/Icons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import StatePanel from '../../components/ui/StatePanel'
import { useAuth } from '../../context/AuthContext'
import { createBooking, getBookingEligibility } from '../../services/bookingService'
import { getAvailableSlots } from '../../services/scheduleService'
import { formatScheduleDate, formatTime, scheduleDayKey } from '../../utils/dateTime'
import './Schedule.css'
import { trackEvent } from '../../services/analyticsService'

export default function Schedule() {
  const [schedule, setSchedule] = useState({ data: [], error: null, status: 'loading' })
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [booking, setBooking] = useState(false)
  const [eligibility, setEligibility] = useState({ status: 'idle', canBook: true, nextLessonType: null, message: null })
  const { status: authStatus, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const loadSchedule = useCallback(async () => {
    setSchedule((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await getAvailableSlots()
      setSchedule({ data, error: null, status: data.length ? 'available' : 'empty' })
    } catch (error) {
      setSchedule({ data: [], error, status: 'error' })
    }
  }, [])

  useEffect(() => { void loadSchedule() }, [loadSchedule])

  useEffect(() => {
    let active = true
    if (authStatus !== 'authenticated' || user.role !== 'STUDENT') {
      setEligibility({ status: 'idle', canBook: true, nextLessonType: null, message: null })
      return () => { active = false }
    }

    setEligibility({ status: 'loading', canBook: true, nextLessonType: null, message: null })
    void getBookingEligibility()
      .then((result) => {
        if (active) setEligibility({ status: 'ready', ...result })
      })
      .catch(() => {
        if (active) setEligibility({ status: 'error', canBook: true, nextLessonType: null, message: null })
      })
    return () => { active = false }
  }, [authStatus, user])

  useEffect(() => {
    void trackEvent('schedule_viewed', { metadata: { availability: 'requested' } }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const selectedId = Number(searchParams.get('slotId'))
    const isStudent = authStatus === 'authenticated' && user.role === 'STUDENT'
    const eligibilityKnown = eligibility.status === 'ready' || eligibility.status === 'error'
    if (!isStudent || !eligibilityKnown || (eligibility.status === 'ready' && !eligibility.canBook)) {
      setSelectedSlot(null)
      return
    }
    if (selectedId && schedule.data.length) {
      const slot = schedule.data.find((item) => item.id === selectedId)
      if (slot) setSelectedSlot(slot)
    }
  }, [authStatus, eligibility, schedule.data, searchParams, user])

  const groups = useMemo(() => Object.values(schedule.data.reduce((result, slot) => {
    const key = scheduleDayKey(slot.startsAt)
    result[key] ||= { date: slot.startsAt, slots: [] }
    result[key].slots.push(slot)
    return result
  }, {})), [schedule.data])

  const bookingBlocked = authStatus === 'authenticated' && user.role === 'STUDENT'
    && eligibility.status === 'ready' && !eligibility.canBook
  const checkingEligibility = authStatus === 'authenticated' && user.role === 'STUDENT'
    && eligibility.status !== 'ready' && eligibility.status !== 'error'

  function chooseSlot(slot) {
    setFeedback(null)
    void trackEvent('booking_started', { metadata: { slotId: slot.id } }).catch(() => undefined)
    if (authStatus !== 'authenticated') {
      navigate(`/login?redirect=/agendar&slotId=${slot.id}`)
      return
    }
    if (user.role !== 'STUDENT') {
      setFeedback({ tone: 'error', message: 'A reserva está disponível somente para contas de aluno.' })
      return
    }
    if (eligibility.status === 'ready' && !eligibility.canBook) {
      setFeedback({ tone: 'info', message: eligibility.message })
      return
    }
    setSelectedSlot(slot)
    setSearchParams({ slotId: String(slot.id) }, { replace: true })
  }

  async function confirmBooking() {
    setBooking(true)
    try {
      const result = await createBooking(selectedSlot.id)
      setSelectedSlot(null)
      setSearchParams({}, { replace: true })
      const lessonLabel = result.booking.type === 'REGULAR' ? 'Aula regular' : 'Aula experimental'
      setFeedback({ tone: 'success', message: `${lessonLabel} reservada. Ela já está disponível em Minhas Aulas.` })
      await loadSchedule()
    } catch (error) {
      setSelectedSlot(null)
      if (error.code === 'TRIAL_ALREADY_COMPLETED') {
        setEligibility({ status: 'ready', canBook: false, nextLessonType: null, message: error.message })
        setFeedback(null)
      } else {
        setFeedback({ tone: 'error', message: error.message })
      }
      await loadSchedule()
    } finally {
      setBooking(false)
    }
  }

  return (
    <main className="site-main schedule-page">
      <section className="schedule-hero container">
        <Eyebrow>Agendamento</Eyebrow>
        <h1>Escolha um horário para <span className="text-marker">começar.</span></h1>
        <p>Encontre um encontro que caiba na sua semana. A confirmação fica disponível imediatamente na sua área.</p>
      </section>

      {authStatus !== 'authenticated' && (
        <section className="auth-notice container">
          <div className="auth-notice__message"><span><Sparkles size={19} /></span><div><strong>Entre para reservar seu horário.</strong><p>Você pode consultar a agenda agora; a reserva exige uma conta de aluno.</p></div></div>
          <Button to="/login"><LogIn size={16} /> Entrar</Button>
        </section>
      )}

      <section className="schedule-content container">
        {bookingBlocked && <p className="schedule-feedback schedule-feedback--info" role="status">{eligibility.message}</p>}
        {feedback && <p className={`schedule-feedback schedule-feedback--${feedback.tone}`} role="status">{feedback.message}</p>}
        {schedule.status === 'loading' && <StatePanel title="Carregando horários..."><span className="schedule-spinner" /></StatePanel>}
        {schedule.status === 'error' && <StatePanel title="Não foi possível carregar os horários." tone="error"><p>{schedule.error?.message || 'Tente novamente em instantes.'}</p><Button onClick={() => void loadSchedule()} type="button">Tentar novamente</Button></StatePanel>}
        {schedule.status === 'empty' && <StatePanel icon={Clock} title="Novos horários em breve." tone="dashed"><p>A agenda de Douglas será publicada aqui. Enquanto isso, você pode conhecer o método e se preparar para o primeiro encontro.</p><Button to="/metodo">Conhecer o método</Button></StatePanel>}
        {schedule.status === 'available' && (
          <div className="schedule-grid">
            {groups.map((group) => (
              <article className="schedule-day" key={scheduleDayKey(group.date)}>
                <h2><span><Clock size={19} /></span>{formatScheduleDate(group.date)}</h2>
                <div className="schedule-day__slots">
                  {group.slots.map((slot) => (
                    <div className="schedule-slot" key={slot.id}>
                      <div><strong>{formatTime(slot.startsAt)}</strong><small>{slot.durationMinutes} minutos</small></div>
                      <Button disabled={bookingBlocked || checkingEligibility} onClick={() => chooseSlot(slot)} type="button" variant={authStatus === 'authenticated' ? 'solid' : 'muted'}>
                        {authStatus !== 'authenticated' ? 'Entrar' : bookingBlocked ? 'Indisponível' : checkingEligibility ? 'Verificando...' : 'Reservar'}
                      </Button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedSlot && (
        <ConfirmDialog busy={booking} confirmLabel="Confirmar reserva" onCancel={() => { setSelectedSlot(null); setSearchParams({}, { replace: true }) }} onConfirm={() => void confirmBooking()} title="Confirmar agendamento">
          <p><strong>{formatScheduleDate(selectedSlot.startsAt)}</strong>, às <strong>{formatTime(selectedSlot.startsAt)}</strong>.</p>
          <p>Duração: {selectedSlot.durationMinutes} minutos.</p>
        </ConfirmDialog>
      )}
    </main>
  )
}
