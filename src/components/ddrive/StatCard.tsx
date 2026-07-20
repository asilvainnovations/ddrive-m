import React from 'react';
import GlassCard from './GlassCard';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
  suffix?: string;
}

const colorMap = {
  blue: 'from-blue-600 to-blue-800 text-blue-600',
  green: 'from-emerald-500 to-emerald-700 text-emerald-600',
  amber: 'from-amber-500 to-amber-600 text-amber-600',
  red: 'from-red-500 to-red-700 text-red-600',
  purple: 'from-purple-500 to-purple-700 text-purple-600',
  cyan: 'from-cyan-500 to-cyan-700 text-cyan-600',
};

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon: Icon, color, suffix }) => {
  const gradients = colorMap[color];
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-roboto-condensed font-semibold">{label}</p>
          <p className="text-3xl font-montserrat font-bold mt-1 text-slate-900 dark:text-white tracking-tight">
            {value}
            {suffix && <span className="text-base font-normal text-slate-500 ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', gradients)}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={cn('text-xs font-semibold', trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-slate-500">vs last month</span>
        </div>
      )}
    </GlassCard>
  );
};

export default StatCard;
