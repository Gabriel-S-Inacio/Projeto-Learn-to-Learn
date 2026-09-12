import './shared.css'

export default function QuotePanel({ children, eyebrow }) {
  return (
    <aside className="quote-panel">
      {eyebrow && <p className="quote-panel__eyebrow">{eyebrow}</p>}
      <p className="quote-panel__text">{children}</p>
    </aside>
  )
}
