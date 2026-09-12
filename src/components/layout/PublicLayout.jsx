import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function PublicLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 })
  }, [pathname])

  return (
    <div className="site-shell">
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}
