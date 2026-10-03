import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import { useAuth } from '../../context/AuthContext'
import './AuthPage.css'
import { trackEvent } from '../../services/analyticsService'

function safeRedirect(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const trackedStart = useRef(false)
  const { signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function trackStart() {
    if (trackedStart.current) return
    trackedStart.current = true
    void trackEvent('registration_started', { metadata: { form: 'student_registration' } }).catch(() => undefined)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signUp(form)
      const redirect = safeRedirect(params.get('redirect')) || '/minhas-aulas'
      const slotId = params.get('slotId')
      navigate(`${redirect}${slotId ? `?slotId=${encodeURIComponent(slotId)}` : ''}`, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const loginSearch = new URLSearchParams()
  for (const key of ['redirect', 'slotId']) if (params.get(key)) loginSearch.set(key, params.get(key))

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <Eyebrow>Área do aluno</Eyebrow>
          <h1>Crie sua conta para começar.</h1>
          <p>Seu cadastro guarda apenas os dados necessários para identificar e organizar sua aula experimental.</p>
        </section>
        <section className="auth-card" aria-labelledby="register-title">
          <h2 id="register-title">Cadastro</h2>
          <form className="auth-form" onFocus={trackStart} onSubmit={handleSubmit}>
            <div className="form-field"><label htmlFor="register-name">Nome</label><input autoComplete="name" id="register-name" name="name" onChange={updateField} required value={form.name} /></div>
            <div className="form-field"><label htmlFor="register-email">E-mail</label><input autoComplete="email" id="register-email" name="email" onChange={updateField} required type="email" value={form.email} /></div>
            <div className="form-field"><label htmlFor="register-phone">Telefone</label><input autoComplete="tel" id="register-phone" name="phone" onChange={updateField} required type="tel" value={form.phone} /></div>
            <div className="form-field"><label htmlFor="register-password">Senha</label><input autoComplete="new-password" id="register-password" minLength="8" name="password" onChange={updateField} required type="password" value={form.password} /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button disabled={submitting} type="submit">{submitting ? 'Criando conta...' : 'Criar conta'}</Button>
          </form>
          <p className="auth-card__alternate">Já tem uma conta? <Link to={`/login${loginSearch.size ? `?${loginSearch}` : ''}`}>Entrar</Link></p>
        </section>
      </div>
    </main>
  )
}
