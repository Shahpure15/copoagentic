import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Grid, Eye, Edit3, HelpCircle, Lock } from 'lucide-react';
import { api } from '../api/client';

const Phase4Matrix = () => {
  const { sessionData, activeSessionId, refreshSession, setChatInput, setIsChatOpen } = useSession();
  const [hoveredCell, setHoveredCell] = useState({ coId: null, poId: null });

  if (!sessionData) return <div className="page-wrapper" style={{ color: 'var(--text-secondary)' }}>Retrieving curriculum mapping matrix...</div>;

  const cos = [...(sessionData.cos || [])].sort((a, b) => a.co_id.localeCompare(b.co_id, undefined, { numeric: true, sensitivity: 'base' }));
  const pos = [...(sessionData.pos || [])].sort((a, b) => a.po_id.localeCompare(b.po_id, undefined, { numeric: true, sensitivity: 'base' }));
  const mappings = sessionData.mappings || [];

  const handleLock = async () => {
    if (window.confirm("Are you sure you want to permanently lock this curriculum framework?\nCourse Outcomes, Program Outcomes, and Mappings will be completely frozen.")) {
      try {
        await api.post(`/sessions/${activeSessionId}/lock`);
        await refreshSession();
      } catch (e) {
        alert("Failed to lock framework: " + e.message);
      }
    }
  };

  const handleCellDoubleClick = (coId, poId) => {
    if (sessionData.is_locked) return;
    setChatInput(`Update mapping strength of ${coId} to ${poId} to `);
    setIsChatOpen(true);
  };

  // Create lookup table
  const matrix = {};
  mappings.forEach(m => {
    if (!matrix[m.co_id]) matrix[m.co_id] = {};
    matrix[m.co_id][m.po_id] = m.strength;
  });

  const getHeatmapStyle = (strength, isHovered) => {
    let background = '#11131C';
    let color = 'var(--text-secondary)';
    let border = '2px solid var(--border-thick)';
    
    if (strength === 3) {
      background = '#34D399';
      color = '#000000';
    } else if (strength === 2) {
      background = '#86EFAC';
      color = '#000000';
    } else if (strength === 1) {
      background = '#DCFCE7';
      color = '#000000';
    }

    if (isHovered) {
      border = '2px solid var(--aurora-purple)';
    }

    return { background, color, border };
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upper Title Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Competency Matrix Mapping</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
            Assess alignment intensities between Course Outcomes (CO) and Program Outcomes (PO).
          </p>
        </div>
        
        {sessionData.is_locked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-base)', padding: '0.5rem 1rem', borderRadius: '4px', border: '2px solid var(--border-thick)', boxShadow: '2px 2px 0px #000000', fontSize: '0.85rem', color: '#FF453A', fontWeight: '700' }}>
            <Lock size={16} />
            CURRICULUM FRAMEWORK LOCKED
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-base)', padding: '0.5rem 1rem', borderRadius: '4px', border: '2px solid var(--border-thick)', boxShadow: '2px 2px 0px #000000', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              <HelpCircle size={14} color="var(--aurora-purple)" />
              Use AI Mediator to override mapping weights.
            </div>
            <button 
              onClick={handleLock}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#FF453A', color: '#000' }}
            >
              <Lock size={16} /> Lock Framework
            </button>
          </div>
        )}
      </div>

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Grid Table Container */}
      <div className="bento-card" style={{ overflowX: 'auto', padding: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ 
                padding: '1rem', 
                textAlign: 'left', 
                fontSize: '0.9rem',
                fontFamily: "'Space Grotesk', sans-serif",
                color: 'var(--text-secondary)',
                fontWeight: '700',
                borderBottom: '2px solid var(--border-thick)',
                minWidth: '120px'
              }}>
                CO \ PO
              </th>
              {pos.map(po => {
                const isColumnHovered = hoveredCell.poId === po.po_id;
                return (
                  <th 
                    key={po.po_id} 
                    style={{ 
                      padding: '1rem', 
                      fontSize: '0.85rem',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: '700',
                      color: isColumnHovered ? 'var(--aurora-purple)' : 'var(--text-primary)',
                      borderBottom: '2px solid var(--border-thick)',
                      transition: 'color 0.2s'
                    }}
                  >
                    {po.po_id}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cos.map(co => {
              const isRowHovered = hoveredCell.coId === co.co_id;
              
              return (
                <tr key={co.co_id}>
                  <td style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    fontWeight: '700', 
                    fontSize: '0.9rem',
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: isRowHovered ? 'var(--aurora-purple)' : 'var(--text-primary)',
                    transition: 'color 0.2s'
                  }}>
                    {co.co_id}
                  </td>
                  {pos.map(po => {
                    const strength = matrix[co.co_id]?.[po.po_id] || 0;
                    const isCellHovered = hoveredCell.coId === co.co_id && hoveredCell.poId === po.po_id;
                    const activeStyle = getHeatmapStyle(strength, isCellHovered);
                    
                    return (
                      <td 
                        key={po.po_id} 
                        className="matrix-cell"
                        onMouseEnter={() => !sessionData.is_locked && setHoveredCell({ coId: co.co_id, poId: po.po_id })}
                        onMouseLeave={() => !sessionData.is_locked && setHoveredCell({ coId: null, poId: null })}
                        onDoubleClick={() => handleCellDoubleClick(co.co_id, po.po_id)}
                        style={{ 
                          padding: '1.1rem', 
                          borderRadius: '4px',
                          cursor: sessionData.is_locked ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          ...activeStyle,
                          transform: isCellHovered ? 'translate(-2px, -2px)' : 'none',
                          boxShadow: isCellHovered ? '4px 4px 0px var(--aurora-purple)' : '2px 2px 0px #000000',
                          position: 'relative',
                          zIndex: isCellHovered ? 10 : 1
                        }} 
                        title={sessionData.is_locked ? "Locked" : "Open AI Mediator chat to override"}
                      >
                        {strength > 0 ? strength : <span style={{ opacity: 0.15 }}>-</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Details Block */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Mapping weights legend */}
        <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-thick)', paddingBottom: '0.5rem' }}>Strength Mapping Index</h4>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#34D399', border: '2px solid var(--border-thick)', display: 'grid', placeItems: 'center', color: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '1.5px 1.5px 0px #000000' }}>3</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>Strong</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#86EFAC', border: '2px solid var(--border-thick)', display: 'grid', placeItems: 'center', color: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '1.5px 1.5px 0px #000000' }}>2</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>Moderate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#DCFCE7', border: '2px solid var(--border-thick)', display: 'grid', placeItems: 'center', color: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '1.5px 1.5px 0px #000000' }}>1</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>Weak</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#11131C', border: '2px solid var(--border-thick)', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '1.5px 1.5px 0px #000000' }}>-</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>None</span>
            </div>
          </div>
        </div>

        {/* Selected Outcome details info */}
        <div className="bento-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hoveredCell.coId ? (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--aurora-purple)', letterSpacing: '0.05em' }}>SELECTED OUTCOME FOCUS</div>
              <div style={{ fontSize: '1rem', fontWeight: '600', marginTop: '0.25rem', fontFamily: "'Space Grotesk', sans-serif" }}>{hoveredCell.coId} &bull; {hoveredCell.poId}</div>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Evaluating strength requirements of {hoveredCell.coId} outcomes against {hoveredCell.poId} capability thresholds. Open the global AI Mediator chat to modify weights.
              </p>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', fontStyle: 'italic' }}>
              Hover over matrix cells to inspect individual outcome alignments.
            </div>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
};

export default Phase4Matrix;
