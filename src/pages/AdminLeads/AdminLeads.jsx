import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StatePanel from '../../components/ui/StatePanel'
import { useAuth } from '../../context/AuthContext'
import { getAdminLeads, getLeadMetrics, reopenLead, updateLeadStatus } from '../../services/adminLeadService'
import './AdminLeads.css'

const statusLabels = {
  NEW: 'Novo', INTERESTED: 'Interessado', SCHEDULED: 'Agendado',
  TRIAL_COMPLETED: 'Aula concluída', CONVERTED: 'Convertido', LOST: 'Perdido',
}
const sourceLabels = { FORM: 'Formulário', REGISTER: 'Cadastro', SCHEDULE: 'Agenda', MANUAL: 'Manual' }

export default function AdminLeads() {
  const { status: authStatus, user, signOut } = useAuth()
  const [filters, setFilters] = useState({ days: '30', status: '', source: '' })
  const [state, setState] = useState({ leads: [], metrics: null, status: 'loading', error: null })
  const [busy, setBusy] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [correction, setCorrection] = useState(null)

  const load = useCallback(async () => {
    if (authStatus !== 'authenticated' || user.role !== 'ADMIN') return
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const [leads, metrics] = await Promise.all([getAdminLeads(filters), getLeadMetrics({ days: filters.days })])
      setState({ leads, metrics, status: 'ready', error: null })
    } catch (error) {
      setState({ leads: [], metrics: null, status: 'error', error })
    }
  }, [authStatus, filters, user])

  useEffect(() => { void load() }, [load])

  async function changeStatus(lead, status) {
    setBusy(lead.id)
    setFeedback(null)
    try {
      await updateLeadStatus(lead.id, status)
      setFeedback({ tone: 'success', message: `${lead.name} agora está como ${statusLabels[status].toLowerCase()}.` })
      await load()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusy(null)
    }
  }

  async function correctStatus() {
    if (!correction?.status || correction.reason.trim().length < 5) return
    setBusy(correction.lead.id)
    setFeedback(null)
    try {
      await reopenLead(correction.lead.id, correction.status, correction.reason.trim())
      setFeedback({
        tone: 'success',
        message: `Status de ${correction.lead.name} corrigido para ${statusLabels[correction.status].toLowerCase()}.`,
      })
      setCorrection(null)
      await load()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusy(null)
    }
  }

  if (authStatus === 'loading') return <main className="admin-gate"><StatePanel title="Verificando acesso..."><span className="schedule-spinner" /></StatePanel></main>
  if (authStatus === 'anonymous' || user.role !== 'ADMIN') {
    return <main className="admin-gate"><section className="admin-gate__content"><span className="admin-brand">Learn to Learn</span><h1>Acesso administrativo</h1><p>Entre com uma conta administrativa para consultar os leads.</p><Button to="/login?redirect=/admin/leads">Entrar</Button><Link to="/">Voltar ao site</Link></section></main>
  }

  const metrics = state.metrics?.metrics
  const funnel = state.metrics?.funnel
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><Link className="admin-brand" to="/">Learn to Learn</Link><nav className="admin-nav"><Link to="/admin/agenda">Agenda</Link><Link className="is-active" to="/admin/leads">Leads</Link><Link to="/minha-conta">Minha conta</Link></nav></div>
        <div className="admin-header__account"><span>{user.name}</span><button onClick={() => void signOut()} type="button">Sair</button></div>
      </header>

      <div className="admin-shell">
        <section className="admin-intro admin-intro--leads">
          <div><span className="admin-kicker">Funil comercial</span><h1>Leads e conversão</h1><p>Acompanhe o caminho entre o primeiro interesse, a aula experimental e o fechamento comercial.</p></div>
          <div className="lead-period"><label htmlFor="lead-period">Período</label><select id="lead-period" onChange={(event) => setFilters((current) => ({ ...current, days: event.target.value }))} value={filters.days}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></div>
        </section>

        {metrics && <section aria-label="Indicadores de conversão" className="lead-metrics">{[
          ['Novos leads', metrics.leads], ['Agendamentos', metrics.bookings], ['Aulas concluídas', metrics.trials], ['Conversões', metrics.conversions],
        ].map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>}

        {funnel && <section className="lead-funnel"><div><h2>Funil</h2><p>Coorte de leads que entrou no período selecionado.</p></div><div className="lead-funnel__steps">{[
          ['Leads', funnel.leads], ['Agendados', funnel.scheduled], ['Aula concluída', funnel.trialCompleted], ['Convertidos', funnel.converted],
        ].map(([label, value], index) => <article key={label}><small>0{index + 1}</small><strong>{value}</strong><span>{label}</span></article>)}</div><p className="lead-funnel__rate"><strong>{funnel.conversionRate}%</strong> de conversão sobre os leads da coorte.</p></section>}

        <section className="lead-panel">
          <div className="lead-panel__heading"><div><h2>Leads</h2><p>{state.leads.length} registros no período</p></div><div className="lead-filters"><select aria-label="Filtrar por status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por origem" onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} value={filters.source}><option value="">Todas as origens</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
          {feedback && <p className={`admin-feedback admin-feedback--${feedback.tone}`} role="status">{feedback.message}</p>}
          {state.status === 'loading' && <StatePanel title="Carregando leads..."><span className="schedule-spinner" /></StatePanel>}
          {state.status === 'error' && <StatePanel title="Não foi possível carregar os leads." tone="error"><p>{state.error?.message}</p><Button onClick={() => void load()} type="button">Tentar novamente</Button></StatePanel>}
          {state.status === 'ready' && !state.leads.length && <StatePanel title="Nenhum lead neste período." tone="dashed" />}
          {state.status === 'ready' && state.leads.length > 0 && <div className="lead-list">{state.leads.map((lead) => (
            <article className="lead-row" key={lead.id}>
              <div className="lead-row__person"><strong>{lead.name}</strong><a href={`mailto:${lead.email}`}>{lead.email}</a><a href={`tel:${lead.phone}`}>{lead.phone}</a></div>
              <div className="lead-row__source"><span>{sourceLabels[lead.source]}</span>{lead.utmSource && <small>{[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ')}</small>}</div>
              <div><span className={`lead-status lead-status--${lead.status.toLowerCase()}`}>{statusLabels[lead.status]}</span><small className="lead-row__date">{new Intl.DateTimeFormat('pt-BR').format(new Date(lead.createdAt))}</small></div>
              <div className="lead-row__user">{lead.userName ? <><strong>{lead.userName}</strong><span>Conta associada</span></> : <span>Sem conta</span>}</div>
              <div className="lead-row__action">{lead.allowedTransitions.length ? <select aria-label={`Alterar status de ${lead.name}`} disabled={busy !== null} onChange={(event) => { if (event.target.value) void changeStatus(lead, event.target.value) }} value=""><option value="">Alterar status</option>{lead.allowedTransitions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select> : lead.allowedCorrections?.length ? <Button className="lead-row__correction" disabled={busy !== null} onClick={() => setCorrection({ lead, status: lead.allowedCorrections[0], reason: '' })} type="button" variant="outline">Corrigir status</Button> : null}</div>
            </article>
          ))}</div>}
        </section>
      </div>
      {correction && <ConfirmDialog
        busy={busy === correction.lead.id}
        confirmDisabled={!correction.status || correction.reason.trim().length < 5}
        confirmLabel="Confirmar correção"
        onCancel={() => setCorrection(null)}
        onConfirm={() => void correctStatus()}
        title="Corrigir status final"
      >
        <p>Registre a correção de <strong>{correction.lead.name}</strong>. Esta ação ficará no histórico de auditoria.</p>
        <div className="lead-correction-form">
          <label>
            <span>Novo status</span>
            <select onChange={(event) => setCorrection((current) => ({ ...current, status: event.target.value }))} value={correction.status}>
              {correction.lead.allowedCorrections.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
          <label>
            <span>Motivo da correção</span>
            <textarea
              maxLength={500}
              onChange={(event) => setCorrection((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explique por que o status precisa ser corrigido"
              rows={4}
              value={correction.reason}
            />
          </label>
          <small>Mínimo de 5 caracteres.</small>
        </div>
      </ConfirmDialog>}
    </main>
  )
}
