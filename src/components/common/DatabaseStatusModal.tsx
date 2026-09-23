import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, X, Shield, Server } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const isConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(`-- Skill Mesh PostgreSQL / Supabase Schema
-- Run in Supabase SQL Editor:
-- Tables: profiles, offered_skills, wanted_skills, connection_requests
-- Includes full Row Level Security (RLS) policies.
-- Found in /supabase/schema.sql in the repository.`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="supabase-status-modal"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isConfigured ? 'bg-emerald-600' : 'bg-teal-700'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Backend & Database Status</h3>
              <p className="text-xs text-slate-500">Supabase relational integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600">
          {/* Status Indicator Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isConfigured 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-teal-50 border-teal-200 text-teal-950'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Server className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">
                {isConfigured ? 'Live Supabase Cloud Connected' : 'Local Persistence & Supabase Ready'}
              </p>
              <p className="mt-1 leading-relaxed text-xs opacity-90">
                {isConfigured
                  ? 'Application data is automatically synchronized with your Supabase database in real time.'
                  : 'The application is running with robust persistent local storage and is fully prepared for Supabase cloud deployment.'}
              </p>
            </div>
          </div>

          {/* Database Entities summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Integrated Tables & Schemas:</p>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center justify-between">
                <span>&bull; <strong className="text-slate-900">profiles:</strong> User accounts, roles, bios, and contacts</span>
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">RLS Active</span>
              </li>
              <li className="flex items-center justify-between">
                <span>&bull; <strong className="text-slate-900">offered_skills:</strong> Proficiency, experience, evidence links</span>
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">RLS Active</span>
              </li>
              <li className="flex items-center justify-between">
                <span>&bull; <strong className="text-slate-900">wanted_skills:</strong> Target learning goals and levels</span>
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">RLS Active</span>
              </li>
              <li className="flex items-center justify-between">
                <span>&bull; <strong className="text-slate-900">connection_requests:</strong> Proposals & voluntary sharing</span>
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">RLS Active</span>
              </li>
              <li className="flex items-center justify-between">
                <span>&bull; <strong className="text-slate-900">messages:</strong> 1-on-1 private chat & resource sharing</span>
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">RLS Active</span>
              </li>
            </ul>
          </div>

          {/* Migration file info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-[11px] text-slate-600 font-medium">Schema migration: <code className="font-mono font-bold text-slate-900">/supabase/schema.sql</code></span>
            <button
              onClick={handleCopySchema}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
