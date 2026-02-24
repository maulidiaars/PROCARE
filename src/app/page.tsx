"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk real-time date & time
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // CEK LOGIN
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    setCurrentUser(JSON.parse(userData));
  }, [router]);

  // Update real-time date & time setiap detik
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setCurrentDate(`${year}-${month}-${day}`);
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateDateTime();
    
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      (e.target as HTMLInputElement).showPicker();
    } catch (error) {
      (e.target as HTMLInputElement).focus();
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const timingDate = formData.get('timingDate') as string;
      const timingTime = formData.get('timingTime') as string;
      
      if (!timingDate || !timingTime) {
        throw new Error('Timing Date dan Time wajib diisi');
      }
      
      const timingDateTime = `${timingDate}T${timingTime}:00`;

      const densoPn = formData.get('densoPn') as string;
      const localImport = formData.get('localImport') as string;
      const problem = formData.get('problem') as string;
      const dueDateMax = formData.get('dueDateMax') as string;

      if (!densoPn || !localImport || !problem || !dueDateMax) {
        throw new Error('Semua field bertanda * harus diisi');
      }

      const data = {
        denso_pn: densoPn,
        part_name: formData.get('partName') || null,
        local_import: localImport,
        supplier_name: formData.get('supplierName') || null,
        problem: problem,
        timing_date_time: timingDateTime,
        action: formData.get('action') || null,
        due_date_max: dueDateMax,
        pic: formData.get('pic') || null,
        note_remark: formData.get('noteRemark') || null,
        status: 'Open'
      };

      const { error } = await supabase
        .from('problems')
        .insert([data]);

      if (error) throw error;

      const result = await Swal.fire({
        icon: 'success',
        title: '✅ Berhasil!',
        text: 'Data problem berhasil disimpan',
        background: '#1a1a1a',
        color: 'white',
        showCancelButton: true,
        confirmButtonColor: '#8b3a3a',
        cancelButtonColor: '#2a2a2a',
        confirmButtonText: '📊 Lihat Dashboard',
        cancelButtonText: '📝 Input Lagi'
      });

      if (result.isConfirmed) {
        router.push('/dashboard');
      } else {
        (e.target as HTMLFormElement).reset();
        const dateInput = document.querySelector('input[name="timingDate"]') as HTMLInputElement;
        const timeInput = document.querySelector('input[name="timingTime"]') as HTMLInputElement;
        if (dateInput) dateInput.value = currentDate;
        if (timeInput) timeInput.value = currentTime;
      }

    } catch (error) {
      console.error('Error detail:', error);
      
      Swal.fire({
        icon: 'error',
        title: '❌ Gagal!',
        text: error instanceof Error ? error.message : 'Terjadi kesalahan',
        background: '#1a1a1a',
        color: 'white',
        confirmButtonColor: '#8b3a3a'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Tampilkan loading kalau belum login
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-danger"></div>
      </div>
    );
  }

  return (
    <main style={{ 
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '16px'
    }}>
      <div style={{ 
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* HEADER - DENGAN USER INFO */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a0f0f 0%, #2c0b0b 100%)',
          padding: '24px 20px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid rgba(139, 58, 58, 0.3)'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '30px',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <i className="fas fa-heartbeat" style={{ color: '#c44a4a', marginRight: '8px' }}></i>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>FORM FOLLOW UP</span>
              </div>
              
              <h1 style={{ 
                fontSize: 'clamp(28px, 6vw, 40px)',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 8px 0',
                letterSpacing: '1px'
              }}>
                BNF MATERIAL CONTROL
              </h1>
              
              <p style={{ 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                margin: 0
              }}>
                Submit this form to report and follow up on material issues.
              </p>
              <p style={{ 
                color: '#8b3a3a',
                fontSize: '12px',
                margin: '8px 0 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-clock"></i>
                Real-time: {currentDate} {currentTime}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/dashboard">
                <button style={{
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-chart-bar"></i>
                  Dashboard
                </button>
              </Link>
              
              <button
                onClick={handleLogout}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* FORM CARD - (TETAP) */}
        <div style={{ 
          background: '#121212',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ 
            color: 'white', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            borderBottom: '1px solid #2a2a2a',
            paddingBottom: '16px'
          }}>
            <span style={{ 
              background: '#8b3a3a',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '14px'
            }}>
              <i className="fas fa-pen-alt" style={{ color: 'white' }}></i>
            </span>
            Input Problem Material
          </h2>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              
              {/* DENSO PN */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  DENSO PN <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="densoPn"
                  required
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Contoh: D12345"
                />
              </div>

              {/* PART NAME */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PART NAME
                </label>
                <input
                  type="text"
                  name="partName"
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Nama part"
                />
              </div>

              {/* LOCAL / IMPORT */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  LOCAL / IMPORT <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  name="localImport"
                  required
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Pilih</option>
                  <option value="Local">Local</option>
                  <option value="Import">Import</option>
                </select>
              </div>

              {/* SUPPLIER NAME */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  SUPPLIER NAME
                </label>
                <input
                  type="text"
                  name="supplierName"
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Nama supplier"
                />
              </div>

              {/* PROBLEM (FULL WIDTH) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PROBLEM <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  name="problem"
                  required
                  rows={3}
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Deskripsi problem..."
                />
              </div>

              {/* TIMING DATE - REAL TIME OTOMATIS */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  TIMING DATE <span style={{ color: '#dc3545' }}>*</span>
                  <span style={{ color: '#8b3a3a', fontSize: '11px', marginLeft: '8px' }}>
                    <i className="fas fa-sync-alt fa-spin"></i> Real-time
                  </span>
                </label>
                <input
                  type="date"
                  name="timingDate"
                  required
                  defaultValue={currentDate}
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onClick={handleDateClick}
                />
                <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Klik untuk mengganti tanggal (otomatis terisi real-time)
                </small>
              </div>

              {/* TIMING TIME - REAL TIME OTOMATIS */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  TIMING TIME <span style={{ color: '#dc3545' }}>*</span>
                  <span style={{ color: '#8b3a3a', fontSize: '11px', marginLeft: '8px' }}>
                    <i className="fas fa-sync-alt fa-spin"></i> Real-time
                  </span>
                </label>
                <input
                  type="time"
                  name="timingTime"
                  required
                  defaultValue={currentTime}
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onClick={handleDateClick}
                />
                <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Klik untuk mengganti jam (otomatis terisi real-time)
                </small>
              </div>

              {/* ACTION */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  ACTION
                </label>
                <input
                  type="text"
                  name="action"
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Tindakan yang diambil"
                />
              </div>

              {/* DUE DATE MAX */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  DUE DATE MAX <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="date"
                  name="dueDateMax"
                  required
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onClick={handleDateClick}
                />
              </div>

              {/* PIC */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PIC
                </label>
                <input
                  type="text"
                  name="pic"
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Person in charge"
                />
              </div>

              {/* NOTE / REMARK (FULL WIDTH) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  NOTE / REMARK
                </label>
                <textarea
                  name="noteRemark"
                  rows={2}
                  autoComplete="off"
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div style={{ marginTop: '30px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ 
                  width: '100%',
                  padding: '14px',
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isSubmitting ? (
                  <span>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Menyimpan...
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-paper-plane me-2"></i>
                    SUBMIT PROBLEM
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '12px', 
          marginTop: '20px'
        }}>
          <i className="fas fa-heart me-1" style={{ color: '#8b3a3a' }}></i>
          BNF Material Control - Problem Resolution System
        </p>
      </div>

      {/* FLOATING DASHBOARD BUTTON */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 9999 
      }}>
        <Link 
          href="/dashboard" 
          style={{ 
            width: '56px', 
            height: '56px', 
            background: '#8b3a3a',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '22px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          title="Ke Dashboard"
        >
          <i className="fas fa-chart-bar"></i>
        </Link>
      </div>
    </main>
  );
}