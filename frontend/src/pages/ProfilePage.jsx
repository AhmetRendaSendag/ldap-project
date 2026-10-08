import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

function formatLastLogin(value) {
  if (value === undefined) return 'Yükleniyor...'
  if (!value) return 'Kayıt yok'
  return new Date(value).toLocaleString('tr-TR')
}

function ageFromBirthDate(value) {
  if (!value) return null
  const birth = new Date(value)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function formatProfileValue(value, unit) {
  if (value === undefined) return 'Yükleniyor...'
  if (value === null || value === '') return '—'
  return unit ? `${value} ${unit}` : String(value)
}

function emptyToNull(value) {
  return value === '' ? null : value
}

export default function ProfilePage({ accessToken, currentUser, onLogout }) {
  const navigate = useNavigate()
  const { uid } = useParams()
  const [user, setUser] = useState(null)
  const [lastLogin, setLastLogin] = useState(undefined)
  const [status, setStatus] = useState('')
  const [statusClass, setStatusClass] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarStatus, setAvatarStatus] = useState('')
  const [avatarStatusClass, setAvatarStatusClass] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [qrTarget, setQrTarget] = useState(null)
  const [qrVersion, setQrVersion] = useState(0)
  const [tunnel, setTunnel] = useState(null)
  const [tunnelBusy, setTunnelBusy] = useState(false)
  const [tunnelStatus, setTunnelStatus] = useState('')
  const [profile, setProfile] = useState(undefined)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ birth_date: '', height_cm: '', weight_kg: '' })
  const [profileStatus, setProfileStatus] = useState('')
  const [profileStatusClass, setProfileStatusClass] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwnProfile = !!currentUser && api.isSameUser(currentUser.uid, user)
  const canEditProfile = isOwnProfile || !!currentUser?.isAdmin

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      setUser(null)
      setLastLogin(undefined)
      setStatus('Yükleniyor...')
      setStatusClass('')
      try {
        const data = await api.getUser(accessToken, uid)
        if (cancelled) return
        setUser(data)
        setStatus('')
      } catch (e) {
        if (cancelled) return
        setStatus('Hata: ' + e.message)
        setStatusClass('error')
        return
      }
      try {
        const data = await api.getLastLogin(accessToken, uid)
        if (cancelled) return
        setLastLogin(data.last_login)
      } catch {
        if (!cancelled) setLastLogin(null)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [accessToken, uid])

  useEffect(() => {
    let cancelled = false
    setProfile(undefined)
    setEditing(false)
    setProfileStatus('')
    api
      .getProfile(accessToken, uid)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, uid])

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setAvatarUrl(null)
    setAvatarStatus('')
    api
      .getAvatarUrl(accessToken, uid)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setAvatarUrl(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, uid])

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setQrUrl(null)
    setQrTarget(null)
    api
      .getQrUrl(accessToken, uid)
      .then(({ url, target }) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setQrUrl(url)
        setQrTarget(target)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, uid, qrVersion])

  useEffect(() => {
    if (!currentUser?.isAdmin) return
    let cancelled = false
    api
      .getTunnel(accessToken)
      .then((data) => {
        if (!cancelled) setTunnel(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [accessToken, currentUser?.isAdmin])

  async function handleTunnelToggle() {
    const starting = !tunnel?.running
    setTunnelBusy(true)
    setTunnelStatus(starting ? 'Tünel açılıyor, birkaç saniye sürebilir...' : 'Tünel kapatılıyor...')
    try {
      setTunnel(starting ? await api.startTunnel(accessToken) : await api.stopTunnel(accessToken))
      setTunnelStatus('')
    } catch (err) {
      setTunnelStatus('Hata: ' + err.message)
    } finally {
      setTunnelBusy(false)
      setQrVersion((v) => v + 1)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setAvatarStatus('Yükleniyor...')
    setAvatarStatusClass('')
    try {
      await api.uploadAvatar(accessToken, uid, file)
      const url = await api.getAvatarUrl(accessToken, uid)
      setAvatarUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return url
      })
      setAvatarStatus('Resim güncellendi.')
      setAvatarStatusClass('success')
    } catch (err) {
      setAvatarStatus('Hata: ' + err.message)
      setAvatarStatusClass('error')
    } finally {
      setUploading(false)
    }
  }

  function startEditing() {
    setForm({
      birth_date: profile?.birth_date ?? '',
      height_cm: profile?.height_cm ?? '',
      weight_kg: profile?.weight_kg ?? '',
    })
    setProfileStatus('')
    setEditing(true)
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setSaving(true)
    setProfileStatus('Kaydediliyor...')
    setProfileStatusClass('')
    const body = {
      birth_date: emptyToNull(form.birth_date),
      height_cm: form.height_cm === '' ? null : Number(form.height_cm),
      weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
    }
    try {
      await api.updateProfile(accessToken, uid, body)
      setProfile(await api.getProfile(accessToken, uid))
      setEditing(false)
      setProfileStatus('Bilgiler güncellendi.')
      setProfileStatusClass('success')
    } catch (err) {
      setProfileStatus('Hata: ' + err.message)
      setProfileStatusClass('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>Kullanıcı Profili</h1>
        <div className="user-info">
          {currentUser && (
            <span>
              Hoş geldin, {currentUser.name}
              {currentUser.isAdmin && <span className="admin-badge">Admin</span>}
            </span>
          )}
          <button onClick={() => navigate('/')}>Kullanıcılar</button>
          <button onClick={onLogout}>Çıkış Yap</button>
        </div>
      </div>
      {status && <p className={statusClass}>{status}</p>}
      {user && (
        <div className="box profile">
          <div className="avatar-section">
            {avatarUrl ? (
              <img className="avatar" src={avatarUrl} alt={user.cn} />
            ) : (
              <div className="avatar avatar-placeholder">{(user.cn || '?').charAt(0).toUpperCase()}</div>
            )}
            {isOwnProfile && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  hidden
                />
                <button onClick={() => fileInputRef.current.click()} disabled={uploading}>
                  {avatarUrl ? 'Resmi Değiştir' : 'Resim Yükle'}
                </button>
                {avatarStatus && <p className={avatarStatusClass}>{avatarStatus}</p>}
              </div>
            )}
          </div>
          <dl>
            <dt>cn</dt>
            <dd>{user.cn}</dd>
            <dt>sn</dt>
            <dd>{user.sn}</dd>
            {canEditProfile && (
              <>
                <dt>uid</dt>
                <dd>{user.uid || '—'}</dd>
                <dt>ou</dt>
                <dd>{user.ou || '—'}</dd>
              </>
            )}
            <dt>Son giriş</dt>
            <dd>{formatLastLogin(lastLogin)}</dd>
            {canEditProfile && (
              <>
                <dt>Yaş</dt>
                <dd>{formatProfileValue(profile === undefined ? undefined : ageFromBirthDate(profile?.birth_date))}</dd>
                <dt>Boy</dt>
                <dd>{formatProfileValue(profile === undefined ? undefined : profile?.height_cm, 'cm')}</dd>
                <dt>Kilo</dt>
                <dd>{formatProfileValue(profile === undefined ? undefined : profile?.weight_kg, 'kg')}</dd>
              </>
            )}
          </dl>
          {qrUrl && <img className="qr" src={qrUrl} alt="Profil QR kodu" />}
          {qrTarget && <p className="qr-target">QR adresi: {qrTarget}</p>}
          {currentUser?.isAdmin && tunnel && (
            <div className="tunnel">
              <button onClick={handleTunnelToggle} disabled={tunnelBusy}>
                {tunnel.running ? 'Tüneli Kapat' : 'Tüneli Aç'}
              </button>
              <span className="tunnel-state">
                {tunnel.running ? `Tünel açık: ${tunnel.url || 'adres alınıyor...'}` : 'Tünel kapalı (QR sadece bu ağda çalışır)'}
              </span>
              {tunnelStatus && <p className={tunnelStatus.startsWith('Hata') ? 'error' : ''}>{tunnelStatus}</p>}
            </div>
          )}
          {canEditProfile && !editing && profile !== undefined && (
            <button onClick={startEditing}>Bilgileri Düzenle</button>
          )}
          {editing && (
            <form onSubmit={handleProfileSave}>
              <label>
                Doğum tarihi{' '}
                <input type="date" name="birth_date" value={form.birth_date} onChange={handleFormChange} />
              </label>{' '}
              <label>
                Boy (cm){' '}
                <input type="number" name="height_cm" value={form.height_cm} onChange={handleFormChange} />
              </label>{' '}
              <label>
                Kilo (kg){' '}
                <input type="number" name="weight_kg" value={form.weight_kg} onChange={handleFormChange} />
              </label>{' '}
              <button type="submit" disabled={saving}>Kaydet</button>{' '}
              <button type="button" onClick={() => setEditing(false)} disabled={saving}>
                İptal
              </button>
            </form>
          )}
          {profileStatus && <p className={profileStatusClass}>{profileStatus}</p>}
        </div>
      )}
    </>
  )
}
