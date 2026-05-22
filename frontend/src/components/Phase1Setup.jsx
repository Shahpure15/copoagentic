import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { UploadCloud, CheckCircle, FileText, Settings, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Phase1Setup = () => {
  const { activeSessionId, setActiveSessionId, sessionData, refreshSession } = useSession();
  const navigate = useNavigate();
  const parseAcademicYear = (str) => {
    if (!str) return 2025;
    const match = str.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 2025;
  };

  const [formData, setFormData] = useState({
    subject_name: sessionData?.subject_name || '',
    subject_code: sessionData?.subject_code || '',
    academic_year: sessionData?.academic_year || '2025-26',
    year_of_study: sessionData?.year_of_study || 'TY'
  });
  
  const [startYear, setStartYear] = useState(() => parseAcademicYear(formData.academic_year));
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [yearError, setYearError] = useState('');
  
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [manualText, setManualText] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const [uploadWarning, setUploadWarning] = useState('');
  
  const hasSyllabusText = !!(sessionData?.syllabus_text && sessionData.syllabus_text.trim().length > 0);

  React.useEffect(() => {
    if (sessionData?.academic_year) {
      const parsed = parseAcademicYear(sessionData.academic_year);
      setStartYear(parsed);
      setFormData(prev => ({ ...prev, academic_year: sessionData.academic_year }));
    }
    if (sessionData?.syllabus_text) {
      setManualText(sessionData.syllabus_text);
    }
  }, [sessionData]);

  const getAcademicYearString = (year) => {
    const nextYearShort = (year + 1) % 100;
    const formattedNext = nextYearShort < 10 ? `0${nextYearShort}` : nextYearShort;
    return `${year}-${formattedNext}`;
  };

  const handleYearStep = (direction) => {
    if (activeSessionId) return;
    const newStartYear = direction === 'up' ? startYear + 1 : startYear - 1;
    setStartYear(newStartYear);
    const newYearStr = getAcademicYearString(newStartYear);
    setFormData(prev => ({ ...prev, academic_year: newYearStr }));
    setYearError('');
  };

  const validateAcademicYear = (val) => {
    if (!val) return "Academic year is required";
    const regex = /^(\d{4})-(\d{2}|\d{4})$/;
    const match = val.match(regex);
    if (!match) {
      return "Format must be YYYY-YY or YYYY-YYYY (e.g. 2024-25 or 2024-2025)";
    }
    
    const sYear = parseInt(match[1], 10);
    const endYearStr = match[2];
    let eYear = parseInt(endYearStr, 10);
    
    if (endYearStr.length === 2) {
      const startCent = Math.floor(sYear / 100);
      if (sYear % 100 === 99 && eYear === 0) {
        eYear = (startCent + 1) * 100;
      } else {
        eYear = startCent * 100 + eYear;
      }
    }
    
    if (eYear - sYear !== 1) {
      const nextShortYear = (sYear + 1) % 100;
      const formattedShort = nextShortYear < 10 ? `0${nextShortYear}` : nextShortYear;
      return `Gap must be exactly 1 year (e.g. ${sYear}-${formattedShort} or ${sYear}-${sYear + 1})`;
    }
    
    return null;
  };


  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (activeSessionId) return;
    
    const err = validateAcademicYear(formData.academic_year);
    if (err) {
      setYearError(err);
      return;
    }
    
    try {
      const res = await api.post('/sessions', formData);
      setActiveSessionId(res.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpload = async () => {
    if (!file || !activeSessionId) return;
    setIsUploading(true);
    setUploadWarning('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.upload(`/pipeline/${activeSessionId}/syllabus`, fd);
      await refreshSession();
      setFile(null); // Clear selected file state to reset view and allow subsequent uploads
      if (res && res.empty_text) {
        setUploadWarning("Your PDF appears to be a scanned image with no selectable text. Please paste the syllabus text manually in the Direct Paste tab below, or use the Quick-load DBMS Template.");
        setActiveTab('paste');
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadTemplate = () => {
    setManualText(DBMS_TEMPLATE);
    setUploadWarning('');
  };

  const handleSaveManualText = async () => {
    if (!manualText.trim() || !activeSessionId) return;
    setIsSavingText(true);
    try {
      await api.post(`/pipeline/${activeSessionId}/syllabus_text`, { syllabus_text: manualText });
      await refreshSession();
      setUploadWarning('');
    } catch (err) {
      alert("Saving failed: " + err.message);
    } finally {
      setIsSavingText(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const startPipeline = () => {
    navigate('/session/pipeline', { state: { triggerImmediately: true } });
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upper Bento Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Step 1: Session Details Card */}
        <div className="bento-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <Settings size={20} color="var(--aurora-purple)" />
            <h2 style={{ fontSize: '1.4rem' }}>1. Curriculum Scope Setup</h2>
          </div>
          
          <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Subject Name</label>
                <input type="text" value={formData.subject_name} onChange={e => setFormData({...formData, subject_name: e.target.value})} disabled={!!activeSessionId} placeholder="e.g. Compiler Design" required style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Subject Code</label>
                <input type="text" value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} disabled={!!activeSessionId} placeholder="e.g. CS-302" style={{ width: '100%' }} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Academic Year</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleYearStep('down')}
                    disabled={!!activeSessionId}
                    className="btn-secondary"
                    style={{
                      height: '50px',
                      width: '50px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: '700',
                      boxShadow: '2px 2px 0px #000000',
                      cursor: activeSessionId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    -
                  </button>
                  
                  <div
                    style={{
                      flex: 1,
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-obsidian)',
                      border: 'var(--neo-border-width) solid var(--border-thick)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: '700',
                      fontSize: '1.1rem',
                      boxShadow: '2px 2px 0px #000000',
                      letterSpacing: '0.05em',
                      userSelect: 'none'
                    }}
                  >
                    {formData.academic_year}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleYearStep('up')}
                    disabled={!!activeSessionId}
                    className="btn-secondary"
                    style={{
                      height: '50px',
                      width: '50px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: '700',
                      boxShadow: '2px 2px 0px #000000',
                      cursor: activeSessionId ? 'not-allowed' : 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
                {yearError && (
                  <div style={{
                    marginTop: '0.4rem',
                    color: '#000000',
                    background: 'var(--aurora-crimson)',
                    border: '2px solid var(--border-thick)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: '1px 1px 0px #000000',
                    display: 'inline-block'
                  }}>
                    ⚠️ {yearError}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Year of Study</label>
                <select value={formData.year_of_study} onChange={e => setFormData({...formData, year_of_study: e.target.value})} disabled={!!activeSessionId} style={{ width: '100%', height: '50px' }}>
                  <option value="FY">First Year (FY)</option>
                  <option value="SY">Second Year (SY)</option>
                  <option value="TY">Third Year (TY)</option>
                  <option value="BTech">Final Year (B.Tech)</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '0.75rem' }}>
              {!activeSessionId ? (
                <button type="submit" className="btn-aurora" style={{ width: '100%', height: '48px' }}>Initialize Session</button>
              ) : (
                <div style={{ 
                  color: 'var(--text-dark)', 
                  background: 'var(--aurora-emerald)', 
                  border: '3px solid var(--border-thick)',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '6px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.6rem', 
                  padding: '0.85rem',
                  fontWeight: '700',
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase'
                }}>
                  <CheckCircle size={18} /> Session Registered
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Step 2: Ingestion & Syllabus Input Card */}
        <div className="bento-card" style={{ opacity: activeSessionId ? 1 : 0.55, pointerEvents: activeSessionId ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UploadCloud size={20} color="var(--aurora-purple)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>2. Document Ingestion</h2>
            </div>
            
            {/* Cyber Tab Toggle Buttons */}
            <div style={{ display: 'flex', border: '3px solid var(--border-thick)', borderRadius: '6px', overflow: 'hidden', boxShadow: '2px 2px 0px #000000' }}>
              <button 
                type="button"
                onClick={() => { setActiveTab('upload'); setUploadWarning(''); }} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: activeTab === 'upload' ? 'var(--aurora-purple)' : 'var(--surface-base)',
                  color: activeTab === 'upload' ? 'var(--text-dark)' : 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRight: '3px solid var(--border-thick)',
                  textTransform: 'uppercase'
                }}
              >
                Upload File
              </button>
              <button 
                type="button"
                onClick={() => { setActiveTab('paste'); setUploadWarning(''); }} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: activeTab === 'paste' ? 'var(--aurora-purple)' : 'var(--surface-base)',
                  color: activeTab === 'paste' ? 'var(--text-dark)' : 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Direct Paste
              </button>
            </div>
          </div>

          {uploadWarning && (
            <div style={{
              background: 'var(--aurora-crimson)',
              color: '#000000',
              border: '3px solid var(--border-thick)',
              boxShadow: '3px 3px 0px #000000',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontWeight: '700',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.9rem',
              lineHeight: '1.4',
              textAlign: 'left'
            }}>
              ⚠️ {uploadWarning}
            </div>
          )}

          {activeTab === 'upload' ? (
            <div>
              <div 
                className={`file-dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{ marginBottom: '1.25rem', borderStyle: file ? 'solid' : 'dashed', borderColor: file ? 'var(--aurora-purple)' : '' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={38} color={file ? "var(--aurora-purple)" : "var(--text-secondary)"} />
                  {file ? (
                    <div>
                      <span style={{ display: 'block', fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{file.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ) : (
                    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      {hasSyllabusText && (
                        <span style={{
                          background: 'var(--aurora-emerald)',
                          color: 'var(--text-dark)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '4px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          border: '2px solid var(--border-thick)',
                          boxShadow: '1px 1px 0px #000000',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <CheckCircle size={14} /> ACTIVE SYLLABUS LOADED
                        </span>
                      )}
                      <span style={{ display: 'block', fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
                        {hasSyllabusText ? 'Drop new syllabus here to replace' : 'Drop syllabus here'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supports PDF or TXT formats</span>
                    </div>
                  )}
                  
                  {!file && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <label htmlFor="file-input" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        Select File
                      </label>
                      <input id="file-input" type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.txt" style={{ display: 'none' }} />
                    </div>
                  )}
                </div>
              </div>
              
              {file && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button 
                    className="btn-aurora" 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    style={{ width: '100%', height: '44px' }}
                  >
                    {isUploading ? 'Decoding File Contents...' : (hasSyllabusText ? 'Overwrite & Re-analyze Syllabus' : 'Analyze Document Structure')}
                  </button>
                  <button 
                    type="button"
                    className="btn-secondary" 
                    onClick={() => setFile(null)} 
                    disabled={isUploading}
                    style={{ width: '100%', height: '44px', boxShadow: '2px 2px 0px #000000' }}
                  >
                    Cancel Selection
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Syllabus Raw Text
                </span>
                
                <button 
                  type="button" 
                  onClick={handleLoadTemplate}
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    height: 'auto',
                    boxShadow: '1px 1px 0px #000000'
                  }}
                >
                  ✨ Quick-load DBMS Template
                </button>
              </div>
              
              <textarea
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                placeholder="Paste the course syllabus details here... (e.g. Modules, topics, reference books)"
                style={{
                  width: '100%',
                  height: '180px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  lineHeight: '1.4'
                }}
              />
              
              <button 
                type="button"
                className="btn-aurora"
                onClick={handleSaveManualText}
                disabled={isSavingText || !manualText.trim()}
                style={{ width: '100%', height: '44px' }}
              >
                {isSavingText ? 'Saving Syllabus Text...' : (hasSyllabusText ? 'Update Syllabus Text' : 'Save Syllabus Text')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Pipeline Trigger Card */}
      {hasSyllabusText && (
        <div className="bento-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '2.5rem', textAlign: 'center', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04), transparent)' }}>
          <div style={{
            background: 'var(--aurora-purple)',
            width: '56px',
            height: '56px',
            borderRadius: '4px',
            display: 'grid',
            placeItems: 'center',
            border: '3px solid var(--border-thick)',
            boxShadow: '3px 3px 0px #000000',
            color: 'var(--text-dark)'
          }}>
            <Play size={20} color="currentColor" fill="currentColor" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>Ingestion Finished successfully</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '550px', margin: '0 auto', fontSize: '0.9rem' }}>
              The syllabus has been successfully parsed. Trigger the multi-agent system to run parsing models, Bloom outcomes formulation, and PO mapping linkages.
            </p>
          </div>
          <button className="btn-aurora" onClick={startPipeline} style={{ padding: '1rem 3.5rem', fontSize: '1.05rem', marginTop: '0.5rem' }}>
            Orchestrate Multi-Agent Pipeline
          </button>
        </div>
      )}
    </div>
  );
};

const DBMS_TEMPLATE = `Subject: Database Management Systems (DBMS)
Course Code: CS-302

Module 1: Introduction to DBMS and Architecture (8 Hours)
- Database System Applications, Purpose of Database Systems, View of Data.
- Database Languages, Relational Databases, Database Design.
- Data Storage and Querying, Transaction Management, Database Architecture.
- Database Users and Administrators.

Module 2: Relational Model and SQL (12 Hours)
- Structure of Relational Databases, Database Schema, Keys, Schema Diagrams.
- Relational Query Languages, Relational Algebra.
- SQL Data Definition, Basic Structure of SQL Queries, Additional Basic Operations.
- Set Operations, Null Values, Aggregate Functions, Nested Subqueries.
- Modification of the Database, Intermediate SQL: Join Expressions, Views, Integrity Constraints.

Module 3: Database Design and Entity-Relationship (ER) Model (10 Hours)
- Overview of the Design Process, The Entity-Relationship Model, Constraints.
- Removing Redundant Attributes in Entity Sets, Entity-Relationship Diagrams.
- Reduction to Relational Schemas, Entity-Relationship Design Issues.
- Extended E-R Features, Alternative Notations for Modeling Data.

Module 4: Relational Database Design & Normalization (10 Hours)
- Features of Good Relational Designs, Functional Dependencies.
- Atomic Domains and First Normal Form (1NF).
- Decomposition Using Functional Dependencies (2NF, 3NF, BCNF).
- Functional Dependency Theory, Algorithms for Decomposition.
- Decomposition Using Multivalued Dependencies (4NF, 5NF).

Module 5: Transactions and Concurrency Control (10 Hours)
- Transaction Concept, A Simple Transaction Model, Storage Structure.
- Transaction Atomicity and Durability, Transaction Isolation, Serializability.
- Concurrency Control: Lock-Based Protocols, Deadlock Handling, Multiple Granularity.
- Timestamp-Based Protocols, Validation-Based Protocols.
- Recovery System: Failure Classification, Storage, Recovery and Atomicity, Recovery Algorithm.

Reference Books:
1. Silberschatz, Korth, Sudarshan, "Database System Concepts", 6th Edition, McGraw Hill.
2. Elmasri, Navathe, "Fundamentals of Database Systems", 7th Edition, Pearson.
3. Ramakrishnan, Gehrke, "Database Management Systems", 3rd Edition, McGraw Hill.`;

export default Phase1Setup;
