import { useState } from 'react'

function UserRow({ user, onUpdate, onDelete }) {
  const [sn, setSn] = useState(user.sn)
  const [ou, setOu] = useState(user.ou || '')

  return (
    <tr>
      <td>{user.cn}</td>
      <td><input type="text" value={sn} onChange={(e) => setSn(e.target.value)} /></td>
      <td>{user.uid}</td>
      <td><input type="text" value={ou} onChange={(e) => setOu(e.target.value)} /></td>
      <td>
        <button onClick={() => onUpdate(user.uid, { sn, ou })}>Güncelle</button>
        <button onClick={() => onDelete(user.uid)}>Sil</button>
      </td>
    </tr>
  )
}

export default function UserTable({ users, onUpdate, onDelete }) {
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
