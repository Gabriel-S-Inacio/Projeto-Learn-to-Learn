import './ui.css'

export default function StatePanel({ children, className = '', icon: Icon, title, tone = 'default' }) {
  return (
    <div className={`state-panel state-panel--${tone} ${className}`.trim()}>
      {Icon && <Icon className="state-panel__icon" size={32} />}
      {title && <h2 className="state-panel__title">{title}</h2>}
      {children}
    </div>
  )
}
