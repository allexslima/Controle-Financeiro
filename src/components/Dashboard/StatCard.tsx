"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendType?: 'up' | 'down';
  icon: LucideIcon;
  color: string;
}

const StatCard = ({ title, value, trend, trendType, icon: Icon, color }: StatCardProps) => {
  return (
    <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              trendType === 'up' ? "text-emerald-600" : "text-rose-600"
            )}>
              {trend} <span className="text-gray-400 font-normal">em relação ao mês passado</span>
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-2xl", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
};

export default StatCard;