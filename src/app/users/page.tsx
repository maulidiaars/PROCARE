"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

type User = {
  id?: number;
  npk: string;
  name: string;
  password: string;
  role: 'master' | 'staff';
  created_at?: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [npk, setNpk] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    if (user.role !== 'master') {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Hanya Master yang bisa mengakses halaman ini!',
        background: '#1a1a1a',
        color: 'white'
      }).then(() => {
        router.push('/dashboard');
      });
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!npk || !name || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Peringatan',
        text: 'Semua field harus diisi!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    const isDuplicate = users.some(u => 
      u.npk === npk && (editingId ? u.id !== editingId : true)
    );

    if (isDuplicate) {
      Swal.fire({
        icon: 'error',
        title: 'NPK sudah ada!',
        text: 'NPK ini sudah terdaftar',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('users')
          .update({ npk, name, password })
          .eq('id', editingId);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'User berhasil diupdate',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });
      } else {
        const { error } = await supabase
          .from('users')
          .insert([{ npk, name, password, role: 'staff' }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'User baru berhasil ditambahkan',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });
      }

      setNpk('');
      setName('');
      setPassword('');
      setEditingId(null);
      setShowForm(false);
      
      fetchUsers();

    } catch (error) {
      console.error('Error save user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: 'Terjadi kesalahan',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  };

  const handleEdit = (user: User) => {
    setNpk(user.npk);
    setName(user.name);
    setPassword(user.password);
    setEditingId(user.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Yakin hapus?',
      text: 'User akan dihapus permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Ya, Hapus!',
      background: '#1a1a1a',
      color: 'white'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'User berhasil dihapus',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });

        fetchUsers();

      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal!',
          text: 'Terjadi kesalahan',
          background: '#1a1a1a',
          color: 'white'
        });
      }
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Yakin logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Logout',
      background: '#1a1a1a',
      color: 'white'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        router.push('/login');
      }
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-danger"></div>
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '24px', margin: 0 }}>
              <i className="fas fa-users-cog me-2"></i>
              User Management
            </h1>
            <p style={{ color: '#aaa', fontSize: '13px', margin: '4px 0 0' }}>
              Welcome, {currentUser?.name} (Master)
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid #8b3a3a',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-sign-out-alt me-2"></i>
            Logout
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <Link href="/dashboard">
            <button style={{
              background: '#2a2a2a',
              border: '1px solid #404040',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <i className="fas fa-chart-bar me-2"></i>
              Dashboard
            </button>
          </Link>
          
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setNpk('');
              setName('');
              setPassword('');
            }}
            style={{
              background: '#8b3a3a',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} me-2`}></i>
            {showForm ? 'Tutup Form' : 'Tambah User'}
          </button>
        </div>

        {/* FORM TAMBAH/EDIT USER */}
        {showForm && (
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px' }}>
              {editingId ? 'Edit User' : 'Tambah User Baru'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    NPK <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={npk}
                    onChange={(e) => setNpk(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#2a2a2a',
                      border: '1px solid #404040',
                      color: 'white',
                      padding: '10px',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    Nama <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#2a2a2a',
                      border: '1px solid #404040',
                      color: 'white',
                      padding: '10px',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    Password <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#2a2a2a',
                      border: '1px solid #404040',
                      color: 'white',
                      padding: '10px',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  style={{
                    background: '#2a2a2a',
                    border: '1px solid #404040',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  style={{
                    background: '#8b3a3a',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABLE USERS */}
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
          overflow: 'hidden'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-users" style={{ color: '#8b3a3a' }}></i>
            Daftar Staff ({users.filter(u => u.role === 'staff').length})
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #333'
            }}>
              <thead>
                <tr style={{ 
                  background: '#2a2a2a',
                  borderBottom: '2px solid #8b3a3a'
                }}>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'center', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>No</th>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'left', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>NPK</th>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'left', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Nama</th>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'left', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Password</th>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'center', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Role</th>
                  <th style={{ 
                    padding: '14px 12px', 
                    textAlign: 'center', 
                    border: '1px solid #404040',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} style={{ 
                    background: idx % 2 === 0 ? '#1a1a1a' : '#222'
                  }}>
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      textAlign: 'center',
                      color: '#aaa'
                    }}>{idx + 1}</td>
                    
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      color: 'white'
                    }}>{user.npk}</td>
                    
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      color: 'white'
                    }}>{user.name}</td>
                    
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      color: user.role === 'master' ? '#888' : '#ffc107',
                      fontFamily: 'monospace'
                    }}>
                      {user.role === 'master' ? '••••••••' : user.password}
                    </td>
                    
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      textAlign: 'center'
                    }}>
                      <span style={{ 
                        background: user.role === 'master' ? '#8b3a3a' : '#17a2b8', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {user.role === 'master' ? '👑 MASTER' : 'STAFF'}
                      </span>
                    </td>
                    
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid #333', 
                      textAlign: 'center'
                    }}>
                      {user.role === 'master' ? (
                        <span style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                          <i className="fas fa-lock me-1"></i>System
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(user)}
                            style={{
                              background: '#8b3a3a',
                              border: 'none',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fas fa-edit"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id!)}
                            style={{
                              background: '#dc3545',
                              border: 'none',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fas fa-trash"></i>
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ 
                      padding: '60px', 
                      textAlign: 'center', 
                      color: '#666',
                      border: '1px solid #333'
                    }}>
                      <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', color: '#8b3a3a' }}></i>
                      <p>Belum ada user</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}