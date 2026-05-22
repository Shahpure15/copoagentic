import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Target, Grid, BarChart3, Terminal, FileText, Compass, Cpu } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/session/setup', label: '1. Session Setup', icon: <BookOpen size={18} /> },
    { path: '/session/pipeline', label: '1b. Agent Console', icon: <Cpu size={18} /> },
    { path: '/session/cos', label: '2. Generate COs', icon: <Target size={18} /> },
    { path: '/session/pos', label: '3. Input POs', icon: <Compass size={18} /> },
    { path: '/session/matrix', label: '4. Matrix Grid', icon: <Grid size={18} /> },
    { path: '/session/attainment', label: '5. Attainment Analytics', icon: <BarChart3 size={18} /> },
    { path: '/session/reports', label: '6. Core Reports', icon: <FileText size={18} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <div style={{
          background: 'var(--aurora-purple)',
          width: '38px',
          height: '38px',
          borderRadius: '4px',
          display: 'grid',
          placeItems: 'center',
          border: '3px solid var(--border-thick)',
          boxShadow: '2px 2px 0px #000000',
          color: 'var(--text-dark)'
        }}>
          <Terminal size={20} fill="currentColor" />
        </div>
        <span className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          COPO.agent
        </span>
      </div>

      {/* Navigation Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: 'none',
              padding: '0.85rem 1.1rem',
              borderRadius: '6px',
              color: isActive ? 'var(--text-dark)' : 'var(--text-primary)',
              background: isActive ? 'var(--aurora-purple)' : 'transparent',
              border: '3px solid',
              borderColor: isActive ? 'var(--border-thick)' : 'transparent',
              boxShadow: isActive ? '3px 3px 0px #000000' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              fontWeight: '700',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.9rem',
              transition: 'all 0.15s ease',
            })}
            onMouseEnter={(e) => {
              // Custom active hover transitions via raw DOM hover styles
              if (!e.currentTarget.className.includes('active')) {
                e.currentTarget.style.borderColor = 'var(--border-thick)';
                e.currentTarget.style.background = 'var(--surface-elevate)';
                e.currentTarget.style.boxShadow = '3px 3px 0px #000000';
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.className.includes('active')) {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <span style={{ 
              color: 'currentColor', 
              display: 'flex', 
              alignItems: 'center',
              transition: 'color 0.15s ease'
            }}>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Engine Status Banner */}
      <div style={{ 
        marginTop: 'auto', 
        borderTop: '3px solid var(--border-thick)', 
        paddingTop: '1.5rem' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          border: '3px solid var(--border-thick)',
          background: 'var(--surface-elevate)',
          padding: '0.6rem 0.85rem',
          borderRadius: '4px',
          boxShadow: '2px 2px 0px #000000'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--aurora-emerald)',
            boxShadow: '0 0 6px var(--aurora-emerald)',
            border: '1.5px solid var(--border-thick)'
          }} />
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-primary)', 
            fontFamily: "'Space Grotesk', sans-serif", 
            fontWeight: '700',
            textTransform: 'uppercase'
          }}>
            Engine: Live
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
