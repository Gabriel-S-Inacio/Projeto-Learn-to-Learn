import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import { forgotPassword } from '../../services/authService'
import './AuthPage.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    setSubmitting(true)
    try {
      const result = await forgotPassword(email)
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
          <Eyebrow>Recuperação de acesso</Eyebrow>
          <h1>Vamos ajudar você a voltar.</h1>
          <p>Informe o e-mail da sua conta. Se ela existir, enviaremos um link válido por 30 minutos.</p>
        </section>
        <section className="auth-card" aria-labelledby="forgot-password-title">
          <h2 id="forgot-password-title">Esqueci minha senha</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="forgot-password-email">E-mail</label>
              <input autoComplete="email" disabled={submitting} id="forgot-password-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </div>
            {feedback && <p className={`form-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
            <Button disabled={submitting} type="submit">{submitting ? 'Enviando...' : 'Enviar instruções'}</Button>
          </form>
          <p className="auth-card__alternate"><Link to="/login">Voltar para o login</Link></p>
        </section>
      </div>
    </main>
  )
}
