"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

type ImageItem = {
  file: File;
  preview: string;
  caption: string;
};

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk multiple images
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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
    const files = e.target.files;
    if (!files) return;

    // Cek total gambar (max 10)
    if (images.length + files.length > 10) {
      Swal.fire({
        icon: 'error',
        title: 'Too Many Files',
        text: 'Maximum 10 images allowed',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    Array.from(files).forEach(file => {
      // Cek size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File too large',
          text: `${file.name} exceeds 5MB limit`,
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
          text: `${file.name} is not an image`,
          background: '#1a1a1a',
          color: 'white'
        });
        return;
      }

      // Buat preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, {
          file,
          preview: reader.result as string,
          caption: ''
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, caption } : img
    ));
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
      let imageUrls: { url: string; caption: string }[] = [];
      
      // Upload multiple images
      if (images.length > 0) {
        setUploadingImages(true);
        
        for (const img of images) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `bnf-images/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('bnf')
            .upload(filePath, img.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('bnf')
            .getPublicUrl(filePath);

          imageUrls.push({
            url: urlData.publicUrl,
            caption: img.caption
          });
        }
        
        setUploadingImages(false);
      }

      const formData = new FormData(e.target as HTMLFormElement);
      
      const issuedDate = formData.get('issuedDate') as string;
      const issuedTime = formData.get('issuedTime') as string;
      
      if (!issuedDate || !issuedTime) {
        throw new Error('Issued Date and Time are required');
      }
      
      const issuedDateTime = `${issuedDate}T${issuedTime}:00`;

      const densoPn = formData.get('densoPn') as string;
      const plant = formData.get('plant') as string;
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
      if (!plant) throw new Error('Plant wajib diisi');
      if (!localImport) throw new Error('Local/Import wajib diisi');
      if (!description) throw new Error('Description wajib diisi');
      if (!dueDateMax) throw new Error('Due Date Max wajib diisi');

      const data = {
        denso_pn: densoPn,
        plant: plant,
        part_name: partName || null,
        local_import: localImport,
        supplier_name: supplierName || null,
        description: description,
        issued_date_time: issuedDateTime,
        action: action || null,
        due_date_max: dueDateMax,
        pic: pic || null,
        note_remark: noteRemark || null,
        images: imageUrls, // Simpan array of objects
        status: 'Open'
      };

      console.log('Data yang akan dikirim:', data);

      const { error } = await supabase
        .from('problems')
        .insert([data]);

      if (error) {
        console.error('Supabase error detail:', error);
        throw new Error(error.message);
      }

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
        setImages([]);
        
        // Set tanggal & jam ke real-time
        const dateInput = document.querySelector('input[name="issuedDate"]') as HTMLInputElement;
        const timeInput = document.querySelector('input[name="issuedTime"]') as HTMLInputElement;
        
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
      setUploadingImages(false);
    }
  }

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
        
        {/* STICKY HEADER */}
        <div style={{ 
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'linear-gradient(135deg, #1a0f0f 0%, #2c0b0b 100%)',
          padding: '12px 16px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid rgba(139, 58, 58, 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#8b3a3a',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: 'white'
              }}>
                <i className="fas fa-clipboard-list"></i>
              </div>
              
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>BNF FORM - Material Control</span>
                </div>
                <p style={{ color: '#8b3a3a', fontSize: '10px', margin: '2px 0 0 0' }}>
                  <i className="fas fa-clock"></i> {currentDate} {currentTime}
                </p>
              </div>
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
            ADD NEW BNF RECORD
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

              {/* PLANT */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  PLANT <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  name="plant"
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
                  <option value="">SELECT PLANT</option>
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
                  <option value="">SELECT</option>
                  <option value="Local">LOCAL</option>
                  <option value="Import">IMPORT</option>
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

              {/* ISSUED DATE */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  ISSUED DATE <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="date"
                  name="issuedDate"
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

              {/* ISSUED TIME */}
              <div>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  ISSUED TIME <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="time"
                  name="issuedTime"
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

              {/* IMAGES - Multiple Upload */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  IMAGES
                  <span style={{ color: '#8b3a3a', fontSize: '11px', marginLeft: '8px' }}>
                    <i className="fas fa-info-circle"></i> Max 10 images, 5MB each
                  </span>
                </label>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
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
                
                {/* Image Previews with Captions */}
                {images.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                    marginTop: '20px'
                  }}>
                    {images.map((img, index) => (
                      <div key={index} style={{
                        background: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '12px'
                      }}>
                        <img 
                          src={img.preview} 
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginBottom: '8px'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Caption (optional)"
                          value={img.caption}
                          onChange={(e) => updateCaption(index, e.target.value)}
                          style={{
                            width: '100%',
                            background: '#2a2a2a',
                            border: '1px solid #404040',
                            color: 'white',
                            padding: '6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginBottom: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            background: '#dc3545',
                            border: 'none',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          <i className="fas fa-trash me-1"></i> Remove
                        </button>
                      </div>
                    ))}
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
                disabled={isSubmitting || uploadingImages}
                style={{ 
                  width: '100%',
                  padding: '14px',
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: (isSubmitting || uploadingImages) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || uploadingImages) ? 0.7 : 1
                }}
              >
                {isSubmitting || uploadingImages ? (
                  <span>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    {uploadingImages ? 'UPLOADING IMAGES...' : 'SAVING...'}
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
          BNF MATERIAL CONTROL - FOLLOW UP SYSTEM
        </p>
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

                {currentUser?.role === 'master' && (
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
                )}
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
    </main>
  );
}