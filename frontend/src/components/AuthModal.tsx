import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Shield, KeyRound, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode || 'login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  // State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode when modal opens
  React.useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode || 'login');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Login failed.');
        } else {
          setSuccessMsg('Welcome back!');
        }
      } else {
        if (!name.trim()) {
          setError('Please provide your name.');
          setLoading(false);
          return;
        }
        const res = await register(name, email, password, role);
        if (!res.success) {
          setError(res.error || 'Registration failed.');
        } else {
          setSuccessMsg('Account created successfully!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo account fill and login
  const handleQuickLogin = async (demoRole: 'admin' | 'member') => {
    setError(null);
    setLoading(true);
    const demoEmail = demoRole === 'admin' ? 'admin@catchup.ai' : 'member@catchup.ai';
    const demoPass = demoRole === 'admin' ? 'admin123' : 'member123';
    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('login');

    const res = await login(demoEmail, demoPass);
    if (!res.success) {
      setError(res.error || 'Failed to login with demo credentials.');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="auth-modal-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, rgba(23, 27, 44, 0.95), rgba(13, 16, 27, 0.98))',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden',
          position: 'relative',
          animation: 'fadeInScale 0.25s ease-out',
        }}
      >
        {/* Glow ambient background accent */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: mode === 'login' ? 'radial-gradient(circle, rgba(99, 102, 241, 0.25), transparent 70%)' : 'radial-gradient(circle, rgba(168, 85, 247, 0.25), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              {mode === 'login' ? <KeyRound size={20} color="#fff" /> : <Shield size={20} color="#fff" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                {mode === 'login' ? 'Sign In to CatchUp AI' : 'Create an Account'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                {mode === 'login' ? 'Access your smart meetings & insights' : 'Get started with AI meeting intelligence'}
              </p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switchers */}
        <div style={{ padding: '1rem 1.75rem 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'login' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: mode === 'login' ? '#fff' : '#94a3b8',
                fontWeight: mode === 'login' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'register' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent',
                color: mode === 'register' ? '#fff' : '#94a3b8',
                fontWeight: mode === 'register' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Register
            </button>
          </div>
        </div>

        {/* Alert / Error Banner */}
        {error && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div
            style={{
              margin: '1rem 1.75rem 0',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.75rem 1.5rem' }}>
          {mode === 'register' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '9px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '8px' }}>
                Account Role (Authorization Level)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  style={{
                    padding: '10px',
                    borderRadius: '9px',
                    border: role === 'member' ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: role === 'member' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    color: role === 'member' ? '#818cf8' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Team Member</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>Manage own meetings</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  style={{
                    padding: '10px',
                    borderRadius: '9px',
                    border: role === 'admin' ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    color: role === 'admin' ? '#c084fc' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Admin</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>Full team & delete access</div>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '9px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Quick Demo Accounts */}
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} color="#fbbf24" />
                Quick Test Accounts (1-Click)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(168, 85, 247, 0.08)',
                  color: '#d8b4fe',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                }}
              >
                <Shield size={12} />
                Demo Admin
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('member')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  color: '#7dd3fc',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                }}
              >
                <User size={12} />
                Demo Member
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
