import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { FileText, Cpu, Download, Activity, CheckCircle, PenTool } from 'lucide-react';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

const Phase5LearningPlan = () => {
  const { activeSessionId, activeBatchId, setActiveBatchId, sessionData } = useSession();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editInstructions, setEditInstructions] = useState({});
  const [numAssignments, setNumAssignments] = useState(5);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  useEffect(() => {
    if (activeBatchId) {
      loadAssignments();
    } else if (sessionData && sessionData.batches && sessionData.batches.length > 0) {
      setActiveBatchId(sessionData.batches[0].id);
    }
  }, [activeBatchId, sessionData]);

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
      await api.post(`/learning_plan/batches/${activeBatchId}/generate?num_assignments=${numAssignments}`);
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

  const handleEditAssignment = async (assignmentId) => {
    const instruction = editInstructions[assignmentId];
    if (!instruction) return;
    
    setEditingId(assignmentId);
    try {
      const response = await api.post(`/learning_plan/batches/${activeBatchId}/assignments/${assignmentId}/edit`, {
        instruction
      });
      setAssignments(prev => prev.map(a => a.id === assignmentId ? response : a));
      setEditInstructions(prev => ({ ...prev, [assignmentId]: '' }));
    } catch (e) {
      alert("Failed to edit assignment");
    } finally {
      setEditingId(null);
    }
  };

  const handleDownloadAssignment = (assignment) => {
    try {
      const text = assignment.content || '';
      const htmlContent = marked.parse ? marked.parse(text) : marked(text);

      const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${assignment.title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; line-height: 1.6; padding: 40px; max-width: 800px; margin: auto; }
            h1, h2, h3, h4, h5 { color: #333; margin-bottom: 10px; margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
            code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; }
            p { margin-bottom: 10px; }
            ul, ol { margin-bottom: 10px; padding-left: 20px; }
            @media print {
              body { padding: 0; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(finalHtml);
      printWindow.document.close();
    } catch (e) {
      console.error("Markdown parse failed:", e);
      alert("Failed to parse markdown: " + e.message);
    }
  };

  const handleDownloadAll = () => {
    if (!assignments || assignments.length === 0) return;
    try {
      let combinedHtml = "";
      assignments.forEach(assignment => {
        const text = assignment.content || '';
        const htmlContent = marked.parse ? marked.parse(text) : marked(text);
        combinedHtml += `<div class="page-break">${htmlContent}</div>`;
      });

      const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>All Assignments</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; line-height: 1.6; padding: 40px; max-width: 800px; margin: auto; }
            h1, h2, h3, h4, h5 { color: #333; margin-bottom: 10px; margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
            code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; }
            p { margin-bottom: 10px; }
            ul, ol { margin-bottom: 10px; padding-left: 20px; }
            .page-break { page-break-after: always; margin-bottom: 40px; }
            @media print {
              body { padding: 0; max-width: 100%; }
              .page-break { margin-bottom: 0; }
            }
          </style>
        </head>
        <body>
          ${combinedHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 1000);
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(finalHtml);
      printWindow.document.close();
    } catch (e) {
      console.error("Markdown parse failed:", e);
      alert("Failed to generate PDF: " + e.message);
    }
  };

  if (!activeBatchId) {
    return (
      <div className="page-wrapper">
        <div className="bento-card">
          {sessionData?.batches?.length === 0 ? "No batches available for this course. Add a batch in the dashboard." : "Selecting batch..."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="bento-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--aurora-primary) 0%, var(--aurora-purple) 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Count:</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={numAssignments} 
                onChange={(e) => setNumAssignments(parseInt(e.target.value) || 1)}
                className="neo-input"
                style={{ width: '60px', padding: '0.4rem' }}
              />
            </div>
            <button 
              className="btn-primary" 
              onClick={handleGenerate}
              disabled={loading}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              {loading ? <Activity className="spin" size={18} /> : <Cpu size={18} />}
              {loading ? "Synthesizing..." : "Generate Optimal Plan"}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={handleDownloadAll}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--aurora-blue)', color: '#fff' }}
            >
              <Download size={18} /> Download All (PDF)
            </button>
            <button 
              className="btn-primary" 
              onClick={handleExportTemplate}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--aurora-emerald)', color: '#000' }}
            >
              <Download size={18} /> Download Excel Template
            </button>
          </div>
        )}
      </div>

      {generated && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Sidebar Selector */}
          <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Assignments</h3>
            {assignments.map((a, index) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssignmentId(a.id)}
                style={{
                  textAlign: 'left',
                  padding: '0.8rem',
                  borderRadius: '4px',
                  background: selectedAssignmentId === a.id || (!selectedAssignmentId && index === 0) ? 'var(--aurora-primary)' : 'var(--bg-obsidian)',
                  color: selectedAssignmentId === a.id || (!selectedAssignmentId && index === 0) ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--border-thick)',
                  cursor: 'pointer',
                  fontWeight: selectedAssignmentId === a.id || (!selectedAssignmentId && index === 0) ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {a.title}
              </button>
            ))}
          </div>

          {/* Main Content Pane */}
          <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              const a = assignments.find(ass => ass.id === (selectedAssignmentId || assignments[0]?.id));
              if (!a) return <p>Select an assignment.</p>;

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{a.title}</h3>
                      <div className="rendered-description" style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.95rem', 
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5'
                      }} dangerouslySetInnerHTML={{ __html: marked.parse(a.description || '') }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--aurora-primary)' }}>{a.max_marks} pts</span>
                      <button 
                        onClick={() => handleDownloadAssignment(a)}
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
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

                  {a.content && (
                    <div style={{ 
                      background: '#fff', 
                      color: '#000',
                      padding: '2rem', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border-thick)', 
                      marginTop: '1rem',
                      overflowX: 'auto'
                    }}>
                      <div 
                        className="rendered-assignment"
                        dangerouslySetInnerHTML={{ __html: marked.parse(a.content) }} 
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          lineHeight: '1.6'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* AI Edit Box */}
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Ask AI to modify this assignment (e.g. 'Make it harder')"
                      className="neo-input"
                      style={{ flex: 1 }}
                      value={editInstructions[a.id] || ''}
                      onChange={(e) => setEditInstructions(prev => ({ ...prev, [a.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditAssignment(a.id)}
                    />
                    <button 
                      className="btn-primary" 
                      onClick={() => handleEditAssignment(a.id)}
                      disabled={editingId === a.id || !editInstructions[a.id]}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--aurora-purple)' }}
                    >
                      {editingId === a.id ? <Activity className="spin" size={14} /> : <PenTool size={14} />}
                      Edit
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Phase5LearningPlan;
