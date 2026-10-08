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
          className="btn-secondary nav-guide-btn"
          onClick={onOpenHelp}
          title="How CatchUp AI works"
        >
          <HelpCircle size={16} />
          <span className="nav-btn-label">Guide</span>
        </button>

        <button className="btn-primary nav-meet-btn" onClick={onStartMeeting}>
          <Video size={16} />
          <span className="nav-btn-label">Instant Meet</span>
        </button>

        {/* Authentication Section */}
        {isAuthenticated && user ? (
          <div className="nav-user-container">
            <div className="nav-user-badge">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                className="nav-user-avatar"
              />
              <span className="nav-user-name">
                {user.name}
              </span>
              <span className={`nav-user-role ${isAdmin ? 'admin' : 'member'}`}>
                {isAdmin ? <Shield size={10} /> : <UserIcon size={10} />}
                {isAdmin ? 'Admin' : 'Member'}
              </span>
            </div>

            <button
              onClick={logout}
              className="nav-logout-btn"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="nav-btn-label">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="nav-signin-btn"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
