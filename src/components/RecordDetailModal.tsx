import React from 'react';
import {
  X,
  Zap,
  Building,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  User,
  Wrench,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { SheetRecord } from '../lib/types';

interface RecordDetailModalProps {
  record: SheetRecord | null;
  onClose: () => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const text = `${record.project} - Block ${record.block}, Lot ${record.lot} (Status: ${record.unitsStatus})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEnergized = record.unitsStatus.toUpperCase().includes('ENERGIZED');
  const isPriority = record.priorityMoveIn && record.priorityMoveIn.toUpperCase().includes('PRIORITY');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex justify-end">
      {/* Slide-over panel */}
      <div
        className="relative w-full max-w-2xl bg-white min-h-screen shadow-2xl flex flex-col border-l border-[#CBD5E1] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Slate Dark #1E293B with White Text */}
        <div className="p-6 border-b border-[#CBD5E1]/30 bg-[#1E293B] text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#2563EB] text-white font-mono text-xs font-bold shadow-xs">
                Blk {record.block} • Lot {record.lot}
              </span>
              {isPriority && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 text-white font-bold text-xs shadow-xs">
                  <Flame className="w-3.5 h-3.5 fill-white" /> PRIORITY MOVE-IN
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              {record.project}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
              <span>Developer: <strong className="text-white">{record.developer || 'N/A'}</strong></span>
              <span>•</span>
              <span>Code: <strong className="text-white">{record.projectCode}</strong></span>
              <span>•</span>
              <span>Row #{record.id + 1}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-750 transition-colors"
              title="Copy details"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-[#F8FAFC]">
          {/* Main Status Callout Card */}
          <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#334155] uppercase tracking-wider block">
                Current Unit Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                {isEnergized ? (
                  <>
                    <Zap className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                    <span className="text-xl font-extrabold text-emerald-700">
                      {record.unitsStatus || 'Unspecified'}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-[#2563EB]" />
                    <span className="text-xl font-extrabold text-[#1E293B]">
                      {record.unitsStatus || 'Unspecified'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-[#334155] uppercase tracking-wider block">
                Completion Progress
              </span>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-xl font-extrabold text-[#1E293B] font-mono">
                  {record.percentage || '0%'}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {record.stages || 'Stage -'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Property & Area Identification */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-[#2563EB]" />
              Property & Area Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Project Code</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.projectCode || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Developer</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.developer || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Area SPE</span>
                <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  {record.areaSpe || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Block</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.block || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Lot</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.lot || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Personnel Incharge</span>
                <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#2563EB]" />
                  {record.incharge || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Important Dates & Energization Milestones */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563EB]" />
              Target & Milestone Dates
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Energized Date</span>
                <span className="text-xs font-extrabold font-mono text-emerald-700">{record.energizedDate || 'Pending'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Takeout Date</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.takeoutDate || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Final E-Target</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.finalETarget || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">MMS Application Date</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.mmsApplicationDate || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Folder Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {record.folderStatus || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Priority Move-In</span>
                {isPriority ? (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    {record.priorityMoveIn}
                  </span>
                ) : (
                  <span className="text-xs font-extrabold text-[#334155]">{record.priorityMoveIn || 'No'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Engineering Approvals & Clearances */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              Approvals & Adjusted Targets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">FAC Status</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.facStatus || '-'}</span>
                <span className="text-[11px] text-[#334155] font-semibold block mt-0.5">Batch: {record.facBatch || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">FAC Adjusted Target</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.facAdjustedTarget || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">COO Status</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.cooStatus || '-'}</span>
                <span className="text-[11px] text-[#334155] font-semibold block mt-0.5">Target: {record.cooAdjustedTarget || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">SEP Status</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.sepStatus || '-'}</span>
                <span className="text-[11px] text-[#334155] font-semibold block mt-0.5">Target: {record.sepAdjustedTarget || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">PWG CFEI Status</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.pwgCfeiStatus || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">PWG JO Award Status</span>
                <span className="text-xs font-extrabold text-[#1E293B]">{record.pwgJoAwardStatus || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: PWG Updates, Operations & Remarks */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#2563EB]" />
              PWG Technical Updates & Remarks
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">PWG Updates</span>
                <p className="text-xs text-[#1E293B] font-bold mt-1">
                  {record.pwgUpdates || 'No technical updates recorded.'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">PWG Remarks / Notes</span>
                <p className="text-xs text-[#1E293B] font-bold mt-1">
                  {record.pwgRemarks || 'None'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">KPI Remarks</span>
                <p className="text-xs text-[#1E293B] font-bold mt-1">
                  {record.kpiRemarks || 'No KPI notes.'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs">
                <span className="text-xs font-semibold text-[#334155] block">Job Order (JO)</span>
                <span className="text-xs font-extrabold font-mono text-[#1E293B]">{record.jo || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#CBD5E1] bg-white flex items-center justify-between">
          <a
            href="https://docs.google.com/spreadsheets/d/1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#334155] hover:text-[#2563EB] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Google Sheets (Row #{record.id + 1})</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
