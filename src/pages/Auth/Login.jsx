import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Eyebrow from '../../components/ui/Eyebrow'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import TurnstileWidget from '../../components/security/TurnstileWidget'
import './AuthPage.css'

function safeRedirect(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  const { signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await signIn({ ...form, turnstileToken })
      const redirect = safeRedirect(params.get('redirect'))
      const slotId = params.get('slotId')
      if (user.role === 'ADMIN') navigate('/admin/agenda', { replace: true })
      else if (redirect) navigate(`${redirect}${slotId ? `?slotId=${encodeURIComponent(slotId)}` : ''}`, { replace: true })
      else navigate('/minhas-aulas', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      setTurnstileToken('')
      setChallengeKey((current) => current + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const registerSearch = new URLSearchParams()
  for (const key of ['redirect', 'slotId']) if (params.get(key)) registerSearch.set(key, params.get(key))

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <Eyebrow>Boas-vindas</Eyebrow>
          <h1>Entre para continuar sua jornada.</h1>
          <p>Acesse suas aulas, confirme um horário ou administre a agenda com a mesma conta.</p>
        </section>
        <section className="auth-card" aria-labelledby="login-title">
          <h2 id="login-title">Entrar</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field"><label htmlFor="login-email">E-mail</label><input autoComplete="email" id="login-email" name="email" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></div>
            <div className="form-field"><label htmlFor="login-password">Senha</label><input autoComplete="current-password" id="login-password" minLength="8" name="password" onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} /></div>
            <TurnstileWidget action="login" key={challengeKey} onError={() => setError('Não foi possível validar a proteção antibot.')} onVerify={setTurnstileToken} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button disabled={submitting || !turnstileToken} type="submit">{submitting ? 'Entrando...' : 'Entrar'}</Button>
          </form>
          <p className="auth-card__alternate">Ainda não tem uma conta? <Link to={`/cadastro${registerSearch.size ? `?${registerSearch}` : ''}`}>Cadastre-se</Link></p>
        </section>
      </div>
    </main>
  )
}

