import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import Eyebrow from '../../components/ui/Eyebrow'
import StatePanel from '../../components/ui/StatePanel'
import { useAuth } from '../../context/AuthContext'
import { changePassword, updateProfile } from '../../services/authService'
import './Account.css'

export default function Account() {
  const { status, user, setUser } = useAuth()
  const [profile, setProfile] = useState({ email: '', phone: '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [profileFeedback, setProfileFeedback] = useState(null)
  const [passwordFeedback, setPasswordFeedback] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (user) setProfile({ email: user.email, phone: user.phone || '' })
  }, [user])

  function updateProfileField(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updatePasswordField(event) {
    setPasswords((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileFeedback(null)
    setBusy('profile')
    try {
      const result = await updateProfile(profile)
      setUser(result.user)
      setProfile({ email: result.user.email, phone: result.user.phone || '' })
      setProfileFeedback({ tone: 'success', message: 'Dados da conta atualizados com sucesso.' })
    } catch (error) {
      setProfileFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusy(null)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordFeedback(null)
    if (passwords.newPassword !== passwords.confirmation) {
      setPasswordFeedback({ tone: 'error', message: 'A confirmação da nova senha não confere.' })
      return
    }
    setBusy('password')
    try {
      const result = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' })
      setPasswordFeedback({ tone: 'success', message: result.message })
    } catch (error) {
      setPasswordFeedback({ tone: 'error', message: error.message })
    } finally {
      setBusy(null)
    }
  }

  if (status === 'loading') return <main className="account-page"><StatePanel title="Carregando sua conta..." /></main>
  if (status === 'anonymous') return <main className="account-page"><StatePanel title="Entre para acessar sua conta."><Button to="/login?redirect=/minha-conta">Entrar</Button></StatePanel></main>

  return (
    <main className="account-page">
      <section className="account-heading container container--narrow">
        <Eyebrow>Minha conta</Eyebrow>
        <h1>Seus dados e sua segurança.</h1>
        <p>Atualize apenas as informações necessárias para manter seu acesso e seu contato em dia.</p>
      </section>
      <div className="account-grid container container--narrow">
        <section className="account-card" aria-labelledby="account-data-title">
          <div><span className="account-card__kicker">Dados da conta</span><h2 id="account-data-title">Informações de contato</h2></div>
          <form className="account-form" onSubmit={handleProfileSubmit}>
            <div className="form-field"><label htmlFor="account-name">Nome</label><input disabled id="account-name" value={user.name} /></div>
            <div className="form-field"><label htmlFor="account-email">E-mail</label><input autoComplete="email" disabled={busy !== null} id="account-email" name="email" onChange={updateProfileField} required type="email" value={profile.email} /></div>
            <div className="form-field"><label htmlFor="account-phone">Telefone {user.role === 'ADMIN' && <small>(opcional)</small>}</label><input autoComplete="tel" disabled={busy !== null} id="account-phone" minLength={user.role === 'STUDENT' ? 8 : undefined} name="phone" onChange={updateProfileField} required={user.role === 'STUDENT'} type="tel" value={profile.phone} /></div>
            {profileFeedback && <p className={`form-${profileFeedback.tone}`} role={profileFeedback.tone === 'error' ? 'alert' : 'status'}>{profileFeedback.message}</p>}
            <Button disabled={busy !== null} type="submit">{busy === 'profile' ? 'Salvando...' : 'Salvar alterações'}</Button>
          </form>
        </section>

        <section className="account-card" aria-labelledby="account-security-title">
          <div><span className="account-card__kicker">Segurança</span><h2 id="account-security-title">Alterar senha</h2></div>
          <form className="account-form" onSubmit={handlePasswordSubmit}>
            <div className="form-field"><label htmlFor="current-password">Senha atual</label><input autoComplete="current-password" disabled={busy !== null} id="current-password" name="currentPassword" onChange={updatePasswordField} required type="password" value={passwords.currentPassword} /></div>
            <div className="form-field"><label htmlFor="new-password">Nova senha</label><input autoComplete="new-password" disabled={busy !== null} id="new-password" minLength="8" name="newPassword" onChange={updatePasswordField} required type="password" value={passwords.newPassword} /></div>
            <div className="form-field"><label htmlFor="confirm-password">Confirmar nova senha</label><input autoComplete="new-password" disabled={busy !== null} id="confirm-password" minLength="8" name="confirmation" onChange={updatePasswordField} required type="password" value={passwords.confirmation} /></div>
            {passwordFeedback && <p className={`form-${passwordFeedback.tone}`} role={passwordFeedback.tone === 'error' ? 'alert' : 'status'}>{passwordFeedback.message}</p>}
            <Button disabled={busy !== null} type="submit">{busy === 'password' ? 'Alterando...' : 'Alterar senha'}</Button>
          </form>
        </section>
      </div>
    </main>
  )
}
