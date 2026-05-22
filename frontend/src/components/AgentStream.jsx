import React, { useState, useEffect, useRef } from 'react';
import { Activity, Terminal, Cpu, Loader2, ChevronRight, CheckCircle2, Zap } from 'lucide-react';

const AgentStream = ({ sessionId, onComplete, isStatic = false }) => {
  const [logs, setLogs] = useState(() => {
    if (isStatic) {
      return [
        { agent: 'system', status: 'done', detail: 'Accreditation multi-agent lifecycle execution complete!' },
        { agent: 'report_generator', status: 'done', detail: 'Finished: Compiling sheet equations, formatting tables, and compiling final Excel spreadsheet... ✓' },
        { agent: 'orchestrator', status: 'done', detail: 'Accreditation multi-agent lifecycle execution complete!' }
      ];
    }
    return [];
  });
  const [activeAgent, setActiveAgent] = useState(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(() => isStatic ? 4 : 0);
  const [agentStatuses, setAgentStatuses] = useState(() => {
    const initial = {
      syllabus_parser: 'idle',
      co_generator: 'idle',
      co_validator: 'idle',
      reflection_agent: 'idle',
      po_loader: 'idle',
      po_mapper: 'idle',
      mapping_validator: 'idle',
      teaching_philosophy: 'idle',
      co_attainment: 'idle',
      po_attainment: 'idle',
      recommendation: 'idle',
      report_generator: 'idle'
    };
    if (isStatic) {
      Object.keys(initial).forEach(k => {
        initial[k] = 'done';
      });
    }
    return initial;
  });

  const terminalContainerRef = useRef(null);

  useEffect(() => {
    const container = terminalContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
      if (isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs]);

  useEffect(() => {
    if (!sessionId) return;

    const token = localStorage.getItem('access_token');
    const startStream = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/pipeline/${sessionId}/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.body) throw new Error("No readable stream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.status === 'running') {
                  setActiveAgent(data.agent);
                  setAgentStatuses(prev => ({ ...prev, [data.agent]: 'active' }));
                  // Update phase index based on running agent
                  const index = agentsList.findIndex(a => a.id === data.agent);
                  if (index !== -1) {
                    if (index < 2) setCurrentPhaseIndex(0); // Setup
                    else if (index < 4) setCurrentPhaseIndex(1); // Formulation
                    else if (index < 8) setCurrentPhaseIndex(2); // Alignment
                    else setCurrentPhaseIndex(3); // Reporting
                  }
                } else if (data.status === 'done') {
                  setAgentStatuses(prev => ({ ...prev, [data.agent]: 'done' }));
                } else if (data.status === 'error') {
                  setAgentStatuses(prev => ({ ...prev, [data.agent]: 'error' }));
                }
                
                setLogs(prev => [...prev, data]);
                
                if (data.agent === 'orchestrator' && data.status === 'done') {
                  setActiveAgent(null);
                  // Mark all agents done for visual satisfaction
                  setAgentStatuses(prev => {
                    const allDone = {};
                    Object.keys(prev).forEach(k => { allDone[k] = 'done'; });
                    return allDone;
                  });
                  setCurrentPhaseIndex(4); // Fully Complete
                  if (onComplete) onComplete();
                }
              } catch (e) {
                console.error("SSE parse error", e, line);
              }
            }
          }
        }
      } catch (err) {
        console.error("Stream failed", err);
        setLogs(prev => [...prev, { agent: 'system', status: 'error', detail: 'Connection lost' }]);
      }
    };

    startStream();
  }, [sessionId]);

  const agentsList = [
    { id: 'syllabus_parser', label: 'Syllabus Parser', phase: 0, desc: 'Extract syllabus topics' },
    { id: 'po_loader', label: 'PO Loader', phase: 0, desc: 'Load curriculum metrics' },
    { id: 'co_generator', label: 'CO Generator', phase: 1, desc: 'Formulate Bloom outcomes' },
    { id: 'co_validator', label: 'CO Validator', phase: 1, desc: 'Audit quality constraints' },
    { id: 'reflection_agent', label: 'Reflector Agent', phase: 1, desc: 'Self-correct outcomes' },
    { id: 'po_mapper', label: 'PO Mapper', phase: 2, desc: 'Align CO-PO linkages' },
    { id: 'mapping_validator', label: 'Matrix Auditor', phase: 2, desc: 'Validate mapping justification' },
    { id: 'teaching_philosophy', label: 'Pedagogy Agent', phase: 2, desc: 'Generate course philosophy' },
    { id: 'co_attainment', label: 'CO Attainment', phase: 3, desc: 'Compute student metrics' },
    { id: 'po_attainment', label: 'PO Attainment', phase: 3, desc: 'Aggregate outcomes weights' },
    { id: 'recommendation', label: 'Advisor Agent', phase: 3, desc: 'Generate target corrections' },
    { id: 'report_generator', label: 'Excel Compiler', phase: 3, desc: 'Compile final reports' }
  ];

  const phases = [
    { title: "Knowledge Discovery", desc: "Ingesting syllabus & metrics", color: "var(--cyber-cyan)" },
    { title: "Outcomes Design", desc: "Formulating verified outcomes", color: "var(--aurora-purple)" },
    { title: "Alignment Matrix", desc: "Calibrating competencies", color: "var(--aurora-violet)" },
    { title: "Accreditation Reporting", desc: "Analytics & Excel export", color: "var(--aurora-emerald)" }
  ];

  const getAgentColor = (status, agentId) => {
    if (status === 'active') return 'var(--aurora-purple)';
    if (status === 'done') return 'var(--aurora-emerald)';
    if (status === 'error') return 'var(--aurora-crimson)';
    return '#1E2235'; // idle/muted border
  };

  const getAgentShadow = (status) => {
    if (status === 'active') return '4px 4px 0px var(--aurora-purple)';
    if (status === 'done') return '4px 4px 0px var(--aurora-emerald)';
    if (status === 'error') return '4px 4px 0px var(--aurora-crimson)';
    return '2px 2px 0px #000000';
  };

  return (
    <div className="bento-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Stream Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--border-thick)', paddingBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--aurora-purple)',
            color: 'var(--text-dark)',
            border: '2px solid var(--border-thick)',
            boxShadow: '2px 2px 0px #000000',
            width: '36px',
            height: '36px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '4px'
          }}>
            <Zap size={18} fill="currentColor" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>Accreditation Pipeline</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Multi-Agent System Visualization</p>
          </div>
        </div>
        <div style={{ 
          fontSize: '0.8rem', 
          color: 'var(--text-dark)', 
          background: 'var(--aurora-emerald)',
          border: '2px solid var(--border-thick)',
          boxShadow: '2px 2px 0px #000000',
          padding: '0.35rem 0.75rem',
          borderRadius: '4px',
          fontWeight: '700',
          fontFamily: "'JetBrains Mono', monospace" 
        }}>
          SSE: Active Socket
        </div>
      </div>

      {/* Progress Phase Status Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '0.5rem', 
        background: '#08090C',
        padding: '0.75rem',
        borderRadius: '6px',
        border: '3px solid var(--border-thick)',
        boxShadow: '3px 3px 0px #000000'
      }}>
        {phases.map((phase, idx) => {
          const isActive = idx === currentPhaseIndex;
          const isDone = idx < currentPhaseIndex;
          return (
            <div 
              key={idx}
              style={{
                padding: '0.5rem 0.75rem',
                border: `2px solid ${isActive ? phase.color : (isDone ? 'var(--aurora-emerald)' : 'var(--border-muted)')}`,
                borderRadius: '4px',
                background: isActive ? `${phase.color}15` : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                opacity: isActive || isDone ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", color: isActive ? phase.color : (isDone ? 'var(--aurora-emerald)' : 'var(--text-secondary)') }}>
                  Phase {idx + 1}
                </span>
                {isDone && <CheckCircle2 size={12} color="var(--aurora-emerald)" />}
              </div>
              <h5 style={{ fontSize: '0.85rem', margin: 0, textTransform: 'none', color: 'var(--text-primary)' }}>{phase.title}</h5>
            </div>
          );
        })}
      </div>

      {/* Agents Network Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Cpu size={16} /> Orchestrated Node Topography
        </h4>
        
        {/* Phase Row segments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          {[0, 1, 2, 3].map((phaseId) => {
            const phaseAgents = agentsList.filter(a => a.phase === phaseId);
            const isPhaseActive = currentPhaseIndex === phaseId;
            return (
              <div 
                key={phaseId}
                style={{
                  border: '3px solid var(--border-thick)',
                  borderRadius: '6px',
                  padding: '1.25rem',
                  background: isPhaseActive ? 'rgba(167, 139, 250, 0.02)' : 'transparent',
                  borderColor: isPhaseActive ? 'var(--aurora-purple)' : 'var(--border-thick)',
                  boxShadow: isPhaseActive ? '4px 4px 0px var(--aurora-purple)' : '2px 2px 0px #000000',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid var(--border-thick)', paddingBottom: '0.5rem' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isPhaseActive ? 'var(--aurora-purple)' : (currentPhaseIndex > phaseId ? 'var(--aurora-emerald)' : 'var(--text-secondary)')
                  }} />
                  <span style={{ 
                    fontFamily: "'Space Grotesk', sans-serif", 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    textTransform: 'uppercase',
                    color: isPhaseActive ? 'var(--aurora-purple)' : 'var(--text-primary)'
                  }}>
                    {phases[phaseId].title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>— {phases[phaseId].desc}</span>
                </div>

                {/* Agents list in this phase */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {phaseAgents.map(agent => {
                    const status = agentStatuses[agent.id];
                    const isActive = status === 'active';
                    const isDone = status === 'done';
                    const isError = status === 'error';
                    
                    return (
                      <div 
                        key={agent.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '6px',
                          background: isActive ? 'var(--surface-elevate)' : 'var(--bg-obsidian)',
                          border: `3px solid ${getAgentColor(status, agent.id)}`,
                          boxShadow: getAgentShadow(status),
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            color: isDone ? 'var(--aurora-emerald)' : (isActive ? 'var(--aurora-purple)' : 'var(--text-secondary)')
                          }}>
                            {status}
                          </span>
                          
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            background: isDone ? 'rgba(52, 211, 153, 0.1)' : (isActive ? 'rgba(167, 139, 250, 0.1)' : 'rgba(255,255,255,0.02)'),
                            display: 'grid',
                            placeItems: 'center',
                            border: `2px solid ${getAgentColor(status, agent.id)}`
                          }}>
                            {isActive ? (
                              <Loader2 size={12} className="pulse-active-agent" style={{ animation: 'spin 1.5s linear infinite' }} />
                            ) : (
                              <Cpu size={12} color={isDone ? 'var(--aurora-emerald)' : 'var(--text-secondary)'} />
                            )}
                          </div>
                        </div>

                        <div>
                          <h5 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.15rem 0', textTransform: 'none', color: 'var(--text-primary)' }}>{agent.label}</h5>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{agent.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal logs block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: "'Space Grotesk', sans-serif" }}>
          <Terminal size={14} /> Pipeline Audit Trails
        </div>
        
        <div style={{ 
          background: '#040508', 
          border: '3px solid var(--border-thick)',
          padding: '1.25rem', 
          borderRadius: '6px', 
          maxHeight: '260px', 
          overflowY: 'auto', 
          fontFamily: "'JetBrains Mono', monospace", 
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9)'
        }}>
          {logs.map((log, i) => {
            let labelColor = 'var(--aurora-purple)';
            if (log.agent === 'co_validator' || log.agent === 'mapping_validator') labelColor = 'var(--aurora-violet)';
            else if (log.agent === 'syllabus_parser' || log.agent === 'po_loader') labelColor = 'var(--cyber-cyan)';
            else if (log.agent === 'co_attainment' || log.agent === 'po_attainment') labelColor = 'var(--aurora-amber)';
            else if (log.agent === 'report_generator') labelColor = 'var(--aurora-emerald)';
            else if (log.agent === 'orchestrator') labelColor = '#F8FAFC';

            return (
              <div key={i} style={{ 
                marginBottom: '0.15rem', 
                color: log.status === 'error' ? 'var(--aurora-crimson)' : 'var(--text-primary)',
                opacity: i === logs.length - 1 ? 1 : 0.65,
                transform: i === logs.length - 1 ? 'translateX(2px)' : 'none',
                transition: 'all 0.3s'
              }}>
                <span style={{ 
                  color: labelColor, 
                  marginRight: '0.5rem', 
                  border: '1.5px solid var(--border-thick)',
                  background: '#11131C',
                  padding: '0.1rem 0.35rem',
                  fontSize: '0.7rem',
                  borderRadius: '3px',
                  fontWeight: '700',
                  boxShadow: '1px 1px 0px #000000'
                }}>
                  {log.agent.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>&gt;</span>
                {log.detail}
              </div>
            );
          })}
          {logs.length === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Awaiting pipeline signal activation...</span>}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

export default AgentStream;
