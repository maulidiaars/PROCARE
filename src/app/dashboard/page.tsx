"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

declare global {
  interface Window {
    bootstrap: any;
    $: any;
    jQuery: any;
  }
}

type Problem = {
  id: number;
  denso_pn: string;
  part_name: string | null;
  local_import: string;
  supplier_name: string | null;
  problem: string;
  timing_date_time: string;
  action: string | null;
  due_date_max: string;
  pic: string | null;
  note_remark: string | null;
  created_at: string;
  status: string;
};

export default function Dashboard() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    progress: 0,
    closed: 0
  });

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Edit Modal
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [editAction, setEditAction] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const modalRef = useRef<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch data
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Setup modal dengan aman
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if (window.bootstrap && !modalRef.current) {
          const modalElement = document.getElementById('updateModal');
          if (modalElement) {
            modalRef.current = new window.bootstrap.Modal(modalElement);
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [problems, statusFilter, picFilter, dueFilter, searchText]);

  // Reset ke halaman 1 kalau filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, picFilter, dueFilter, searchText]);

  async function fetchData(silent = false) {
    if (!silent) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const dataWithStatus = (data || []).map(item => ({
        ...item,
        status: item.status || 'Open'
      }));

      setProblems(dataWithStatus);
      setFilteredProblems(dataWithStatus);
      setLastUpdate(new Date().toLocaleString('id-ID'));

      const open = dataWithStatus.filter(p => p.status === 'Open').length;
      const progress = dataWithStatus.filter(p => p.status === 'In Progress').length;
      const closed = dataWithStatus.filter(p => p.status === 'Closed').length;

      setStats({
        total: dataWithStatus.length,
        open,
        progress,
        closed
      });

      const pics = [...new Set(dataWithStatus.map(p => p.pic).filter(p => p && p !== '-'))] as string[];
      setPicOptions(pics);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...problems];

    // Filter status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filter PIC
    if (picFilter !== 'all') {
      filtered = filtered.filter(p => p.pic === picFilter);
    }

    // Filter due date
    if (dueFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(p => {
        if (!p.due_date_max) return false;
        
        const dueDate = new Date(p.due_date_max);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (dueFilter === 'overdue') return diffDays < 0;
        if (dueFilter === 'warning') return diffDays >= 0 && diffDays <= 3;
        if (dueFilter === 'safe') return diffDays > 3;
        
        return true;
      });
    }

    // Filter search text
    if (searchText.trim() !== '') {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(p => 
        p.denso_pn.toLowerCase().includes(searchLower) ||
        (p.part_name && p.part_name.toLowerCase().includes(searchLower)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchLower)) ||
        p.problem.toLowerCase().includes(searchLower) ||
        (p.pic && p.pic.toLowerCase().includes(searchLower))
      );
    }

    setFilteredProblems(filtered);
  }

  // Pagination
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProblems.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  function getDueDateClass(dueDate: string) {
    if (!dueDate) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-danger fw-bold';
    if (diffDays <= 3) return 'text-warning fw-bold';
    return 'text-success fw-bold';
  }

  function getTimingClass(timingDateTime: string) {
    if (!timingDateTime) return '';
    
    const timing = new Date(timingDateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    timing.setHours(0, 0, 0, 0);
    
    if (timing < today) return 'text-danger fw-bold';
    if (timing.getTime() === today.getTime()) return 'text-warning fw-bold';
    return '';
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID');
  }

  function formatDateTime(dateStr: string) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // EDIT FUNCTIONS
function openEditModal(problem: Problem) {
  setSelectedProblem(problem); // Set data yang dipilih
  setEditAction(problem.action || '');
  
  if (problem.due_date_max) {
    const date = new Date(problem.due_date_max);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setEditDueDate(`${year}-${month}-${day}`);
  } else {
    setEditDueDate('');
  }
  
  setEditPic(problem.pic || '');
  setEditNote(problem.note_remark || '');
  setEditStatus(problem.status || 'Open');
  setEditRemark('');
  
  if (modalRef.current) {
    modalRef.current.show();
  }
}

async function saveUpdate() {
  if (!selectedProblem) return;
  
  // Validasi input
  if (!editAction || !editDueDate || !editPic || !editStatus || !editRemark) {
    Swal.fire({
      icon: 'warning',
      title: 'Peringatan',
      text: 'Semua field wajib diisi!',
      background: '#1a1a1a',
      color: 'white'
    });
    return;
  }

  try {
    console.log('Updating problem ID:', selectedProblem.id);
    console.log('Data to update:', {
      action: editAction,
      due_date_max: editDueDate,
      pic: editPic,
      note_remark: editNote,
      status: editStatus
    });

    const { error } = await supabase
      .from('problems')
      .update({
        action: editAction,
        due_date_max: editDueDate,
        pic: editPic,
        note_remark: editNote || null,
        status: editStatus
      })
      .eq('id', selectedProblem.id);

    if (error) throw error;
    
    // Tampilkan notifikasi sukses
    await Swal.fire({
      icon: 'success',
      title: '✅ Berhasil!',
      text: 'Data berhasil diupdate',
      timer: 1500,
      showConfirmButton: false,
      background: '#1a1a1a',
      color: 'white'
    });

    // Tutup modal
    if (modalRef.current) {
      modalRef.current.hide();
    }
    
    // **PENTING: Reset selectedProblem biar ga nyimpen data lama**
    setSelectedProblem(null);
    
    // Refresh data
    await fetchData();

    } catch (error) {
    console.error('Update error:', error);
    
    let errorMessage = 'Terjadi kesalahan';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
    }
    
    Swal.fire({
        icon: 'error',
        title: '❌ Gagal Update',
        text: errorMessage,
        background: '#1a1a1a',
        color: 'white'
    });
    }
}

  // DELETE FUNCTION
  async function deleteProblem(id: number) {
    const result = await Swal.fire({
      title: 'Yakin mau hapus?',
      text: 'Data yang dihapus tidak bisa dikembalikan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#1a1a1a',
      color: 'white'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('problems')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Data berhasil dihapus',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });

        fetchData();

      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal menghapus data',
          background: '#1a1a1a',
          color: 'white'
        });
      }
    }
  }

