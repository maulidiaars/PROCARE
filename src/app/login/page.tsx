"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

export default function LoginPage() {
  const router = useRouter();
  const [npk, setNpk] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      setShowModal(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // CEK USER DARI DATABASE DOANG (GA PAKE HARDCODE)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('npk', npk)
        .eq('password', password)
        .single();

      if (error || !user) {
        throw new Error('NPK atau password salah');
      }

      const userData = {
        npk: user.npk,
        name: user.name,
        role: user.role,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setCurrentUser(userData);

      await Swal.fire({
        icon: 'success',
        title: `Welcome ${user.name}!`,
        text: user.role === 'master' ? '👑 Master User' : '👤 Staff User',
        timer: 1200,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: 'white',
        timerProgressBar: true
      });

      setShowModal(true);

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: error instanceof Error ? error.message : 'NPK atau password salah',
        background: '#1a1a1a',
        color: 'white',
        confirmButtonColor: '#8b3a3a'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowModal(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setNpk('');
    setPassword('');
  };

  const navigateTo = (path: string) => {
    setShowModal(false);
    router.push(path);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      {/* MODAL POPUP - TETEP KEREN */}
      {showModal && currentUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #8b3a3a',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease-out',
            boxShadow: '0 20px 40px rgba(139,58,58,0.3)'
          }}>
            {/* Avatar */}
            <div style={{
              width: '80px',
              height: '80px',
              background: '#8b3a3a',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '32px',
              color: 'white',
              border: '3px solid #c44a4a'
            }}>
              <i className={`fas ${currentUser.role === 'master' ? 'fa-crown' : 'fa-user'}`}></i>
            </div>

            <h2 style={{ color: 'white', fontSize: '24px', margin: '0 0 4px 0' }}>
              Hi, {currentUser.name}!
            </h2>
            
            <p style={{
              color: '#aaa',
              fontSize: '13px',
              marginBottom: '24px',
              padding: '4px 12px',
              background: currentUser.role === 'master' ? '#8b3a3a20' : '#17a2b820',
              borderRadius: '20px',
              display: 'inline-block'
            }}>
              {currentUser.role === 'master' ? '👑 Master' : '👤 Staff'}
            </p>

            {/* Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => navigateTo('/')}
                style={{
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#a54545'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#8b3a3a'}
              >
                <i className="fas fa-pen-alt"></i>
                Google Form
              </button>
              
              <button
                onClick={() => navigateTo('/dashboard')}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.borderColor = '#8b3a3a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.borderColor = '#404040'; }}
              >
                <i className="fas fa-chart-bar" style={{ color: '#8b3a3a' }}></i>
                Dashboard
              </button>

              {currentUser?.role === 'master' && (
                <button
                  onClick={() => navigateTo('/users')}
                  style={{
                    background: '#17a2b8',
                    border: 'none',
                    color: 'white',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: '0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#138496'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#17a2b8'}
                >
                  <i className="fas fa-users-cog"></i>
                  User Management
                </button>
              )}
            </div>

            <button
              onClick={handleLogout}
              style={{
                marginTop: '16px',
                background: 'none',
                border: '1px solid #404040',
                color: '#666',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '13px',
                cursor: 'pointer',
                width: '100%',
                transition: '0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#404040'; }}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Ganti Akun
            </button>
          </div>
        </div>
      )}

      {/* LOGIN CARD - DIPENDEKIN */}
      <div style={{
        maxWidth: '360px',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          background: '#121212',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: '#8b3a3a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '28px',
            color: 'white'
          }}>
            <i className="fas fa-heartbeat"></i>
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'white',
            margin: '0 0 4px 0'
          }}>
            BNF MATERIAL
          </h1>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
            Problem Resolution System
          </p>
        </div>

        {/* Form Login */}
        <div style={{
          background: '#121212',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          padding: '24px'
        }}>
          <form onSubmit={handleLogin} autoComplete="off">
            {/* NPK */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                NPK
              </label>
              <input
                type="text"
                value={npk}
                onChange={(e) => setNpk(e.target.value)}
                required
                autoComplete="off"
                placeholder="Masukkan NPK"
                style={{
                  width: '100%',
                  background: '#1e1e1e',
                  border: '1px solid #333',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    paddingRight: '40px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#8b3a3a',
                border: 'none',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <span><i className="fas fa-spinner fa-spin me-2"></i>Loading...</span>
              ) : (
                <span><i className="fas fa-sign-in-alt me-2"></i>LOGIN</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}