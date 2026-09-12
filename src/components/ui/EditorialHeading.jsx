import './ui.css'

export default function EditorialHeading({ as: Tag = 'h2', children, className = '', size = 'large' }) {
  return <Tag className={`editorial-heading editorial-heading--${size} ${className}`.trim()}>{children}</Tag>
}
