import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StatePanel from '../../components/ui/StatePanel'
import { useAuth } from '../../context/AuthContext'
import { cancelAdminBooking, createAdminSlot, createRegularLesson, getAdminSchedule, getConvertedStudents, updateAdminSlot } from '../../services/adminScheduleService'
import { formatScheduleDate, formatTime, toSaoPauloIso } from '../../utils/dateTime'
import './AdminSchedule.css'

const statusLabels = {
  AVAILABLE: 'Disponível',
  BOOKED: 'Reservado',
  BLOCKED: 'Bloqueado',
  COMPLETED: 'Concluído',
}

const typeLabels = {
  TRIAL: 'Experimental',
  REGULAR: 'Regular',
}

const initialForm = {
  startsAt: '',
  durationMinutes: '60',
  status: 'AVAILABLE',
  notes: '',
}

const initialRegularForm = {
  studentId: '',
  startsAt: '',
  durationMinutes: '60',
  notes: '',
}

export default function AdminSchedule() {
  const { status: authStatus, user, signOut } = useAuth()
  const [schedule, setSchedule] = useState({ data: [], error: null, status: 'loading' })
  const [convertedStudents, setConvertedStudents] = useState({ data: [], error: null, status: 'loading' })
  const [form, setForm] = useState(initialForm)
  const [regularForm, setRegularForm] = useState(initialRegularForm)
  const [feedback, setFeedback] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const [cancelDialog, setCancelDialog] = useState(null)
  const [cancellationReason, setCancellationReason] = useState('')

  const loadSchedule = useCallback(async () => {
    if (authStatus !== 'authenticated' || user.role !== 'ADMIN') return
    setSchedule((current) => ({ ...current, error: null, status: 'loading' }))
    try {
      const data = await getAdminSchedule()
      setSchedule({ data, error: null, status: 'ready' })
    } catch (error) {
      setSchedule({ data: [], error, status: 'error' })
    }
  }, [authStatus, user])

  useEffect(() => { void loadSchedule() }, [loadSchedule])

  const loadConvertedStudents = useCallback(async () => {
    if (authStatus !== 'authenticated' || user.role !== 'ADMIN') return
    setConvertedStudents((current) => ({ ...current, error: null, status: 'loading' }))
    try {
      const data = await getConvertedStudents()
      setConvertedStudents({ data, error: null, status: 'ready' })
    } catch (error) {
      setConvertedStudents({ data: [], error, status: 'error' })
    }
  }, [authStatus, user])

  useEffect(() => { void loadConvertedStudents() }, [loadConvertedStudents])

  const summary = useMemo(() => schedule.data.reduce((totals, slot) => {
    totals[slot.status] = (totals[slot.status] || 0) + 1
    return totals
  }, {}), [schedule.data])

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateRegularField(event) {
    setRegularForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setFeedback(null)
    setBusyAction('create')
    try {
      await createAdminSlot({
        startsAt: toSaoPauloIso(form.startsAt),
        durationMinutes: Number(form.durationMinutes),
        status: form.status,
        notes: form.notes.trim() || null,
      })
      setForm(initialForm)
      setFeedback({ tone: 'success', message: 'Horário criado e publicado na agenda.' })
      await loadSchedule()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCreateRegular(event) {
    event.preventDefault()
    setFeedback(null)
    setBusyAction('create-regular')
    try {
      await createRegularLesson({
        studentId: Number(regularForm.studentId),
        startsAt: toSaoPauloIso(regularForm.startsAt),
        durationMinutes: Number(regularForm.durationMinutes),
        type: 'REGULAR',
        notes: regularForm.notes.trim() || null,
      })
      setRegularForm(initialRegularForm)
      setFeedback({ tone: 'success', message: 'Aula regular criada e atribuída ao aluno.' })
      await loadSchedule()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusyAction(null)
    }
  }

  async function changeStatus(slot, status) {
    setFeedback(null)
    setBusyAction(slot.id)
    try {
      await updateAdminSlot(slot.id, { status })
      setFeedback({ tone: 'success', message: `Horário atualizado para ${statusLabels[status].toLowerCase()}.` })
      await loadSchedule()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusyAction(null)
    }
  }

  function openCancellation(slot) {
    setFeedback(null)
    setCancellationReason('')
    setCancelDialog(slot)
  }

  async function confirmCancellation() {
    const reason = cancellationReason.trim()
    if (!cancelDialog?.booking || reason.length < 5) return
    setBusyAction(`cancel-${cancelDialog.booking.id}`)
    try {
      await cancelAdminBooking(cancelDialog.booking.id, reason)
      setFeedback({ tone: 'success', message: 'Reserva cancelada e notificação registrada.' })
      setCancelDialog(null)
      setCancellationReason('')
      await loadSchedule()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusyAction(null)
    }
  }

  if (authStatus === 'loading') {
    return <main className="admin-gate"><StatePanel title="Verificando acesso..."><span className="schedule-spinner" /></StatePanel></main>
  }

  if (authStatus === 'anonymous') {
    return (
      <main className="admin-gate">
        <section aria-labelledby="admin-gate-title" className="admin-gate__content">
          <span className="admin-brand">Learn to Learn</span>
          <h1 id="admin-gate-title">Entre para continuar</h1>
          <p>O painel do professor exige uma conta administrativa.</p>
          <Button to="/login?redirect=/admin/agenda">Entrar</Button>
          <Link to="/">Voltar ao site</Link>
        </section>
      </main>
    )
  }

  if (user.role !== 'ADMIN') {
    return (
      <main className="admin-gate">
        <section aria-labelledby="admin-gate-title" className="admin-gate__content">
          <span className="admin-brand">Learn to Learn</span>
          <h1 id="admin-gate-title">Acesso restrito</h1>
          <p>Esta área está disponível somente para a administração.</p>
          <Button to="/minhas-aulas">Ir para minhas aulas</Button>
          <Link to="/">Voltar ao site</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-brand" to="/">Learn to Learn</Link>
          <nav className="admin-nav"><Link className="is-active" to="/admin/agenda">Agenda</Link><Link to="/admin/leads">Leads</Link></nav>
        </div>
        <div className="admin-header__account">
          <span>{user.name}</span>
          <button onClick={() => void signOut()} type="button">Sair</button>
        </div>
      </header>

      <div className="admin-shell">
        <section className="admin-intro">
          <div>
            <span className="admin-kicker">Painel do professor</span>
            <h1>Agenda de aulas</h1>
            <p>Publique novos horários e acompanhe reservas sem expor dados dos alunos na agenda pública.</p>
          </div>
          <div aria-label="Resumo da agenda" className="admin-summary">
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status}><strong>{summary[status] || 0}</strong><span>{label}</span></div>
            ))}
          </div>
        </section>

        {feedback && <p className={`admin-feedback admin-feedback--${feedback.tone}`} role="status">{feedback.message}</p>}

        <section className="admin-layout">
          <div className="admin-create-column">
            <aside className="admin-create">
              <h2>Novo horário</h2>
              <p>A aula experimental pode durar no máximo 60 minutos.</p>
              <form onSubmit={handleCreate}>
              <div className="form-field">
                <label htmlFor="slot-start">Data e hora</label>
                <input id="slot-start" name="startsAt" onChange={updateField} required type="datetime-local" value={form.startsAt} />
              </div>
              <div className="form-field">
                <label htmlFor="slot-duration">Duração</label>
                <select id="slot-duration" name="durationMinutes" onChange={updateField} value={form.durationMinutes}>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="slot-status">Estado inicial</label>
                <select id="slot-status" name="status" onChange={updateField} value={form.status}>
                  <option value="AVAILABLE">Disponível</option>
                  <option value="BLOCKED">Bloqueado</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="slot-notes">Observações (opcional)</label>
                <textarea id="slot-notes" maxLength="2000" name="notes" onChange={updateField} value={form.notes} />
              </div>
                <Button disabled={busyAction !== null} type="submit">{busyAction === 'create' ? 'Criando...' : 'Criar horário'}</Button>
              </form>
            </aside>

            <aside className="admin-create">
              <h2>Nova aula regular</h2>
              <p>Atribua diretamente a um aluno convertido.</p>
              <form onSubmit={handleCreateRegular}>
              <div className="form-field">
                <label htmlFor="regular-student">Aluno convertido</label>
                <select id="regular-student" name="studentId" onChange={updateRegularField} required value={regularForm.studentId}>
                  <option value="">Selecione um aluno</option>
                  {convertedStudents.data.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}
                </select>
                {convertedStudents.status === 'ready' && !convertedStudents.data.length && <small>Nenhum aluno convertido disponível.</small>}
                {convertedStudents.status === 'error' && <small>Não foi possível carregar os alunos convertidos.</small>}
              </div>
              <div className="form-field">
                <label htmlFor="regular-start">Data e hora</label>
                <input id="regular-start" name="startsAt" onChange={updateRegularField} required type="datetime-local" value={regularForm.startsAt} />
              </div>
              <div className="form-field">
                <label htmlFor="regular-duration">Duração</label>
                <select id="regular-duration" name="durationMinutes" onChange={updateRegularField} value={regularForm.durationMinutes}>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="regular-notes">Observação (opcional)</label>
                <textarea id="regular-notes" maxLength="2000" name="notes" onChange={updateRegularField} value={regularForm.notes} />
              </div>
                <Button disabled={busyAction !== null || convertedStudents.status !== 'ready' || !convertedStudents.data.length} type="submit">{busyAction === 'create-regular' ? 'Criando...' : 'Criar aula regular'}</Button>
              </form>
            </aside>
          </div>

          <section className="admin-schedule" aria-labelledby="admin-schedule-title">
            <div className="admin-schedule__heading">
              <div><h2 id="admin-schedule-title">Horários</h2><p>{schedule.data.length} registros na agenda</p></div>
              <Button disabled={schedule.status === 'loading'} onClick={() => void loadSchedule()} type="button" variant="outline">Atualizar</Button>
            </div>

            {schedule.status === 'loading' && <StatePanel title="Carregando agenda..."><span className="schedule-spinner" /></StatePanel>}
            {schedule.status === 'error' && <StatePanel title="Não foi possível carregar a agenda." tone="error"><p>{schedule.error?.message}</p><Button onClick={() => void loadSchedule()} type="button">Tentar novamente</Button></StatePanel>}
            {schedule.status === 'ready' && !schedule.data.length && <StatePanel title="Nenhum horário criado." tone="dashed"><p>Use o formulário para publicar o primeiro horário.</p></StatePanel>}
            {schedule.status === 'ready' && schedule.data.length > 0 && (
              <div className="admin-slot-list">
                {schedule.data.map((slot) => (
                  <article className="admin-slot" key={slot.id}>
                    <div className="admin-slot__time">
                      <strong>{formatScheduleDate(slot.startsAt)}</strong>
                      <span>{formatTime(slot.startsAt)} · {slot.durationMinutes} minutos</span>
                    </div>
                    <div className="admin-slot__badges">
                      <span className={`admin-type admin-type--${(slot.type || 'TRIAL').toLowerCase()}`}>{typeLabels[slot.type || 'TRIAL']}</span>
                      <span className={`admin-status admin-status--${slot.booking?.cancellation ? 'cancelled' : slot.status.toLowerCase()}`}>{slot.booking?.cancellation ? 'Cancelado' : statusLabels[slot.status]}</span>
                    </div>
                    <div className="admin-slot__details">
                      {slot.booking ? (
                        <>
                          <strong>{slot.booking.student.name}</strong>
                          <span>{slot.booking.student.email} · {slot.booking.student.phone}</span>
                          {slot.booking.cancellation && <span>Cancelado por {slot.booking.cancellation.cancelledBy}: {slot.booking.cancellation.reason}</span>}
                        </>
                      ) : <span>{slot.notes || 'Sem observações.'}</span>}
                    </div>
                    <div className="admin-slot__actions">
                      {slot.status === 'AVAILABLE' && <Button disabled={busyAction !== null} onClick={() => void changeStatus(slot, 'BLOCKED')} type="button" variant="outline">Bloquear</Button>}
                      {slot.status === 'BLOCKED' && !slot.booking?.cancellation && <Button disabled={busyAction !== null} onClick={() => void changeStatus(slot, 'AVAILABLE')} type="button">Liberar</Button>}
                      {slot.status === 'BOOKED' && (
                        <>
                          <Button disabled={busyAction !== null} onClick={() => void changeStatus(slot, 'COMPLETED')} type="button">Concluir aula</Button>
                          <Button disabled={busyAction !== null} onClick={() => openCancellation(slot)} type="button" variant="outline">Cancelar reserva</Button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>

      {cancelDialog && (
        <ConfirmDialog
          busy={busyAction === `cancel-${cancelDialog.booking.id}`}
          confirmDisabled={cancellationReason.trim().length < 5}
          confirmLabel="Cancelar reserva"
          onCancel={() => { setCancelDialog(null); setCancellationReason('') }}
          onConfirm={() => void confirmCancellation()}
          title="Cancelar reserva administrativamente"
        >
          <p>Informe o motivo do cancelamento. Ele ficará registrado e será enviado ao aluno.</p>
          <div className="form-field">
            <label htmlFor="cancellation-reason">Motivo</label>
            <textarea
              autoFocus
              id="cancellation-reason"
              maxLength="500"
              minLength="5"
              onChange={(event) => setCancellationReason(event.target.value)}
              required
              value={cancellationReason}
            />
          </div>
        </ConfirmDialog>
      )}
    </main>
  )
}
