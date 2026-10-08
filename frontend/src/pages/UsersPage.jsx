import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AddUserForm from '../components/AddUserForm.jsx'
import UserTable from '../components/UserTable.jsx'
import * as api from '../api.js'

export default function UsersPage({ accessToken, currentUser, onLogout }) {
  const navigate = useNavigate()
  const isAdmin = !!currentUser?.isAdmin
  const [users, setUsers] = useState([])
  const [listStatus, setListStatus] = useState('')
  const [listStatusClass, setListStatusClass] = useState('')
  const [addStatus, setAddStatus] = useState('')
  const [addStatusClass, setAddStatusClass] = useState('')
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')

  async function loadUsers(activeSearch = search, activeField = searchField) {
    setListStatus('Yükleniyor...')
    setListStatusClass('')
    try {
      const data = await api.listUsers(accessToken, activeSearch.trim(), activeField)
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

  function handleSearch(e) {
    e.preventDefault()
    loadUsers()
  }

  function handleClearSearch() {
    setSearch('')
    setSearchField('')
    loadUsers('', '')
  }

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
        <div className="user-info">
          {currentUser && (
            <span>
              Hoş geldin, {currentUser.name}
              {currentUser.isAdmin && <span className="admin-badge">Admin</span>}
            </span>
          )}
          {isAdmin && <button onClick={() => navigate('/logs')}>Loglar</button>}
          {isAdmin && <button onClick={() => navigate('/chat')}>Asistan</button>}
          <button onClick={onLogout}>Çıkış Yap</button>
        </div>
      </div>
      <p className={listStatusClass}>{listStatus}</p>
      {isAdmin && <AddUserForm onAdd={handleAdd} status={addStatus} statusClass={addStatusClass} />}
      <form className="box" onSubmit={handleSearch}>
        <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
          <option value="">Hepsi</option>
          <option value="cn">cn</option>
          <option value="sn">sn</option>
          {isAdmin && <option value="uid">uid</option>}
        </select>
        <input
          type="text"
          placeholder={isAdmin ? 'Ara (cn, sn, uid)' : 'Ara (cn, sn)'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Ara</button>
        <button type="button" onClick={handleClearSearch}>Temizle</button>
      </form>
      <UserTable users={users} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdate={handleUpdate} onDelete={handleDelete} />
    </>
  )
}