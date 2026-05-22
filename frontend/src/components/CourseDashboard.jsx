import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../api/client';
import { BookOpen, Plus, Users, ArrowRight, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CourseDashboard = () => {
  const { activeSessionId, setActiveSessionId, setActiveBatchId } = useSession();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseData, setNewCourseData] = useState({
    subject_name: '',
    subject_code: '',
    academic_year: '2024-25',
    year_of_study: 'SY',
    batch_name: 'Main Batch'
  });

  const [uploadingFor, setUploadingFor] = useState(null); // stores batch_id
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await api.get('/courses');
      setCourses(data);
    } catch (e) {
      console.error("Failed to load courses", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', newCourseData);
      setShowNewCourse(false);
      loadCourses();
    } catch (e) {
      alert("Failed to create course");
    }
  };

  const handleAddBatch = async (sessionId) => {
    const batchName = prompt("Enter new batch name:");
    if (!batchName) return;
    try {
      await api.post(`/courses/${sessionId}/batches`, { name: batchName });
      loadCourses();
    } catch (e) {
      alert("Failed to add batch");
    }
  };

  const handleUploadStudents = async (batchId) => {
    if (!uploadFile) return alert("Select a file first");
    
    const formData = new FormData();
    formData.append("file", uploadFile);
    
    try {
      await api.post(`/courses/batches/${batchId}/students`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Students uploaded successfully");
      setUploadingFor(null);
      setUploadFile(null);
    } catch (e) {
      alert("Upload failed: " + (e.response?.data?.detail || e.message));
    }
  };

  const enterCoursePipeline = (sessionId) => {
    setActiveSessionId(sessionId);
    setActiveBatchId(null);
    navigate('/session/setup');
  };

  const handleDeleteCourse = async (sessionId) => {
    const isConfirmed = window.confirm(
      "WARNING: Are you absolutely sure you want to delete this course and ALL associated data (COs, POs, Batches, Students, Assignments, Marks)? This action CANNOT be undone."
    );
    if (!isConfirmed) return;
    
    try {
      await api.delete(`/courses/${sessionId}`);
      if (sessionId === activeSessionId) {
        setActiveSessionId(null);
        setActiveBatchId(null);
      }
      loadCourses();
    } catch (e) {
      alert("Failed to delete course: " + (e.response?.data?.detail || e.message));
    }
  };

  const enterBatchAttainment = (sessionId, batchId) => {
    setActiveSessionId(sessionId);
    setActiveBatchId(batchId);
    navigate('/session/plan');
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>My Courses</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your curriculum pipelines and student batches.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowNewCourse(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> New Course
        </button>
      </div>

      {showNewCourse && (
        <div className="bento-card" style={{ marginBottom: '2rem', border: '2px solid var(--aurora-primary)' }}>
          <h3 style={{ marginTop: 0 }}>Create New Course Session</h3>
          <form onSubmit={handleCreateCourse} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <input 
              type="text" 
              placeholder="Subject Name (e.g. Data Structures)" 
              required
              className="text-input"
              value={newCourseData.subject_name}
              onChange={e => setNewCourseData({...newCourseData, subject_name: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Subject Code (e.g. CS201)" 
              required
              className="text-input"
              value={newCourseData.subject_code}
              onChange={e => setNewCourseData({...newCourseData, subject_code: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Academic Year (e.g. 2024-25)" 
              required
              className="text-input"
              value={newCourseData.academic_year}
              onChange={e => setNewCourseData({...newCourseData, academic_year: e.target.value})}
            />
            <select 
              className="text-input"
              value={newCourseData.year_of_study}
              onChange={e => setNewCourseData({...newCourseData, year_of_study: e.target.value})}
            >
              <option value="FY">First Year (FY)</option>
              <option value="SY">Second Year (SY)</option>
              <option value="TY">Third Year (TY)</option>
              <option value="LY">Final Year (LY)</option>
            </select>
            <input 
              type="text" 
              placeholder="Initial Batch Name (e.g. Main Batch)" 
              required
              className="text-input"
              value={newCourseData.batch_name}
              onChange={e => setNewCourseData({...newCourseData, batch_name: e.target.value})}
              style={{ gridColumn: '1 / -1' }}
            />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary">Create Course</button>
              <button type="button" className="btn-secondary" onClick={() => setShowNewCourse(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div>Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="bento-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookOpen size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <p>You haven't created any courses yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {courses.map(course => (
            <div key={course.id} className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {course.subject_code} • {course.academic_year} • {course.year_of_study}
                  </div>
                  <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem' }}>{course.subject_name}</h3>
                  <div style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'var(--surface-elevate)', borderRadius: '4px', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Status: {course.status}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    onClick={() => enterCoursePipeline(course.id)}
                  >
                    <Settings size={16} /> Course Pipeline
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#ff4d4d', borderColor: 'transparent', background: 'rgba(255, 77, 77, 0.1)' }}
                    onClick={() => handleDeleteCourse(course.id)}
                    title="Delete Course permanently"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Batches</h4>
                  <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleAddBatch(course.id)}>
                    + Add Batch
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {course.batches && course.batches.map(batch => (
                    <div key={batch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{batch.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-secondary"
                          title="Upload Students"
                          style={{ padding: '0.4rem 0.6rem' }}
                          onClick={() => setUploadingFor(batch.id)}
                        >
                          <Users size={14} />
                        </button>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => enterBatchAttainment(course.id, batch.id)}
                        >
                          Attainment <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {uploadingFor && course.batches.find(b => b.id === uploadingFor) && (
                    <div style={{ background: 'var(--bg-obsidian)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-thick)', marginTop: '0.5rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        Upload Student List (CSV) for {course.batches.find(b => b.id === uploadingFor).name}
                      </p>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Required columns: Roll Number, Name</p>
                      <input type="file" accept=".csv" onChange={e => setUploadFile(e.target.files[0])} style={{ marginBottom: '1rem', width: '100%' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleUploadStudents(uploadingFor)}>Upload</button>
                        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setUploadingFor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseDashboard;
