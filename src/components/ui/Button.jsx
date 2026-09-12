import { Link } from 'react-router-dom'
import './ui.css'

export default function Button({
  children,
  className = '',
  disabled = false,
  to,
  type = 'button',
  variant = 'solid',
  ...props
}) {
  const classes = `button button--${variant} ${className}`.trim()

  if (to) {
    return <Link className={classes} to={to} {...props}>{children}</Link>
  }

  return <button className={classes} disabled={disabled} type={type} {...props}>{children}</button>
}
