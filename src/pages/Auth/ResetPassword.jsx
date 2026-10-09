import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import { resetPassword } from '../../services/authService'
import './AuthPage.css'

export default function ResetPassword() {
  const token = new URLSearchParams(useLocation().search).get('token') || ''
  const [form, setForm] = useState({ password: '', confirmation: '' })
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    if (form.password !== form.confirmation) {
      setFeedback({ tone: 'error', message: 'A confirmação da senha não confere.' })
      return
    }
    setSubmitting(true)
    try {
      const result = await resetPassword(token, form.password)
      setCompleted(true)
      setForm({ password: '', confirmation: '' })
      setFeedback({ tone: 'success', message: result.message })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <Eyebrow>Nova senha</Eyebrow>
          <h1>Crie um novo acesso seguro.</h1>
          <p>Depois da alteração, suas sessões anteriores serão encerradas.</p>
        </section>
        <section className="auth-card" aria-labelledby="reset-password-title">
          <h2 id="reset-password-title">Redefinir senha</h2>
          {!token && <p className="form-error" role="alert">Este link de recuperação é inválido.</p>}
          {!completed && token && (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field"><label htmlFor="reset-password">Nova senha</label><input autoComplete="new-password" disabled={submitting} id="reset-password" minLength="8" name="password" onChange={updateField} required type="password" value={form.password} /></div>
              <div className="form-field"><label htmlFor="reset-confirmation">Confirmar nova senha</label><input autoComplete="new-password" disabled={submitting} id="reset-confirmation" minLength="8" name="confirmation" onChange={updateField} required type="password" value={form.confirmation} /></div>
              {feedback && <p className={`form-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
              <Button disabled={submitting} type="submit">{submitting ? 'Atualizando...' : 'Atualizar senha'}</Button>
            </form>
          )}
          {completed && <div className="auth-card__actions"><p className="form-success" role="status">{feedback?.message}</p><Button to="/login">Voltar para o login</Button></div>}
          {!completed && <p className="auth-card__alternate"><Link to="/login">Voltar para o login</Link></p>}
        </section>
      </div>
    </main>
  )
}
