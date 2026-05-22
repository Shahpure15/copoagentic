import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { Send, Check, X, Bot, User, Loader } from 'lucide-react';

const MediatorChat = ({ phase, externalInput }) => {
  const { activeSessionId, refreshSession } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (externalInput) {
      setInput(externalInput);
    }
  }, [externalInput]);

  useEffect(() => {
    if (activeSessionId) loadHistory();
  }, [activeSessionId, phase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const loadHistory = async () => {
    try {
      const data = await api.get(`/mediator/${activeSessionId}/history?phase=${phase}`);
      setMessages(data);
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    
    const userMsg = input;
    setInput('');
    setSending(true);
    
    // Optimistic UI update
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      await api.post(`/mediator/${activeSessionId}/chat`, {
        message: userMsg,
        phase
      });
      await loadHistory();
    } catch (e) {
      alert("Failed to send message: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (chatId, accept) => {
    try {
      await api.post(`/mediator/${activeSessionId}/confirm`, {
        chat_id: chatId,
        accept
      });
      await loadHistory();
      await refreshSession();
    } catch (e) {
      alert("Failed to confirm changes");
    }
  };

  return (
    <div 
      className="bento-card" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 180px)', 
        padding: '1.25rem'
      }}
    >
      {/* Sidebar Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '2px solid var(--border-thick)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '4px',
          background: 'var(--aurora-purple)',
          border: '2px solid var(--border-thick)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-dark)',
          boxShadow: '1.5px 1.5px 0px #000000'
        }}>
          <Bot size={16} color="var(--text-dark)" />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700' }}>
          AI Alignment Mediator
        </h3>
      </div>
      
      {/* Scrollable Message Space */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem', 
          marginBottom: '1.25rem',
          paddingRight: '0.25rem'
        }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          
          return (
            <div 
              key={i} 
              style={{ 
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                display: 'flex',
                gap: '0.6rem',
                flexDirection: isUser ? 'row-reverse' : 'row'
              }}
            >
              {/* Message Bubble */}
              <div style={{ 
                background: isUser ? 'var(--aurora-purple)' : 'var(--surface-elevate)',
                border: '2px solid var(--border-thick)',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: isUser ? 'var(--text-dark)' : 'var(--text-primary)',
                boxShadow: '3px 3px 0px #000000'
              }}>
                <div style={{ fontWeight: '600', lineHeight: '1.5' }}>{msg.content}</div>
                
                {/* Proposed Changes Sub-Card */}
                {msg.pending_changes && !msg.changes_applied && (
                  <div style={{ 
                    marginTop: '1rem', 
                    background: 'var(--bg-obsidian)', 
                    border: '2px solid var(--border-thick)', 
                    padding: '0.85rem', 
                    borderRadius: '4px',
                    boxShadow: '2px 2px 0px #000000'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.4rem', color: 'var(--aurora-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontFamily: "'Space Grotesk', sans-serif" }}>
                      PROPOSED MUTATION
                    </div>
                    <div style={{ marginBottom: '1rem', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {msg.pending_changes.description}
                      {msg.pending_changes.changes && msg.pending_changes.changes.length > 0 && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#000000', borderRadius: '4px', border: '1px solid var(--border-thick)' }}>
                          {msg.pending_changes.changes.map((change, idx) => (
                            <div key={idx} style={{ marginBottom: idx < msg.pending_changes.changes.length - 1 ? '0.5rem' : 0 }}>
                              <span style={{ color: 'var(--aurora-amber)', fontWeight: 'bold' }}>{change.id}</span>
                              <span style={{ color: 'var(--text-secondary)', margin: '0 0.3rem' }}>({change.field}) &rarr;</span>
                              <span style={{ color: 'var(--aurora-emerald)' }}>{String(change.new_value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleConfirm(msg.id, true)} 
                        style={{ 
                          flex: 1, 
                          padding: '0.45rem', 
                          background: 'var(--aurora-emerald)', 
                          border: '2px solid var(--border-thick)',
                          color: 'var(--text-dark)', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          fontFamily: "'Space Grotesk', sans-serif",
                          boxShadow: '2px 2px 0px #000000',
                          transform: 'translate(0px, 0px)',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'translate(1px, 1px)';
                          e.currentTarget.style.boxShadow = '1px 1px 0px #000000';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'translate(0px, 0px)';
                          e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#10B981'}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--aurora-emerald)';
                          e.currentTarget.style.transform = 'translate(0px, 0px)';
                          e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
                        }}
                      >
                        <Check size={14} strokeWidth={3} /> Accept
                      </button>
                      <button 
                        onClick={() => handleConfirm(msg.id, false)} 
                        style={{ 
                          flex: 1, 
                          padding: '0.45rem', 
                          background: 'var(--aurora-crimson)', 
                          border: '2px solid var(--border-thick)',
                          color: 'var(--text-dark)', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          fontFamily: "'Space Grotesk', sans-serif",
                          boxShadow: '2px 2px 0px #000000',
                          transform: 'translate(0px, 0px)',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseDown={e => {
                          e.currentTarget.style.transform = 'translate(1px, 1px)';
                          e.currentTarget.style.boxShadow = '1px 1px 0px #000000';
                        }}
                        onMouseUp={e => {
                          e.currentTarget.style.transform = 'translate(0px, 0px)';
                          e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#EF4444'}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--aurora-crimson)';
                          e.currentTarget.style.transform = 'translate(0px, 0px)';
                          e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
                        }}
                      >
                        <X size={14} strokeWidth={3} /> Reject
                      </button>
                    </div>
                  </div>
                )}
                
                {msg.changes_applied && msg.pending_changes && (
                  <div style={{ 
                    marginTop: '0.6rem', 
                    fontSize: '0.75rem', 
                    color: 'var(--aurora-emerald)', 
                    fontWeight: '700',
                    fontFamily: "'Space Grotesk', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <Check size={12} strokeWidth={3} /> Changes synchronized successfully
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {sending && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
            <Loader className="pulse-active-agent" size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
            <span>AI mediator analyzing curriculum...</span>
          </div>
        )}
      </div>

      {/* Message Form */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', borderTop: '2px solid var(--border-thick)', paddingTop: '0.85rem' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Suggest curriculum tweaks..." 
          style={{ flex: 1, padding: '0.75rem 1rem', height: '42px', fontSize: '0.85rem' }}
        />
        <button type="submit" className="btn-aurora" disabled={sending} style={{ padding: '0.75rem', width: '42px', height: '42px', minWidth: 'auto', borderRadius: '8px' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default MediatorChat;
