import Button from './Button'

export default function ConfirmDialog({ children, confirmDisabled = false, confirmLabel = 'Confirmar', busy = false, onCancel, onConfirm, title }) {
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
      <section aria-labelledby="dialog-title" aria-modal="true" className="dialog-card" role="dialog">
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog-card__content">{children}</div>
        <div className="dialog-card__actions">
          <Button disabled={busy} onClick={onCancel} type="button" variant="outline">Voltar</Button>
          <Button disabled={busy || confirmDisabled} onClick={onConfirm} type="button">{busy ? 'Aguarde...' : confirmLabel}</Button>
        </div>
      </section>
    </div>
  )
}
