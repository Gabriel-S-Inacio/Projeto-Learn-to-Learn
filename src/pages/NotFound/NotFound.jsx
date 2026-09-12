import { Alert, HomeIcon } from '../../assets/icons/Icons'
import Button from '../../components/ui/Button'
import './NotFound.css'

export default function NotFound() {
  return (
    <main className="not-found">
      <section className="not-found__card">
        <Alert className="not-found__icon" size={58} />
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Sorry, the page you are looking for doesn't exist.<br />It may have been moved or deleted.</p>
        <Button className="not-found__button" to="/"><HomeIcon size={16} /> Go Home</Button>
      </section>
    </main>
  )
}
