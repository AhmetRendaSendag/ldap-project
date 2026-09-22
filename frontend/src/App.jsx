import { useState } from 'react'
import LoginForm from './components/LoginForm.jsx'
import AddUserForm from './components/AddUserForm.jsx'
import UserTable from './components/UserTable.jsx'
import * as api from './api.js'

export default function App() {
  const [accessToken, setAccessToken] = useState(null)
  const [users, setUsers] = useState([])
  const [loginStatus, setLoginStatus] = useState('')
  const [loginStatusClass, setLoginStatusClass] = useState('')
  const [addStatus, setAddStatus] = useState('')
  const [addStatusClass, setAddStatusClass] = useState('')

  async function loadUsers(token) {
    setLoginStatus('Yükleniyor...')
    setLoginStatusClass('')
    try {
      const data = await api.listUsers(token)
      setUsers(data.users)
      setLoginStatus('Bağlantı başarılı.')
      setLoginStatusClass('success')
    } catch (e) {
      setLoginStatus('Hata: ' + e.message)
      setLoginStatusClass('error')
    }
  }

  async function handleLogin(username, password) {
    setLoginStatus('Giriş yapılıyor...')
    setLoginStatusClass('')
    try {
      const data = await api.login(username, password)
      setAccessToken(data.access_token)
      setLoginStatus('Giriş başarılı.')
      setLoginStatusClass('success')
      await loadUsers(data.access_token)
    } catch (e) {
      setAccessToken(null)
      setLoginStatus('Bağlantı hatası: ' + e.message)
      setLoginStatusClass('error')
    }
  }

  async function handleAdd(form) {
    try {
      const data = await api.createUser(accessToken, form)
      setAddStatus(data.message)
      setAddStatusClass('success')
      await loadUsers(accessToken)
      return true
    } catch (e) {
      setAddStatus('Hata: ' + e.message)
      setAddStatusClass('error')
      return false
    }
  }

  async function handleUpdate(uid, updates) {
    try {
      await api.updateUser(accessToken, uid, updates)
      await loadUsers(accessToken)
    } catch (e) {
      alert('Hata: ' + e.message)
    }
  }

  async function handleDelete(uid) {
    if (!confirm('Silmek istediğine emin misin? (' + uid + ')')) return
    try {
      await api.deleteUser(accessToken, uid)
      await loadUsers(accessToken)
    } catch (e) {
      alert('Hata: ' + e.message)
    }
  }

  return (
    <>
      <h1>LDAP Kullanıcı Yönetimi</h1>
      <LoginForm onLogin={handleLogin} status={loginStatus} statusClass={loginStatusClass} />
      <AddUserForm onAdd={handleAdd} status={addStatus} statusClass={addStatusClass} />
      <UserTable users={users} onUpdate={handleUpdate} onDelete={handleDelete} />
    </>
  )
}
