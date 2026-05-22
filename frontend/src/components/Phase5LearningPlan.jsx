import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { FileText, Cpu, Download, Activity, CheckCircle, PenTool } from 'lucide-react';

const Phase5LearningPlan = () => {
  const { activeSessionId, activeBatchId } = useSession();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (activeBatchId) {
      loadAssignments();
    }
  }, [activeBatchId]);

  const loadAssignments = async () => {
    try {
      const data = await api.get(`/learning_plan/batches/${activeBatchId}/assignments`);
      if (data && data.length > 0) {
        setAssignments(data);
        setGenerated(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post(`/learning_plan/batches/${activeBatchId}/generate`);
      await loadAssignments();
      setGenerated(true);
    } catch (e) {
      alert("Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      const response = await api.get(`/learning_plan/batches/${activeBatchId}/export_template`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Assessment_Template.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert("Export failed. Did you upload a student list from the Course Dashboard?");
    }
  };

  if (!activeBatchId) return <div className="page-wrapper"><div className="bento-card">Select a batch from the dashboard first.</div></div>;

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="bento-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              background: 'var(--aurora-primary)',
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--border-thick)',
              boxShadow: '2px 2px 0px #000000',
              color: '#fff'
            }}>
              <PenTool size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>AI Learning Plan</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Generate assignments engineered to measure your specific CO-PO targets.
          </p>
        </div>

        {!generated ? (
          <button 
            className="btn-primary" 
            onClick={handleGenerate}
            disabled={loading}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            {loading ? <Activity className="spin" size={18} /> : <Cpu size={18} />}
            {loading ? "Synthesizing..." : "Generate Optimal Plan"}
          </button>
        ) : (
          <button 
            className="btn-primary" 
            onClick={handleExportTemplate}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--aurora-emerald)', color: '#000' }}
          >
            <Download size={18} /> Download Excel Template
          </button>
        )}
      </div>

      {generated && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {assignments.map((a, i) => (
            <div key={i} className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{a.title}</h3>
                <span style={{ fontWeight: 'bold', color: 'var(--aurora-primary)' }}>{a.max_marks} pts</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>{a.description}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', background: 'var(--bg-obsidian)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-thick)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Targets:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {a.target_co_ids?.map(co => (
                    <span key={co} style={{ background: 'var(--aurora-amber)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{co}</span>
                  ))}
                  {a.target_po_ids?.map(po => (
                    <span key={po} style={{ background: 'var(--aurora-emerald)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{po}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Phase5LearningPlan;
