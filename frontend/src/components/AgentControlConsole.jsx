import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, RotateCcw, AlertTriangle, ArrowRight, Server, Terminal } from 'lucide-react';
import AgentStream from './AgentStream';

const AgentControlConsole = () => {
  const { activeSessionId, sessionData, refreshSession, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!loading && sessionData && !hasInitialized) {
      if (sessionData?.cos && sessionData.cos.length > 0) {
        setCompleted(true);
        setPipelineRunning(false);
      } else if (location.state?.triggerImmediately) {
        setPipelineRunning(true);
      }
      setHasInitialized(true);
    }
  }, [loading, sessionData, location.state, hasInitialized]);

  const handleStartPipeline = () => {
    if (!activeSessionId) return;
    setCompleted(false);
    setPipelineRunning(true);
  };

  const handlePipelineComplete = () => {
    setPipelineRunning(false);
    setCompleted(true);
    refreshSession();
  };

  if (loading || !hasInitialized) {
    return <div className="page-wrapper"><div className="bento-card">Loading session data...</div></div>;
  }

  if (!activeSessionId) {
    return (
      <div className="page-wrapper animate-fade-in">
        <div className="bento-card" style={{ textAlign: 'center', padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(248, 113, 113, 0.1)',
            width: '64px',
            height: '64px',
            borderRadius: '4px',
            display: 'grid',
            placeItems: 'center',
            border: '3px solid var(--border-thick)',
            boxShadow: '3px 3px 0px #000000',
            color: 'var(--aurora-crimson)'
          }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>No Active Session</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', fontSize: '0.95rem' }}>
              You need to initialize a curriculum session and specify your subject metadata before you can orchestrate the pipeline.
            </p>
          </div>
          <button 
            className="btn-aurora" 
            onClick={() => navigate('/session/setup')}
            style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>Initialize Curriculum Session</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Agent Control Console</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
            Orchestrate and monitor the multi-agent pipeline responsible for syllabus parsing and accreditation calculations.
          </p>
        </div>
        
        {completed && !pipelineRunning && (
          <button 
            className="btn-secondary" 
            onClick={handleStartPipeline}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={16} />
            <span>Re-run Full Pipeline</span>
          </button>
        )}
      </div>

      {/* Main Console Logic */}
      {pipelineRunning ? (
        <AgentStream sessionId={activeSessionId} onComplete={handlePipelineComplete} />
      ) : completed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Success Banner Card */}
          <div className="bento-card" style={{ 
            background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.05), transparent)', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '3rem 2rem', 
            textAlign: 'center' 
          }}>
            <div style={{
              background: 'var(--aurora-emerald)',
              width: '56px',
              height: '56px',
              borderRadius: '4px',
              display: 'grid',
              placeItems: 'center',
              border: '3px solid var(--border-thick)',
              boxShadow: '3px 3px 0px #000000',
              color: 'var(--text-dark)'
            }}>
              <Server size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Pipeline Calibrated Successfully
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '550px', margin: '0 auto', fontSize: '0.9rem' }}>
                All 12 cognitive agents successfully ingested your syllabus, formulated Course Outcomes (COs), mapped Program Outcomes (POs), and outputted alignment matrices.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                className="btn-aurora"
                onClick={() => navigate('/session/cos')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Inspect Generated COs</span>
                <ArrowRight size={16} />
              </button>
              <button 
                className="btn-secondary"
                onClick={() => navigate('/session/matrix')}
              >
                View Heatmap Matrix
              </button>
            </div>
          </div>

          {/* Fallback Static Stream Map */}
          <AgentStream sessionId={activeSessionId} onComplete={null} isStatic={true} />
        </div>
      ) : (
        /* Syllabus uploaded but not run yet */
        <div className="bento-card" style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.5rem',
          background: 'radial-gradient(ellipse at center, rgba(167, 139, 250, 0.05), transparent)' 
        }}>
          <div style={{
            background: 'var(--aurora-purple)',
            width: '60px',
            height: '60px',
            borderRadius: '4px',
            display: 'grid',
            placeItems: 'center',
            border: '3px solid var(--border-thick)',
            boxShadow: '3px 3px 0px #000000',
            color: 'var(--text-dark)'
          }}>
            <Terminal size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>Ingestion Pipeline Ready</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem' }}>
              {sessionData?.syllabus_text 
                ? 'Your syllabus document has been successfully ingested and decoded. You can now execute the 12-agent orchestration pipeline to formulate COs and alignment metrics.'
                : 'You need to upload your course syllabus file under Session Setup before executing the multi-agent pipeline.'}
            </p>
          </div>
          
          {sessionData?.syllabus_text ? (
            <button 
              className="btn-aurora" 
              onClick={handleStartPipeline}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 3rem' }}
            >
              <Play size={18} fill="currentColor" />
              <span>Orchestrate Multi-Agent System</span>
            </button>
          ) : (
            <button 
              className="btn-aurora" 
              onClick={() => navigate('/session/setup')}
            >
              Go to Session Setup
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentControlConsole;
