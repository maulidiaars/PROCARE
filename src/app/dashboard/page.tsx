"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
};

export default function Dashboard() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems();
  }, []);

  async function fetchProblems() {
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProblems(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard PROCARE</h1>
          <Link href="/" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
            ← Kembali ke Form
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">DENSO PN</th>
                <th className="px-6 py-3 text-left">Problem</th>
                <th className="px-6 py-3 text-left">Timing</th>
                <th className="px-6 py-3 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="px-6 py-4">{p.id}</td>
                  <td className="px-6 py-4">{p.denso_pn}</td>
                  <td className="px-6 py-4">{p.problem.substring(0, 50)}...</td>
                  <td className="px-6 py-4">{new Date(p.timing_date_time).toLocaleString()}</td>
                  <td className="px-6 py-4">{new Date(p.due_date_max).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}