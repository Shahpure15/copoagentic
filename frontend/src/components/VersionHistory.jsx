import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { History, Clock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

const VersionHistory = () => {
  const { sessionData, activeSessionId, refreshSession } = useSession();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState(null);

  useEffect(() => {
    if (activeSessionId) {
      loadVersions();
    }
  }, [activeSessionId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/history/session/${activeSessionId}/versions`);
      setVersions(data);
    } catch (e) {
      console.error("Failed to load versions", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (auditId) => {
    if (!window.confirm("Are you sure you want to rollback to this previous state?")) return;
    
    setRollingBack(auditId);
    try {
      await api.post(`/history/session/${activeSessionId}/rollback/${auditId}`);
      await refreshSession();
      await loadVersions();
      alert("Successfully rolled back!");
    } catch (e) {
      alert("Rollback failed: " + e.message);
    } finally {
      setRollingBack(null);
    }
  };

  if (!sessionData) {
    return (
      <div className="page-wrapper animate-fade-in">
        <div className="bento-card">
          <p>Please initialize a session first to view history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="bento-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'var(--aurora-amber)',
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            display: 'grid',
            placeItems: 'center',
            border: '3px solid var(--border-thick)',
            boxShadow: '2px 2px 0px #000000',
            color: 'var(--text-dark)'
          }}>
            <History size={20} />
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>Curriculum Version History</h2>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Track AI-mediated adjustments to your curriculum and roll back to previous known stable states if required.
        </p>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history logs...</div>
        ) : versions.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            background: 'var(--surface-base)', 
            border: '2px dashed var(--border-thick)', 
            borderRadius: '6px' 
          }}>
            <Clock size={32} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
            <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>No version history recorded yet.</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Changes made via the AI Mediator will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {versions.map((ver, idx) => {
              const isLatest = idx === 0;
              const date = new Date(ver.created_at);
              
              return (
                <div key={ver.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.25rem', 
                  background: isLatest ? 'var(--bg-obsidian)' : 'var(--surface-base)',
                  border: `2px solid ${isLatest ? 'var(--aurora-emerald)' : 'var(--border-thick)'}`,
                  borderRadius: '6px',
                  boxShadow: '2px 2px 0px #000000'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          padding: '0.2rem 0.5rem', 
                          background: 'var(--surface-elevate)', 
                          border: '1px solid var(--border-thick)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)'
                        }}>
                          {date.toLocaleString()}
                        </span>
                        {isLatest && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            padding: '0.2rem 0.5rem', 
                            background: 'var(--aurora-emerald)', 
                            border: '1px solid var(--border-thick)',
                            borderRadius: '4px',
                            color: 'var(--text-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <CheckCircle size={12} /> LATEST
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{ver.detail}</h4>
                      
                      {ver.metadata && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace", marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-thick)' }}>
                          <span style={{ color: 'var(--aurora-crimson)' }}>- {ver.metadata.field}: {ver.metadata.old_value}</span><br />
                          <span style={{ color: 'var(--aurora-emerald)' }}>+ {ver.metadata.field}: {ver.metadata.new_value}</span>
                        </div>
                      )}
                    </div>
                    
                    {!isLatest && (
                      <button 
                        className="btn-secondary"
                        onClick={() => handleRollback(ver.id)}
                        disabled={rollingBack === ver.id || sessionData.is_locked}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', opacity: sessionData.is_locked ? 0.5 : 1, cursor: sessionData.is_locked ? 'not-allowed' : 'pointer' }}
                        title={sessionData.is_locked ? "Cannot restore a locked curriculum" : ""}
                      >
                        <ArrowLeft size={16} />
                        {rollingBack === ver.id ? 'Restoring...' : 'Restore This State'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
