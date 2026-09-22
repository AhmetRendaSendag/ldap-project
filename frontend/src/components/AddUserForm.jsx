import { useState } from 'react'

const EMPTY_FORM = { cn: '', sn: '', uid: '', ou: '', password: '' }

export default function AddUserForm({ onAdd, status, statusClass }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function setField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleAdd() {
    const created = await onAdd(form)
    if (created) setForm(EMPTY_FORM)
  }

  return (
    <div className="box">
      <h3>Yeni Kullanıcı Ekle</h3>
      <input type="text" placeholder="cn (örn: ali.veli)" value={form.cn} onChange={setField('cn')} />
      <input type="text" placeholder="sn (soyad)" value={form.sn} onChange={setField('sn')} />
      <input type="text" placeholder="uid" value={form.uid} onChange={setField('uid')} />
      <input type="text" placeholder="ou (örn: IT)" value={form.ou} onChange={setField('ou')} />
      <input type="password" placeholder="Şifre" value={form.password} onChange={setField('password')} />
      <button onClick={handleAdd}>Ekle</button>
      <p className={statusClass}>{status}</p>
    </div>
  )
}
