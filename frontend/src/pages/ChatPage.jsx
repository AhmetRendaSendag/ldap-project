import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

const EXAMPLES = [
  'Tüm kullanıcıları listele',
  'Adında ali geçen kullanıcıları listele',
  'mehmet.gur kullanıcısını göster',
]

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return part
  })
}

export default function ChatPage({ accessToken }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send(text) {
    const message = text.trim()
    if (!message || sending) return
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setInput('')
    setSending(true)
    try {
      const data = await api.sendChat(accessToken, message)
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply || '(Boş yanıt)' }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'error', text: 'Hata: ' + e.message }])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      <div className="topbar">
        <h1>Asistan</h1>
        <div className="user-info">
          <button onClick={() => navigate('/')}>Kullanıcılara Dön</button>
        </div>
      </div>
      <div className="box chat">
        <p className="chat-note">
          Kullanıcıları listeleyebilir, gösterebilir, ekleyebilir, güncelleyebilir ve silebilirim. Her mesaj ayrı
          değerlendirilir; bir işlem için gereken tüm bilgiyi tek mesajda yazın.
        </p>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-examples">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => send(example)} disabled={sending}>
                  {example}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={'chat-message chat-' + m.role}>
              {m.role === 'bot' ? renderInline(m.text) : m.text}
            </div>
          ))}
          {sending && <div className="chat-message chat-bot chat-pending">Düşünüyor...</div>}
          <div ref={endRef} />
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Örn: test.bot kullanıcısının departmanını DEV yap"
            disabled={sending}
            autoFocus
          />
          <button type="submit" disabled={sending || !input.trim()}>
            Gönder
          </button>
        </form>
      </div>
    </>
  )
}
