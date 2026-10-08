import { useEffect, useRef, useState } from 'react'

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
const scriptId = 'cloudflare-turnstile-script'

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(scriptId)
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function TurnstileWidget({ action, onError, onVerify }) {
  const containerRef = useRef(null)
  const callbacksRef = useRef({ onError, onVerify })
  const [status, setStatus] = useState(siteKey ? 'loading' : 'unavailable')
  callbacksRef.current = { onError, onVerify }

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined
    let widgetId
    let cancelled = false
    void loadTurnstile().then(() => {
      if (cancelled || !containerRef.current) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: 'light',
        size: 'flexible',
        callback: (token) => {
          setStatus('ready')
          callbacksRef.current.onVerify(token)
        },
        'expired-callback': () => {
          setStatus('expired')
          callbacksRef.current.onVerify('')
        },
        'error-callback': () => {
          setStatus('error')
          callbacksRef.current.onVerify('')
          callbacksRef.current.onError()
        },
      })
    }).catch(() => {
      if (cancelled) return
      setStatus('error')
      callbacksRef.current.onError()
    })
    return () => {
      cancelled = true
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [action])

  if (!siteKey) return <p className="turnstile-status turnstile-status--error">Proteção antibot não configurada.</p>
  return (
    <div className="turnstile-field">
      <div ref={containerRef} />
      {status === 'loading' && <small>Carregando verificação de segurança...</small>}
      {status === 'expired' && <small>A verificação expirou. Conclua novamente.</small>}
      {status === 'error' && <small>Não foi possível carregar a verificação de segurança.</small>}
    </div>
  )
}

