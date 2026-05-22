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

import { useLocation } from 'react-router-dom';
import MediatorChat from './components/MediatorChat';
import { useSession } from './context/SessionContext';
import { Bot, X } from 'lucide-react';

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

const getPhaseFromPath = (path) => {
  if (path.includes('cos')) return 2;
  if (path.includes('pos')) return 3;
  if (path.includes('matrix')) return 4;
  if (path.includes('learning_plan')) return 5;
  if (path.includes('attainment')) return 6;
  if (path.includes('reports')) return 8;
  return 1;
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const location = useLocation();
  const { sessionData, isChatOpen, setIsChatOpen, chatInput } = useSession();
  const currentPhase = getPhaseFromPath(location.pathname);

  return (
    <div className="app-container">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
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

      {/* Global AI Mediator Toggle */}
      {location.pathname.includes('/session') && (!sessionData?.is_locked || currentPhase >= 5) && (
        <>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--aurora-purple)',
              border: '3px solid var(--border-thick)',
              boxShadow: '4px 4px 0px #000',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 100,
              color: 'var(--text-dark)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            {isChatOpen ? <X size={28} /> : <Bot size={28} />}
          </button>

          {/* Chat Drawer */}
          <div style={{
            position: 'fixed',
            bottom: '6rem',
            right: isChatOpen ? '2rem' : '-500px',
            width: '400px',
            height: 'calc(100vh - 8rem)',
            zIndex: 99,
            transition: 'right 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            opacity: isChatOpen ? 1 : 0,
            pointerEvents: isChatOpen ? 'auto' : 'none'
          }}>
            <div style={{ height: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '8px 8px 0px #000' }}>
              <MediatorChat phase={currentPhase} externalInput={chatInput} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
