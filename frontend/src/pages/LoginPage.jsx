import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm.jsx'
import * as api from '../api.js'

export default function LoginPage({ onAuthenticated }) {
  const [status, setStatus] = useState('')
  const [statusClass, setStatusClass] = useState('')
  const navigate = useNavigate()

  async function handleLogin(username, password) {
    setStatus('Giriş yapılıyor...')
    setStatusClass('')
    try {
      const data = await api.login(username, password)
      onAuthenticated(data.access_token)
      navigate('/')
    } catch (e) {
      setStatus('Bağlantı hatası: ' + e.message)
      setStatusClass('error')
    }
  }

  return (
    <>
      <h1>LDAP Kullanıcı Yönetimi</h1>
      <LoginForm onLogin={handleLogin} status={status} statusClass={statusClass} />
    </>
  )
}
