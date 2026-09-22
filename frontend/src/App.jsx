import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import UsersPage from './pages/UsersPage.jsx'

const TOKEN_KEY = 'accessToken'

export default function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))

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
          element={accessToken ? <UsersPage accessToken={accessToken} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
