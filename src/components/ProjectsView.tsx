import React, { useState } from 'react';
import { Building2, Search, ArrowUpRight } from 'lucide-react';
import { SummaryData } from '../lib/types';

interface ProjectsViewProps {
  summary: SummaryData | null;
  onSelectProject: (projectName: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ summary, onSelectProject }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!summary) {
    return <div className="p-8 text-center text-[#334155] font-semibold">Loading project data...</div>;
  }

  const projectList = Object.entries(summary.projectCounts || {})
    .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#1E293B] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
            Project Developments ({projectList.length})
          </h2>
          <p className="text-xs text-[#334155] font-semibold mt-1">
            Browse all residential and commercial project developments tracked in the Google Sheet database.
          </p>
        </div>

        {/* Search with input background #0F172A and text #FFFFFF */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-[#CBD5E1] rounded-xl text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectList.map(([name, count]) => {
          const pct = ((count / summary.totalRecords) * 100).toFixed(2);
          return (
            <div
              key={name}
              onClick={() => onSelectProject(name)}
              className="p-5 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    {pct}% of DB
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-[#1E293B] mt-3 group-hover:text-[#2563EB] transition-colors line-clamp-1">
                  {name}
                </h3>
              </div>

              <div className="mt-4 pt-4 border-t border-[#CBD5E1] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#334155] uppercase font-semibold">Total Units</span>
                  <p className="text-xl font-extrabold font-mono text-[#1E293B]">
                    {count.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#2563EB] group-hover:translate-x-0.5 transition-transform">
                  <span>Explore</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
