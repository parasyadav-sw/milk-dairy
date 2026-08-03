import React, { useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Users, UserX, ClipboardList, Route, Radio, Battery, Clock } from 'lucide-react';

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;

interface TrackingDashboardProps {
  selectedEmployee?: string;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = () => {
  const { locations, attendance, surveys, users } = useDatabase();

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const employees = users.filter(u => u.role === 'EMPLOYEE');
    const now = Date.now();
    const latestByUser = new Map<string, typeof locations[0]>();

    locations.forEach(loc => {
      const existing = latestByUser.get(loc.userId);
      if (!existing || new Date(loc.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        latestByUser.set(loc.userId, loc);
      }
    });

    let online = 0;
    let idle = 0;
    let offline = 0;
    let totalDistance = 0;

    employees.forEach(emp => {
      const latest = latestByUser.get(emp.id);
      if (!latest) {
        offline++;
        return;
      }
      const age = now - new Date(latest.timestamp).getTime();
      if (age > OFFLINE_THRESHOLD_MS) {
        offline++;
      } else if (age > IDLE_THRESHOLD_MS) {
        idle++;
      } else {
        online++;
      }
    });

    locations.forEach(loc => {
      const empLocations = locations
        .filter(l => l.userId === loc.userId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      for (let i = 1; i < empLocations.length; i++) {
        const prev = empLocations[i - 1];
        const curr = empLocations[i];
        if (prev.userId !== curr.userId) continue;
        const R = 6371;
        const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
        const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos((prev.latitude * Math.PI) / 180) *
          Math.cos((curr.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        totalDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
    });

    const todaySurveys = surveys.filter(s => s.surveyDate === today).length;

    return { online, idle, offline, totalEmployees: employees.length, todaySurveys, totalDistance: Math.round(totalDistance * 10) / 10 };
  }, [locations, surveys, users, today]);

  const cards = [
    {
      label: 'Employees Online',
      value: stats.online,
      icon: <Radio className="w-5 h-5" />,
      color: 'bg-forest-50 text-forest-700 border-forest-200/60',
      iconBg: 'bg-forest-100',
    },
    {
      label: 'Idle (>5 min)',
      value: stats.idle,
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-700 border-amber-200/60',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Employees Offline',
      value: stats.offline,
      icon: <UserX className="w-5 h-5" />,
      color: 'bg-red-50 text-error border-red-200/60',
      iconBg: 'bg-red-100',
    },
    {
      label: "Today's Surveys",
      value: stats.todaySurveys,
      icon: <ClipboardList className="w-5 h-5" />,
      color: 'bg-primary-50 text-primary-700 border-primary-200/60',
      iconBg: 'bg-primary-100',
    },
    {
      label: 'Total Distance',
      value: `${stats.totalDistance} km`,
      icon: <Route className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200/60',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-warm-50 text-warm-700 border-warm-200/60',
      iconBg: 'bg-warm-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`card p-4 border ${card.color} animate-fade-in`}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-label opacity-70">{card.label}</p>
              <p className="text-display-sm font-display font-bold">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
