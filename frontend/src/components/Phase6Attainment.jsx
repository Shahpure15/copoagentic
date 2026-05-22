import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { BarChart3, UploadCloud, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Phase6Attainment = () => {
  const { sessionData, activeBatchId, refreshSession } = useSession();
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [batchData, setBatchData] = useState(null);
  
  useEffect(() => {
    if (activeBatchId && sessionData?.batches) {
      const batch = sessionData.batches.find(b => b.id === activeBatchId);
      setBatchData(batch);
    }
  }, [activeBatchId, sessionData]);
  
  const hasAttainmentData = batchData?.co_attainments && batchData.co_attainments.length > 0;
  
  const handleUpload = async () => {
    if (!file || !activeBatchId) return;
    setIsProcessing(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.upload(`/learning_plan/batches/${activeBatchId}/upload_marks`, fd);
      if (res && res.analytics) {
        setAnalytics(res.analytics);
      }
      await refreshSession();
      setFile(null);
    } catch (err) {
      setError(err.message || 'Failed to process attainment data');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sessionData || !activeBatchId) {
    return (
      <div className="page-wrapper animate-fade-in">
        <div className="bento-card">
          <p>Please initialize a session first.</p>
        </div>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = (batchData?.co_attainments || []).map(coa => ({
    name: coa.co_id,
    'Average Percentage': coa.avg_percentage,
    'Achieved Level': coa.achieved_level,
  }));

  const recommendations = sessionData?.recommendations || [];

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
            <BarChart3 size={20} />
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>5. Attainment Analytics</h2>
        </div>

        {!hasAttainmentData && !analytics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Upload your completed Assessment Excel template with student marks.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="file" accept=".csv,.xlsx" onChange={e => setFile(e.target.files[0])} className="btn-secondary" style={{ padding: '0.75rem' }} />
              {error && <div style={{ color: 'var(--aurora-crimson)', fontWeight: 'bold' }}>{error}</div>}
              <button 
                className="btn-aurora" 
                disabled={!file || isProcessing} 
                onClick={handleUpload}
              >
                {isProcessing ? 'Evaluating Performance...' : 'Process Attainment Template'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Chart Section */}
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>CO Average Attainment (%)</h3>
              <div style={{ height: '350px', background: 'var(--surface-base)', border: '3px solid var(--border-thick)', borderRadius: '6px', padding: '1rem', boxShadow: '3px 3px 0px #000000' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="var(--text-primary)" />
                    <YAxis stroke="var(--text-primary)" domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-obsidian)', border: '2px solid var(--border-thick)' }} />
                    <Legend />
                    <Bar dataKey="Average Percentage" fill="var(--aurora-purple)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Threshold and Levels Overview */}
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Target Attainment Levels</h3>
              <div className="table-responsive" style={{ border: '3px solid var(--border-thick)', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="neo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>CO ID</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>L1 (%)</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>L2 (%)</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>L3 (%)</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Achieved Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batchData?.co_attainments || []).map(coa => (
                      <tr key={coa.co_id} style={{ borderBottom: '1px solid var(--border-thick)' }}>
                        <td style={{ textAlign: 'left', padding: '0.75rem' }}><strong>{coa.co_id}</strong></td>
                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{coa.level_1_students_pct.toFixed(1)}%</td>
                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{coa.level_2_students_pct.toFixed(1)}%</td>
                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{coa.level_3_students_pct.toFixed(1)}%</td>
                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>
                          <span style={{ 
                            background: coa.achieved_level === 3 ? 'var(--aurora-emerald)' : (coa.achieved_level === 2 ? 'var(--aurora-purple)' : 'var(--aurora-crimson)'),
                            color: coa.achieved_level === 3 ? 'var(--text-dark)' : 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            Level {coa.achieved_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {analytics && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-elevate)', border: '2px solid var(--aurora-amber)', borderRadius: '6px' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Student Analytics Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-obsidian)', borderRadius: '4px', border: '1px solid var(--aurora-emerald)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--aurora-emerald)' }}>{analytics.fast}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fast Learners</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-obsidian)', borderRadius: '4px', border: '1px solid var(--aurora-primary)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--aurora-primary)' }}>{analytics.average}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Average Learners</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-obsidian)', borderRadius: '4px', border: '1px solid var(--aurora-crimson)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--aurora-crimson)' }}>{analytics.slow}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Slow Learners</div>
                  </div>
                </div>
              </div>
            )}

            {/* Corrective Actions / Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="var(--aurora-crimson)" />
                  AI Pedagogical Corrective Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recommendations.map(rec => (
                    <div key={rec.id} style={{ 
                      border: '3px solid var(--border-thick)',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      background: 'var(--surface-elevate)',
                      boxShadow: '3px 3px 0px #000000',
                      borderLeft: `6px solid ${rec.priority === 'HIGH' ? 'var(--aurora-crimson)' : 'var(--aurora-purple)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem' }}>Target: {rec.target}</strong>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', background: 'var(--bg-obsidian)', borderRadius: '4px', border: '1px solid var(--border-thick)' }}>{rec.priority} PRIORITY</span>
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}><strong>Issue:</strong> {rec.issue}</p>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>Suggestion:</strong> {rec.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Phase6Attainment;
