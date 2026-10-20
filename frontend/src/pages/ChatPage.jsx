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
  const [conversations, setConversations] = useState([])
  const [listError, setListError] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  const busy = sending || loading

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    refreshConversations()
  }, [accessToken])

  async function refreshConversations() {
    try {
      const data = await api.listConversations(accessToken)
      setConversations(data.conversations || [])
      setListError('')
    } catch (e) {
      setListError('Konuşmalar yüklenemedi: ' + e.message)
    }
  }

  function startNew() {
    if (busy) return
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  async function openConversation(id) {
    if (busy || id === activeId) return
    setActiveId(id)
    setMessages([])
    setLoading(true)
    try {
      const data = await api.getConversation(accessToken, id)
      setMessages(data.messages || [])
    } catch (e) {
      setMessages([{ role: 'error', text: 'Hata: ' + e.message }])
    } finally {
      setLoading(false)
    }
  }

  async function send(text) {
    const message = text.trim()
    if (!message || busy) return
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setInput('')
    setSending(true)
    try {
      const data = await api.sendChat(accessToken, message, activeId)
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply || '(Boş yanıt)' }])
      if (data.conversation_id) setActiveId(data.conversation_id)
      refreshConversations()
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
      <div className="chat-layout">
        <aside className="box chat-sidebar">
          <button type="button" className="chat-new" onClick={startNew} disabled={busy}>
            + Yeni konuşma
          </button>
          {listError && <p className="error">{listError}</p>}
          {!listError && conversations.length === 0 && <p className="chat-note">Henüz konuşma yok.</p>}
          <ul className="chat-list">
            {conversations.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  className={c._id === activeId ? 'active' : ''}
                  onClick={() => openConversation(c._id)}
                  disabled={busy && c._id !== activeId}
                  title={c.title}
                >
                  {c.title || '(Başlıksız)'}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="box chat">
          <p className="chat-note">
            Kullanıcıları listeleyebilir, gösterebilir, ekleyebilir ve güncelleyebilirim. Konuşmalarınız kaydedilir;
            soldan eski bir konuşmaya devam edebilirsiniz.
          </p>
          <div className="chat-messages">
            {messages.length === 0 && !activeId && !loading && (
              <div className="chat-examples">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => send(example)} disabled={busy}>
                    {example}
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="chat-message chat-bot chat-pending">Yükleniyor...</div>}
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
              disabled={busy}
              autoFocus
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Gönder
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
