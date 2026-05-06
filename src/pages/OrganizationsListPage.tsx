import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, TrendingUp, Users, Clock, RefreshCw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrgStat {
  orgId: string;
  orgName: string;
  totalMeals: number;
  donationCount: number;
  lastReceived: number;
}

type Period = 'today' | 'month' | 'all';

function startOfDay()   { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); }

const RANK_STYLE = [
  { ring: 'ring-yellow-500', num: 'text-yellow-400', badge: '🥇' },
  { ring: 'ring-slate-400',  num: 'text-slate-300',  badge: '🥈' },
  { ring: 'ring-orange-500', num: 'text-orange-400', badge: '🥉' },
];

export default function OrganizationsListPage() {
  const navigate = useNavigate();
  const [period, setPeriod]             = useState<Period>('month');
  const [allDonations, setAllDonations] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchDonations = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'donations'));
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setAllDonations(list);
    } catch (err) {
      console.error('OrganizationsListPage:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const buildBoard = (): OrgStat[] => {
    const cutoff = period === 'today' ? startOfDay() : period === 'month' ? startOfMonth() : 0;
    const map: Record<string, OrgStat> = {};
    allDonations
      .filter((d) => (d.createdAt || 0) >= cutoff && (d.reservedByorganizationsId || d.organizationName))
      .forEach((d) => {
        const key = d.reservedByorganizationsId || d.organizationName || 'unknown';
        if (!map[key]) map[key] = { orgId: key, orgName: d.organizationName || 'Unknown Organization', totalMeals: 0, donationCount: 0, lastReceived: 0 };
        map[key].totalMeals    += d.quantityInMeals || 0;
        map[key].donationCount += 1;
        if ((d.createdAt || 0) > map[key].lastReceived) map[key].lastReceived = d.createdAt;
      });
    return Object.values(map).sort((a, b) => b.totalMeals - a.totalMeals);
  };

  const board       = buildBoard();
  const totalMeals  = board.reduce((s, o) => s + o.totalMeals, 0);
  const periodLabel = period === 'today' ? 'Today' : period === 'month' ? 'This Month' : 'All Time';

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', color: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ background: '#161616', borderBottom: '1px solid #2a2a2a' }} className="px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-6 text-sm font-medium" style={{ color: '#888' }}>
            <ArrowLeft size={16} /> Back to Home
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy size={28} style={{ color: '#a3a3a3' }} />
                <h1 className="text-3xl font-black tracking-tight">Top Organizations</h1>
              </div>
              <p style={{ color: '#666' }} className="text-sm">Ranked by meals received · {periodLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }} className="rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-black">{totalMeals.toLocaleString()}</p>
                <p className="text-xs" style={{ color: '#666' }}>Total Meals</p>
              </div>
              <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }} className="rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-black">{board.length}</p>
                <p className="text-xs" style={{ color: '#666' }}>Organizations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex gap-2">
            {(['today', 'month', 'all'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={period === p
                  ? { background: '#fff', color: '#000' }
                  : { background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
                className="px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 hover:opacity-80"
              >
                {p === 'today' ? 'Today' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchDonations(true)}
            disabled={refreshing}
            style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#888' }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-56 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent" />
            <p style={{ color: '#555' }} className="text-sm">Loading…</p>
          </div>
        ) : board.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto mb-4" style={{ color: '#333' }} />
            <h3 className="text-lg font-bold" style={{ color: '#555' }}>
              No organization activity {period === 'today' ? 'today' : period === 'month' ? 'this month' : 'yet'}
            </h3>
            <p className="text-sm mt-1" style={{ color: '#444' }}>Switch to "All Time" to see all records.</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              {board.slice(0, 3).map((o, i) => {
                const r = RANK_STYLE[i];
                return (
                  <div
                    key={o.orgId}
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    className={`rounded-2xl p-6 text-center ring-1 ${r.ring} ${i === 0 ? 'md:order-2 md:scale-105' : i === 1 ? 'md:order-1' : 'md:order-3'}`}
                  >
                    <div className="text-4xl mb-3">{r.badge}</div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${r.num}`}>Rank #{i + 1}</p>
                    <h3 className="text-lg font-black text-white mb-4 leading-tight">{o.orgName}</h3>
                    <div style={{ background: '#111', border: '1px solid #2a2a2a' }} className="rounded-xl p-3">
                      <p className="text-3xl font-black text-white">{o.totalMeals.toLocaleString()}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#555' }}>meals received</p>
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#444' }}>
                      {o.donationCount} donation{o.donationCount !== 1 ? 's' : ''} accepted
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Rest */}
            {board.length > 3 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} style={{ color: '#444' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#444' }}>Remaining Rankings</span>
                </div>
                <div className="space-y-2">
                  {board.slice(3).map((o, i) => (
                    <div
                      key={o.orgId}
                      style={{ background: '#161616', border: '1px solid #222' }}
                      className="flex items-center gap-4 rounded-xl p-4 hover:border-zinc-600 transition-all"
                    >
                      <span className="w-8 text-center font-black text-sm" style={{ color: '#444' }}>{i + 4}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{o.orgName}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#555' }}>{o.donationCount} donations accepted</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white">{o.totalMeals.toLocaleString()}</p>
                        <p className="text-xs" style={{ color: '#555' }}>meals</p>
                      </div>
                      {o.lastReceived > 0 && (
                        <p className="hidden md:flex items-center gap-1 text-xs" style={{ color: '#444' }}>
                          <Clock size={10} />
                          {new Date(o.lastReceived).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
