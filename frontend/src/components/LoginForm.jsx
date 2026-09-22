import { useState } from 'react'

export default function LoginForm({ onLogin, status, statusClass }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="box">
      <h3>Giriş Bilgileri</h3>
      <input
        type="text"
        placeholder="Kullanıcı adı (örn: admin)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={() => onLogin(username, password)}>Bağlan ve Listele</button>
      <p className={statusClass}>{status}</p>
    </div>
  )
}
