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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';

declare global {
  interface Window {
    bootstrap: any;
  }
}

type ImageItem = {
  url: string;
  caption: string;
};

type BNFItem = {
  id: number;
  denso_pn: string;
  plant: string;
  part_name: string | null;
  local_import: string;
  supplier_name: string | null;
  description: string;
  issued_date_time: string;
  action: string | null;
  due_date_max: string;
  pic: string | null;
  note_remark: string | null;
  images: ImageItem[] | null;
  created_at: string;
  status: string;
};

const CustomBarWithLabel = (props: any) => {
  const { fill, x, y, width, height, texture, data, type, index } = props;
  
  if (!width || !height || height < 0) return null;
  
  const value = data && data[index] ? data[index][type] : 0;
  
  return (
    <g>
      <defs>
        <pattern id="diagonalPattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
        </pattern>
      </defs>
      
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="none"
      />
      
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="url(#diagonalPattern)"
        stroke="none"
      />
      
      {value > 0 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={10}
          fontWeight={700}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {value} issued
        </text>
      )}
    </g>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bnfItems, setBnfItems] = useState<BNFItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BNFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    progress: 0,
    closed: 0
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [picFilter, setPicFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [plantOptions, setPlantOptions] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  const [userPics, setUserPics] = useState<string[]>([]);

  const [selectedItem, setSelectedItem] = useState<BNFItem | null>(null);
  const [editAction, setEditAction] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const modalRef = useRef<any>(null);

  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const galleryModalRef = useRef<any>(null);

  const [showMenuModal, setShowMenuModal] = useState(false);
  const menuModalRef = useRef<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [chartData, setChartData] = useState<any[]>([]);
  
  const [pieData, setPieData] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const COLORS = {
    open: '#FFC107',
    progress: '#17A2B8',
    closed: '#28A745'
  };

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if (window.bootstrap) {
          const modalElement = document.getElementById('updateModal');
          if (modalElement && !modalRef.current) {
            modalRef.current = new window.bootstrap.Modal(modalElement);
          }
          
          const galleryModalElement = document.getElementById('galleryModal');
          if (galleryModalElement && !galleryModalRef.current) {
            galleryModalRef.current = new window.bootstrap.Modal(galleryModalElement);
          }

          const menuModalElement = document.getElementById('menuModal');
          if (menuModalElement && !menuModalRef.current) {
            menuModalRef.current = new window.bootstrap.Modal(menuModalElement);
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bnfItems, statusFilter, picFilter, plantFilter, dueFilter, searchText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, picFilter, plantFilter, dueFilter, searchText]);

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
          title: '🔄 MONTHLY CLEANUP',
          html: `
            <div style="text-align: center">
              <i class="fas fa-calendar-alt" style="font-size: 48px; color: #8b3a3a; margin-bottom: 16px;"></i>
              <p style="font-size: 16px; margin-bottom: 8px;">TODAY IS THE 1ST!</p>
              <p style="color: #aaa; font-size: 14px;">RECORDS WITH CLOSED STATUS WILL BE DELETED.</p>
              <p style="color: #28a745; font-size: 13px; margin-top: 12px;">
                <i class="fas fa-info-circle me-1"></i>
                OPEN & IN PROGRESS RECORDS ARE KEPT.
              </p>
            </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#8b3a3a',
          cancelButtonColor: '#2a2a2a',
          confirmButtonText: 'YES, CLEAN UP',
          cancelButtonText: 'LATER',
          background: '#1a1a1a',
          color: 'white'
        });

        if (result.isConfirmed) {
          await resetMonthlyData();
          localStorage.setItem('lastResetDate', today.toISOString());
          
          Swal.fire({
            icon: 'success',
            title: '✅ CLEANUP SUCCESSFUL',
            text: 'CLOSED RECORDS HAVE BEEN DELETED. ACTIVE RECORDS ARE SAFE!',
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
        title: '❌ FAILED',
        text: 'AN ERROR OCCURRED DURING CLEANUP',
        background: '#1a1a1a',
        color: 'white'
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchData(silent = false) {
    if (!silent) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('name')
        .order('name');

      if (!usersError && usersData) {
        const userNames = usersData.map(u => u.name);
        setUserPics(userNames);
      }

      const dataWithStatus = (data || []).map(item => ({
        ...item,
        status: item.status || 'Open',
        images: item.images || []
      }));

      setBnfItems(dataWithStatus);
      setFilteredItems(dataWithStatus);
      setLastUpdate(new Date().toLocaleString('en-US'));

      const open = dataWithStatus.filter(p => p.status === 'Open').length;
      const progress = dataWithStatus.filter(p => p.status === 'In Progress').length;
      const closed = dataWithStatus.filter(p => p.status === 'Closed').length;

      setStats({
        total: dataWithStatus.length,
        open,
        progress,
        closed
      });

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayStr = date.toLocaleDateString('en-US', { 
          weekday: 'short',
          day: 'numeric'
        });
        
        let openCount = 0, progressCount = 0, closedCount = 0;

        dataWithStatus.forEach(item => {
          const itemDate = new Date(item.created_at);
          if (itemDate.toDateString() === date.toDateString()) {
            if (item.status === 'Open') openCount++;
            else if (item.status === 'In Progress') progressCount++;
            else if (item.status === 'Closed') closedCount++;
          }
        });

        last7Days.push({
          date: dayStr,
          open: openCount,
          progress: progressCount,
          closed: closedCount,
          total: openCount + progressCount + closedCount
        });
      }
      setChartData(last7Days);

      const now = new Date();
      const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      setCurrentMonth(currentMonthStr);
      
      const monthData = dataWithStatus.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === now.getMonth() && 
               itemDate.getFullYear() === now.getFullYear();
      });
      
      const monthOpen = monthData.filter(p => p.status === 'Open').length;
      const monthProgress = monthData.filter(p => p.status === 'In Progress').length;
      const monthClosed = monthData.filter(p => p.status === 'Closed').length;
      
      setPieData([
        { name: 'OPEN', value: monthOpen, color: COLORS.open },
        { name: 'IN PROGRESS', value: monthProgress, color: COLORS.progress },
        { name: 'CLOSED', value: monthClosed, color: COLORS.closed }
      ].filter(item => item.value > 0));

      const existingPics = [...new Set(dataWithStatus.map(p => p.pic).filter(p => p && p !== '-'))] as string[];
      
      const allPics = [...new Set([...userPics, ...existingPics])];
      setPicOptions(allPics);

      const plants = [...new Set(dataWithStatus.map(p => p.plant).filter(p => p))] as string[];
      setPlantOptions(plants);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...bnfItems];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (picFilter !== 'all') {
      filtered = filtered.filter(p => p.pic === picFilter);
    }

    if (plantFilter !== 'all') {
      filtered = filtered.filter(p => p.plant === plantFilter);
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
        (p.plant && p.plant.toLowerCase().includes(searchLower)) ||
        (p.part_name && p.part_name.toLowerCase().includes(searchLower)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchLower)) ||
        p.description.toLowerCase().includes(searchLower) ||
        (p.pic && p.pic.toLowerCase().includes(searchLower))
      );
    }

    setFilteredItems(filtered);
  }

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

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

  function formatDateOnly(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
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
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '-';
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US');
    } catch {
      return '-';
    }
  }

  function canUpdate(currentStatus: string, newStatus: string): boolean {
    if (currentStatus === 'Closed') return false;
    
    if (newStatus === 'Closed' && currentUser?.role !== 'master') {
      return false;
    }
    
    if (currentStatus === 'In Progress') {
      return newStatus === 'Closed' && currentUser?.role === 'master';
    }
    
    if (currentStatus === 'Open') {
      if (newStatus === 'In Progress') return true;
      if (newStatus === 'Closed') return currentUser?.role === 'master';
    }
    
    return false;
  }

  function canEdit(item: BNFItem): boolean {
    if (item.status === 'Closed') return false;
    return true;
  }

  function canDelete(item: BNFItem): boolean {
    if (item.status === 'Closed') return false;
    return true;
  }

  function openGallery(images: ImageItem[]) {
    setSelectedImages(images);
    setCurrentImageIndex(0);
    if (galleryModalRef.current) {
      galleryModalRef.current.show();
    }
  }

  function openMenuModal() {
    if (menuModalRef.current) {
      menuModalRef.current.show();
    }
  }

  function getNormalizedPicName(name: string | null): string {
    if (!name || name === '-') return '';
    
    const matchedUser = userPics.find(userName => 
      userName.toLowerCase() === name.toLowerCase() ||
      userName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(userName.toLowerCase())
    );
    
    return matchedUser || name;
  }

  function openEditModal(item: BNFItem) {
    if (!canEdit(item)) {
      Swal.fire({
        icon: 'error',
        title: '❌ CANNOT EDIT',
        text: 'CLOSED RECORDS CANNOT BE MODIFIED!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    setSelectedItem(item);
    setEditAction(item.action || '');
    
    if (item.due_date_max) {
      const date = new Date(item.due_date_max);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setEditDueDate(`${year}-${month}-${day}`);
    } else {
      setEditDueDate('');
    }
    
    const normalizedPic = getNormalizedPicName(item.pic);
    setEditPic(normalizedPic || '');
    
    setEditNote(item.note_remark || '');
    setEditStatus(item.status || 'Open');
    
    if (modalRef.current) {
      modalRef.current.show();
    }
  }

  async function saveUpdate() {
    if (!selectedItem) return;
    
    if (!editAction || !editDueDate || !editPic) {
      Swal.fire({
        icon: 'warning',
        title: 'WARNING',
        text: 'ACTION, DUE DATE, DAN PIC WAJIB DIISI!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    if (editStatus && editStatus !== selectedItem.status) {
      if (!canUpdate(selectedItem.status, editStatus)) {
        let message = '';
        if (selectedItem.status === 'Closed') {
          message = 'CLOSED RECORDS CANNOT BE MODIFIED!';
        } else if (selectedItem.status === 'In Progress' && editStatus !== 'Closed') {
          message = 'IN PROGRESS STATUS CAN ONLY BE CHANGED TO CLOSED!';
        } else if (editStatus === 'Closed' && currentUser?.role !== 'master') {
          message = 'ONLY MASTER USERS CAN CHANGE STATUS TO CLOSED!';
        } else {
          message = 'STATUS CHANGE NOT ALLOWED!';
        }
        
        Swal.fire({
          icon: 'error',
          title: '❌ NOT ALLOWED',
          text: message,
          background: '#1a1a1a',
          color: 'white'
        });
        return;
      }
    }

    try {
      const updatedId = selectedItem.id;
      const scrollPosition = window.scrollY;
      
      const updateData: any = {
        action: editAction,
        due_date_max: editDueDate,
        pic: editPic,
        note_remark: editNote || null
      };

      if (editStatus && editStatus !== selectedItem.status) {
        updateData.status = editStatus;
      }

      const { error } = await supabase
        .from('problems')
        .update(updateData)
        .eq('id', selectedItem.id);

      if (error) throw error;
      
      await fetchData(true);
      
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'instant'
        });
        
        const updatedRow = document.getElementById(`row-${updatedId}`);
        if (updatedRow) {
          updatedRow.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
          
          updatedRow.classList.add('row-highlight');
          
          setTimeout(() => {
            updatedRow.classList.remove('row-highlight');
          }, 3000);
        }
      }, 100);

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });

      await Toast.fire({
        icon: 'success',
        title: editStatus && editStatus !== selectedItem.status 
          ? '✅ Updated + Status Changed!' 
          : '✅ Updated Successfully!'
      });

      if (modalRef.current) {
        modalRef.current.hide();
      }
      
      setSelectedItem(null);

    } catch (error) {
      console.error('Update error:', error);
      
      Swal.fire({
        icon: 'error',
        title: '❌ UPDATE FAILED',
        text: 'AN ERROR OCCURRED',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  async function deleteItem(id: number) {
    const item = bnfItems.find(p => p.id === id);
    
    if (item?.status === 'Closed') {
      Swal.fire({
        icon: 'error',
        title: '❌ CANNOT DELETE',
        text: 'CLOSED RECORDS CANNOT BE DELETED!',
        background: '#1a1a1a',
        color: 'white'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'DELETE CONFIRMATION',
      text: 'THIS RECORD WILL BE PERMANENTLY DELETED!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'YES, DELETE!',
      cancelButtonText: 'CANCEL',
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
          title: 'DELETED!',
          text: 'RECORD HAS BEEN DELETED',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        });

        fetchData();

      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'ERROR',
          text: 'FAILED TO DELETE RECORD',
          background: '#1a1a1a',
          color: 'white'
        });
      }
    }
  }

  async function downloadExcel() {
    const result = await Swal.fire({
      title: '📊 DOWNLOAD EXCEL',
      html: `
        <div style="text-align: left">
          <p style="color: #fff; margin-bottom: 16px;">SELECT DATA PERIOD:</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="all" checked style="cursor: pointer;"> 
              <i class="fas fa-database" style="color: #8b3a3a;"></i>
              ALL RECORDS (${filteredItems.length} RECORDS)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="month" style="cursor: pointer;"> 
              <i class="fas fa-calendar-alt" style="color: #28a745;"></i>
              THIS MONTH ONLY
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'DOWNLOAD',
      cancelButtonText: 'CANCEL',
      background: '#1a1a1a',
      color: 'white',
      preConfirm: () => {
        const selected = document.querySelector('input[name="period"]:checked') as HTMLInputElement;
        return selected?.value;
      }
    });

    if (!result.isConfirmed) return;

    const period = result.value;
    let dataToDownload = [...filteredItems];

    if (period === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      dataToDownload = filteredItems.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      });

      if (dataToDownload.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'NO DATA',
          text: 'NO RECORDS FOR THIS MONTH',
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
        ? `PERIOD: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`
        : `PERIOD: ALL RECORDS`;
      const dateGenerated = `GENERATED: ${new Date().toLocaleString('en-US').toUpperCase()}`;
      const totalData = `TOTAL RECORDS: ${dataToDownload.length}`;
      
      const wsData = [
        [title],
        [periode],
        [dateGenerated],
        [totalData],
        [],
        ['NO', 'PLANT', 'DENSO PN', 'PART NAME', 'L/I', 'SUPPLIER NAME', 'DESCRIPTION', 
         'ISSUED DATE', 'TIME', 'ACTION', 'DUE DATE', 'PIC', 'NOTE', 'IMAGES', 'STATUS']
      ];
      
      dataToDownload.forEach((item, index) => {
        wsData.push([
          String(index + 1),
          String(item.plant || '-'),
          String(item.denso_pn),
          String(item.part_name || '-'),
          String(item.local_import),
          String(item.supplier_name || '-'),
          String(item.description),
          formatDateOnly(item.issued_date_time),
          formatTimeOnly(item.issued_date_time),
          String(item.action || '-'),
          formatDateOnly(item.due_date_max),
          String(item.pic || '-'),
          String(item.note_remark || '-'),
          item.images && item.images.length > 0 ? `${item.images.length} IMAGE(S)` : '-',
          String(item.status || 'Open').toUpperCase()
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }
      ];
      
      ws['!cols'] = [
        { wch: 5 }, { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 8 },
        { wch: 30 }, { wch: 50 }, { wch: 12 }, { wch: 8 }, { wch: 50 },
        { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'BNF DATA');
      
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const fileName = period === 'month'
        ? `BNF_${new Date().getFullYear()}${month}.xlsx`
        : `BNF_ALL_${new Date().getFullYear()}${month}${new Date().getDate().toString().padStart(2, '0')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      Swal.fire({
        icon: 'success',
        title: '✅ EXCEL SUCCESS',
        html: `
          <div style="text-align: left">
            <p><i class="fas fa-file-excel me-2" style="color: #28a745;"></i> FILE: ${fileName}</p>
            <p><i class="fas fa-database me-2" style="color: #8b3a3a;"></i> RECORDS: ${dataToDownload.length}</p>
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
        title: '❌ FAILED',
        text: 'AN ERROR OCCURRED WHILE DOWNLOADING EXCEL',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  async function downloadPDF() {
    const result = await Swal.fire({
      title: '📄 DOWNLOAD PDF',
      html: `
        <div style="text-align: left">
          <p style="color: #fff; margin-bottom: 16px;">SELECT DATA PERIOD:</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="all" checked style="cursor: pointer;"> 
              <i class="fas fa-database" style="color: #8b3a3a;"></i>
              ALL RECORDS (${filteredItems.length} RECORDS)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; padding: 8px; background: #222; border-radius: 8px; cursor: pointer;">
              <input type="radio" name="period" value="month" style="cursor: pointer;"> 
              <i class="fas fa-calendar-alt" style="color: #28a745;"></i>
              THIS MONTH ONLY
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#8b3a3a',
      cancelButtonColor: '#2a2a2a',
      confirmButtonText: 'DOWNLOAD',
      cancelButtonText: 'CANCEL',
      background: '#1a1a1a',
      color: 'white',
      preConfirm: () => {
        const selected = document.querySelector('input[name="period"]:checked') as HTMLInputElement;
        return selected?.value;
      }
    });

    if (!result.isConfirmed) return;

    const period = result.value;
    let dataToDownload = [...filteredItems];

    if (period === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      dataToDownload = filteredItems.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      });

      if (dataToDownload.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'NO DATA',
          text: 'NO RECORDS FOR THIS MONTH',
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
      doc.text('BNF MATERIAL CONTROL - FOLLOW UP SYSTEM', 15, 18);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      const today = new Date();
      const periode = period === 'month'
        ? `PERIOD: ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`
        : `PERIOD: ALL RECORDS`;
      const generated = `GENERATED: ${today.toLocaleDateString('en-US').toUpperCase()} ${today.toLocaleTimeString('en-US')}`;
      const totalData = `TOTAL RECORDS: ${dataToDownload.length}`;
      
      doc.text(periode, 15, 24);
      doc.text(generated, 15, 28);
      doc.text(totalData, 15, 32);
      
      doc.setDrawColor(maroon[0], maroon[1], maroon[2]);
      doc.setLineWidth(0.3);
      doc.line(15, 35, 280, 35);
      
      const tableColumn = [
        'NO', 'PLANT', 'DENSO PN', 'PART NAME', 'L/I', 'SUPPLIER NAME', 'DESCRIPTION',
        'ISSUED DATE', 'TIME', 'ACTION', 'DUE DATE', 'PIC', 'NOTE', 'IMAGES', 'STATUS'
      ];
      
      const tableRows = dataToDownload.map((item, index) => [
        index + 1,
        item.plant || '-',
        item.denso_pn,
        item.part_name || '-',
        item.local_import,
        item.supplier_name || '-',
        item.description,
        formatDateOnly(item.issued_date_time),
        formatTimeOnly(item.issued_date_time),
        item.action || '-',
        formatDateOnly(item.due_date_max),
        item.pic || '-',
        item.note_remark || '-',
        item.images && item.images.length > 0 ? `${item.images.length} IMG` : '-',
        item.status.toUpperCase()
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 38,
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: { fillColor: maroon, textColor: 255, fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 15 },
          2: { cellWidth: 18 },
          3: { cellWidth: 20 },
          4: { cellWidth: 10 },
          5: { cellWidth: 22 },
          6: { cellWidth: 40 },
          7: { cellWidth: 15 },
          8: { cellWidth: 10 },
          9: { cellWidth: 30 },
          10: { cellWidth: 15 },
          11: { cellWidth: 15 },
          12: { cellWidth: 25 },
          13: { cellWidth: 15 },
          14: { cellWidth: 15 }
        }
      });
      
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const fileName = period === 'month'
        ? `BNF_${today.getFullYear()}${month}.pdf`
        : `BNF_ALL_${today.getFullYear()}${month}${today.getDate().toString().padStart(2, '0')}.pdf`;
      
      doc.save(fileName);
      
      Swal.fire({
        icon: 'success',
        title: '✅ PDF SUCCESS',
        html: `<p><i class="fas fa-file-pdf" style="color: #dc3545;"></i> FILE: ${fileName}</p>`,
        timer: 2000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: 'white'
      });
      
    } catch (error) {
      console.error('PDF error:', error);
      Swal.fire({
        icon: 'error',
        title: '❌ FAILED',
        text: 'AN ERROR OCCURRED WHILE DOWNLOADING PDF',
        background: '#1a1a1a',
        color: 'white'
      });
    }
  }

  const navigateTo = (path: string) => {
    if (menuModalRef.current) {
      menuModalRef.current.hide();
    }
    router.push(path);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #8b3a3a',
          borderRadius: '8px',
          padding: '10px',
          color: 'white'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '2px 0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')) {
      return;
    }

    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeft(tableContainerRef.current.scrollLeft);
    tableContainerRef.current.style.cursor = 'grabbing';
    tableContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseUp = () => {
    if (!tableContainerRef.current || !isDragging) return;
    
    setIsDragging(false);
    tableContainerRef.current.style.cursor = 'grab';
    tableContainerRef.current.style.userSelect = 'auto';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    
    e.preventDefault();
    
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    if (isDragging && tableContainerRef.current) {
      setIsDragging(false);
      tableContainerRef.current.style.cursor = 'grab';
      tableContainerRef.current.style.userSelect = 'auto';
    }
  };

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
            <span className="visually-hidden">LOADING...</span>
          </div>
          <div style={{ color: '#aaa' }}>LOADING DATA...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      <div style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
        borderBottom: '1px solid rgba(139, 58, 58, 0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <h1 style={{ 
                fontSize: '18px',
                fontWeight: 700,
                color: 'white',
                margin: 0
              }}>
                BNF DASHBOARD - Material Control
              </h1>
              <p style={{ color: '#aaa', fontSize: '10px', margin: '2px 0 0 0' }}>
                <i className="far fa-clock me-1"></i>LAST UPDATE: {lastUpdate || '-'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <div className="dropdown" style={{ cursor: 'pointer' }}>
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
      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '16px' }}>
        
        <div style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          marginBottom: '20px',
          borderRadius: '16px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '20px',
            minWidth: '1000px',
          }}>
            
            <div style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #333',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
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
                    7-DAY PERFORMANCE TREND
                  </h4>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>
                    <i className="far fa-calendar-alt me-1"></i>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      background: 'repeating-linear-gradient(45deg, #FFC107, #FFC107 4px, #e6a800 4px, #e6a800 8px)',
                      borderRadius: '3px',
                      boxShadow: '0 0 8px #FFC107'
                    }}></div>
                    <span style={{ color: '#ccc', fontSize: '11px' }}>OPEN</span>
                    <span style={{ color: '#ffc107', fontSize: '12px', fontWeight: 600 }}>
                      {stats.open}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      background: 'repeating-linear-gradient(45deg, #17A2B8, #17A2B8 4px, #138496 4px, #138496 8px)',
                      borderRadius: '3px',
                      boxShadow: '0 0 8px #17A2B8'
                    }}></div>
                    <span style={{ color: '#ccc', fontSize: '11px' }}>IN PROGRESS</span>
                    <span style={{ color: '#17a2b8', fontSize: '12px', fontWeight: 600 }}>
                      {stats.progress}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      background: 'repeating-linear-gradient(45deg, #28A745, #28A745 4px, #1e7e34 4px, #1e7e34 8px)',
                      borderRadius: '3px',
                      boxShadow: '0 0 8px #28A745'
                    }}></div>
                    <span style={{ color: '#ccc', fontSize: '11px' }}>CLOSED</span>
                    <span style={{ color: '#28a745', fontSize: '12px', fontWeight: 600 }}>
                      {stats.closed}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ 
                width: '100%', 
                height: '350px',
                minWidth: '600px',
                position: 'relative'
              }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={chartData} 
                    margin={{ top: 30, right: 30, left: 0, bottom: 20 }}
                    barGap={0}
                    barCategoryGap={10}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#333" 
                      vertical={false}
                    />
                    
                    <XAxis 
                      dataKey="date" 
                      stroke="#aaa"
                      tick={{ fill: '#ccc', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#404040' }}
                      tickLine={{ stroke: '#404040' }}
                    />
                    
                    <YAxis 
                      stroke="#aaa"
                      tick={{ fill: '#ccc', fontSize: 11 }}
                      axisLine={{ stroke: '#404040' }}
                      tickLine={{ stroke: '#404040' }}
                      allowDecimals={false}
                    />
                    
                    <Bar 
                      dataKey="open" 
                      stackId="a"
                      fill="#FFC107"
                      shape={<CustomBarWithLabel texture="diagonal" color="#FFC107" data={chartData} type="open" />}
                    />
                    
                    <Bar 
                      dataKey="progress" 
                      stackId="a"
                      fill="#17A2B8"
                      shape={<CustomBarWithLabel texture="diagonal" color="#17A2B8" data={chartData} type="progress" />}
                    />
                    
                    <Bar 
                      dataKey="closed" 
                      stackId="a"
                      fill="#28A745"
                      shape={<CustomBarWithLabel texture="diagonal" color="#28A745" data={chartData} type="closed" />}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #8b3a3a, #c44a4a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(139,58,58,0.3)'
                  }}>
                    <i className="fas fa-chart-pie" style={{ color: 'white', fontSize: '14px' }}></i>
                  </div>
                  <div>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>SUMMARY</span>
                    <div style={{ color: '#666', fontSize: '11px' }}>LIVE OVERVIEW</div>
                  </div>
                </div>
                <div style={{
                  background: '#222',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  border: '1px solid #333'
                }}>
                  <span style={{ color: '#8b3a3a', fontSize: '11px', fontWeight: 500 }}>
                    <i className="fas fa-circle me-1" style={{ fontSize: '6px' }}></i>
                    LIVE
                  </span>
                </div>
              </div>

              <div style={{
                background: '#222',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #333',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#aaa', fontSize: '12px' }}>COMPLETION RATE</span>
                  <span style={{ color: 'white', fontSize: '24px', fontWeight: 700 }}>
                    {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: '#2a2a2a',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                }}>
                  <div style={{
                    width: `${stats.total > 0 ? (stats.closed / stats.total) * 100 : 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #28a745, #5cb85c)',
                    borderRadius: '5px',
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 10px rgba(40,167,69,0.5)'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#666', fontSize: '10px' }}>
                  <span>CLOSED: {stats.closed}</span>
                  <span>TOTAL: {stats.total}</span>
                </div>
              </div>

              <div style={{
                background: '#222',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #333',
                marginTop: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>
                    <i className="fas fa-chart-pie me-2" style={{ color: '#8b3a3a' }}></i>
                    {currentMonth}
                  </span>
                  <span style={{ color: '#aaa', fontSize: '11px' }}>
                    {pieData.reduce((sum, item) => sum + item.value, 0)} total
                  </span>
                </div>

                {pieData.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '120px', height: '120px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                            label={renderCustomizedLabel}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      {pieData.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: index < pieData.length - 1 ? '1px solid #333' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', background: item.color, borderRadius: '3px' }}></div>
                            <span style={{ color: '#ccc', fontSize: '11px' }}>{item.name}</span>
                          </div>
                          <div>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>{item.value}</span>
                            <span style={{ color: '#666', fontSize: '10px', marginLeft: '4px' }}>
                              ({((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    <i className="fas fa-chart-pie" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}></i>
                    <p style={{ fontSize: '12px' }}>No data this month</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #333' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>STATUS</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">ALL STATUS</option>
                <option value="Open">OPEN</option>
                <option value="In Progress">IN PROGRESS</option>
                <option value="Closed">CLOSED</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>PIC</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={picFilter} onChange={(e) => setPicFilter(e.target.value)}>
                <option value="all">ALL PIC</option>
                {userPics.map(pic => (
                  <option key={pic} value={pic}>{pic}</option>
                ))}
                {picOptions.filter(pic => !userPics.includes(pic)).map(pic => (
                  <option key={pic} value={pic} style={{ color: '#ffc107' }}>
                    {pic} (legacy)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>PLANT</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
                <option value="all">ALL PLANT</option>
                {plantOptions.map(plant => <option key={plant} value={plant}>{plant}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>DUE DATE</label>
              <select className="form-select" style={{ background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontSize: '14px' }} value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
                <option value="all">ALL</option>
                <option value="overdue">OVERDUE</option>
                <option value="warning">WARNING (≤3 DAYS)</option>
                <option value="safe">SAFE</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px', display: 'block' }}>SEARCH</label>
              <input type="text" placeholder="PN, PART, DESCRIPTION..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: '100%', background: '#2a2a2a', border: '1px solid #404040', color: 'white', padding: '10px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}/>
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #333',
          padding: '20px'
        }}>
          
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
              BNF RECORDS LIST
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
                title="DOWNLOAD EXCEL"
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
                title="DOWNLOAD PDF"
              >
                <i className="fas fa-file-pdf"></i>
              </button>
            </div>
          </div>
          
          <div 
            ref={tableContainerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ 
              overflowX: 'auto',
              overflowY: 'visible',
              border: '1px solid #333',
              borderRadius: '8px',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: isDragging ? 'none' : 'auto',
              WebkitUserSelect: isDragging ? 'none' : 'auto',
              position: 'relative'
            }}
          >
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '1800px',
              color: 'white',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#2a2a2a' }}>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '40px' }}>NO</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '80px' }}>PLANT</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>DENSO PN</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>PART NAME</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '60px' }}>L/I</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '150px' }}>SUPPLIER NAME</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '200px' }}>DESCRIPTION</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '130px' }}>ISSUED DATE</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '250px' }}>ACTION</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>DUE DATE</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>PIC</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>NOTE</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>IMAGES</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '100px' }}>STATUS</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040', width: '120px' }}>OPTIONS</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ 
                      textAlign: 'center', 
                      padding: '60px 20px', 
                      color: '#666',
                      border: '1px solid #404040'
                    }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '40px', marginBottom: '16px', color: '#8b3a3a' }}></i>
                      <p>NO RECORDS FOUND</p>
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

                    let plantColor = '';
                    let plantBg = '';
                    if (item.plant === 'FAJAR') {
                      plantColor = '#ffc107';
                      plantBg = '#ffc10720';
                    } else if (item.plant === 'BEKASI') {
                      plantColor = '#17a2b8';
                      plantBg = '#17a2b820';
                    } else if (item.plant === 'SIP') {
                      plantColor = '#28a745';
                      plantBg = '#28a74520';
                    } else {
                      plantColor = '#8b3a3a';
                      plantBg = '#8b3a3a20';
                    }
                    
                    const isPicValid = item.pic && userPics.includes(item.pic);
                    
                    return (
                      <tr 
                        key={item.id} 
                        id={`row-${item.id}`}
                        style={{ background: index % 2 === 0 ? '#1a1a1a' : '#222' }}
                      >
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{rowIndex}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <span style={{
                            background: plantBg,
                            color: plantColor,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block',
                            minWidth: '70px',
                            border: `1px solid ${plantColor}40`
                          }}>
                            {item.plant || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.denso_pn}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.part_name || '-'}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.local_import}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.supplier_name || '-'}</td>
                        
                        <td style={{ 
                          padding: '12px 4px', 
                          textAlign: 'left', 
                          border: '1px solid #404040',
                          whiteSpace: 'pre-line',
                          lineHeight: '1.5'
                        }}>
                          {item.description}
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <i className="far fa-calendar-alt" style={{ fontSize: '10px', color: '#8b3a3a' }}></i>
                              <span>{formatDateOnly(item.issued_date_time)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <i className="far fa-clock" style={{ fontSize: '10px', color: '#8b3a3a' }}></i>
                              <span style={{ fontSize: '11px', color: '#ccc' }}>{formatTimeOnly(item.issued_date_time)}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td style={{ 
                          padding: '12px 4px', 
                          textAlign: 'left', 
                          border: '1px solid #404040',
                          whiteSpace: 'pre-line',
                          lineHeight: '1.5'
                        }}>
                          {item.action || '-'}
                        </td>
                        
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
                        
                        <td style={{ 
                          padding: '12px 4px', 
                          textAlign: 'center', 
                          border: '1px solid #404040',
                          color: isPicValid ? 'white' : '#ffc107',
                          fontWeight: isPicValid ? 400 : 600
                        }}>
                          {item.pic || '-'}
                          {!isPicValid && item.pic && (
                            <i className="fas fa-exclamation-triangle ms-1" style={{ color: '#ffc107', fontSize: '10px' }} title="Legacy PIC"></i>
                          )}
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>{item.note_remark || '-'}</td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          {item.images && item.images.length > 0 ? (
                            <button
                              onClick={() => openGallery(item.images!)}
                              style={{
                                background: '#00449c',
                                border: 'none',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                margin: '0 auto'
                              }}
                            >
                              <i className="fas fa-images"></i>
                              {item.images.length} views
                            </button>
                          ) : (
                            <span style={{ color: '#666', fontSize: '11px' }}>-</span>
                          )}
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <span style={{ 
                            background: statusColor,
                            color: statusText,
                            padding: '3px 6px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block',
                            minWidth: '90px'
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        
                        <td style={{ padding: '12px 4px', textAlign: 'center', border: '1px solid #404040' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              style={{ 
                                background: canEdit(item) ? '#8b3a3a' : '#444',
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: canEdit(item) ? 'pointer' : 'not-allowed',
                                opacity: canEdit(item) ? 1 : 0.5,
                                fontSize: '12px',
                                minWidth: '60px'
                              }}
                              onClick={() => canEdit(item) && openEditModal(item)}
                              disabled={!canEdit(item)}
                            >
                              <i className="fas fa-edit me-1"></i> EDIT
                            </button>
                            <button 
                              style={{ 
                                background: canDelete(item) ? '#dc3545' : '#444',
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: canDelete(item) ? 'pointer' : 'not-allowed',
                                opacity: canDelete(item) ? 1 : 0.5,
                                fontSize: '12px',
                                minWidth: '60px'
                              }}
                              onClick={() => canDelete(item) && deleteItem(item.id)}
                              disabled={!canDelete(item)}
                            >
                              <i className="fas fa-trash me-1"></i> DELETE
                            </button>
                          </div>
                          {item.status === 'Closed' && (
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                              <i className="fas fa-lock"></i> LOCKED
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {!isDragging && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '20px',
                background: 'rgba(139, 58, 58, 0.9)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                pointerEvents: 'none',
                opacity: 0.7,
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
                zIndex: 100
              }}>
                <i className="fas fa-arrows-alt-h me-2"></i>
                Drag to scroll
              </div>
            )}
          </div>
          
          {filteredItems.length > 0 && (
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
                {startIndex + 1} - {Math.min(endIndex, filteredItems.length)} OF {filteredItems.length}
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
                  PREVIOUS
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
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                    UPDATE BNF RECORD
                  </h5>
                  <p style={{ color: '#aaa', fontSize: '12px', margin: '4px 0 0 0' }}>
                    {selectedItem?.denso_pn} - {selectedItem?.part_name}
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
                      placeholder="WRITE THE ACTION TAKEN..."
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
                    <select
                      className="form-select"
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
                    >
                      <option value="">SELECT PIC</option>
                      {userPics.map(pic => (
                        <option key={pic} value={pic}>{pic}</option>
                      ))}
                      {editPic && !userPics.includes(editPic) && (
                        <option value={editPic} style={{ color: '#ffc107' }}>
                          {editPic} (existing)
                        </option>
                      )}
                    </select>
                    <p style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                      <i className="fas fa-info-circle me-1"></i>
                      Pilih PIC dari daftar staff
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#ccc', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-info-circle" style={{ color: '#c44a4a', fontSize: '12px' }}></i>
                      STATUS
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
                      {selectedItem?.status === 'Open' && (
                        <>
                          <option value="Open">🔴 OPEN</option>
                          <option value="In Progress">🟡 IN PROGRESS</option>
                          {currentUser?.role === 'master' && (
                            <option value="Closed">🟢 CLOSED</option>
                          )}
                        </>
                      )}
                      {selectedItem?.status === 'In Progress' && (
                        <>
                          <option value="In Progress">🟡 IN PROGRESS</option>
                          {currentUser?.role === 'master' && (
                            <option value="Closed">🟢 CLOSED</option>
                          )}
                        </>
                      )}
                      {selectedItem?.status === 'Closed' && (
                        <option value="Closed">🟢 CLOSED</option>
                      )}
                    </select>
                    
                    <p style={{ color: '#aaa', fontSize: '11px', marginTop: '6px' }}>
                      <i className="fas fa-info-circle me-1"></i>
                      Kosongkan jika tidak ingin mengubah status
                    </p>
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
                      placeholder="ADDITIONAL NOTES..."
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
                  CREATED: {selectedItem ? new Date(selectedItem.created_at).toLocaleString('en-US').toUpperCase() : '-'}
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
                CANCEL
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  background: selectedItem?.status === 'Closed' ? '#444' : '#8b3a3a',
                  color: 'white', 
                  border: 'none',
                  padding: '10px 32px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: selectedItem?.status === 'Closed' ? 0.5 : 1,
                  cursor: selectedItem?.status === 'Closed' ? 'not-allowed' : 'pointer'
                }} 
                onClick={saveUpdate}
                disabled={selectedItem?.status === 'Closed'}
              >
                <i className="fas fa-save"></i>
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="galleryModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content" style={{ 
            background: '#1a1a1a', 
            border: '2px solid #8b3a3a',
            borderRadius: '16px'
          }}>
            <div className="modal-header" style={{ 
              background: 'linear-gradient(135deg, #2c0b0b 0%, #4a1a1a 100%)',
              border: 'none',
              padding: '16px 24px'
            }}>
              <h5 className="modal-title text-white">
                <i className="fas fa-images me-2" style={{ color: '#c44a4a' }}></i>
                IMAGE GALLERY ({selectedImages.length} PHOTOS)
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {selectedImages.length > 0 ? (
                <div>
                  <div 
                    style={{ 
                      position: 'relative', 
                      marginBottom: '20px',
                      minHeight: '400px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0a0a0a',
                      borderRadius: '8px',
                      padding: '20px'
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        setCurrentImageIndex(prev => 
                          prev === 0 ? selectedImages.length - 1 : prev - 1
                        );
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        setCurrentImageIndex(prev => 
                          prev === selectedImages.length - 1 ? 0 : prev + 1
                        );
                      }
                    }}
                  >
                    {selectedImages.length > 1 && (
                      <button
                        onClick={() => setCurrentImageIndex(prev => 
                          prev === 0 ? selectedImages.length - 1 : prev - 1
                        )}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '20px',
                          background: 'rgba(0,0,0,0.7)',
                          border: '2px solid #8b3a3a',
                          color: 'white',
                          fontSize: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#8b3a3a';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        }}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      minHeight: '350px'
                    }}>
                      <img 
                        src={selectedImages[currentImageIndex]?.url} 
                        alt={`Image ${currentImageIndex + 1}`}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          border: '1px solid #333'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const errorDiv = document.createElement('div');
                            errorDiv.style.padding = '40px';
                            errorDiv.style.color = '#666';
                            errorDiv.style.textAlign = 'center';
                            errorDiv.innerHTML = '<i class="fas fa-image-slash" style="font-size: 48px; margin-bottom: 16px;"></i><p>IMAGE FAILED TO LOAD</p>';
                            parent.appendChild(errorDiv);
                          }
                        }}
                      />
                    </div>

                    {selectedImages.length > 1 && (
                      <button
                        onClick={() => setCurrentImageIndex(prev => 
                          prev === selectedImages.length - 1 ? 0 : prev + 1
                        )}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '20px',
                          background: 'rgba(0,0,0,0.7)',
                          border: '2px solid #8b3a3a',
                          color: 'white',
                          fontSize: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#8b3a3a';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        }}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    )}
                  </div>

                  {selectedImages[currentImageIndex]?.caption && (
                    <div style={{
                      marginTop: '16px',
                      marginBottom: '20px',
                      padding: '12px 20px',
                      background: '#222',
                      borderRadius: '12px',
                      color: '#ccc',
                      fontSize: '14px',
                      textAlign: 'center',
                      border: '1px solid #333',
                      width: '100%'
                    }}>
                      <i className="fas fa-quote-right me-2" style={{ color: '#8b3a3a' }}></i>
                      {selectedImages[currentImageIndex].caption}
                    </div>
                  )}

                  {selectedImages.length > 1 && (
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      overflowX: 'auto',
                      padding: '10px 0',
                      justifyContent: 'center',
                      marginTop: '10px'
                    }}>
                      {selectedImages.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          style={{
                            cursor: 'pointer',
                            border: idx === currentImageIndex ? '2px solid #8b3a3a' : '2px solid transparent',
                            borderRadius: '6px',
                            padding: '2px',
                            background: idx === currentImageIndex ? '#8b3a3a20' : 'transparent'
                          }}
                        >
                          <img 
                            src={img.url} 
                            alt={`Thumb ${idx + 1}`}
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #333'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <i className="fas fa-image-slash" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                  <p>NO IMAGES AVAILABLE</p>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #333', padding: '16px 24px' }}>
              <button type="button" className="btn" style={{ 
                background: '#2a2a2a', 
                border: '1px solid #404040', 
                color: 'white',
                padding: '8px 24px',
                borderRadius: '8px'
              }} data-bs-dismiss="modal">
                CLOSE
              </button>
              {selectedImages.length > 0 && (
                <a 
                  href={selectedImages[currentImageIndex]?.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: '#8b3a3a',
                    color: 'white',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fas fa-external-link-alt me-2"></i>
                  OPEN ORIGINAL
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}