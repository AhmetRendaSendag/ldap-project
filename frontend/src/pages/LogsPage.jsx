import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

const EMPTY_FILTERS = { type: '', method: '', path: '', ip: '', user: '', what: '', whom: '' }

function collectValues(prev, data, field) {
  const set = new Set(prev)
  data.forEach((entry) => {
    if (entry[field]) set.add(entry[field])
  })
  return Array.from(set).sort()
}

function rowType(entry) {
  if ('method' in entry) return 'İstek'
  if ('bind_dn' in entry) return 'Login'
  if ('who' in entry) return 'İşlem'
  return 'Bilinmeyen'
}

export default function LogsPage({ accessToken }) {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [pathOptions, setPathOptions] = useState([])
  const [whatOptions, setWhatOptions] = useState([])
  const [whomOptions, setWhomOptions] = useState([])
  const [status, setStatus] = useState('')
  const [statusClass, setStatusClass] = useState('')
  const navigate = useNavigate()

  async function loadLogs(activeFilters = filters) {
    setStatus('Yükleniyor...')
    setStatusClass('')
    try {
      const data = await api.getLogs(accessToken, activeFilters)
      setLogs(data)
      setPathOptions((prev) => collectValues(prev, data, 'path'))
      setWhatOptions((prev) => collectValues(prev, data, 'what'))
      setWhomOptions((prev) => collectValues(prev, data, 'whom'))
      setStatus(`${data.length} kayıt bulundu.`)
      setStatusClass('success')
    } catch (e) {
      setStatus('Hata: ' + e.message)
      setStatusClass('error')
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setField(field) {
    return (e) => setFilters({ ...filters, [field]: e.target.value })
  }

  function setAndApply(field) {
    return (e) => {
      const next = { ...filters, [field]: e.target.value }
      setFilters(next)
      loadLogs(next)
    }
  }

  function handleTextKeyDown(e) {
    if (e.key === 'Enter') loadLogs(filters)
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS)
    loadLogs(EMPTY_FILTERS)
  }

  return (
    <>
      <div className="topbar">
        <h1>Log Kayıtları</h1>
        <div className="user-info">
          <button onClick={() => navigate('/')}>Kullanıcılara Dön</button>
          <button onClick={() => loadLogs()}>Yenile</button>
          <button onClick={handleClear}>Temizle</button>
        </div>
      </div>

      <p className={statusClass}>{status}</p>
      <table>
        <thead>
          <tr>
            <th>Zaman</th>
            <th>
              Tür
              <br />
              <select value={filters.type} onChange={setAndApply('type')}>
                <option value="">Tümü</option>
                <option value="request">İstek</option>
                <option value="login">Login</option>
                <option value="action">İşlem</option>
              </select>
            </th>
            <th>
              Yöntem
              <br />
              <select value={filters.method} onChange={setAndApply('method')}>
                <option value="">Tümü</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </th>
            <th>
              Yol
              <br />
              <select value={filters.path} onChange={setAndApply('path')}>
                <option value="">Tümü</option>
                {pathOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </th>
            <th>Durum</th>
            <th>Süre (ms)</th>
            <th>
              IP
              <br />
              <input
                type="text"
                placeholder="IP adresi"
                value={filters.ip}
                onChange={setField('ip')}
                onKeyDown={handleTextKeyDown}
              />
            </th>
            <th>
              Kullanıcı
              <br />
              <input
                type="text"
                placeholder="Kullanıcı"
                value={filters.user}
                onChange={setField('user')}
                onKeyDown={handleTextKeyDown}
              />
            </th>
            <th>
              Eylem
              <br />
              <select value={filters.what} onChange={setAndApply('what')}>
                <option value="">Tümü</option>
                {whatOptions.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </th>
            <th>
              Hedef
              <br />
              <select value={filters.whom} onChange={setAndApply('whom')}>
                <option value="">Tümü</option>
                {whomOptions.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </th>
            <th>Değişiklik</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((entry, i) => {
            const userDn = entry.bind_dn || entry.who || ''
            return (
              <tr key={i}>
                <td>{entry.time ? new Date(entry.time).toLocaleString() : '-'}</td>
                <td>{rowType(entry)}</td>
                <td>{entry.method || '-'}</td>
                <td>{entry.path || '-'}</td>
                <td>{entry.status_code ?? '-'}</td>
                <td>{entry.duration_ms ?? '-'}</td>
                <td>{entry.client || '-'}</td>
                <td title={userDn || undefined}>
                  {userDn ? api.nameFromDn(userDn) + (entry.is_admin ? ' (admin)' : '') : '-'}
                </td>
                <td>{entry.what || '-'}</td>
                <td>{entry.whom || '-'}</td>
                <td>{entry.which ? JSON.stringify(entry.which) : '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
