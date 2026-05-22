import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [activeSessionId, setActiveSessionId] = useState(localStorage.getItem('active_session') || null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('active_session', activeSessionId);
      refreshSession();
    } else {
      localStorage.removeItem('active_session');
      setSessionData(null);
    }
  }, [activeSessionId]);

  const refreshSession = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/sessions/${activeSessionId}`);
      setSessionData(data);
    } catch (err) {
      console.error("Failed to load session", err);
      // If unauthorized or not found, clear it
      if (err.message.includes('401') || err.message.includes('404')) {
        setActiveSessionId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SessionContext.Provider value={{
      activeSessionId,
      setActiveSessionId,
      sessionData,
      refreshSession,
      loading
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
