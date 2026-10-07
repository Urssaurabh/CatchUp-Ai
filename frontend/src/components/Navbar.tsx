import React from 'react';
import { Video, LayoutDashboard, PlusCircle, HelpCircle, LogIn, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: 'dashboard' | 'meeting' | 'catchup';
  onNavigate: (view: 'dashboard' | 'meeting') => void;
  onStartMeeting: () => void;
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onStartMeeting,
  onOpenHelp,
}) => {
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();

  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => onNavigate('dashboard')}>
        <div className="brand-icon-wrapper">
          <Video size={22} />
        </div>
        <span className="brand-text">CatchUp AI</span>
        <span className="brand-tag">Auto-Recorder</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>CatchUp Hub</span>
        </button>

        <button
          className="nav-btn"
          onClick={onStartMeeting}
        >
          <PlusCircle size={16} />
          <span>New Meeting</span>
        </button>
      </nav>

      <div className="nav-actions">

        <button
          className="btn-secondary"
          style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
          onClick={onOpenHelp}
          title="How CatchUp AI works"
        >
          <HelpCircle size={16} />
          <span>Guide</span>
        </button>

        <button className="btn-primary" onClick={onStartMeeting}>
          <Video size={16} />
          <span>Instant Meet</span>
        </button>

        {/* Authentication Section */}
        {isAuthenticated && user ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              paddingLeft: '0.5rem',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 8px 4px 5px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.2)',
                }}
              />
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  maxWidth: '100px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.name}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isAdmin ? 'rgba(168, 85, 247, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                  color: isAdmin ? '#d8b4fe' : '#7dd3fc',
                  border: isAdmin ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {isAdmin ? <Shield size={10} /> : <UserIcon size={10} />}
                {isAdmin ? 'Admin' : 'Member'}
              </span>
            </div>

            <button
              onClick={logout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                padding: '6px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#c7d2fe',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
