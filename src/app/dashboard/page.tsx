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
  const itemsPerPage = 10;

  // Fetch data
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Setup modal
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

  function getDueDateClass(dueDate: string) {
    if (!dueDate) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-danger fw-bold';
    if (diffDays <= 3) return 'text-warning fw-bold';
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

  // CEK STATUS VALIDATION
  function canUpdate(currentStatus: string, newStatus: string): boolean {
    // Closed tidak bisa diubah apapun
    if (currentStatus === 'Closed') return false;
    
    // In Progress hanya bisa ke Closed
    if (currentStatus === 'In Progress' && newStatus !== 'Closed') return false;
    
    // Open bisa ke In Progress atau Closed
    if (currentStatus === 'Open' && (newStatus === 'In Progress' || newStatus === 'Closed')) return true;
    
    return false;
  }

  function openEditModal(problem: Problem) {
    setSelectedProblem(problem);
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

    // CEK VALIDASI STATUS
    if (!canUpdate(selectedProblem.status, editStatus)) {
      let message = '';
      if (selectedProblem.status === 'Closed') {
        message = 'Data dengan status CLOSED tidak dapat diubah lagi!';
      } else if (selectedProblem.status === 'In Progress' && editStatus !== 'Closed') {
        message = 'Status IN PROGRESS hanya bisa diubah menjadi CLOSED!';
      } else if (selectedProblem.status === 'Open' && editStatus === 'Open') {
        message = 'Status tidak berubah. Pilih In Progress atau Closed!';
      }
      
      Swal.fire({
        icon: 'error',
        title: '❌ Tidak Diijinkan',
        text: message,
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    try {
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
      
      await Swal.fire({
        icon: 'success',
        title: '✅ Berhasil!',
        text: 'Data berhasil diupdate',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: 'white'
      });

      if (modalRef.current) {
        modalRef.current.hide();
      }
      
      setSelectedProblem(null);
      await fetchData();

    } catch (error) {
      console.error('Update error:', error);
      
      Swal.fire({
        icon: 'error',
        title: '❌ Gagal Update',
        text: 'Terjadi kesalahan',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  async function deleteProblem(id: number) {
    const problem = problems.find(p => p.id === id);
    
    // Cek kalau Closed gabisa dihapus
    if (problem?.status === 'Closed') {
      Swal.fire({
        icon: 'error',
        title: '❌ Tidak Bisa Hapus',
        text: 'Data dengan status CLOSED tidak dapat dihapus!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

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
    
    doc.setFontSize(18);
    doc.setTextColor(139, 58, 58);
    doc.text('PROCARE - Material Control', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    
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
    <div style={{ background: '#000000', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ 
          background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
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
              <h1 style={{ 
                fontSize: 'clamp(20px, 4vw, 28px)',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 4px 0'
              }}>
                <i className="fas fa-heartbeat me-2" style={{ color: '#ffa5a5' }}></i>
                PROCARE DASHBOARD
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
                <i className="far fa-clock me-1"></i>Update: {lastUpdate || '-'}
              </p>
            </div>
            <div style={{ 
              background: 'rgba(0,0,0,0.3)',
              padding: '8px 16px',
              borderRadius: '30px',
              fontSize: '13px',
              color: '#ffa5a5'
            }}>
              <i className="fas fa-sync-alt fa-spin me-2"></i>
              Auto Refresh
            </div>
          </div>
        </div>

        {/* STATS CARDS - Responsive Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* TOTAL */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #333'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#8b3a3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white'
            }}>
              <i className="fas fa-tasks"></i>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#c44a4a' }}>TOTAL</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>{stats.total}</div>
            </div>
          </div>

          {/* OPEN */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #333'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ffc107',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#1a1a1a'
            }}>
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#ffc107' }}>OPEN</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>{stats.open}</div>
            </div>
          </div>

          {/* IN PROGRESS */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #333'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#17a2b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white'
            }}>
              <i className="fas fa-spinner"></i>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#17a2b8' }}>PROGRESS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>{stats.progress}</div>
            </div>
          </div>

          {/* CLOSED */}
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #333'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#28a745',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white'
            }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#28a745' }}>CLOSED</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>{stats.closed}</div>
            </div>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #333'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>
                <i className="fas fa-filter me-1" style={{ color: '#c44a4a' }}></i> Status
              </label>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  width: '100%',
                  fontSize: '14px'
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
            
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>
                <i className="fas fa-user me-1" style={{ color: '#c44a4a' }}></i> PIC
              </label>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  width: '100%',
                  fontSize: '14px'
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
            
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>
                <i className="fas fa-calendar me-1" style={{ color: '#c44a4a' }}></i> Due Date
              </label>
              <select 
                className="form-select" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  width: '100%',
                  fontSize: '14px'
                }}
                value={dueFilter} 
                onChange={(e) => setDueFilter(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="overdue">Overdue</option>
                <option value="warning">Mepet (H-3)</option>
                <option value="safe">Aman</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>
                <i className="fas fa-search me-1" style={{ color: '#c44a4a' }}></i> Cari
              </label>
              <input 
                type="text" 
                placeholder="PN, Part, Problem..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ 
                  width: '100%',
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #333',
          padding: '20px',
          overflow: 'hidden'
        }}>
          
          {/* Header Table */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h5 style={{ color: 'white', margin: 0, fontSize: '16px' }}>
              <i className="fas fa-list-ul me-2" style={{ color: '#c44a4a' }}></i>
              Daftar Problem Material
            </h5>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  borderRadius: '8px',
                  color: '#28a745',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={downloadExcel} 
                title="Download Excel"
              >
                <i className="fas fa-file-excel"></i>
              </button>
              
              <button 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  borderRadius: '8px',
                  color: '#dc3545',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={downloadPDF} 
                title="Download PDF"
              >
                <i className="fas fa-file-pdf"></i>
              </button>
            </div>
          </div>
          
          {/* Table - Responsive */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '1200px',
              color: 'white',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ 
                  background: '#2a2a2a',
                  borderBottom: '2px solid #8b3a3a'
                }}>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>DENSO PN</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Part Name</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>L/I</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Supplier</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Problem</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Timing</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Action</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Due Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>PIC</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Note</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '40px', marginBottom: '16px', color: '#8b3a3a' }}></i>
                      <p>Tidak Ada Data</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const dueDateClass = getDueDateClass(item.due_date_max);
                    const rowIndex = startIndex + index + 1;
                    
                    let statusColor = '';
                    if (item.status === 'Open') statusColor = '#ffc107';
                    else if (item.status === 'In Progress') statusColor = '#17a2b8';
                    else if (item.status === 'Closed') statusColor = '#28a745';
                    
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{rowIndex}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.denso_pn}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.part_name || '-'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.local_import}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.supplier_name || '-'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.problem}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{formatDateTime(item.timing_date_time)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.action || '-'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }} className={dueDateClass}>{formatDate(item.due_date_max)}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.pic || '-'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.note_remark || '-'}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span style={{ 
                            background: statusColor,
                            color: statusColor === '#ffc107' ? '#1a1a1a' : 'white',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button 
                            style={{ 
                              background: '#8b3a3a', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '6px',
                              padding: '4px 8px',
                              margin: '0 2px',
                              cursor: item.status === 'Closed' ? 'not-allowed' : 'pointer',
                              opacity: item.status === 'Closed' ? 0.5 : 1,
                              fontSize: '12px'
                            }}
                            onClick={() => item.status !== 'Closed' && openEditModal(item)}
                            disabled={item.status === 'Closed'}
                            title={item.status === 'Closed' ? 'Closed tidak bisa diedit' : 'Edit'}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            style={{ 
                              background: '#dc3545', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '6px',
                              padding: '4px 8px',
                              margin: '0 2px',
                              cursor: item.status === 'Closed' ? 'not-allowed' : 'pointer',
                              opacity: item.status === 'Closed' ? 0.5 : 1,
                              fontSize: '12px'
                            }}
                            onClick={() => item.status !== 'Closed' && deleteProblem(item.id)}
                            disabled={item.status === 'Closed'}
                            title={item.status === 'Closed' ? 'Closed tidak bisa dihapus' : 'Hapus'}
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
          
          {/* Pagination */}
          {filteredProblems.length > 0 && (
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
                {startIndex + 1} - {Math.min(endIndex, filteredProblems.length)} dari {filteredProblems.length}
              </div>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  style={{ 
                    background: currentPage === 1 ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === 1 ? '#666' : 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </button>
                
                <span style={{ 
                  background: '#2a2a2a',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #404040'
                }}>
                  {currentPage} / {totalPages}
                </span>
                
                <button 
                  style={{ 
                    background: currentPage === totalPages ? '#1a1a1a' : '#2a2a2a',
                    border: '1px solid #404040',
                    color: currentPage === totalPages ? '#666' : 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      <div className="modal fade" id="updateModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
            <div className="modal-header" style={{ background: '#2a2a2a', border: 'none' }}>
              <h5 className="modal-title text-white">
                <i className="fas fa-edit me-2" style={{ color: '#c44a4a' }}></i>
                Update Problem
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">DENSO PN</label>
                <input type="text" className="form-control" value={selectedProblem?.denso_pn || ''} readOnly
                       style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
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

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
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

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
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

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
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

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
                  Status <span className="text-danger">*</span>
                </label>
                <select 
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                >
                  {selectedProblem?.status === 'Open' && (
                    <>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </>
                  )}
                  {selectedProblem?.status === 'In Progress' && (
                    <>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </>
                  )}
                  {selectedProblem?.status === 'Closed' && (
                    <option value="Closed">Closed</option>
                  )}
                </select>
                {selectedProblem?.status === 'Closed' && (
                  <small className="text-danger d-block mt-1">
                    <i className="fas fa-info-circle me-1"></i>
                    Data Closed tidak dapat diubah
                  </small>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label text-white-50 small">
                  Alasan Update <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  placeholder="Contoh: Follow up supplier"
                  style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #333' }}>
              <button type="button" className="btn btn-secondary" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white' }} data-bs-dismiss="modal">Batal</button>
              <button type="button" className="btn" style={{ background: '#8b3a3a', color: 'white', border: 'none' }} onClick={saveUpdate}>
                Simpan Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING BUTTON */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <Link 
          href="/" 
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
            textDecoration: 'none'
          }}
          title="Tambah Data"
        >
          <i className="fas fa-plus"></i>
        </Link>
      </div>
    </div>
  );
}