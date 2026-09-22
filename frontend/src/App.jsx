import { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import { cnFromDn, decodeToken } from './api.js'

const TOKEN_KEY = 'accessToken'

export default function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const currentUser = useMemo(() => {
    if (!accessToken) return null
    try {
      const payload = decodeToken(accessToken)
      return { name: cnFromDn(payload.sub), isAdmin: !!payload.is_admin }
    } catch {
      return null
    }
  }, [accessToken])

  function handleAuthenticated(token) {
    localStorage.setItem(TOKEN_KEY, token)
    setAccessToken(token)
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={accessToken ? <Navigate to="/" replace /> : <LoginPage onAuthenticated={handleAuthenticated} />}
        />
        <Route
          path="/"
          element={
            accessToken ? (
              <UsersPage accessToken={accessToken} currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
