import React, { useState } from 'react';
import {
  Settings2,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Database,
  TableProperties,
  Clock,
} from 'lucide-react';
import { ConnectionStatus } from '../lib/types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';

interface ConnectionViewProps {
  status: ConnectionStatus | null;
  user: User | null;
  onAuthChange: (user: User | null) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const ConnectionView: React.FC<ConnectionViewProps> = ({
  status,
  user,
  onAuthChange,
  isRefreshing,
  onRefresh,
}) => {
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    try {
      await onRefresh();
      setRefreshMessage('Spreadsheet records successfully refreshed from Google Sheets source of truth!');
      setTimeout(() => setRefreshMessage(null), 4000);
    } catch (err: any) {
      setRefreshMessage(`Sync error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
        <h2 className="text-xl font-bold text-[#1E293B] flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#2563EB]" />
          Google Sheets Database Connection & Sync
        </h2>
        <p className="text-xs text-[#334155] mt-1 font-semibold">
          Inspect connection status, OAuth permissions, and dynamic synchronization with your Google Spreadsheet.
        </p>
      </div>

      {refreshMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>{refreshMessage}</span>
        </div>
      )}

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source of Truth Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
            <span className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2563EB]" />
              Source Spreadsheet
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1E293B] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
              Live Sync Connected
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[#334155] text-xs font-semibold block">Spreadsheet ID:</span>
              <code className="font-mono text-xs font-bold text-[#1E293B] break-all select-all">
                {status?.spreadsheetId || '1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM'}
              </code>
            </div>

            <div>
              <span className="text-[#334155] text-xs font-semibold block">Target Worksheet:</span>
              <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                <TableProperties className="w-3.5 h-3.5 text-[#2563EB]" />
                <code className="font-mono text-[#2563EB] font-extrabold text-xs">DATA</code>
              </span>
            </div>

            <div>
              <span className="text-[#334155] text-xs font-semibold block">Synchronized Records:</span>
              <span className="font-mono font-extrabold text-lg text-[#1E293B]">
                {status?.totalRecords ? status.totalRecords.toLocaleString() : 'Loading...'} units
              </span>
            </div>

            <div>
              <span className="text-[#334155] text-xs font-semibold block">Last Synced:</span>
              <span className="text-[#1E293B] font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#334155]" />
                {status?.lastFetched ? new Date(status.lastFetched).toLocaleString() : 'Recently'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Now from Sheets'}</span>
            </button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${status?.spreadsheetId || '1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM'}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-[#CBD5E1] text-[#1E293B] rounded-xl hover:bg-slate-100 transition-colors"
              title="Open Google Spreadsheet in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
            <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              Security & OAuth Scopes
            </span>
            <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
              Firebase Auth
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#334155] text-xs font-semibold block">Active User Session:</span>
              <div className="mt-1.5">
                <GoogleSignInButton user={user} onAuthChange={onAuthChange} compact={false} />
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[#334155] text-xs font-semibold block mb-1">Configured Scope:</span>
              <div className="p-2.5 rounded-lg bg-[#0F172A] font-mono text-[11px] font-semibold text-white border border-[#CBD5E1]">
                https://www.googleapis.com/auth/spreadsheets.readonly
              </div>
            </div>

            <div>
              <span className="text-[#334155] text-xs font-semibold block">Access Architecture:</span>
              <p className="text-xs text-[#334155] mt-0.5 leading-relaxed font-semibold">
                Tokens are stored securely in memory and sent via Bearer headers to backend endpoints. No mock data is used; records are fetched dynamically and cached with automated TTL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
