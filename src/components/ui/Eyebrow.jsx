import './ui.css'

export default function Eyebrow({ children, className = '', light = false }) {
  return <p className={`eyebrow ${light ? 'eyebrow--light' : ''} ${className}`.trim()}>{children}</p>
}
