import React from 'react';
import { useSession } from '../context/SessionContext';
import { FileText, Download, Target, Compass, MessageSquare } from 'lucide-react';
import { api } from '../api/client';

const Phase8Reports = () => {
  const { sessionData, activeSessionId } = useSession();

  if (!sessionData) {
    return (
      <div className="page-wrapper animate-fade-in">
        <div className="bento-card">
          <p>Please initialize a session first.</p>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const blob = await api.download(`/reports/${activeSessionId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `COPO_Report_${activeSessionId.substring(0,8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert("Failed to download report. Ensure the pipeline has completely finished processing.");
    }
  };

  const hasReport = !!sessionData.excel_report_path;

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Download Section */}
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
            <FileText size={20} />
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>6. Core Reports</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            The AI agents have compiled all generated Course Outcomes, mappings, attainment metrics, and recommendations into the finalized Excel accreditation report.
          </p>
          <button 
            className="btn-aurora" 
            onClick={handleDownload} 
            disabled={!hasReport}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}
          >
            <Download size={20} />
            {hasReport ? 'Download NBA/NAAC Excel Report' : 'Report Not Yet Generated'}
          </button>
        </div>
      </div>

      {/* Teaching Philosophy Section */}
      {sessionData.teaching_philosophy && (
        <div className="bento-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'var(--surface-base)',
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--border-thick)',
              boxShadow: '2px 2px 0px #000000',
              color: 'var(--text-primary)'
            }}>
              <MessageSquare size={20} />
            </div>
            <h2 style={{ fontSize: '1.4rem' }}>Generated Teaching Philosophy</h2>
          </div>
          
          <div style={{
            background: 'var(--bg-obsidian)',
            border: '2px solid var(--border-thick)',
            borderRadius: '6px',
            padding: '1.5rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            whiteSpace: 'pre-wrap'
          }}>
            {sessionData.teaching_philosophy}
          </div>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
          <Target size={32} color="var(--aurora-purple)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }}>{(sessionData.course_outcomes || []).length}</h3>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold' }}>Generated COs</span>
        </div>
        
        <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
          <Compass size={32} color="var(--aurora-emerald)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }}>{(sessionData.program_outcomes || []).length}</h3>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold' }}>Mapped POs</span>
        </div>
        
        <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
          <FileText size={32} color="var(--aurora-crimson)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }}>{(sessionData.recommendations || []).length}</h3>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold' }}>AI Recommendations</span>
        </div>

      </div>

    </div>
  );
};

export default Phase8Reports;
