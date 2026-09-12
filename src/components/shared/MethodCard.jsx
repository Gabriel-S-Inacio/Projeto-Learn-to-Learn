import './shared.css'

export default function MethodCard({ icon: Icon, index, text, title, variant = 'default' }) {
  return (
    <article className={`method-card method-card--${variant}`}>
      <div className="method-card__top">
        <span className="method-card__index">{index}</span>
        <span className="method-card__icon"><Icon size={21} /></span>
      </div>
      <h3 className="method-card__title">{title}</h3>
      <p className="method-card__text">{text}</p>
    </article>
  )
}
