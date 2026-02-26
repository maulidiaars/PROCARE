"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function SessionTimeout({ timeoutMinutes = 5 }: { timeoutMinutes?: number }) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const timerIntervalRef = useRef<NodeJS.Timeout>();

  const logout = () => {
    // Bersihkan semua timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const showWarning = () => {
    Swal.fire({
      title: '⏰ SESSION AKAN BERAKHIR',
      html: `
        <div style="text-align: center">
          <i class="fas fa-clock" style="font-size: 48px; color: #ffc107; margin-bottom: 16px;"></i>
          <p style="font-size: 16px; margin-bottom: 8px; color: white;">Anda tidak aktif selama 5 menit</p>
          <p style="color: #ffc107; font-size: 18px; font-weight: bold; margin-bottom: 16px;">
            ⏳ <span id="countdown">60</span> detik
          </p>
          <p style="color: #aaa; font-size: 13px;">Klik "Tetap Login" untuk melanjutkan sesi</p>
        </div>
      `,
      timer: 60000, // 1 menit
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: '✅ Tetap Login',
      confirmButtonColor: '#8b3a3a',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: '#1a1a1a',
      color: 'white',
      didOpen: () => {
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
          timerIntervalRef.current = setInterval(() => {
            const timeLeft = Swal.getTimerLeft();
            if (timeLeft) {
              countdownEl.textContent = Math.ceil(timeLeft / 1000).toString();
            }
          }, 100);
        }
      },
      willClose: () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        resetTimer();
      }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
        // Logout otomatis setelah 1 menit
        Swal.fire({
          title: '🔒 SESSION BERAKHIR',
          html: `
            <div style="text-align: center">
              <i class="fas fa-sign-out-alt" style="font-size: 48px; color: #8b3a3a; margin-bottom: 16px;"></i>
              <p style="color: white; margin-bottom: 8px;">Anda telah logout karena tidak ada aktivitas</p>
              <p style="color: #aaa; font-size: 13px;">Silakan login kembali</p>
            </div>
          `,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        }).then(() => {
          logout();
        });
      }
    });
  };

  const resetTimer = () => {
    // Hapus timer yang lama
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Cek apakah user masih login
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;

    // Set timer baru
    const warningTime = (timeoutMinutes * 60 * 1000) - 60000; // 1 menit sebelum habis
    const logoutTime = timeoutMinutes * 60 * 1000;

    warningRef.current = setTimeout(showWarning, warningTime);
    timeoutRef.current = setTimeout(logout, logoutTime);
    
    console.log(`Timer reset: warning in ${warningTime/1000}s, logout in ${logoutTime/1000}s`); // DEBUG
  };

  useEffect(() => {
    // Event yang dianggap sebagai "aktivitas"
    const events = [
      'mousedown', 'keydown', 'scroll', 'mousemove', 
      'touchstart', 'click', 'wheel'
    ];
    
    const handleActivity = () => {
      console.log('Activity detected!'); // DEBUG
      resetTimer();
    };

    // Cek login status
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      console.log('No user logged in'); // DEBUG
      return;
    }

    console.log('Session timeout initialized'); // DEBUG

    // Reset timer setiap ada aktivitas
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Set timer pertama kali
    resetTimer();

    // Cleanup
    return () => {
      console.log('Cleaning up session timeout'); // DEBUG
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timeoutMinutes]);

  return null; // Komponen ini gak render apa-apa
}