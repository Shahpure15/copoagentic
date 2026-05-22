import React from 'react';
import { useSession } from '../context/SessionContext';
import { Compass, CheckCircle } from 'lucide-react';

const Phase3POs = () => {
  const { sessionData } = useSession();
  
  const pos = sessionData?.pos || [];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
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
          <h2 style={{ fontSize: '1.4rem' }}>Program Outcomes (POs)</h2>
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
                gap: '1rem'
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
                  <p style={{ margin: 0, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {po.statement}
                  </p>
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
