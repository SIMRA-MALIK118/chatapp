'use client';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import StatusViewer from './StatusViewer';
import StatusCreator from './StatusCreator';

export default function StatusBar() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const fetchStatuses = async () => {
    try {
      const res = await api.get('/api/status');
      setGroups(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!user) return;
    fetchStatuses();
    const t = setInterval(fetchStatuses, 60000);
    return () => clearInterval(t);
  }, [user]);

  const myGroup = groups.find((g) => g.uid === user?.uid);
  const others = groups.filter((g) => g.uid !== user?.uid);

  const openViewer = (idx) => { setViewerStart(idx); setViewerOpen(true); };

  const handleDeleted = (deletedId) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        statuses: g.statuses.filter((s) => s.id !== deletedId),
      })).filter((g) => g.statuses.length > 0)
    );
  };

  const handleCreated = (newStatus) => {
    setGroups((prev) => {
      const existing = prev.find((g) => g.uid === user.uid);
      if (existing) {
        return prev.map((g) =>
          g.uid === user.uid ? { ...g, statuses: [...g.statuses, newStatus] } : g
        );
      }
      return [
        { uid: user.uid, name: profile?.name || 'Me', photoURL: profile?.photoURL || '', statuses: [newStatus] },
        ...prev,
      ];
    });
  };

  const isAllViewed = (g) =>
    g.statuses.every((s) => s.viewedBy?.includes(user?.uid));

  // Don't render the bar if there are no statuses and no own group
  const hasContent = groups.length > 0;

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 overflow-x-auto scrollbar-hide border-b border-[#2a2a45]">
        {/* My status ring */}
        <button
          onClick={() => myGroup ? openViewer(groups.findIndex(g => g.uid === user?.uid)) : setCreatorOpen(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <div className={`w-12 h-12 rounded-full p-0.5
              ${myGroup
                ? 'bg-gradient-to-tr from-purple-500 to-pink-500'
                : 'bg-[#2a2a45]'}`}>
              <div className="w-full h-full rounded-full bg-[#111128] p-0.5 overflow-hidden flex items-center justify-center">
                {profile?.photoURL
                  ? <img src={profile.photoURL} alt="me" className="w-full h-full object-cover rounded-full" />
                  : <span className="text-white font-bold text-sm">{profile?.name?.[0]?.toUpperCase() || 'M'}</span>}
              </div>
            </div>
            {!myGroup && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-600 rounded-full
                flex items-center justify-center border-2 border-[#111128]">
                <Plus className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 w-12 text-center truncate">My Status</span>
        </button>

        {/* Contact status rings */}
        {others.map((g) => {
          const allViewed = isAllViewed(g);
          const gIdx = groups.findIndex((gr) => gr.uid === g.uid);
          return (
            <button key={g.uid} onClick={() => openViewer(gIdx)}
              className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-12 h-12 rounded-full p-0.5
                ${allViewed
                  ? 'bg-[#2a2a45]'
                  : 'bg-gradient-to-tr from-purple-500 to-pink-500'}`}>
                <div className="w-full h-full rounded-full bg-[#111128] p-0.5 overflow-hidden flex items-center justify-center">
                  {g.photoURL
                    ? <img src={g.photoURL} alt={g.name} className="w-full h-full object-cover rounded-full" />
                    : <span className="text-white font-bold text-sm">{g.name?.[0]?.toUpperCase()}</span>}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 w-12 text-center truncate">{g.name}</span>
            </button>
          );
        })}

        {/* Add status button if no statuses at all */}
        {!hasContent && (
          <button onClick={() => setCreatorOpen(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0 opacity-50">
            <div className="w-12 h-12 rounded-full bg-[#1e1e3a] border-2 border-dashed border-[#2a2a45]
              flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[10px] text-gray-500">Add</span>
          </button>
        )}
      </div>

      {viewerOpen && (
        <StatusViewer
          groups={groups}
          startIndex={viewerStart}
          onClose={() => setViewerOpen(false)}
          onDeleted={handleDeleted}
        />
      )}
      {creatorOpen && (
        <StatusCreator
          onClose={() => setCreatorOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