function downloadExcel() {
  const wb = XLSX.utils.book_new();
  
  const title = `PROCARE - MATERIAL CONTROL`;
  const dateGenerated = `Generated: ${new Date().toLocaleString('id-ID')}`;
  
  const wsData = [
    [title],
    [dateGenerated],
    [],
    ['No', 'DENSO PN', 'Part Name', 'L/I', 'Supplier', 'Problem', 
     'Timing', 'Action', 'Due Date', 'PIC', 'Note/Remark', 'Status']
  ];
  
  filteredProblems.forEach((item, index) => {
    wsData.push([
      String(index + 1),
      String(item.denso_pn),
      String(item.part_name || '-'),
      String(item.local_import),
      String(item.supplier_name || '-'),
      String(item.problem),
      String(formatDateTime(item.timing_date_time)),
      String(item.action || '-'),
      String(formatDate(item.due_date_max)),
      String(item.pic || '-'),
      String(item.note_remark || '-'),
      String(item.status || 'Open')
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 30 },
    { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
    { wch: 30 }, { wch: 12 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'PROCARE Data');
  
  const fileName = `PROCARE_${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
  
  Swal.fire({
    icon: 'success',
    title: '✅ Excel Berhasil',
    text: `File: ${fileName}`,
    timer: 2000,
    showConfirmButton: false,
    background: '#1a1a1a',
    color: 'white'
  });
}

  function downloadPDF() {
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(139, 58, 58);
    doc.text('PROCARE - Material Control', 14, 15);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    
    // Table
    const tableColumn = [
      'No', 'DENSO PN', 'Part Name', 'L/I', 'Supplier', 'Problem', 
      'Timing', 'Action', 'Due Date', 'PIC', 'Status'
    ];
    
    const tableRows = filteredProblems.map((item, index) => [
      index + 1,
      item.denso_pn,
      item.part_name || '-',
      item.local_import,
      item.supplier_name || '-',
      item.problem.substring(0, 30) + (item.problem.length > 30 ? '...' : ''),
      formatDateTime(item.timing_date_time),
      item.action || '-',
      formatDate(item.due_date_max),
      item.pic || '-',
      item.status || 'Open'
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [139, 58, 58], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    const fileName = `PROCARE_${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}.pdf`;
    
    doc.save(fileName);
    
    Swal.fire({
      icon: 'success',
      title: '✅ PDF Berhasil',
      text: `File: ${fileName}`,
      timer: 2000,
      showConfirmButton: false,
      background: '#1a1a1a',
      color: 'white'
    });
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#000000'
      }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{ color: '#aaa' }}>Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#000000', minHeight: '100vh', padding: '20px' }}>
      <div className="container-fluid px-0 px-lg-4">
        
        {/* HEADER GRADIENT MAROON */}
        <div style={{ 
          background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 50%, #6b2b2b 100%)',
          padding: '30px',
          borderRadius: '24px',
          marginBottom: '25px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(180, 80, 80, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: 'clamp(24px, 5vw, 32px)',
                  fontWeight: 700,
                  color: 'white',
                  margin: '0 0 8px 0',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                  <i className="fas fa-heartbeat me-3" style={{ color: '#ffa5a5' }}></i>
                  PROCARE DASHBOARD
                </h1>
                <p style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  margin: 0,
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}>
                  <span><i className="far fa-clock me-2" style={{ color: '#ffa5a5' }}></i>Update: {lastUpdate || '-'}</span>
                  <span><i className="fas fa-database me-2" style={{ color: '#ffa5a5' }}></i>Total: {stats.total}</span>
                </p>
              </div>
              <div style={{ 
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
                padding: '10px 20px',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-sync-alt fa-spin" style={{ color: '#ffa5a5' }}></i>
                <span>Auto Refresh 1 Menit</span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '25px',
          marginBottom: '30px'
        }}>
          {/* TOTAL PROBLEM */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid #8b3a3a',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: '#8b3a3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              color: 'white'
            }}>
              <i className="fas fa-tasks"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#c44a4a', marginBottom: '8px' }}>TOTAL PROBLEM</div>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>{stats.total}</div>
              <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-chart-line" style={{ color: '#c44a4a' }}></i> All Time
              </div>
            </div>
          </div>

          {/* OPEN */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid #ffc107',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: '#ffc107',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              color: '#1a1a1a'
            }}>
              <i className="fas fa-folder-open"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffc107', marginBottom: '8px' }}>OPEN</div>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>{stats.open}</div>
              <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-lock" style={{ color: '#ffc107' }}></i> Need Action
              </div>
            </div>
          </div>

          {/* IN PROGRESS */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid #17a2b8',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: '#17a2b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              color: 'white'
            }}>
              <i className="fas fa-spinner"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#17a2b8', marginBottom: '8px' }}>IN PROGRESS</div>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>{stats.progress}</div>
              <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-sync-alt fa-spin" style={{ color: '#17a2b8' }}></i> On Process
              </div>
            </div>
          </div>

          {/* CLOSED */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            border: '2px solid #28a745',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: '#28a745',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              color: 'white'
            }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#28a745', marginBottom: '8px' }}>CLOSED</div>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>{stats.closed}</div>
              <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-check-double" style={{ color: '#28a745' }}></i> Completed
              </div>
            </div>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '25px',
          border: '1px solid #333'
        }}>
          <div className="row g-4">
            <div className="col-md-4">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '8px' }}>
                <i className="fas fa-filter me-2" style={{ color: '#c44a4a' }}></i> Status
              </div>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            
            <div className="col-md-4">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '8px' }}>
                <i className="fas fa-user me-2" style={{ color: '#c44a4a' }}></i> PIC
              </div>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
                value={picFilter} 
                onChange={(e) => setPicFilter(e.target.value)}
              >
                <option value="all">Semua PIC</option>
                {picOptions.map(pic => (
                  <option key={pic} value={pic}>{pic}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-4">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '8px' }}>
                <i className="fas fa-calendar me-2" style={{ color: '#c44a4a' }}></i> Due Date
              </div>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
                value={dueFilter} 
                onChange={(e) => setDueFilter(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="overdue">Overdue (Lewat)</option>
                <option value="warning">Mepet (H-3)</option>
                <option value="safe">Aman</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '20px',
          border: '1px solid #333',
          padding: '20px'
        }}>
          {/* Header Table dengan Title + Buttons + Search */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <h5 style={{ color: 'white', margin: 0 }}>
              <i className="fas fa-list-ul me-2" style={{ color: '#c44a4a' }}></i>
              Daftar Problem Material
            </h5>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Excel Button */}
              <button 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  borderRadius: '12px',
                  color: '#28a745',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onClick={downloadExcel} 
                title="Download Excel"
              >
                <i className="fas fa-file-excel"></i>
              </button>
              
              {/* PDF Button */}
              <button 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  borderRadius: '12px',
                  color: '#dc3545',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onClick={downloadPDF} 
                title="Download PDF"
              >
                <i className="fas fa-file-pdf"></i>
              </button>
              
              {/* Search Box - Desain Menyatu */}
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ 
                  position: 'absolute', 
                  left: '15px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#aaa',
                  zIndex: 1
                }}></i>
                <input 
                  type="text" 
                  placeholder="Cari..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ 
                    background: '#2a2a2a',
                    border: '1px solid #404040',
                    color: 'white',
                    padding: '10px 15px 10px 45px',
                    borderRadius: '12px',
                    width: '250px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#c44a4a'}
                  onBlur={(e) => e.target.style.borderColor = '#404040'}
                />
              </div>
            </div>
          </div>
          
          {/* Table */}
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              color: 'white'
            }}>
              <thead>
                <tr style={{ 
                  background: '#2a2a2a',
                  borderBottom: '2px solid #8b3a3a'
                }}>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>DENSO PN</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Part Name</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>L/I</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Supplier</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Problem</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Timing</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Action</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Due Date</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>PIC</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Note</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '15px 10px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '80px 20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#aaa'
                      }}>
                        <i className="fas fa-folder-open" style={{ fontSize: '60px', marginBottom: '20px', color: '#8b3a3a' }}></i>
                        <h3 style={{ color: 'white', marginBottom: '10px' }}>Tidak Ada Data</h3>
                        <p style={{ color: '#aaa', marginBottom: '20px' }}>Belum ada problem material yang tercatat</p>
                        <Link 
                          href="/" 
                          style={{ 
                            background: '#8b3a3a',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <i className="fas fa-plus"></i>
                          Tambah Problem
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const dueDateClass = getDueDateClass(item.due_date_max);
                    const timingClass = getTimingClass(item.timing_date_time);
                    const rowIndex = startIndex + index + 1;
                    
                    let statusBadge = '';
                    let statusBg = '';
                    if (item.status === 'Open') {
                      statusBg = '#ffc107';
                      statusBadge = 'Open';
                    } else if (item.status === 'In Progress') {
                      statusBg = '#17a2b8';
                      statusBadge = 'In Progress';
                    } else if (item.status === 'Closed') {
                      statusBg = '#28a745';
                      statusBadge = 'Closed';
                    }
                    
                    return (
                      <tr key={item.id} style={{ 
                        borderBottom: '1px solid #333',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{rowIndex}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 500 }}>{item.denso_pn}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.part_name || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.local_import}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.supplier_name || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.problem}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }} className={timingClass}>{formatDateTime(item.timing_date_time)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.action || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }} className={dueDateClass}>{formatDate(item.due_date_max)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.pic || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.note_remark || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            background: statusBg,
                            color: statusBg === '#ffc107' ? '#1a1a1a' : 'white',
                            padding: '5px 12px',
                            borderRadius: '30px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {statusBadge}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button 
                            style={{ 
                              background: '#8b3a3a', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px',
                              padding: '6px 12px',
                              margin: '0 4px',
                              cursor: 'pointer',
                              transition: 'all 0.3s'
                            }}
                            onClick={() => openEditModal(item)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            style={{ 
                              background: '#dc3545', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px',
                              padding: '6px 12px',
                              margin: '0 4px',
                              cursor: 'pointer',
                              transition: 'all 0.3s'
                            }}
                            onClick={() => deleteProblem(item.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Info - Hanya muncul kalau ada data */}
          {filteredProblems.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '20px',
              color: '#aaa',
              fontSize: '14px'
            }}>
              <div>
                Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredProblems.length)} dari {filteredProblems.length} data
              </div>
              
              {/* Pagination Buttons */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  style={{ 
                    background: currentPage === 1 ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === 1 ? '#666' : 'white',
                    padding: '8px 15px',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </button>
                
                {/* Nomor halaman */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                  }
                  if (pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        style={{
                          background: currentPage === pageNum ? '#8b3a3a' : '#2a2a2a',
                          border: currentPage === pageNum ? '1px solid #c44a4a' : '1px solid #404040',
                          color: 'white',
                          padding: '8px 15px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          minWidth: '40px'
                        }}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button 
                  style={{ 
                    background: currentPage === totalPages ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === totalPages ? '#666' : 'white',
                    padding: '8px 15px',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '25px' }}>
          <i className="fas fa-circle me-1" style={{ color: '#8b3a3a', fontSize: '8px' }}></i>
          PROCARE - Material Control Problem Resolution
          <i className="fas fa-circle ms-1" style={{ color: '#8b3a3a', fontSize: '8px' }}></i>
        </div>
      </div>

      {/* EDIT MODAL */}
      <div className="modal fade" id="updateModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content" style={{ background: '#1a1a1a', border: '1px solid #8b3a3a' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)', border: 'none' }}>
              <h5 className="modal-title text-white">
                <i className="fas fa-edit me-2"></i>
                Update Problem
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-white-50 small">DENSO PN</label>
                  <input type="text" className="form-control" value={selectedProblem?.denso_pn || ''} readOnly
                         style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }} />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white-50 small">Part Name</label>
                  <input type="text" className="form-control" value={selectedProblem?.part_name || ''} readOnly
                         style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }} />
                </div>

                <div className="col-12">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-tasks me-2" style={{ color: '#c44a4a' }}></i>
                    Action <span className="text-danger">*</span>
                  </label>
                  <textarea 
                    className="form-control" 
                    rows={2}
                    value={editAction}
                    onChange={(e) => setEditAction(e.target.value)}
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                    placeholder="Tindakan terbaru..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-calendar-alt me-2" style={{ color: '#c44a4a' }}></i>
                    Due Date <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-user me-2" style={{ color: '#c44a4a' }}></i>
                    PIC <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={editPic}
                    onChange={(e) => setEditPic(e.target.value)}
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                    placeholder="Nama PIC"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-sticky-note me-2" style={{ color: '#c44a4a' }}></i>
                    Note/Remark
                  </label>
                  <textarea 
                    className="form-control" 
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                    placeholder="Catatan tambahan..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-info-circle me-2" style={{ color: '#c44a4a' }}></i>
                    Status <span className="text-danger">*</span>
                  </label>
                  <select 
                    className="form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-white-50 small">
                    <i className="fas fa-pen me-2" style={{ color: '#c44a4a' }}></i>
                    Alasan Update <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    placeholder="Contoh: Follow up supplier, revisi dokumen, dll"
                    style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #333' }}>
              <button type="button" className="btn" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }} data-bs-dismiss="modal">Batal</button>
              <button type="button" className="btn" style={{ background: '#8b3a3a', color: 'white', border: 'none' }} onClick={saveUpdate}>
                <i className="fas fa-save me-2"></i>Simpan Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING BUTTONS */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <Link 
          href="/" 
          style={{ 
            width: '50px', 
            height: '50px', 
            background: '#2a2a2a',
            border: '1px solid #404040',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            transition: 'all 0.3s',
            textDecoration: 'none'
          }}
          title="Ke Form Input"
        >
          <i className="fas fa-plus"></i>
        </Link>
      </div>
    </div>
  );
}