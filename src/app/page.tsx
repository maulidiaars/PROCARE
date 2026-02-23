"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Efek buat background biar interaktif tapi enteng
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
        window.location.href = '/dashboard';
      } else {
        (e.target as HTMLFormElement).reset();
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

  return (
    <main style={{ 
      minHeight: '100vh',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background stars - CSS murni biar enteng */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(2px 2px at 10px 20px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 30px 80px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 50px 150px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 130px 200px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 180px 90px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 220px 170px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 260px 50px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 300px 220px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 350px 120px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 390px 250px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 430px 80px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 470px 190px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 520px 140px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 560px 220px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 600px 60px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 650px 180px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 700px 110px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 750px 240px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 800px 70px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 850px 200px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 900px 130px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 950px 210px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1000px 90px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 1050px 170px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1100px 230px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 1150px 50px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1200px 150px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 1250px 190px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1300px 80px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 1350px 220px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1400px 120px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 1450px 250px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1500px 70px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 1550px 180px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1600px 140px, #fff, rgba(0,0,0,0)),
          radial-gradient(3px 3px at 1650px 210px, #fff, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 1700px 90px, #fff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 1750px 200px, #fff, rgba(0,0,0,0))
        `,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        opacity: 0.5,
        transform: `translate(${mousePosition.x * 0.005}px, ${mousePosition.y * 0.005}px)`,
        transition: 'transform 0.2s ease-out',
        zIndex: 1
      }}></div>

      {/* Nebula effect - enteng pake CSS */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 30%, rgba(139, 58, 58, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(196, 74, 74, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 40% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
        `,
        filter: 'blur(50px)',
        transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
        transition: 'transform 0.1s ease-out',
        zIndex: 1
      }}></div>

      {/* Floating particles kecil - dikit tapi efek pake CSS */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(2px 2px at 70% 20%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(2px 2px at 80% 60%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(1px 1px at 45% 40%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(2px 2px at 65% 85%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.8) 0%, transparent 100%),
          radial-gradient(2px 2px at 15% 65%, rgba(255,255,255,0.8) 0%, transparent 100%)
        `,
        backgroundRepeat: 'no-repeat',
        animation: 'floatParticles 10s infinite alternate',
        zIndex: 1
      }}></div>

      <div style={{ 
        position: 'relative',
        zIndex: 2,
        padding: '20px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container-fluid px-3 px-md-4 px-lg-5">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-11 col-xxl-10">
              
              {/* HEADER - TETAP KEREN */}
              <div style={{ 
                background: 'linear-gradient(135deg, #1a0f0f 0%, #2c0b0b 30%, #4a1a1a 70%, #6b2b2b 100%)',
                padding: 'clamp(30px, 5vw, 40px) clamp(20px, 4vw, 30px)',
                borderRadius: '30px 30px 30px 30px',
                marginBottom: 'clamp(20px, 3vw, 30px)',
                boxShadow: '0 30px 50px rgba(139, 58, 58, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.1) inset, 0 0 30px rgba(139, 58, 58, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'headerGlow 3s infinite alternate'
              }}>
                {/* Animated lines */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.03), transparent, rgba(255,255,255,0.03), transparent)',
                  animation: 'rotate 10s linear infinite'
                }}></div>
                
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: 'clamp(10px, 2vw, 15px) clamp(15px, 3vw, 25px)',
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50px',
                    marginBottom: 'clamp(15px, 2vw, 20px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <i className="fas fa-heartbeat" style={{ color: '#ffffff', fontSize: 'clamp(24px, 4vw, 32px)', marginRight: '10px' }}></i>
                    <span style={{ color: 'white', fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 500 }}>PROBLEM & CARE</span>
                  </div>
                  
                  <h1 style={{ 
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: 'clamp(32px, 8vw, 56px)',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 15px 0',
                    textShadow: '0 0 20px rgba(255,255,255,0.3), 2px 2px 4px rgba(0,0,0,0.5)',
                    letterSpacing: '2px'
                  }}>
                    PROCARE
                  </h1>
                  
                  <p style={{ 
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 'clamp(12px, 2vw, 18px)',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: 'clamp(2px, 1vw, 3px)',
                    fontWeight: 300
                  }}>
                    Material Control Problem Resolution
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'clamp(10px, 2vw, 20px)',
                    marginTop: 'clamp(15px, 2vw, 20px)'
                  }}>
                    {[0, 0.5, 1].map((delay, i) => (
                      <div key={i} style={{
                        width: '8px',
                        height: '8px',
                        background: '#ffffff',
                        borderRadius: '50%',
                        animation: `pulse 1.5s infinite ${delay}s`
                      }}></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FORM CARD - RESPONSIVE GRID PAKE BOOTSTRAP */}
              <div style={{ 
                background: 'rgba(18, 18, 18, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '30px',
                padding: 'clamp(25px, 4vw, 40px)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '5px',
                  background: 'linear-gradient(90deg, #8b3a3a, #ffffff, #8b3a3a)',
                  animation: 'slide 3s linear infinite'
                }}></div>
                
                <h2 style={{ 
                  color: 'white', 
                  marginBottom: 'clamp(20px, 3vw, 30px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(8px, 1.5vw, 10px)',
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  borderBottom: '2px solid #8b3a3a',
                  paddingBottom: 'clamp(10px, 2vw, 15px)'
                }}>
                  <span style={{ 
                    background: '#8b3a3a',
                    padding: 'clamp(8px, 1.5vw, 10px)',
                    borderRadius: '15px',
                    display: 'inline-flex',
                    boxShadow: '0 0 20px rgba(139, 58, 58, 0.5)'
                  }}>
                    <i className="fas fa-pen-alt" style={{ color: 'white', fontSize: 'clamp(14px, 2vw, 16px)' }}></i>
                  </span>
                  Input Problem Material
                </h2>

                <form onSubmit={handleSubmit} autoComplete="off">
                  {/* Bootstrap grid - super responsive */}
                  <div className="row g-4">
                    
                    {/* DENSO PN */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        DENSO PN <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="densoPn"
                        required
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Contoh: D12345"
                      />
                    </div>

                    {/* PART NAME */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        PART NAME
                      </label>
                      <input
                        type="text"
                        name="partName"
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Nama part"
                      />
                    </div>

                    {/* LOCAL / IMPORT */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        LOCAL / IMPORT <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <select
                        name="localImport"
                        required
                        className="form-select"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s',
                          appearance: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                      >
                        <option value="">Pilih</option>
                        <option value="Local">Local</option>
                        <option value="Import">Import</option>
                      </select>
                    </div>

                    {/* SUPPLIER NAME */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        SUPPLIER NAME
                      </label>
                      <input
                        type="text"
                        name="supplierName"
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Nama supplier"
                      />
                    </div>

                    {/* PROBLEM */}
                    <div className="col-12">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        PROBLEM <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <textarea
                        name="problem"
                        required
                        rows={3}
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s',
                          resize: 'vertical'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Deskripsi problem..."
                      />
                    </div>

                    {/* TIMING DATE */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        TIMING DATE <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="timingDate"
                        required
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                      />
                    </div>

                    {/* TIMING TIME */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        TIMING TIME <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="time"
                        name="timingTime"
                        required
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                      />
                    </div>

                    {/* ACTION */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        ACTION
                      </label>
                      <input
                        type="text"
                        name="action"
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Tindakan yang diambil"
                      />
                    </div>

                    {/* DUE DATE MAX */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        DUE DATE MAX <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="dueDateMax"
                        required
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                      />
                    </div>

                    {/* PIC */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        PIC
                      </label>
                      <input
                        type="text"
                        name="pic"
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Person in charge"
                      />
                    </div>

                    {/* NOTE / REMARK */}
                    <div className="col-12">
                      <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        NOTE / REMARK
                      </label>
                      <textarea
                        name="noteRemark"
                        rows={2}
                        autoComplete="off"
                        className="form-control"
                        style={{ 
                          background: '#2a2a2a',
                          border: '1px solid #404040',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s',
                          resize: 'vertical'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b3a3a'}
                        onBlur={(e) => e.target.style.borderColor = '#404040'}
                        placeholder="Catatan tambahan..."
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 'clamp(30px, 4vw, 40px)' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ 
                        width: '100%',
                        padding: 'clamp(14px, 2vw, 16px)',
                        background: 'linear-gradient(135deg, #8b3a3a 0%, #c44a4a 50%, #8b3a3a 100%)',
                        backgroundSize: '200% 200%',
                        border: 'none',
                        color: 'white',
                        fontSize: 'clamp(14px, 2vw, 16px)',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                        animation: 'gradientMove 3s ease infinite',
                        boxShadow: '0 0 30px rgba(196, 74, 74, 0.5)',
                        transition: 'all 0.3s'
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

              <p style={{ 
                textAlign: 'center', 
                color: '#666', 
                fontSize: '12px', 
                marginTop: '20px',
                textShadow: '0 0 10px rgba(139, 58, 58, 0.3)'
              }}>
                <i className="fas fa-heart me-1" style={{ color: '#8b3a3a' }}></i>
                PROCARE - Material Control Problem Resolution
                <i className="fas fa-heart ms-1" style={{ color: '#8b3a3a' }}></i>
              </p>
            </div>
          </div>
        </div>
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
            width: '60px', 
            height: '60px', 
            background: 'linear-gradient(135deg, #8b3a3a, #c44a4a)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            boxShadow: '0 0 20px rgba(139, 58, 58, 0.5)',
            transition: 'all 0.3s',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 58, 58, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 58, 58, 0.5)';
          }}
          title="Ke Dashboard"
        >
          <i className="fas fa-chart-bar"></i>
        </Link>
      </div>

      {/* STYLE ANIMASI */}
      <style jsx>{`
        @keyframes floatParticles {
          0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          100% { transform: translate(20px, 20px) scale(1.2); opacity: 0.6; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes headerGlow {
          0% { box-shadow: 0 30px 50px rgba(139, 58, 58, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.1) inset, 0 0 30px rgba(139, 58, 58, 0.5); }
          100% { box-shadow: 0 30px 70px rgba(139, 58, 58, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.2) inset, 0 0 60px rgba(139, 58, 58, 0.7); }
        }
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </main>
  );
}