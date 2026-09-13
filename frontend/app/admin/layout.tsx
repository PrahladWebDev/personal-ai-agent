'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { getSession } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    getSession().then((session) => {
      if (!session) {
        router.replace('/admin/login');
      } else {
        setChecked(true);
      }
    });
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (!checked) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}
