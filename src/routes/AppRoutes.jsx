import { Route, Routes } from 'react-router-dom'
import PublicLayout from '../components/layout/PublicLayout'
import About from '../pages/About/About'
import AdminSchedule from '../pages/AdminSchedule/AdminSchedule'
import AdminLeads from '../pages/AdminLeads/AdminLeads'
import Contents from '../pages/Contents/Contents'
import Home from '../pages/Home/Home'
import HowItWorks from '../pages/HowItWorks/HowItWorks'
import Method from '../pages/Method/Method'
import MyLessons from '../pages/MyLessons/MyLessons'
import NotFound from '../pages/NotFound/NotFound'
import Schedule from '../pages/Schedule/Schedule'
import Login from '../pages/Auth/Login'
import Register from '../pages/Auth/Register'
import ForgotPassword from '../pages/Auth/ForgotPassword'
import ResetPassword from '../pages/Auth/ResetPassword'
import Account from '../pages/Account/Account'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<Home />} index />
        <Route element={<Method />} path="metodo" />
        <Route element={<HowItWorks />} path="como-funciona" />
        <Route element={<Contents />} path="conteudos" />
        <Route element={<About />} path="sobre" />
        <Route element={<Schedule />} path="agendar" />
        <Route element={<MyLessons />} path="minhas-aulas" />
        <Route element={<Login />} path="login" />
        <Route element={<Register />} path="cadastro" />
        <Route element={<ForgotPassword />} path="forgot-password" />
        <Route element={<ResetPassword />} path="reset-password" />
        <Route element={<Account />} path="minha-conta" />
      </Route>
      <Route element={<AdminSchedule />} path="admin/agenda" />
      <Route element={<AdminLeads />} path="admin/leads" />
      <Route element={<NotFound />} path="404" />
      <Route element={<NotFound />} path="*" />
    </Routes>
  )
}
