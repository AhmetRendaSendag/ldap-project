import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isSameUser } from '../api.js'

function UserRow({ user, onUpdate, onDelete }) {
  const [sn, setSn] = useState(user.sn)
  const [ou, setOu] = useState(user.ou || '')

  return (
    <tr>
      <td>{user.cn}</td>
      <td><input type="text" value={sn} onChange={(e) => setSn(e.target.value)} /></td>
      <td><Link to={'/profile/' + encodeURIComponent(user.uid)}>{user.uid}</Link></td>
      <td><input type="text" value={ou} onChange={(e) => setOu(e.target.value)} /></td>
      <td>
        <button onClick={() => onUpdate(user.uid, { sn, ou })}>Güncelle</button>
        <button onClick={() => onDelete(user.uid)}>Sil</button>
      </td>
    </tr>
  )
}

function ReadOnlyRow({ user, currentUid }) {
  const isOwn = isSameUser(currentUid, user)
  return (
    <tr>
      <td>{user.cn}</td>
      <td>{user.sn}</td>
      <td><Link to={'/profile/' + encodeURIComponent(user.uid)}>{isOwn ? 'Profilim' : 'Profile git'}</Link></td>
    </tr>
  )
}

export default function UserTable({ users, isAdmin, currentUid, onUpdate, onDelete }) {
  if (!isAdmin) {
    return (
      <table>
        <thead>
          <tr><th>cn</th><th>sn</th><th>Profil</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <ReadOnlyRow key={u.uid} user={u} currentUid={currentUid} />
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table>
      <thead>
        <tr><th>cn</th><th>sn</th><th>uid</th><th>ou</th><th>İşlemler</th></tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <UserRow key={u.uid} user={u} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </tbody>
    </table>
  )
}
