import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import { AdminUserListItem } from '../../types';

interface UserGrowthAnalyticsProps {
  users: AdminUserListItem[];
}

type TimeframeOption = 'ALL_TIME' | 'LAST_30_DAYS' | 'LAST_7_DAYS';

export const UserGrowthAnalytics: React.FC<UserGrowthAnalyticsProps> = ({ users }) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('ALL_TIME');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Filter out any demo accounts and parse valid join timestamps
  const parsedRealUsers = useMemo(() => {
    return users
      .filter(u => {
        if (!u.email) return false;
        const email = u.email.toLowerCase();
        return !email.includes('@demo.com') && !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(u.id);
      })
      .map(u => {
        let dateObj: Date;
        try {
          dateObj = new Date(u.joinedDate);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }
        } catch {
          dateObj = new Date();
        }
        return {
          ...u,
          parsedDate: dateObj,
          dateKey: dateObj.toISOString().split('T')[0], // YYYY-MM-DD
        };
      })
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [users]);

  // Key metrics calculation
  const metrics = useMemo(() => {
    const totalUsers = parsedRealUsers.length;
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const newToday = parsedRealUsers.filter(u => u.parsedDate >= startOfToday).length;
    const newThisWeek = parsedRealUsers.filter(u => u.parsedDate >= sevenDaysAgo).length;
    const newThisMonth = parsedRealUsers.filter(u => u.parsedDate >= thirtyDaysAgo).length;

    // Previous 30-day period for comparison
    const newPreviousMonth = parsedRealUsers.filter(u => u.parsedDate >= sixtyDaysAgo && u.parsedDate < thirtyDaysAgo).length;

    let growthStatus: 'GROWING_FAST' | 'STEADY_GROWTH' | 'STABLE' | 'INITIALIZING' = 'STEADY_GROWTH';
    if (totalUsers === 0) {
      growthStatus = 'INITIALIZING';
    } else if (newThisWeek >= 5 || newThisMonth > newPreviousMonth) {
      growthStatus = 'GROWING_FAST';
    } else if (newThisMonth > 0) {
      growthStatus = 'STEADY_GROWTH';
    } else {
      growthStatus = 'STABLE';
    }

    return {
      totalUsers,
      newToday,
      newThisWeek,
      newThisMonth,
      newPreviousMonth,
      growthStatus
    };
  }, [parsedRealUsers]);

  // Aggregate user growth timeline
  const chartData = useMemo(() => {
    if (parsedRealUsers.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate: Date;

    if (timeframe === 'LAST_7_DAYS') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'LAST_30_DAYS') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // All time: start from the earliest user's date or 14 days ago
      const earliest = parsedRealUsers[0]?.parsedDate || new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      startDate = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    }

    // Build day map
    const dayMap = new Map<string, { dateStr: string; label: string; newUsers: number; usersList: string[] }>();
    const cur = new Date(startDate);
    const end = new Date(now);

    while (cur <= end) {
      const key = cur.toISOString().split('T')[0];
      const monthName = cur.toLocaleString('default', { month: 'short' });
      const dayNum = cur.getDate();
      dayMap.set(key, {
        dateStr: key,
        label: `${monthName} ${dayNum}`,
        newUsers: 0,
        usersList: []
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Distribute users
    parsedRealUsers.forEach(u => {
      const entry = dayMap.get(u.dateKey);
      if (entry) {
        entry.newUsers += 1;
        entry.usersList.push(u.name);
      }
    });

    // Compute cumulative total count over timeline
    const dataPoints: Array<{
      dateStr: string;
      label: string;
      newUsers: number;
      cumulativeUsers: number;
      usersList: string[];
    }> = [];

    // Calculate baseline users prior to timeframe startDate
    let runningTotal = parsedRealUsers.filter(u => u.parsedDate < startDate).length;

    Array.from(dayMap.values()).forEach(item => {
      runningTotal += item.newUsers;
      dataPoints.push({
        dateStr: item.dateStr,
        label: item.label,
        newUsers: item.newUsers,
        cumulativeUsers: runningTotal,
        usersList: item.usersList
      });
    });

    return dataPoints;
  }, [parsedRealUsers, timeframe]);

  // Chart dimensions & math
  const width = 760;
  const height = 240;
  const padding = { top: 24, right: 30, bottom: 36, left: 40 };

  const chartInnerWidth = width - padding.left - padding.right;
  const chartInnerHeight = height - padding.top - padding.bottom;

  const maxCumulative = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.cumulativeUsers), 5);
    return Math.ceil(maxVal * 1.15);
  }, [chartData]);

  // SVG coordinates for points
  const points = useMemo(() => {
    if (chartData.length <= 1) {
      return chartData.map((d, i) => ({
        ...d,
        x: padding.left + chartInnerWidth / 2,
        y: padding.top + chartInnerHeight - (d.cumulativeUsers / maxCumulative) * chartInnerHeight,
        index: i
      }));
    }

    return chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartInnerWidth;
      const y = padding.top + chartInnerHeight - (d.cumulativeUsers / maxCumulative) * chartInnerHeight;
      return {
        ...d,
        x,
        y,
        index: i
      };
    });
  }, [chartData, chartInnerWidth, chartInnerHeight, maxCumulative, padding]);

  // Generate SVG Path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.reduce((path, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth curve with cubic beziers
      const prev = points[idx - 1];
      const cpx1 = prev.x + (pt.x - prev.x) / 2;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (pt.x - prev.x) / 2;
      const cpy2 = pt.y;
      return `${path} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padding.top + chartInnerHeight;
    if (points.length === 1) {
      return `M ${points[0].x - 10} ${bottomY} L ${points[0].x} ${points[0].y} L ${points[0].x + 10} ${bottomY} Z`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [points, linePath, chartInnerHeight, padding]);

  const activePoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : points[points.length - 1];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">User Growth Analytics</h3>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Realtime
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track real registered user acquisition and community growth trajectory over time.
          </p>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            id="admin-growth-timeframe-7d"
            onClick={() => setTimeframe('LAST_7_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'LAST_7_DAYS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            id="admin-growth-timeframe-30d"
            onClick={() => setTimeframe('LAST_30_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'LAST_30_DAYS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
          <button
            id="admin-growth-timeframe-all"
            onClick={() => setTimeframe('ALL_TIME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'ALL_TIME'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-slate-50 border border-emerald-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
            {metrics.totalUsers}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Verified accounts in database
          </p>
        </div>

        {/* New Today */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>New Today</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            +{metrics.newToday}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registered in past 24 hours
          </p>
        </div>

        {/* New This Week */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Past 7 Days</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            +{metrics.newThisWeek}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Weekly signup velocity
          </p>
        </div>

        {/* Growth Trend Status */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Growth Trajectory</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {metrics.growthStatus === 'GROWING_FAST' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                Accelerating
              </span>
            )}
            {metrics.growthStatus === 'STEADY_GROWTH' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Steady Growth
              </span>
            )}
            {metrics.growthStatus === 'STABLE' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200 text-slate-800 border border-slate-300">
                Stable Base
              </span>
            )}
            {metrics.growthStatus === 'INITIALIZING' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                Collecting Data
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {metrics.newThisMonth} new this month
          </p>
        </div>
      </div>

      {/* Interactive Growth Line Chart */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-xs font-bold text-slate-800">Cumulative Registered Users (Growth Curve)</span>
          </div>

          {activePoint && (
            <div className="flex items-center gap-3 text-xs bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="font-semibold text-slate-500">{activePoint.label}:</span>
              <span className="font-extrabold text-emerald-800">{activePoint.cumulativeUsers} total</span>
              {activePoint.newUsers > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  +{activePoint.newUsers} new
                </span>
              )}
            </div>
          )}
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[620px]">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-auto select-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Gradient for area under line */}
                <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>

                {/* Soft shadow for line */}
                <filter id="growthShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#059669" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const yVal = padding.top + chartInnerHeight * (1 - ratio);
                const countVal = Math.round(maxCumulative * ratio);
                return (
                  <g key={`grid-h-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={yVal}
                      x2={padding.left + chartInnerWidth}
                      y2={yVal}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={yVal + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontWeight="600"
                    >
                      {countVal}
                    </text>
                  </g>
                );
              })}

              {/* Area path */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#growthAreaGradient)"
                />
              )}

              {/* Smooth Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#growthShadow)"
                />
              )}

              {/* Data points & Interactive hover targets */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                const showLabel = 
                  idx === 0 || 
                  idx === points.length - 1 || 
                  (points.length > 7 && idx % Math.ceil(points.length / 5) === 0);

                return (
                  <g key={`pt-${idx}`}>
                    {/* Hover column trigger */}
                    <rect
                      x={pt.x - 12}
                      y={padding.top}
                      width={24}
                      height={chartInnerHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />

                    {/* Vertical hover guide line */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={padding.top}
                        x2={pt.x}
                        y2={padding.top + chartInnerHeight}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Circle Node */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : pt.newUsers > 0 ? 4 : 3}
                      fill={isHovered ? '#047857' : pt.newUsers > 0 ? '#059669' : '#34d399'}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150 pointer-events-none"
                    />

                    {/* X-Axis date label */}
                    {showLabel && (
                      <text
                        x={pt.x}
                        y={padding.top + chartInnerHeight + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Footnote on real database tracking */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>
            Data grounded in real user registration timestamps from PostgreSQL / Supabase auth records.
          </span>
          <span className="font-semibold text-emerald-800">
            Active Community: {metrics.totalUsers} registered member{metrics.totalUsers === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
