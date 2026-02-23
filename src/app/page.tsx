"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData(e.currentTarget);
    
    const timingDate = formData.get('timingDate') as string;
    const timingTime = formData.get('timingTime') as string;
    const timingDateTime = `${timingDate}T${timingTime}:00`;

    const data = {
      denso_pn: formData.get('densoPn'),
      part_name: formData.get('partName') || null,
      local_import: formData.get('localImport'),
      supplier_name: formData.get('supplierName') || null,
      problem: formData.get('problem'),
      timing_date_time: timingDateTime,
      action: formData.get('action') || null,
      due_date_max: formData.get('dueDateMax'),
      pic: formData.get('pic') || null,
      note_remark: formData.get('noteRemark') || null,
    };

    try {
      const { error } = await supabase
        .from('problems')
        .insert([data]);

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Data berhasil disimpan!' });
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      setMessage({ type: 'error', text: `❌ Gagal: ${errorMessage}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              📦 PROCARE
            </h1>
            <p className="text-gray-600 mt-1">Material Control Problem Resolution</p>
          </div>
          <Link 
            href="/dashboard" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-2"
          >
            📊 Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <span className="bg-indigo-100 p-2 rounded-lg">📝</span>
            Form Input Problem
          </h2>

          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 
              'bg-red-100 text-red-700 border border-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* DENSO PN */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  DENSO PN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="densoPn"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Contoh: D12345"
                />
              </div>

              {/* PART NAME */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  PART NAME
                </label>
                <input
                  type="text"
                  name="partName"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Nama part"
                />
              </div>

              {/* LOCAL / IMPORT */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  LOCAL / IMPORT <span className="text-red-500">*</span>
                </label>
                <select
                  name="localImport"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                >
                  <option value="">Pilih</option>
                  <option value="Local">Local</option>
                  <option value="Import">Import</option>
                </select>
              </div>

              {/* SUPPLIER NAME */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  SUPPLIER NAME
                </label>
                <input
                  type="text"
                  name="supplierName"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Nama supplier"
                />
              </div>

              {/* PROBLEM */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  PROBLEM <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="problem"
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Deskripsi problem..."
                />
              </div>

              {/* TIMING DATE */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  TIMING DATE <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="timingDate"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              {/* TIMING TIME */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  TIMING TIME <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="timingTime"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              {/* ACTION */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ACTION
                </label>
                <input
                  type="text"
                  name="action"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Tindakan yang diambil"
                />
              </div>

              {/* DUE DATE MAX */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  DUE DATE MAX <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dueDateMax"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              {/* PIC */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  PIC
                </label>
                <input
                  type="text"
                  name="pic"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Person in charge"
                />
              </div>

              {/* NOTE / REMARK */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  NOTE / REMARK
                </label>
                <textarea
                  name="noteRemark"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Menyimpan...
                  </span>
                ) : '🚀 Submit Problem'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          PROCARE v1.0 - Material Control Problem Resolution
        </p>
      </div>
    </main>
  );
}