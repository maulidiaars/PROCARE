// src/components/SessionTimeout.tsx

"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function SessionTimeout({ timeoutMinutes = 5 }: { timeoutMinutes?: number }) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // ← PERBAIKAN: kasih null
  const warningRef = useRef<NodeJS.Timeout | null>(null); // ← PERBAIKAN: kasih null
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // ← PERBAIKAN: kasih null

  const resetTimer = () => {
    // Clear semua timer yang ada
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // Set warning muncul 1 menit sebelum timeout
    const warningTime = (timeoutMinutes - 1) * 60 * 1000;
    const logoutTime = timeoutMinutes * 60 * 1000;

    // Timer untuk warning
    warningRef.current = setTimeout(() => {
      let timerLeft = 60; // 60 detik countdown
      
      Swal.fire({
        title: '⚠️ SESSION EXPIRING',
        html: `
          <div style="text-align: center">
            <p style="color: #ffc107; margin-bottom: 16px; font-size: 16px;">
              <i class="fas fa-clock"></i> Your session will expire in:
            </p>
            <div style="
              background: #2a2a2a;
              border-radius: 50%;
              width: 100px;
              height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              border: 3px solid #8b3a3a;
            ">
              <span id="timer" style="
                color: #ffc107;
                font-size: 36px;
                font-weight: 700;
              ">60</span>
            </div>
            <p style="color: #aaa; font-size: 13px;">
              Click "Extend Session" to continue working
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8b3a3a',
        cancelButtonColor: '#2a2a2a',
        confirmButtonText: '🔋 EXTEND SESSION',
        cancelButtonText: '🚪 LOGOUT NOW',
        background: '#1a1a1a',
        color: 'white',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          // Update timer setiap detik
          timerIntervalRef.current = setInterval(() => {
            timerLeft -= 1;
            const timerElement = document.getElementById('timer');
            if (timerElement) {
              timerElement.textContent = timerLeft.toString();
            }

            if (timerLeft <= 0) {
              clearInterval(timerIntervalRef.current!);
            }
          }, 1000);
        }
      }).then((result) => {
        clearInterval(timerIntervalRef.current!);
        
        if (result.isConfirmed) {
          // Extend session - reset timer
          resetTimer();
        } else {
          // Logout
          localStorage.removeItem('currentUser');
          router.push('/login');
          
          Swal.fire({
            icon: 'info',
            title: 'Logged Out',
            text: 'Your session has ended',
            timer: 1500,
            showConfirmButton: false,
            background: '#1a1a1a',
            color: 'white'
          });
        }
      });
    }, warningTime);

    // Timer untuk auto logout
    timeoutRef.current = setTimeout(() => {
      // Cek apakah user masih login
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        localStorage.removeItem('currentUser');
        
        Swal.fire({
          icon: 'info',
          title: 'Session Expired',
          text: 'You have been logged out due to inactivity',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: 'white'
        }).then(() => {
          router.push('/login');
        });
      }
    }, logoutTime);
  };

  useEffect(() => {
    // Event listener untuk aktivitas user
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Setup timer awal
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timeoutMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // Component ini tidak render apa-apa
}