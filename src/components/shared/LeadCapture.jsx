import { useState } from 'react'
import Button from '../ui/Button'
import Eyebrow from '../ui/Eyebrow'
import { createLead } from '../../services/leadService'

const initialForm = { name: '', email: '', phone: '' }

export default function LeadCapture() {
  const [form, setForm] = useState(initialForm)
  const [state, setState] = useState({ status: 'idle', message: '' })

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setState({ status: 'loading', message: '' })
    try {
      await createLead(form)
      setForm(initialForm)
      setState({ status: 'success', message: 'Interesse registrado. Vamos entrar em contato com você.' })
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  return (
    <section className="lead-capture container" aria-labelledby="lead-capture-title">
      <div className="lead-capture__copy">
        <Eyebrow>Comece uma conversa</Eyebrow>
        <h2 id="lead-capture-title">Quer entender qual é o seu próximo passo?</h2>
        <p>Deixe seus dados e converse com a gente sem criar uma conta agora.</p>
      </div>
      <form className="lead-capture__form" onSubmit={submit}>
        <div className="form-field"><label htmlFor="lead-name">Nome</label><input autoComplete="name" id="lead-name" name="name" onChange={updateField} required value={form.name} /></div>
        <div className="form-field"><label htmlFor="lead-email">E-mail</label><input autoComplete="email" id="lead-email" name="email" onChange={updateField} required type="email" value={form.email} /></div>
        <div className="form-field"><label htmlFor="lead-phone">Telefone</label><input autoComplete="tel" id="lead-phone" name="phone" onChange={updateField} required type="tel" value={form.phone} /></div>
        {state.message && <p className={state.status === 'success' ? 'form-success' : 'form-error'} role="status">{state.message}</p>}
        <Button disabled={state.status === 'loading'} type="submit">{state.status === 'loading' ? 'Enviando...' : 'Quero saber mais'}</Button>
      </form>
    </section>
  )
}
