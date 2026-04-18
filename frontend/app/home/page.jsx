'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ForwardModal from '@/components/ForwardModal';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a14]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="flex flex-col bg-[#0a0a14] relative overflow-hidden" style={{ height: '100svh' }}>
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <ChatWindow />
        </div>
        <ForwardModal />
      </div>
    </ChatProvider>
  );
}
