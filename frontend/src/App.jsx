import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import { nameFromDn, decodeToken } from './api.js'
import LogsPage from './pages/LogsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ChatPage from './pages/ChatPage.jsx'

const TOKEN_KEY = 'accessToken'

function RedirectToLogin() {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function RedirectAfterLogin() {
  const location = useLocation()
  return <Navigate to={location.state?.from || '/'} replace />
}

export default function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const currentUser = useMemo(() => {
    if (!accessToken) return null
    try {
      const payload = decodeToken(accessToken)
      return { dn: payload.sub, uid: payload.uid, name: nameFromDn(payload.sub), isAdmin: !!payload.is_admin }
    } catch {
      return null
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    let expiresAt
    try {
      expiresAt = decodeToken(accessToken).exp * 1000
    } catch {
      handleLogout()
      return
    }
    const timer = setTimeout(handleLogout, Math.max(0, expiresAt - Date.now()))
    return () => clearTimeout(timer)
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
          element={accessToken ? <RedirectAfterLogin /> : <LoginPage onAuthenticated={handleAuthenticated} />}
        />
        <Route
          path="/"
          element={
            accessToken ? (
              <UsersPage accessToken={accessToken} currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <RedirectToLogin />
            )
          }
        />
        <Route
          path="/logs"
          element={
            !accessToken ? (
              <RedirectToLogin />
            ) : currentUser?.isAdmin ? (
              <LogsPage accessToken={accessToken} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/chat"
          element={
            !accessToken ? (
              <RedirectToLogin />
            ) : currentUser?.isAdmin ? (
              <ChatPage accessToken={accessToken} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/profile/:uid"
          element={
            accessToken ? (
              <ProfilePage accessToken={accessToken} currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <RedirectToLogin />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
