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
  
  // State untuk image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // State untuk real-time date & time
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cek size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File too large',
        text: 'Maximum size is 5MB',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    // Cek tipe file
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid file',
        text: 'Please select an image file',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    setImageFile(file);
    
    // Buat preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
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
    let imageUrl = null;
    
    // Upload image jika ada
    if (imageFile) {
      setUploadingImage(true);
      
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `bnf-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bnf')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error('Upload error detail:', uploadError);
        throw new Error(`Upload gagal: ${uploadError.message}`);
      }

      // Dapatkan URL publik
      const { data: urlData } = supabase.storage
        .from('bnf')
        .getPublicUrl(filePath);

      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }

    // Ambil data form
    const formData = new FormData(e.target as HTMLFormElement);
    
    const timingDate = formData.get('timingDate') as string;
    const timingTime = formData.get('timingTime') as string;
    
    if (!timingDate || !timingTime) {
      throw new Error('Timing Date and Time are required');
    }
    
    const timingDateTime = `${timingDate}T${timingTime}:00`;

    const densoPn = formData.get('densoPn') as string;
    const plan = formData.get('plan') as string;
    const partName = formData.get('partName') as string;
    const localImport = formData.get('localImport') as string;
    const supplierName = formData.get('supplierName') as string;
    const description = formData.get('description') as string;
    const action = formData.get('action') as string;
    const dueDateMax = formData.get('dueDateMax') as string;
    const pic = formData.get('pic') as string;
    const noteRemark = formData.get('noteRemark') as string;

    // Validasi
    if (!densoPn) throw new Error('DENSO PN wajib diisi');
    if (!plan) throw new Error('Plan wajib diisi');
    if (!localImport) throw new Error('Local/Import wajib diisi');
    if (!description) throw new Error('Description wajib diisi');
    if (!dueDateMax) throw new Error('Due Date Max wajib diisi');

    const data = {
      denso_pn: densoPn,
      plan: plan,
      part_name: partName || null,
      local_import: localImport,
      supplier_name: supplierName || null,
      description: description,
      timing_date_time: timingDateTime,
      action: action || null,
      due_date_max: dueDateMax,
      pic: pic || null,
      note_remark: noteRemark || null,
      images: imageUrl,
      status: 'Open'
    };

    console.log('Data yang akan dikirim:', data);

    // Simpan ke database
    const { error } = await supabase
      .from('problems')
      .insert([data]);

    if (error) {
      console.error('Supabase error detail:', error);
      throw new Error(error.message);
    }

    // Berhasil
    const result = await Swal.fire({
      icon: 'success',
      title: '✅ Success!',
      text: 'BNF record has been saved',
      background: '#1a1a1a',
      color: 'white',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: '📊 View Dashboard',
      cancelButtonText: '📝 Add Another'
    });

    if (result.isConfirmed) {
      router.push('/dashboard');
    } else {
      // Reset form
      (e.target as HTMLFormElement).reset();
      setImageFile(null);
      setImagePreview(null);
      
      // Set tanggal & jam ke real-time
      const dateInput = document.querySelector('input[name="timingDate"]') as HTMLInputElement;
      const timeInput = document.querySelector('input[name="timingTime"]') as HTMLInputElement;
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      if (dateInput) dateInput.value = `${year}-${month}-${day}`;
      if (timeInput) timeInput.value = `${hours}:${minutes}`;
    }

  } catch (error: any) {
    console.error('Error lengkap:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    Swal.fire({
      icon: 'error',
      title: '❌ Failed!',
      text: error?.message || 'An error occurred',
      background: '#1a1a1a',
      color: 'white',
      confirmButtonColor: '#8b3a3a'
    });
  } finally {
    setIsSubmitting(false);
    setUploadingImage(false);
  }
}

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
        
        {/* HEADER */}
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
                <i className="fas fa-clipboard-list" style={{ color: '#c44a4a', marginRight: '8px' }}></i>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>BNF FOLLOW UP FORM</span>
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
                Submit this form to record and follow up on material BNF items.
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

        {/* FORM CARD */}
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
            Add New BNF Record
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
                  placeholder="Example: D12345"
                />
              </div>

              {/* PLAN */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PLAN <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  name="plan"
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
                  <option value="">Select Plan</option>
                  <option value="FAJAR">FAJAR</option>
                  <option value="BEKASI">BEKASI</option>
                  <option value="SIP">SIP</option>
                </select>
              </div>

              {/* PART NAME */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PART NAME
                </label>
                <input
                  type="text"
                  name="partName"
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
                  placeholder="Part name"
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
                  <option value="">Select</option>
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
                  placeholder="Supplier name"
                />
              </div>

              {/* DESCRIPTION */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  DESCRIPTION <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
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
                  placeholder="Description of the BNF item..."
                />
              </div>

              {/* TIMING DATE */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  TIMING DATE <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="date"
                  name="timingDate"
                  required
                  defaultValue={currentDate}
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

              {/* TIMING TIME */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  TIMING TIME <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="time"
                  name="timingTime"
                  required
                  defaultValue={currentTime}
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

              {/* ACTION */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  ACTION
                </label>
                <input
                  type="text"
                  name="action"
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
                  placeholder="Action taken"
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

              {/* IMAGES - Upload File */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  IMAGES
                  <span style={{ color: '#8b3a3a', fontSize: '11px', marginLeft: '8px' }}>
                    <i className="fas fa-info-circle"></i> Max 5MB
                  </span>
                </label>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ 
                    width: '100%',
                    background: '#1e1e1e',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                {uploadingImage && (
                  <div style={{ marginTop: '8px', color: '#8b3a3a' }}>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Uploading...
                  </div>
                )}
                {imagePreview && (
                  <div style={{ marginTop: '12px' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '100px',
                        borderRadius: '8px',
                        border: '1px solid #333'
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        fontSize: '12px',
                        marginLeft: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-times"></i> Remove
                    </button>
                  </div>
                )}
              </div>

              {/* NOTE / REMARK */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  NOTE / REMARK
                </label>
                <textarea
                  name="noteRemark"
                  rows={2}
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
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div style={{ marginTop: '30px' }}>
              <button
                type="submit"
                disabled={isSubmitting || uploadingImage}
                style={{ 
                  width: '100%',
                  padding: '14px',
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: (isSubmitting || uploadingImage) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || uploadingImage) ? 0.7 : 1
                }}
              >
                {isSubmitting || uploadingImage ? (
                  <span>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    {uploadingImage ? 'Uploading...' : 'Saving...'}
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-paper-plane me-2"></i>
                    SUBMIT BNF RECORD
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
          BNF Material Control - Follow Up System
        </p>
      </div>
    </main>
  );
}