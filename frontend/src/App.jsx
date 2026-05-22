import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Phase1Setup from './components/Phase1Setup';
import Phase2COs from './components/Phase2COs';
import Phase3POs from './components/Phase3POs';
import Phase4Matrix from './components/Phase4Matrix';
import Phase5LearningPlan from './components/Phase5LearningPlan';
import Phase6Attainment from './components/Phase6Attainment';
import Phase8Reports from './components/Phase8Reports';
import AgentControlConsole from './components/AgentControlConsole';
import VersionHistory from './components/VersionHistory';
import CourseDashboard from './components/CourseDashboard';

const Placeholder = ({ title }) => (
  <div className="page-wrapper animate-fade-in">
    <div className="bento-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, fontSize: '0.95rem' }}>
        This curriculum module is currently being finalized by the agent network.
      </p>
    </div>
  </div>
);

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <Routes>
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="/courses" element={<CourseDashboard />} />
          <Route path="/session/setup" element={<Phase1Setup />} />
          <Route path="/session/pipeline" element={<AgentControlConsole />} />
          <Route path="/session/cos" element={<Phase2COs />} />
          <Route path="/session/pos" element={<Phase3POs />} />
          <Route path="/session/matrix" element={<Phase4Matrix />} />
          <Route path="/session/learning_plan" element={<Phase5LearningPlan />} />
          <Route path="/session/attainment" element={<Phase6Attainment />} />
          <Route path="/session/reports" element={<Phase8Reports />} />
          <Route path="/session/history" element={<VersionHistory />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
