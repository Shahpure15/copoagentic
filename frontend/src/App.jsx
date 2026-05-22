import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Phase1Setup from './components/Phase1Setup';
import Phase2COs from './components/Phase2COs';
import Phase4Matrix from './components/Phase4Matrix';
import AgentControlConsole from './components/AgentControlConsole';

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
          <Route path="/" element={<Navigate to="/session/setup" replace />} />
          <Route path="/session/setup" element={<Phase1Setup />} />
          <Route path="/session/pipeline" element={<AgentControlConsole />} />
          <Route path="/session/cos" element={<Phase2COs />} />
          <Route path="/session/pos" element={<Placeholder title="3. Curriculum Program Outcomes" />} />
          <Route path="/session/matrix" element={<Phase4Matrix />} />
          <Route path="/session/attainment" element={<Placeholder title="5. Attainment Analytics" />} />
          <Route path="/session/reports" element={<Placeholder title="6. Core Reports" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
