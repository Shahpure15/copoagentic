import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, Sun, Moon, Book, Users } from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const { sessionData, activeSessionId, setActiveSessionId, activeBatchId, setActiveBatchId } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.get('/courses');
        setCourses(data);
      } catch (e) {
        console.error("Failed to load courses in Topbar", e);
      }
    };
    fetchCourses();
  }, []);

  const handleCourseChange = (e) => {
    const newSessionId = e.target.value;
    if (newSessionId) {
      setActiveSessionId(newSessionId);
      setActiveBatchId(null);
      navigate('/session/setup'); // optionally navigate to setup or remain on current route
    }
  };

  const handleBatchChange = (e) => {
    const newBatchId = e.target.value;
    if (newBatchId) {
      setActiveBatchId(newBatchId);
    }
  };

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {courses.length > 0 ? (
          <>
            <div style={{ position: 'relative' }}>
              <select 
                value={activeSessionId || ''} 
                onChange={handleCourseChange}
                style={{
                  appearance: 'none',
                  background: 'var(--surface-elevate)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border-thick)',
                  padding: '0.4rem 2rem 0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: '700',
                  fontSize: '1rem',
                  boxShadow: '2px 2px 0px #000000',
                  cursor: 'pointer',
                  maxWidth: '250px',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <option value="" disabled>Select Course...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.subject_name} ({c.academic_year})</option>
                ))}
              </select>
              <Book size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>

            {sessionData?.batches && sessionData.batches.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select 
                  value={activeBatchId || ''} 
                  onChange={handleBatchChange}
                  style={{
                    appearance: 'none',
                    background: 'var(--bg-obsidian)',
                    color: 'var(--aurora-amber)',
                    border: '2px solid var(--border-thick)',
                    padding: '0.4rem 2rem 0.4rem 0.8rem',
                    borderRadius: '4px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    boxShadow: '2px 2px 0px #000000',
                    cursor: 'pointer',
                    maxWidth: '200px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  <option value="" disabled>Select Batch...</option>
                  {sessionData.batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <Users size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.2rem', fontFamily: "'Space Grotesk', sans-serif" }}>
              {sessionData ? `${sessionData.subject_name}` : 'New Curriculum Session'}
            </h3>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {/* Cyber Neo-Brutalist Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: theme === 'dark' ? 'var(--surface-elevate)' : 'var(--aurora-amber)',
            color: theme === 'dark' ? 'var(--aurora-amber)' : '#000000',
            border: '3px solid var(--border-thick)',
            borderRadius: '4px',
            width: '40px',
            height: '40px',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '2px 2px 0px #000000',
          }}
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Neo-Brutalist Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--surface-elevate)',
          border: '3px solid var(--border-thick)',
          padding: '0.4rem 0.85rem',
          borderRadius: '4px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.8rem',
          fontWeight: '700',
          boxShadow: '2px 2px 0px #000000',
          textTransform: 'uppercase'
        }}>
          <ShieldCheck size={14} color="var(--aurora-emerald)" />
          <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
          <span style={{ color: 'var(--aurora-emerald)' }}>{sessionData?.status || 'Setup'}</span>
        </div>

        {/* Profile indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Dr. Atharv</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Professor of Engineering</div>
          </div>
          
          {/* Solid Neo avatar plate */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            background: 'var(--aurora-purple)',
            border: '3px solid var(--border-thick)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: '700',
            fontFamily: "'Space Grotesk', sans-serif",
            color: 'var(--text-dark)',
            boxShadow: '2px 2px 0px #000000'
          }}>
            AT
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
