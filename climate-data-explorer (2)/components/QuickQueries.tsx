import React from 'react';
import type { QuickQuery } from '../types';
import { Card } from './Card';

interface QuickQueriesProps {
  queries: QuickQuery[];
  onQueryClick: (query: QuickQuery) => void;
}

export const QuickQueries: React.FC<QuickQueriesProps> = ({ queries, onQueryClick }) => {
  const formatQueryDate = (dateStr: string) => {
    const [monthNum, dayNum] = dateStr.split('-');
    // Use a dummy year; we only care about the month and day for formatting
    const date = new Date(2000, parseInt(monthNum, 10) - 1, parseInt(dayNum, 10)); 
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  return (
    <Card title="Quick Demo Queries">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQueryClick(query)}
            className="p-3 bg-slate-700 rounded-md text-left hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <p className="font-semibold text-white capitalize">{query.location}</p>
            <p className="text-sm text-slate-400">{formatQueryDate(query.date)}</p>
          </button>
        ))}
      </div>
    </Card>
  );
};