// src/app/users/page.tsx (User Management - English)
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Search state
  const [searchText, setSearchText] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Tetap 10 item per halaman
  
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
        title: 'Access Denied',
        text: 'Only Master can access this page!',
        background: '#1a1a1a',
        color: 'white'
      }).then(() => {
        router.push('/dashboard');
      });
      return;
    }

    fetchUsers();
  }, [router]);

  // Filter users based on search
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredUsers(users);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = users.filter(user => 
        user.npk.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
      );
      setFilteredUsers(filtered);
    }
    setCurrentPage(1); // Reset ke halaman 1 setiap kali search
  }, [searchText, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      // SORTING: MASTER DI ATAS, STAFF DI BAWAH
      const sortedUsers = (data || []).sort((a, b) => {
        // Master selalu di atas
        if (a.role === 'master' && b.role !== 'master') return -1;
        if (a.role !== 'master' && b.role === 'master') return 1;
        
        // Kalau sama-sama master atau sama-sama staff, urut berdasarkan NPK
        return a.npk.localeCompare(b.npk);
      });

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
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
        title: 'Warning',
        text: 'All fields are required!',
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
        title: 'NPK already exists!',
        text: 'This NPK is already registered',
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
          title: 'Success!',
          text: 'User updated successfully',
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
          title: 'Success!',
          text: 'New user added successfully',
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
        title: 'Failed!',
        text: 'An error occurred',
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
      title: 'Confirm Delete?',
      text: 'User will be permanently deleted!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Yes, Delete!',
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
          title: 'Deleted!',
          text: 'User has been deleted',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });

        fetchUsers();

      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Failed!',
          text: 'An error occurred',
          background: '#1a1a1a',
          color: 'white'
        });
      }
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Confirm Logout?',
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

  // OPEN MENU MODAL
  const openMenuModal = () => {
    const menuModal = document.getElementById('menuModal');
    if (menuModal && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(menuModal);
      modal.show();
    }
  };

  // NAVIGATE TO PAGE
  const navigateTo = (path: string) => {
    const menuModal = document.getElementById('menuModal');
    if (menuModal && (window as any).bootstrap) {
      const modal = (window as any).bootstrap.Modal.getInstance(menuModal);
      if (modal) modal.hide();
    }
    router.push(path);
  };

  // PAGINATION
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

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
        
        {/* STICKY HEADER */}
        <div style={{ 
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
          padding: '12px 16px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid rgba(139, 58, 58, 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '18px', margin: 0 }}>
                <i className="fas fa-users-cog me-2"></i>
                User Management
              </h1>
              <p style={{ color: '#aaa', fontSize: '10px', margin: '2px 0 0' }}>
                Welcome, {currentUser?.name} (Master)
              </p>
            </div>

            {/* Right side - hanya logout */}
            <div style={{ position: 'relative' }}>
              <div 
                className="dropdown"
                style={{ cursor: 'pointer' }}
              >
                <div 
                  data-bs-toggle="dropdown"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px 8px 4px 4px',
                    borderRadius: '40px',
                    border: '1px solid #8b3a3a'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#8b3a3a',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: 'white'
                  }}>
                    <i className={`fas ${currentUser.role === 'master' ? 'fa-crown' : 'fa-user'}`}></i>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>{currentUser.name}</div>
                  </div>
                  <i className="fas fa-chevron-down" style={{ color: '#aaa', fontSize: '10px', marginRight: '4px' }}></i>
                </div>

                {/* DROPDOWN CANTIK - HANYA LOGOUT */}
                <ul className="dropdown-menu dropdown-menu-end" style={{ 
                  background: '#1a1a1a', 
                  border: '1px solid #8b3a3a',
                  borderRadius: '16px',
                  padding: '8px',
                  minWidth: '200px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  marginTop: '8px'
                }}>
                  <li>
                    <div
                      onClick={handleLogout}
                      style={{
                        padding: '14px 20px',
                        color: '#ff6b6b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2a2a2a';
                        e.currentTarget.style.color = '#ff8a8a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#ff6b6b';
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'rgba(255, 107, 107, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-sign-out-alt"></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Logout</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Sign out from account</div>
                      </div>
                      <i className="fas fa-arrow-right" style={{ fontSize: '12px', opacity: 0.7 }}></i>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS & SEARCH */}
        <div style={{ 
          marginBottom: '20px', 
          display: 'flex', 
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
              {showForm ? 'Close Form' : 'Add User'}
            </button>
          </div>

          {/* SEARCH BAR */}
          <div style={{ minWidth: '250px' }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#666',
                fontSize: '14px'
              }}></i>
              <input
                type="text"
                placeholder="Search by NPK, name, or role..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e1e1e',
                  border: '1px solid #333',
                  color: 'white',
                  padding: '10px 10px 10px 35px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ADD/EDIT FORM */}
        {showForm && (
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px' }}>
              {editingId ? 'Edit User' : 'Add New User'}
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
                    Name <span style={{ color: '#dc3545' }}>*</span>
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
                  Cancel
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
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* USERS TABLE */}
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h3 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-users" style={{ color: '#8b3a3a' }}></i>
              Staff List ({filteredUsers.length} users)
            </h3>
            
            {filteredUsers.length > 0 && (
              <div style={{ color: '#aaa', fontSize: '12px' }}>
                Showing {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
              </div>
            )}
          </div>

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
                  }}>Name</th>
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
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, idx) => {
                  const actualIndex = startIndex + idx + 1;
                  return (
                    <tr key={user.id} style={{ 
                      background: idx % 2 === 0 ? '#1a1a1a' : '#222',
                    }}>
                      <td style={{ 
                        padding: '12px', 
                        border: '1px solid #333', 
                        textAlign: 'center',
                        color: '#aaa'
                      }}>{actualIndex}</td>
                      
                      <td style={{ 
                        padding: '12px', 
                        border: '1px solid #333', 
                        color: user.role === 'master' ? '#888' : 'white',
                        fontWeight: user.role === 'master' ? 600 : 400
                      }}>{user.npk}</td>
                      
                      <td style={{ 
                        padding: '12px', 
                        border: '1px solid #333', 
                        color: user.role === 'master' ? '#888' : 'white',
                        fontWeight: user.role === 'master' ? 600 : 400
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
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ 
                      padding: '60px', 
                      textAlign: 'center', 
                      color: '#666',
                      border: '1px solid #333'
                    }}>
                      <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', color: '#8b3a3a' }}></i>
                      <p>No users found</p>
                      {searchText && (
                        <button
                          onClick={() => setSearchText('')}
                          style={{
                            background: '#2a2a2a',
                            border: '1px solid #404040',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          <i className="fas fa-times me-2"></i>
                          Clear Search
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION - OTOMATIS MUNCUL KALAU > 10 ITEMS */}
          {filteredUsers.length > itemsPerPage && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '20px',
              color: '#aaa',
              fontSize: '13px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                Showing {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  style={{ 
                    background: currentPage === 1 ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === 1 ? '#666' : 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                  Previous
                </button>
                
                <span style={{ 
                  background: '#2a2a2a',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #404040'
                }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button 
                  style={{ 
                    background: currentPage === totalPages ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === totalPages ? '#666' : 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* INFORMASI TOTAL DATA */}
          {filteredUsers.length > 0 && filteredUsers.length <= itemsPerPage && (
            <div style={{ 
              marginTop: '16px', 
              color: '#666', 
              fontSize: '12px',
              textAlign: 'center',
              borderTop: '1px solid #333',
              paddingTop: '16px'
            }}>
              Total {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} • Master always on top
            </div>
          )}
        </div>
      </div>

      {/* FLOATING MENU BUTTON - POJOK KANAN BAWAH */}
      <button
        onClick={openMenuModal}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: '#8b3a3a',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(139,58,58,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#a54545';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#8b3a3a';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* MENU MODAL */}
      <div className="modal fade" id="menuModal" tabIndex={-1} data-bs-backdrop="static">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '350px' }}>
          <div className="modal-content" style={{ 
            background: '#1a1a1a', 
            border: '2px solid #8b3a3a',
            borderRadius: '24px',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{ 
              background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
              border: 'none',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#8b3a3a',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-bars" style={{ color: 'white', fontSize: '18px' }}></i>
                </div>
                <div>
                  <h5 className="modal-title text-white" style={{ fontSize: '18px', fontWeight: 600 }}>
                    MENU NAVIGATION
                  </h5>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: '2px 0 0 0' }}>
                    {currentUser?.name} ({currentUser?.role})
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" style={{ opacity: 0.8 }}></button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => navigateTo('/')}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#8b3a3a';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#222';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#8b3a3a',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-pen-alt" style={{ color: 'white', fontSize: '16px' }}></i>
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>BNF Form</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Add new BNF record</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#8b3a3a' }}></i>
                </button>

                <button
                  onClick={() => navigateTo('/dashboard')}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#8b3a3a';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#222';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#17a2b8',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-chart-bar" style={{ color: 'white', fontSize: '16px' }}></i>
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Dashboard</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>View analytics & data</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#17a2b8' }}></i>
                </button>

                <button
                  onClick={() => navigateTo('/users')}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#8b3a3a';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#222';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#28a745',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-users-cog" style={{ color: 'white', fontSize: '16px' }}></i>
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>User Management</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Manage staff accounts</div>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#28a745' }}></i>
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ 
              borderTop: '1px solid #333',
              padding: '16px 20px',
              background: '#151515',
              justifyContent: 'center'
            }}>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  width: '100%'
                }} 
                data-bs-dismiss="modal"
              >
                <i className="fas fa-times me-2"></i>
                CLOSE MENU
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}