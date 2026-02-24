"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  const modalRef = useRef<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // MODAL SELECTOR
  const [showSelector, setShowSelector] = useState(false);

  // ========== DATA UNTUK GRAFIK ==========
  const [chartData, setChartData] = useState<any[]>([]);

  // ========== CEK LOGIN ==========
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    fetchData();
    checkAndResetMonthly();
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [router]);

  // ========== SETUP MODAL ==========
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

  // ========== FILTER EFFECTS ==========
  useEffect(() => {
    applyFilters();
  }, [problems, statusFilter, picFilter, dueFilter, searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, picFilter, dueFilter, searchText]);

  // ========== LOGOUT ==========
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

  // ========== FUNGSI CEK DAN RESET BULANAN ==========
  async function checkAndResetMonthly() {
    try {
      const today = new Date();
      const isFirstDayOfMonth = today.getDate() === 1;
      
      const lastResetStr = localStorage.getItem('lastResetDate');
      const lastReset = lastResetStr ? new Date(lastResetStr) : null;
      
      const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
      const lastResetMonthYear = lastReset ? `${lastReset.getFullYear()}-${lastReset.getMonth()}` : null;

      if (isFirstDayOfMonth && lastResetMonthYear !== currentMonthYear) {
        const result = await Swal.fire({
          title: '🔄 Monthly Cleanup',
          html: `
            <div style="text-align: center">
              <i class="fas fa-calendar-alt" style="font-size: 48px; color: #8b3a3a; margin-bottom: 16px;"></i>
              <p style="font-size: 16px; margin-bottom: 8px;">Hari ini tanggal 1!</p>
              <p style="color: #aaa; font-size: 14px;">Data dengan status CLOSED akan dihapus.</p>
              <p style="color: #28a745; font-size: 13px; margin-top: 12px;">
                <i class="fas fa-info-circle me-1"></i>
                Data OPEN & IN PROGRESS tetap disimpan.
              </p>
            </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#8b3a3a',
          cancelButtonColor: '#2a2a2a',
          confirmButtonText: 'Ya, Bersihkan',
          cancelButtonText: 'Nanti',
          background: '#1a1a1a',
          color: 'white'
        });

        if (result.isConfirmed) {
          await resetMonthlyData();
          localStorage.setItem('lastResetDate', today.toISOString());
          
          Swal.fire({
            icon: 'success',
            title: '✅ Cleanup Berhasil',
            text: 'Data CLOSED telah dihapus. Data aktif tetap aman!',
            timer: 3000,
            showConfirmButton: false,
            background: '#1a1a1a',
            color: 'white'
          });
        }
      }
    } catch (error) {
      console.error('Error check reset:', error);
    }
  }

  async function resetMonthlyData() {
    try {
      setLoading(true);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const { error: deleteError } = await supabase
        .from('problems')
        .delete()
        .eq('status', 'Closed')
        .lt('created_at', oneMonthAgo.toISOString());

      if (deleteError) throw deleteError;

      await fetchData();

    } catch (error) {
      console.error('Error reset data:', error);
      Swal.fire({
        icon: 'error',
        title: '❌ Gagal',
        text: 'Terjadi kesalahan saat cleanup',
        background: '#1a1a1a',
        color: 'white'
      });
    } finally {
      setLoading(false);
    }
  }

  // ========== FETCH DATA ==========
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

      // ========== UPDATE DATA GRAFIK ==========
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayStr = date.toLocaleDateString('id-ID', { 
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
        
        const dayData = {
          date: dayStr,
          open: 0,
          progress: 0,
          closed: 0
        };

        dataWithStatus.forEach(item => {
          const itemDate = new Date(item.created_at);
          if (itemDate.toDateString() === date.toDateString()) {
            if (item.status === 'Open') dayData.open++;
            else if (item.status === 'In Progress') dayData.progress++;
            else if (item.status === 'Closed') dayData.closed++;
          }
        });

        last7Days.push(dayData);
      }
      setChartData(last7Days);

      const pics = [...new Set(dataWithStatus.map(p => p.pic).filter(p => p && p !== '-'))] as string[];
      setPicOptions(pics);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // ========== APPLY FILTERS ==========
  function applyFilters() {
    let filtered = [...problems];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (picFilter !== 'all') {
      filtered = filtered.filter(p => p.pic === picFilter);
    }

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

  // ========== PAGINATION ==========
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProblems.slice(startIndex, endIndex);

  // ========== DUE DATE CLASS ==========
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

  // ========== FORMAT DATE/TIME ==========
  function formatDateOnly(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  }

  function formatTimeOnly(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID');
    } catch {
      return '-';
    }
  }

  // ========== STATUS VALIDATION ==========
  function canUpdate(currentStatus: string, newStatus: string): boolean {
    if (currentStatus === 'Closed') return false;
    if (currentStatus === 'In Progress') return newStatus === 'Closed';
    if (currentStatus === 'Open') return newStatus === 'In Progress' || newStatus === 'Closed';
    return false;
  }

  // ========== EDIT MODAL ==========
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
    
    if (modalRef.current) {
      modalRef.current.show();
    }
  }

  async function saveUpdate() {
    if (!selectedProblem) return;
    
    if (!editAction || !editDueDate || !editPic || !editStatus) {
      Swal.fire({
        icon: 'warning',
        title: 'Peringatan',
        text: 'Field Action, Due Date, PIC, dan Status wajib diisi!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    if (!canUpdate(selectedProblem.status, editStatus)) {
      let message = '';
      if (selectedProblem.status === 'Closed') {
        message = 'Data dengan status CLOSED tidak dapat diubah lagi!';
      } else if (selectedProblem.status === 'In Progress' && editStatus !== 'Closed') {
        message = 'Status IN PROGRESS hanya bisa diubah menjadi CLOSED!';
      } else {
        message = 'Perubahan status tidak diijinkan!';
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

  // ========== DOWNLOAD EXCEL DENGAN PILIHAN ==========
  async function downloadExcel() {
    const result = await Swal.fire({
      title: '📊 Download Excel',
      html: `
        <div style="text-align: left">
          <p style="color: #fff; margin-bottom: 16px;">Pilih periode data:</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="all" checked style="cursor: pointer;"> 
              <i class="fas fa-database" style="color: #8b3a3a;"></i>
              Semua Data (${filteredProblems.length} records)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="month" style="cursor: pointer;"> 
              <i class="fas fa-calendar-alt" style="color: #28a745;"></i>
              Per Bulan Ini
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Download',
      cancelButtonText: 'Batal',
      background: '#1a1a1a',
      color: 'white',
      preConfirm: () => {
        const selected = document.querySelector('input[name="period"]:checked') as HTMLInputElement;
        return selected?.value;
      }
    });

    if (!result.isConfirmed) return;

    const period = result.value;
    let dataToDownload = [...filteredProblems];

    if (period === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      dataToDownload = filteredProblems.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      });

      if (dataToDownload.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Data',
          text: 'Tidak ada data untuk bulan ini',
          background: '#1a1a1a',
          color: 'white'
        });
        return;
      }
    }

    try {
      const wb = XLSX.utils.book_new();
      
      const title = `PT. DENSO INDONESIA - BNF MATERIAL CONTROL`;
      const periode = period === 'month' 
        ? `Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
        : `Periode: Semua Data`;
      const dateGenerated = `Generated: ${new Date().toLocaleString('id-ID')}`;
      const totalData = `Total Records: ${dataToDownload.length}`;
      
      const wsData = [
        [title],
        [periode],
        [dateGenerated],
        [totalData],
        [],
        ['NO', 'DENSO PN', 'PART NAME', 'L/I', 'SUPPLIER NAME', 'PROBLEM', 
         'Issued Timing', 'TIME', 'ACTION', 'DUE DATE', 'PIC', 'NOTE/REMARK', 'STATUS']
      ];
      
      dataToDownload.forEach((item, index) => {
        wsData.push([
          String(index + 1),
          String(item.denso_pn),
          String(item.part_name || '-'),
          String(item.local_import),
          String(item.supplier_name || '-'),
          String(item.problem),
          formatDateOnly(item.timing_date_time),
          formatTimeOnly(item.timing_date_time),
          String(item.action || '-'),
          formatDateOnly(item.due_date_max),
          String(item.pic || '-'),
          String(item.note_remark || '-'),
          String(item.status || 'Open')
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 12 } }
      ];
      
      ws['!cols'] = [
        { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 30 },
        { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 12 },
        { wch: 20 }, { wch: 40 }, { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'BNF Data');
      
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const fileName = period === 'month'
        ? `BNF_${new Date().getFullYear()}${month}.xlsx`
        : `BNF_All_${new Date().getFullYear()}${month}${new Date().getDate().toString().padStart(2, '0')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      Swal.fire({
        icon: 'success',
        title: '✅ Excel Berhasil',
        html: `
          <div style="text-align: left">
            <p><i class="fas fa-file-excel me-2" style="color: #28a745;"></i> File: ${fileName}</p>
            <p><i class="fas fa-database me-2" style="color: #8b3a3a;"></i> Data: ${dataToDownload.length} records</p>
            <p><i class="fas fa-calendar me-2" style="color: #17a2b8;"></i> ${periode}</p>
          </div>
        `,
        timer: 3000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: 'white'
      });
    } catch (error) {
      console.error('Excel error:', error);
      Swal.fire({
        icon: 'error',
        title: '❌ Gagal',
        text: 'Terjadi kesalahan saat download Excel',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  // ========== DOWNLOAD PDF DENGAN PILIHAN ==========
  async function downloadPDF() {
    const result = await Swal.fire({
      title: '📄 Download PDF',
      html: `
        <div style="text-align: left">
          <p style="color: #fff; margin-bottom: 16px;">Pilih periode data:</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="all" checked style="cursor: pointer;"> 
              <i class="fas fa-database" style="color: #8b3a3a;"></i>
              Semua Data (${filteredProblems.length} records)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="month" style="cursor: pointer;"> 
              <i class="fas fa-calendar-alt" style="color: #28a745;"></i>
              Per Bulan Ini
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'Download',
      cancelButtonText: 'Batal',
      background: '#1a1a1a',
      color: 'white',
      preConfirm: () => {
        const selected = document.querySelector('input[name="period"]:checked') as HTMLInputElement;
        return selected?.value;
      }
    });

    if (!result.isConfirmed) return;

    const period = result.value;
    let dataToDownload = [...filteredProblems];

    if (period === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      dataToDownload = filteredProblems.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      });

      if (dataToDownload.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Data',
          text: 'Tidak ada data untuk bulan ini',
          background: '#1a1a1a',
          color: 'white'
        });
        return;
      }
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const maroon: [number, number, number] = [139, 58, 58];
      
      doc.setFontSize(14);
      doc.setTextColor(maroon[0], maroon[1], maroon[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('PT. DENSO INDONESIA', 15, 12);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text('BNF Material Control - Problem Resolution', 15, 18);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      const today = new Date();
      const periode = period === 'month'
        ? `Periode: ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
        : `Periode: Semua Data`;
      const generated = `Generated: ${today.toLocaleDateString('id-ID')} ${today.toLocaleTimeString('id-ID')}`;
      const totalData = `Total Records: ${dataToDownload.length}`;
      
      doc.text(periode, 15, 24);
      doc.text(generated, 15, 28);
      doc.text(totalData, 15, 32);
      
      doc.setDrawColor(maroon[0], maroon[1], maroon[2]);
      doc.setLineWidth(0.3);
      doc.line(15, 35, 280, 35);
      
      const tableColumn = [
        'No', 'DENSO PN', 'Part Name', 'L/I', 'Supplier', 'Problem',
        'Issued Timing', 'Time', 'Action', 'Due Date', 'PIC', 'Note', 'Status'
      ];
      
      const tableRows = dataToDownload.map((item, index) => [
        index + 1,
        item.denso_pn,
        item.part_name || '-',
        item.local_import,
        item.supplier_name || '-',
        item.problem,
        formatDateOnly(item.timing_date_time),
        formatTimeOnly(item.timing_date_time),
        item.action || '-',
        formatDateOnly(item.due_date_max),
        item.pic || '-',
        item.note_remark || '-',
        item.status
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 38,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: maroon, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const fileName = period === 'month'
        ? `BNF_${today.getFullYear()}${month}.pdf`
        : `BNF_All_${today.getFullYear()}${month}${today.getDate().toString().padStart(2, '0')}.pdf`;
      
      doc.save(fileName);
      
      Swal.fire({
        icon: 'success',
        title: '✅ PDF Berhasil',
        html: `<p><i class="fas fa-file-pdf" style="color: #dc3545;"></i> File: ${fileName}</p>`,
        timer: 2000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: 'white'
      });
      
    } catch (error) {
      console.error('PDF error:', error);
      Swal.fire({
        icon: 'error',
        title: '❌ Gagal',
        text: 'Terjadi kesalahan saat download PDF',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  // ========== LOADING ==========
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

  // ========== RENDER ==========
  return (
    <div style={{ background: '#000000', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* MODAL SELECTOR */}
        {showSelector && currentUser && (
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowSelector(false);
                    router.push('/');
                  }}
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
                  onClick={() => setShowSelector(false)}
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
                    onClick={() => {
                      setShowSelector(false);
                      router.push('/users');
                    }}
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

        {/* HEADER */}
        <div style={{ 
          background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
          padding: '20px 24px',
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
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-heartbeat" style={{ color: '#ffa5a5' }}></i>
                DASHBOARD MONITORING
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
                <i className="far fa-clock me-1"></i>Update: {lastUpdate || '-'}
                <span style={{ marginLeft: '16px' }}>
                  <i className="fas fa-user me-1"></i>
                  {currentUser?.name} ({currentUser?.role})
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSelector(true)}
                style={{
                  background: '#8b3a3a',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                <i className="fas fa-th-large"></i>
                Menu
              </button>
              
              <button
                onClick={handleLogout}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* GRAFIK + STATS SECTION - UDAH DIPERBAIKI */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          
          {/* KIRI: GRAFIK (TOOLTIP DIHAPUS) */}
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h4 style={{
                  color: 'white',
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-chart-bar" style={{ color: '#8b3a3a' }}></i>
                  Performance Trend 7 Hari
                </h4>
                <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>
                  <i className="far fa-calendar-alt me-1"></i>
                  {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#aaa"
                    tick={{ fill: '#aaa', fontSize: 11 }}
                    axisLine={{ stroke: '#404040' }}
                  />
                  <YAxis 
                    stroke="#aaa"
                    tick={{ fill: '#aaa', fontSize: 11 }}
                    axisLine={{ stroke: '#404040' }}
                  />
                  {/* TOOLTIP DIHAPUS TOTAL */}
                  <Legend 
                    wrapperStyle={{ 
                      color: 'white', 
                      paddingTop: '15px',
                      fontSize: '12px'
                    }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar 
                    dataKey="open" 
                    fill="#ffc107" 
                    name="Open"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="#17a2b8" 
                    name="In Progress"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar 
                    dataKey="closed" 
                    fill="#28a745" 
                    name="Closed"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KANAN: STATS MINIMALIS ELEGAN */}
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid #333',
              marginBottom: '4px'
            }}>
              <i className="fas fa-chart-pie" style={{ color: '#8b3a3a', fontSize: '14px' }}></i>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>Ringkasan</span>
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#8b3a3a20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-tasks" style={{ color: '#8b3a3a', fontSize: '12px' }}></i>
                </div>
                <span style={{ color: '#aaa', fontSize: '13px' }}>Total</span>
              </div>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>{stats.total}</span>
            </div>

            {/* Open */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#ffc10720',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-folder-open" style={{ color: '#ffc107', fontSize: '12px' }}></i>
                </div>
                <span style={{ color: '#aaa', fontSize: '13px' }}>Open</span>
              </div>
              <span style={{ color: '#ffc107', fontSize: '18px', fontWeight: 600 }}>{stats.open}</span>
            </div>

            {/* Progress */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#17a2b820',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-spinner" style={{ color: '#17a2b8', fontSize: '12px' }}></i>
                </div>
                <span style={{ color: '#aaa', fontSize: '13px' }}>Progress</span>
              </div>
              <span style={{ color: '#17a2b8', fontSize: '18px', fontWeight: 600 }}>{stats.progress}</span>
            </div>

            {/* Closed */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#28a74520',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '12px' }}></i>
                </div>
                <span style={{ color: '#aaa', fontSize: '13px' }}>Closed</span>
              </div>
              <span style={{ color: '#28a745', fontSize: '18px', fontWeight: 600 }}>{stats.closed}</span>
            </div>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #333' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>Status</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Semua Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>PIC</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={picFilter} onChange={(e) => setPicFilter(e.target.value)}>
                <option value="all">Semua PIC</option>
                {picOptions.map(pic => <option key={pic} value={pic}>{pic}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>Due Date</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
                <option value="all">Semua</option>
                <option value="overdue">Overdue</option>
                <option value="warning">Mepet (H-3)</option>
                <option value="safe">Aman</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>Cari</label>
              <input type="text" placeholder="PN, Part, Problem..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: '100%', background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}/>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #333',
          padding: '20px'
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
          
          {/* Table */}
          <div style={{ 
            overflowX: 'auto',
            overflowY: 'visible',
            border: '1px solid #333',
            borderRadius: '8px'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '1500px',
              color: 'white',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#2a2a2a' }}>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '50px' }}>No</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>DENSO PN</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>Part Name</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '60px' }}>L/I</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '150px' }}>Supplier</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '200px' }}>Problem</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '130px' }}>Issued Timing</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '150px' }}>Action</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>Due Date</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>PIC</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>Note</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>Status</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ 
                      textAlign: 'center', 
                      padding: '60px 20px', 
                      color: '#666',
                      border: '1px solid #404040'
                    }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '40px', marginBottom: '16px', color: '#8b3a3a' }}></i>
                      <p>Tidak Ada Data</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const dueDateClass = getDueDateClass(item.due_date_max);
                    const rowIndex = startIndex + index + 1;
                    
                    let statusColor = '', statusText = '';
                    if (item.status === 'Open') {
                      statusColor = '#ffc107';
                      statusText = '#1a1a1a';
                    } else if (item.status === 'In Progress') {
                      statusColor = '#17a2b8';
                      statusText = 'white';
                    } else if (item.status === 'Closed') {
                      statusColor = '#28a745';
                      statusText = 'white';
                    }
                    
                    return (
                      <tr key={item.id} style={{ background: index % 2 === 0 ? '#1a1a1a' : '#222' }}>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{rowIndex}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.denso_pn}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.part_name || '-'}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.local_import}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.supplier_name || '-'}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.problem}</td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <i className="far fa-calendar-alt" style={{ fontSize: '10px', color: '#8b3a3a' }}></i>
                              <span>{formatDateOnly(item.timing_date_time)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <i className="far fa-clock" style={{ fontSize: '10px', color: '#8b3a3a' }}></i>
                              <span style={{ fontSize: '11px', color: '#ccc' }}>{formatTimeOnly(item.timing_date_time)}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.action || '-'}</td>
                        
                        <td 
                          style={{ 
                            padding: '12px 4px', 
                            textAlign: 'center', 
                            border: '1px solid #404040' 
                          }}
                          className={dueDateClass}
                        >
                          {formatDate(item.due_date_max)}
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.pic || '-'}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.note_remark || '-'}</td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <span style={{ 
                            background: statusColor,
                            color: statusText,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block',
                            minWidth: '90px'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              style={{ 
                                background: '#8b3a3a', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: item.status === 'Closed' ? 'not-allowed' : 'pointer',
                                opacity: item.status === 'Closed' ? 0.5 : 1,
                                fontSize: '12px',
                                minWidth: '60px'
                              }}
                              onClick={() => item.status !== 'Closed' && openEditModal(item)}
                              disabled={item.status === 'Closed'}
                            >
                              <i className="fas fa-edit me-1"></i> Edit
                            </button>
                            <button 
                              style={{ 
                                background: '#dc3545', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: item.status === 'Closed' ? 'not-allowed' : 'pointer',
                                opacity: item.status === 'Closed' ? 0.5 : 1,
                                fontSize: '12px',
                                minWidth: '60px'
                              }}
                              onClick={() => item.status !== 'Closed' && deleteProblem(item.id)}
                              disabled={item.status === 'Closed'}
                            >
                              <i className="fas fa-trash me-1"></i> Hapus
                            </button>
                          </div>
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
      <div className="modal fade" id="updateModal" tabIndex={-1} data-bs-backdrop="static">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content" style={{ 
            background: '#1a1a1a', 
            border: '2px solid #8b3a3a',
            borderRadius: '16px'
          }}>
            <div className="modal-header" style={{ 
              background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
              border: 'none',
              padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#8b3a3a',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-edit" style={{ color: 'white', fontSize: '18px' }}></i>
                </div>
                <div>
                  <h5 className="modal-title text-white" style={{ fontSize: '18px', fontWeight: 600 }}>
                    Update Problem Material
                  </h5>
                  <p style={{ color: '#aaa', fontSize: '12px', margin: '4px 0 0 0' }}>
                    {selectedProblem?.denso_pn} - {selectedProblem?.part_name}
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" style={{ opacity: 0.8 }}></button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}>
                
                {/* KOLOM KIRI */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-tasks" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      ACTION <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea 
                      className="form-control" 
                      rows={4}
                      value={editAction}
                      onChange={(e) => setEditAction(e.target.value)}
                      style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #404040', 
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                      placeholder="Tuliskan tindakan yang sudah dilakukan..."
                    />
                  </div>

                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-calendar-alt" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      DUE DATE MAX <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #404040', 
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        width: '100%'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-user" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      PIC <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editPic}
                      onChange={(e) => setEditPic(e.target.value)}
                      style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #404040', 
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        width: '100%'
                      }}
                      placeholder="Nama PIC"
                    />
                  </div>
                </div>

                {/* KOLOM KANAN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-info-circle" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      STATUS <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <select 
                      className="form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #404040', 
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        width: '100%'
                      }}
                    >
                      {selectedProblem?.status === 'Open' && (
                        <>
                          <option value="Open">🔴 Open</option>
                          <option value="In Progress">🟡 In Progress</option>
                          <option value="Closed">🟢 Closed</option>
                        </>
                      )}
                      {selectedProblem?.status === 'In Progress' && (
                        <>
                          <option value="In Progress">🟡 In Progress</option>
                          <option value="Closed">🟢 Closed</option>
                        </>
                      )}
                      {selectedProblem?.status === 'Closed' && (
                        <option value="Closed">🟢 Closed</option>
                      )}
                    </select>
                    
                    {selectedProblem?.status === 'In Progress' && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#ffc107'
                      }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Status In Progress hanya bisa diubah ke Closed
                      </div>
                    )}
                    
                    {selectedProblem?.status === 'Closed' && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(40, 167, 69, 0.1)',
                        border: '1px solid rgba(40, 167, 69, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#28a745'
                      }}>
                        <i className="fas fa-lock me-1"></i>
                        Data Closed tidak dapat diubah
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-sticky-note" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      NOTE / REMARK
                    </label>
                    <textarea 
                      className="form-control" 
                      rows={4}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #404040', 
                        color: 'white',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: '#222',
                borderRadius: '8px',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: '#aaa'
              }}>
                <i className="fas fa-clock" style={{ color: '#8b3a3a' }}></i>
                <span>
                  Created: {selectedProblem ? new Date(selectedProblem.created_at).toLocaleString('id-ID') : '-'}
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ 
              borderTop: '1px solid #333',
              padding: '16px 24px',
              background: '#151515'
            }}>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  background: '#2a2a2a', 
                  border: '1px solid #404040', 
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500
                }} 
                data-bs-dismiss="modal"
              >
                <i className="fas fa-times me-2"></i>
                Batal
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  background: '#8b3a3a', 
                  color: 'white', 
                  border: 'none',
                  padding: '10px 32px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }} 
                onClick={saveUpdate}
              >
                <i className="fas fa-save"></i>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}