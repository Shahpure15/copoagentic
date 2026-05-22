import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Compass, CheckCircle, Edit2, Save, X } from 'lucide-react';
import { api } from '../api/client';

const Phase3POs = () => {
  const { activeSessionId, sessionData, refreshSession } = useSession();
  const [editingPoId, setEditingPoId] = useState(null);
  const [editStatement, setEditStatement] = useState("");

  const pos = [...(sessionData?.pos || [])].sort((a, b) => 
    a.po_id.localeCompare(b.po_id, undefined, { numeric: true, sensitivity: 'base' })
  );

  const startEdit = (po) => {
    setEditingPoId(po.po_id);
    setEditStatement(po.statement);
  };

  const cancelEdit = () => {
    setEditingPoId(null);
    setEditStatement("");
  };

  const saveEdit = async (poId) => {
    try {
      await api.put(`/sessions/${activeSessionId}/pos/${poId}`, {
        statement: editStatement
      });
      await refreshSession();
      setEditingPoId(null);
    } catch (e) {
      alert("Failed to update PO: " + e.message);
    }
  };

  if (!sessionData) {
    return (
      <div className="page-wrapper animate-fade-in">
        <div className="bento-card">
          <p>Please initialize a session first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="bento-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'var(--aurora-purple)',
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--border-thick)',
              boxShadow: '2px 2px 0px #000000',
              color: 'var(--text-dark)'
            }}>
              <Compass size={20} />
            </div>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Program Outcomes (POs)
              {sessionData.is_locked && (
                <span style={{ fontSize: '0.8rem', background: '#FF453A', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #000' }}>
                  🔒 Locked
                </span>
              )}
            </h2>
          </div>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Standard Program Outcomes as defined by the accreditation board (NBA/ABET). These serve as the baseline competencies that Course Outcomes will map to.
        </p>

        {pos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pos.map(po => (
              <div key={po.po_id} style={{
                background: 'var(--surface-elevate)',
                border: '3px solid var(--border-thick)',
                borderRadius: '6px',
                padding: '1.25rem',
                boxShadow: '3px 3px 0px #000000',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  background: 'var(--aurora-emerald)',
                  color: 'var(--text-dark)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontWeight: '800',
                  fontFamily: "'Space Grotesk', sans-serif",
                  border: '2px solid var(--border-thick)',
                  boxShadow: '1px 1px 0px #000000',
                  height: 'fit-content',
                  whiteSpace: 'nowrap'
                }}>
                  {po.po_id}
                </div>
                <div style={{ flex: 1 }}>
                  {editingPoId === po.po_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <textarea
                        value={editStatement}
                        onChange={(e) => setEditStatement(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          background: 'var(--bg-obsidian)',
                          color: 'var(--text-primary)',
                          border: '2px solid var(--border-thick)',
                          borderRadius: '4px',
                          padding: '0.5rem',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          <X size={14} /> Cancel
                        </button>
                        <button onClick={() => saveEdit(po.po_id)} className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <p style={{ margin: 0, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {po.statement}
                      </p>
                      {!sessionData.is_locked && (
                        <button 
                          onClick={() => startEdit(po)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--aurora-cyan)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                          title="Edit PO Statement"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No Program Outcomes loaded for this session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Phase3POs;
