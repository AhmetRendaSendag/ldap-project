import { useEffect, useState } from 'react'
import AddUserForm from '../components/AddUserForm.jsx'
import UserTable from '../components/UserTable.jsx'
import * as api from '../api.js'

export default function UsersPage({ accessToken, onLogout }) {
  const [users, setUsers] = useState([])
  const [listStatus, setListStatus] = useState('')
  const [listStatusClass, setListStatusClass] = useState('')
  const [addStatus, setAddStatus] = useState('')
  const [addStatusClass, setAddStatusClass] = useState('')

  async function loadUsers() {
    setListStatus('Yükleniyor...')
    setListStatusClass('')
    try {
      const data = await api.listUsers(accessToken)
      setUsers(data.users)
      setListStatus('Bağlantı başarılı.')
      setListStatusClass('success')
    } catch (e) {
      setListStatus('Hata: ' + e.message)
      setListStatusClass('error')
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(form) {
    try {
      const data = await api.createUser(accessToken, form)
      setAddStatus(data.message)
      setAddStatusClass('success')
      await loadUsers()
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
      await loadUsers()
    } catch (e) {
      alert('Hata: ' + e.message)
    }
  }

  async function handleDelete(uid) {
    if (!confirm('Silmek istediğine emin misin? (' + uid + ')')) return
    try {
      await api.deleteUser(accessToken, uid)
      await loadUsers()
    } catch (e) {
      alert('Hata: ' + e.message)
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>LDAP Kullanıcı Yönetimi</h1>
        <button onClick={onLogout}>Çıkış Yap</button>
      </div>
      <p className={listStatusClass}>{listStatus}</p>
      <AddUserForm onAdd={handleAdd} status={addStatus} statusClass={addStatusClass} />
      <UserTable users={users} onUpdate={handleUpdate} onDelete={handleDelete} />
    </>
  )
}
