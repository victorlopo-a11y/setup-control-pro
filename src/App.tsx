/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  Settings, 
  FileText, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  Timer, 
  ShieldCheck, 
  ExternalLink,
  ClipboardCheck,
  Cpu, 
  Cog,
  Search,
  Moon,
  Sun,
  Bell,
  BarChart3
  ,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from './supabase';

// Types
type UserRole = 'PRODUCAO' | 'QUALIDADE' | 'AREA_KIT' | 'ENGENHARIA_SETUP' | 'ENGENHARIA_TESTE' | 'ENGENHARIA_AUTOMACAO' | 'ENGENHARIA_PROCESSO';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface RequestHistoryItem {
  status: string;
  timestamp: string;
  userId: string;
}

interface TesteChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

interface ProcessoChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

interface AutomacaoChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

interface SetupRequest {
  id: string;
  line: string;
  product: string;
  setupType: 'LINHAO' | 'MEIA_LINHA';
  lineDrainage: boolean;
  hasDocument: boolean;
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'PENDING_PROCESSO' | 'PROCESSO_IN_PROGRESS' | 'PENDING_AUTOMACAO' | 'AUTOMACAO_IN_PROGRESS' | 'COMPLETED';
  token?: string;
  createdBy: string;
  createdByName?: string;
  saPaidByKit: boolean;
  checklistUrl?: string;
  checklistCompleted: boolean;
  checklistCompletedAt?: string;
  setupPendingAt?: string;
  qualityPendingAt?: string;
  kitPendingAt?: string;
  testePendingAt?: string;
  processoPendingAt?: string;
  automacaoPendingAt?: string;
  createdAt: string;
  qualityAcceptedAt?: string;
  qualityFinishedAt?: string;
  kitAcceptedAt?: string;
  kitFinishedAt?: string;
  setupAcceptedAt?: string;
  setupFinishedAt?: string;
  testeAcceptedAt?: string;
  testeFinishedAt?: string;
  processoAcceptedAt?: string;
  processoFinishedAt?: string;
  automacaoAcceptedAt?: string;
  automacaoFinishedAt?: string;
  materialInLineConfirmed?: boolean;
  materialInLineCheckedAt?: string;
  testeChecklist: TesteChecklistItem[];
  testeChecklistCompleted: boolean;
  testeChecklistCompletedAt?: string;
  processoChecklist: ProcessoChecklistItem[];
  processoChecklistCompleted: boolean;
  processoChecklistCompletedAt?: string;
  processoVersionChanged?: boolean;
  processoVersionTarget?: string;
  automacaoChecklist: AutomacaoChecklistItem[];
  automacaoChecklistCompleted: boolean;
  automacaoChecklistCompletedAt?: string;
  automacaoSyncValidated?: boolean;
  history: RequestHistoryItem[];
}

interface SetupRequestRow {
  id: string;
  line: string;
  product: string;
  setup_type: 'LINHAO' | 'MEIA_LINHA';
  line_drainage: boolean;
  has_document: boolean;
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'PENDING_PROCESSO' | 'PROCESSO_IN_PROGRESS' | 'PENDING_AUTOMACAO' | 'AUTOMACAO_IN_PROGRESS' | 'COMPLETED';
  token: string | null;
  created_by: string;
  created_by_name: string | null;
  sa_paid_by_kit: boolean | null;
  checklist_url: string | null;
  checklist_completed: boolean | null;
  checklist_completed_at: string | null;
  setup_pending_at: string | null;
  quality_pending_at: string | null;
  kit_pending_at: string | null;
  teste_pending_at: string | null;
  processo_pending_at: string | null;
  automacao_pending_at: string | null;
  created_at: string;
  quality_accepted_at: string | null;
  quality_finished_at: string | null;
  kit_accepted_at: string | null;
  kit_finished_at: string | null;
  setup_accepted_at: string | null;
  setup_finished_at: string | null;
  teste_accepted_at: string | null;
  teste_finished_at: string | null;
  processo_accepted_at: string | null;
  processo_finished_at: string | null;
  automacao_accepted_at: string | null;
  automacao_finished_at: string | null;
  material_in_line_confirmed: boolean | null;
  material_in_line_checked_at: string | null;
  teste_checklist: TesteChecklistItem[] | null;
  teste_checklist_completed: boolean | null;
  teste_checklist_completed_at: string | null;
  processo_checklist: ProcessoChecklistItem[] | null;
  processo_checklist_completed: boolean | null;
  processo_checklist_completed_at: string | null;
  processo_version_changed: boolean | null;
  processo_version_target: string | null;
  automacao_checklist: AutomacaoChecklistItem[] | null;
  automacao_checklist_completed: boolean | null;
  automacao_checklist_completed_at: string | null;
  automacao_sync_validated: boolean | null;
  history: RequestHistoryItem[] | null;
}

interface TesteChecklistEntry {
  id: string;
  createdAt: string;
  status: SetupRequest['status'];
  checkedCount: number;
  totalCount: number;
  checkedLabels: string[];
  savedAt?: string;
}

interface TesteChecklistGroup {
  line: string;
  product: string;
  requests: TesteChecklistEntry[];
}

interface NotificationItem {
  id: string;
  role: UserRole;
  requestId: string;
  status: SetupRequest['status'];
  message: string;
  createdAt: string;
  read: boolean;
}

const TESTE_CHECKLIST_TEMPLATE: TesteChecklistItem[] = [
  { key: 'ATUALIZACAO', label: 'ATUALIZAÇÃO', checked: false },
  { key: 'CUSTOMIZACAO', label: 'CUSTOMIZAÇÃO', checked: false },
  { key: 'DOUBLE_CHECK', label: 'DOUBLE CHECK', checked: false },
  { key: 'BOB', label: 'BOB', checked: false },
  { key: 'PTH', label: 'PTH', checked: false },
  { key: 'IMEI', label: 'IMEI', checked: false },
  { key: 'CHECK_IMEI', label: 'CHECK IMEI', checked: false },
  { key: 'CORRENTE', label: 'CORRENTE', checked: false },
  { key: 'CMU', label: 'CMU', checked: false },
];

const PROCESSO_CHECKLIST_TEMPLATE: ProcessoChecklistItem[] = [
  { key: 'AUDITORIA_AUTOMATICA', label: 'AUDITORIA AUTOMÁTICA', checked: false },
  { key: 'RUNIN', label: 'RUNIN', checked: false },
];

const AUTOMACAO_CHECKLIST_TEMPLATE: AutomacaoChecklistItem[] = [
  { key: 'BALANCA', label: 'BALANÇA', checked: false },
];

const normalizeTesteChecklist = (items?: TesteChecklistItem[] | null): TesteChecklistItem[] =>
  TESTE_CHECKLIST_TEMPLATE.map((base) => ({
    ...base,
    checked: !!items?.find((i) => i.key === base.key)?.checked,
  }));

const normalizeProcessoChecklist = (items?: ProcessoChecklistItem[] | null): ProcessoChecklistItem[] =>
  PROCESSO_CHECKLIST_TEMPLATE.map((base) => ({
    ...base,
    checked: !!items?.find((i) => i.key === base.key)?.checked,
  }));

const normalizeAutomacaoChecklist = (items?: AutomacaoChecklistItem[] | null): AutomacaoChecklistItem[] =>
  AUTOMACAO_CHECKLIST_TEMPLATE.map((base) => ({
    ...base,
    checked: !!items?.find((i) => i.key === base.key)?.checked,
  }));

const mapRequest = (row: SetupRequestRow): SetupRequest => ({
  id: row.id,
  line: row.line || 'SEM_LINHA',
  product: row.product || 'Sem produto',
  setupType: row.setup_type === 'MEIA_LINHA' ? 'MEIA_LINHA' : 'LINHAO',
  lineDrainage: !!row.line_drainage,
  hasDocument: !!row.has_document,
  status: (
    row.status === 'PENDING_QUALITY' ||
    row.status === 'PENDING_KIT' ||
    row.status === 'PENDING_QUALITY_AND_KIT' ||
    row.status === 'PENDING_SETUP_AND_KIT' ||
    row.status === 'PENDING_SETUP' ||
    row.status === 'IN_PROGRESS' ||
    row.status === 'PENDING_KIT_AFTER_SETUP' ||
    row.status === 'PENDING_TESTE' ||
    row.status === 'TESTE_IN_PROGRESS' ||
    row.status === 'PENDING_PROCESSO' ||
    row.status === 'PROCESSO_IN_PROGRESS' ||
    row.status === 'PENDING_AUTOMACAO' ||
    row.status === 'AUTOMACAO_IN_PROGRESS' ||
    row.status === 'COMPLETED'
  ) ? row.status : 'PENDING_QUALITY',
  token: row.token || undefined,
  createdBy: row.created_by || 'SEM_USUARIO',
  createdByName: row.created_by_name || undefined,
  saPaidByKit: row.sa_paid_by_kit ?? true,
  checklistUrl: row.checklist_url || undefined,
  checklistCompleted: row.checklist_completed ?? false,
  checklistCompletedAt: row.checklist_completed_at || undefined,
  setupPendingAt: row.setup_pending_at || undefined,
  qualityPendingAt: row.quality_pending_at || undefined,
  kitPendingAt: row.kit_pending_at || undefined,
  testePendingAt: row.teste_pending_at || undefined,
  processoPendingAt: row.processo_pending_at || undefined,
  automacaoPendingAt: row.automacao_pending_at || undefined,
  createdAt: row.created_at || new Date().toISOString(),
  qualityAcceptedAt: row.quality_accepted_at || undefined,
  qualityFinishedAt: row.quality_finished_at || undefined,
  kitAcceptedAt: row.kit_accepted_at || undefined,
  kitFinishedAt: row.kit_finished_at || undefined,
  setupAcceptedAt: row.setup_accepted_at || undefined,
  setupFinishedAt: row.setup_finished_at || undefined,
  testeAcceptedAt: row.teste_accepted_at || undefined,
  testeFinishedAt: row.teste_finished_at || undefined,
  processoAcceptedAt: row.processo_accepted_at || undefined,
  processoFinishedAt: row.processo_finished_at || undefined,
  automacaoAcceptedAt: row.automacao_accepted_at || undefined,
  automacaoFinishedAt: row.automacao_finished_at || undefined,
  materialInLineConfirmed: row.material_in_line_confirmed ?? undefined,
  materialInLineCheckedAt: row.material_in_line_checked_at || undefined,
  testeChecklist: normalizeTesteChecklist(row.teste_checklist),
  testeChecklistCompleted: row.teste_checklist_completed ?? false,
  testeChecklistCompletedAt: row.teste_checklist_completed_at || undefined,
  processoChecklist: normalizeProcessoChecklist(row.processo_checklist),
  processoChecklistCompleted: row.processo_checklist_completed ?? false,
  processoChecklistCompletedAt: row.processo_checklist_completed_at || undefined,
  processoVersionChanged: row.processo_version_changed ?? undefined,
  processoVersionTarget: row.processo_version_target || undefined,
  automacaoChecklist: normalizeAutomacaoChecklist(row.automacao_checklist),
  automacaoChecklistCompleted: row.automacao_checklist_completed ?? false,
  automacaoChecklistCompletedAt: row.automacao_checklist_completed_at || undefined,
  automacaoSyncValidated: row.automacao_sync_validated ?? undefined,
  history: Array.isArray(row.history) ? row.history : [],
});

const ROLE_OPTIONS: { id: UserRole; label: string; icon: any; color: string }[] = [
  { id: 'PRODUCAO', label: 'Produção', icon: LayoutDashboard, color: 'bg-sky-100 text-sky-700' },
  { id: 'QUALIDADE', label: 'Qualidade', icon: ShieldCheck, color: 'bg-amber-100 text-amber-700' },
  { id: 'AREA_KIT', label: 'Área Kit', icon: CheckCircle2, color: 'bg-orange-100 text-orange-700' },
  { id: 'ENGENHARIA_SETUP', label: 'Engenharia (Setup)', icon: Settings, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'ENGENHARIA_TESTE', label: 'Engenharia (Teste)', icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'ENGENHARIA_AUTOMACAO', label: 'Engenharia (Automação)', icon: Cpu, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'ENGENHARIA_PROCESSO', label: 'Engenharia (Processo)', icon: Cog, color: 'bg-zinc-100 text-zinc-700' },
];

const DEV_ADMIN_EMAILS = new Set(['victor.lopo@grupomultilaser.com.br']);
const isDevAdminEmail = (email?: string) => !!email && DEV_ADMIN_EMAILS.has(email.trim().toLowerCase());
const SETUP_CHECKLIST_URL = 'https://cheecklistt.netlify.app/';

const derivePendingStatus = (hasDocument: boolean, saPaidByKit: boolean, qualityFinishedAt?: string, kitFinishedAt?: string) => {
  const qualityDone = hasDocument || !!qualityFinishedAt;
  const kitDone = saPaidByKit || !!kitFinishedAt;
  if (qualityDone && kitDone) return 'PENDING_SETUP';
  if (!qualityDone && !kitDone) return 'PENDING_QUALITY_AND_KIT';
  if (!qualityDone) return 'PENDING_QUALITY';
  return 'PENDING_SETUP_AND_KIT';
};

const getStatusLabelGlobal = (status: SetupRequest['status']) => {
  switch (status) {
    case 'PENDING_QUALITY': return 'Aguardando Qualidade';
    case 'PENDING_KIT': return 'Aguardando Área Kit';
    case 'PENDING_QUALITY_AND_KIT': return 'Aguardando Qualidade e Área Kit';
    case 'PENDING_SETUP_AND_KIT': return 'Aguardando Setup e Área Kit';
    case 'PENDING_SETUP': return 'Aguardando Setup';
    case 'IN_PROGRESS': return 'Setup em Execucao';
    case 'PENDING_KIT_AFTER_SETUP': return 'Aguardando Área Kit (Pós Setup)';
    case 'PENDING_TESTE': return 'Aguardando Eng. Teste';
    case 'TESTE_IN_PROGRESS': return 'Teste em Execucao';
    case 'PENDING_PROCESSO': return 'Aguardando Eng. Processo';
    case 'PROCESSO_IN_PROGRESS': return 'Processo em Execucao';
    case 'PENDING_AUTOMACAO': return 'Aguardando Eng. Automação';
    case 'AUTOMACAO_IN_PROGRESS': return 'Automação em Execucao';
    case 'COMPLETED': return 'Finalizado';
    default: return status;
  }
};

const isRequestAssignedToRole = (role: UserRole, request: SetupRequest) => {
  if (role === 'QUALIDADE') return request.status === 'PENDING_QUALITY' || request.status === 'PENDING_QUALITY_AND_KIT';
  if (role === 'AREA_KIT') return request.status === 'PENDING_KIT' || request.status === 'PENDING_QUALITY_AND_KIT' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'PENDING_KIT_AFTER_SETUP';
  if (role === 'ENGENHARIA_SETUP') return request.status === 'PENDING_SETUP' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'IN_PROGRESS';
  if (role === 'ENGENHARIA_TESTE') return request.status === 'PENDING_TESTE' || request.status === 'TESTE_IN_PROGRESS';
  if (role === 'ENGENHARIA_PROCESSO') return request.status === 'PENDING_PROCESSO' || request.status === 'PROCESSO_IN_PROGRESS';
  if (role === 'ENGENHARIA_AUTOMACAO') return request.status === 'PENDING_AUTOMACAO' || request.status === 'AUTOMACAO_IN_PROGRESS';
  return false;
};

const parseSafeDate = (value?: string) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms) : null;
};

const formatSafeDate = (value?: string, mask = 'dd/MM HH:mm:ss') => {
  const date = parseSafeDate(value);
  if (!date) return '--';
  try {
    return format(date, mask);
  } catch {
    return '--';
  }
};

const formatSafeDistanceToNow = (value?: string) => {
  const date = parseSafeDate(value);
  if (!date) return '--';
  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return '--';
  }
};

const sanitizeDisplayText = (value?: string) => {
  if (!value) return '';
  return value.replace(/[^\p{L}\p{N}\s._-]/gu, '').trim();
};

const durationMsBetween = (start?: string, end?: string) => {
  const startDate = parseSafeDate(start);
  const endDate = parseSafeDate(end);
  if (!startDate || !endDate) return 0;
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs > 0 ? diffMs : 0;
};

const formatDurationMs = (ms: number) => {
  if (!ms || ms <= 0) return '--';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

// Components
const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
    />
    <p className="mt-4 text-zinc-600 font-medium">Carregando...</p>
  </div>
);

const LoginScreen = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PRODUCAO');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const formatAuthError = (message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid login credentials')) {
      return 'E-mail ou senha inválidos. Se acabou de criar a conta, confirme o e-mail no link enviado pelo Supabase.';
    }
    if (normalized.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada e confirme a conta.';
    }
    if (normalized.includes('email rate limit exceeded') || normalized.includes('too many requests')) {
      return 'Muitas tentativas de envio. Aguarde 60 segundos e tente novamente.';
    }
    return message;
  };

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCooldown]);

  const handleLogin = async () => {
    setLoadingAuth(true);
    setErrorMessage('');
    setSuccessMessage('');
    const emailValue = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    });
    if (error) {
      setErrorMessage(formatAuthError(error.message));
      setLoadingAuth(false);
      return;
    }
    setLoadingAuth(false);
  };

  const handleSignup = async () => {
    setLoadingAuth(true);
    setErrorMessage('');
    setSuccessMessage('');

    const emailValue = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: {
        data: {
          full_name: name.trim(),
          role,
        },
      },
    });

    if (error) {
      setErrorMessage(formatAuthError(error.message));
      setLoadingAuth(false);
      return;
    }

    if (!data.session) {
      setSuccessMessage('Conta criada. Confirme seu e-mail para entrar.');
      setMode('login');
    } else {
      setSuccessMessage('Conta criada com sucesso.');
    }

    setLoadingAuth(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      await handleSignup();
      return;
    }
    await handleLogin();
  };

  const handleForgotPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (forgotCooldown > 0 || loadingForgot) return;

    const emailValue = email.trim().toLowerCase();
    if (!emailValue) {
      setErrorMessage('Informe seu e-mail para recuperar a senha.');
      return;
    }

    setLoadingForgot(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      setErrorMessage(formatAuthError(error.message));
      setLoadingForgot(false);
      if (error.message.toLowerCase().includes('rate limit')) {
        setForgotCooldown(60);
      }
      return;
    }

    setSuccessMessage('Enviamos o link de recuperação de senha para seu e-mail.');
    setForgotCooldown(60);
    setLoadingForgot(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-600 p-4 md:p-8">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-10 -left-10 h-52 w-52 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-300 blur-3xl" />
      </div>
      <div className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg rounded-3xl border border-white/50 bg-white/90 p-8 shadow-2xl backdrop-blur-sm"
        >
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-4 ring-emerald-200/60">
              <Activity size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Setup Control</h1>
            <p className="mt-2 text-sm font-medium text-zinc-600">Acesso seguro da operacao</p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-zinc-900 shadow' : 'text-zinc-500'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${mode === 'signup' ? 'bg-white text-zinc-900 shadow' : 'text-zinc-500'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-zinc-700">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-bold text-zinc-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="voce@empresa.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-zinc-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Minimo de 6 caracteres"
              />
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loadingForgot || forgotCooldown > 0}
                  className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {forgotCooldown > 0 ? `Tentar novamente em ${forgotCooldown}s` : loadingForgot ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-zinc-700">Setor</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-bold text-white shadow-lg shadow-emerald-300/40 transition hover:from-emerald-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingAuth ? 'Processando...' : mode === 'signup' ? 'Criar Usuario' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-500">
            {mode === 'signup' ? 'Já tem conta? Troque para Entrar.' : 'Não tem conta? Use Criar Conta.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const RoleSelection = ({ onSelect }: { onSelect: (role: UserRole) => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-zinc-200"
      >
        <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Selecione seu Setor</h2>
        <p className="text-zinc-500 mb-8 text-center">Para continuar, identifique sua área de atuação</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${role.color} group-hover:scale-110 transition-transform`}>
                <role.icon size={24} />
              </div>
              <div>
                <p className="font-bold text-zinc-900">{role.label}</p>
                <p className="text-xs text-zinc-500">Clique para selecionar</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [devActiveRole, setDevActiveRole] = useState<UserRole>('PRODUCAO');
  const [dashboardView, setDashboardView] = useState<'REQUESTS' | 'TESTE_CHECKLISTS'>('REQUESTS');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'OPERACAO' | 'SLA'>('OPERACAO');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SetupRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const requestStatusSnapshotByRole = useRef<Record<string, Record<string, SetupRequest['status']>>>({});
  const bootstrappedRoleNotifications = useRef<Set<UserRole>>(new Set());

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('setup-control-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      return;
    }
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(!!prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    window.localStorage.setItem('setup-control-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    let active = true;

    const initSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
      }
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    initSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const userRole = user.user_metadata?.role as UserRole | undefined;
    if (!userRole) {
      if (isDevAdminEmail(user.email || '')) {
        const fallbackProfile: UserProfile = {
          uid: user.id,
          email: user.email || '',
          displayName: (user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario') as string,
          role: 'PRODUCAO',
        };
        setProfile(fallbackProfile);
        setDevActiveRole('PRODUCAO');
        return;
      }
      setProfile(null);
      return;
    }

    setProfile({
      uid: user.id,
      email: user.email || '',
      displayName: (user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario') as string,
      role: userRole,
    });
    setDevActiveRole(userRole);
  }, [user]);

  // Requests Listener
  useEffect(() => {
    if (!user || !profile) return;

    const loadRequests = async () => {
      const { data, error } = await supabase
        .from('setup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Requests load error:', error);
        return;
      }

      setRequests((data || []).map((row) => mapRequest(row as SetupRequestRow)));
    };

    loadRequests();

    const channel = supabase
      .channel('setup_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'setup_requests' },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;
    const newProfile: UserProfile = {
      uid: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
      role
    };

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: newProfile.displayName,
        role: newProfile.role,
      },
    });

    if (error) {
      console.error('Profile save error:', error);
      return;
    }

    setProfile({
      ...newProfile,
      displayName: (data.user?.user_metadata?.full_name || newProfile.displayName) as string,
    });
  };

  const handleCreateRequest = async (data: any) => {
    if (!user || !profile) return;

    const initialStatus = derivePendingStatus(data.hasDocument, data.saPaidByKit);
    const now = new Date().toISOString();

    const { error } = await supabase.from('setup_requests').insert({
      line: data.line,
      product: data.product,
      setup_type: data.setupType,
      line_drainage: data.lineDrainage,
      has_document: data.hasDocument,
      sa_paid_by_kit: data.saPaidByKit,
      checklist_url: SETUP_CHECKLIST_URL,
      checklist_completed: false,
      setup_pending_at: (initialStatus === 'PENDING_SETUP' || initialStatus === 'PENDING_SETUP_AND_KIT') ? now : null,
      quality_pending_at: (initialStatus === 'PENDING_QUALITY' || initialStatus === 'PENDING_QUALITY_AND_KIT') ? now : null,
      kit_pending_at: (initialStatus === 'PENDING_QUALITY_AND_KIT' || initialStatus === 'PENDING_SETUP_AND_KIT') ? now : null,
      teste_pending_at: null,
      processo_pending_at: null,
      automacao_pending_at: null,
      material_in_line_confirmed: null,
      material_in_line_checked_at: null,
      teste_checklist: TESTE_CHECKLIST_TEMPLATE,
      teste_checklist_completed: false,
      teste_checklist_completed_at: null,
      processo_checklist: PROCESSO_CHECKLIST_TEMPLATE,
      processo_checklist_completed: false,
      processo_checklist_completed_at: null,
      processo_version_changed: null,
      processo_version_target: null,
      automacao_checklist: AUTOMACAO_CHECKLIST_TEMPLATE,
      automacao_checklist_completed: false,
      automacao_checklist_completed_at: null,
      automacao_sync_validated: null,
      status: initialStatus,
      created_by: user.id,
      created_by_name: profile.displayName || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
      history: [{
        status: initialStatus,
        timestamp: new Date().toISOString(),
        userId: user.id
      }]
    });

    if (error) {
      console.error('Create request error:', error);
      return;
    }

    setShowForm(false);
  };

  const handleUpdateStatus = async (
    requestId: string,
    newStatus: string,
    additionalData: any = {},
    actorRole?: UserRole
  ) => {
    if (!user) return;
    const currentRequest = requests.find((r) => r.id === requestId);
    if (!currentRequest) return;

    const updateData: any = {
      status: newStatus,
      history: [...currentRequest.history, {
        status: newStatus,
        timestamp: new Date().toISOString(),
        userId: user.id
      }],
      ...additionalData
    };

    // Time tracking logic
    const now = new Date().toISOString();
    const effectiveRole = actorRole || (isDevAdminEmail(user.email || profile?.email || '') ? devActiveRole : profile?.role);
    if (newStatus === 'IN_PROGRESS') {
      if (effectiveRole === 'ENGENHARIA_SETUP') {
        if (!currentRequest.setupPendingAt) {
          updateData.setup_pending_at = now;
        }
        updateData.setup_accepted_at = now;
      }
    } else if (newStatus === 'TESTE_IN_PROGRESS') {
      if (currentRequest.materialInLineConfirmed !== true) {
        window.alert('Antes do aceite da Eng. de Teste, confirme se o material consta em linha.');
        return;
      }
      if (effectiveRole === 'ENGENHARIA_TESTE') {
        if (!currentRequest.testePendingAt) {
          updateData.teste_pending_at = now;
        }
        updateData.teste_accepted_at = now;
      }
    } else if (newStatus === 'PROCESSO_IN_PROGRESS') {
      if (effectiveRole === 'ENGENHARIA_PROCESSO') {
        if (!currentRequest.processoPendingAt) {
          updateData.processo_pending_at = now;
        }
        updateData.processo_accepted_at = now;
      }
    } else if (newStatus === 'AUTOMACAO_IN_PROGRESS') {
      if (effectiveRole === 'ENGENHARIA_AUTOMACAO') {
        if (!currentRequest.automacaoPendingAt) {
          updateData.automacao_pending_at = now;
        }
        updateData.automacao_accepted_at = now;
      }
    } else if (newStatus === 'PENDING_SETUP' && effectiveRole === 'QUALIDADE') {
      updateData.quality_accepted_at = now;
      updateData.quality_finished_at = now;
      let nextStatus: SetupRequest['status'];
      if (!currentRequest.saPaidByKit && !currentRequest.kitFinishedAt) {
        nextStatus = currentRequest.setupFinishedAt ? 'PENDING_KIT_AFTER_SETUP' : 'PENDING_SETUP_AND_KIT';
      } else {
        nextStatus = 'PENDING_SETUP';
      }
      updateData.status = nextStatus;
      if ((nextStatus === 'PENDING_SETUP' || nextStatus === 'PENDING_SETUP_AND_KIT') && !currentRequest.setupPendingAt) {
        updateData.setup_pending_at = now;
      }
    } else if (newStatus === 'PENDING_SETUP' && effectiveRole === 'AREA_KIT') {
      updateData.kit_accepted_at = now;
      updateData.kit_finished_at = now;
      let nextStatus: SetupRequest['status'];
      if (currentRequest.setupFinishedAt) {
        nextStatus = 'PENDING_TESTE';
      } else if (currentRequest.qualityFinishedAt || currentRequest.hasDocument) {
        nextStatus = 'PENDING_SETUP';
      } else {
        nextStatus = 'PENDING_QUALITY';
      }
      updateData.status = nextStatus;
      if (nextStatus === 'PENDING_TESTE') {
        updateData.material_in_line_confirmed = null;
        updateData.material_in_line_checked_at = null;
        if (!currentRequest.testePendingAt) {
          updateData.teste_pending_at = now;
        }
      }
      if (nextStatus === 'PENDING_SETUP' && !currentRequest.setupPendingAt) {
        updateData.setup_pending_at = now;
      }
    } else if (newStatus === 'COMPLETED') {
      if (effectiveRole === 'ENGENHARIA_SETUP') {
        updateData.setup_finished_at = now;
        updateData.status = (currentRequest.saPaidByKit || !!currentRequest.kitFinishedAt) ? 'PENDING_TESTE' : 'PENDING_KIT_AFTER_SETUP';
        if (updateData.status === 'PENDING_TESTE') {
          updateData.material_in_line_confirmed = null;
          updateData.material_in_line_checked_at = null;
          if (!currentRequest.testePendingAt) {
            updateData.teste_pending_at = now;
          }
        }
      } else if (effectiveRole === 'ENGENHARIA_TESTE') {
        if (!currentRequest.testeChecklistCompleted) {
          window.alert('Antes de finalizar a Eng. de Teste, conclua o checklist de teste.');
          return;
        }
        updateData.teste_finished_at = now;
        updateData.status = 'PENDING_PROCESSO';
        if (!currentRequest.processoPendingAt) {
          updateData.processo_pending_at = now;
        }
      } else if (effectiveRole === 'ENGENHARIA_PROCESSO') {
        if (!currentRequest.processoChecklistCompleted) {
          window.alert('Antes de finalizar a Eng. de Processo, conclua o checklist de processo.');
          return;
        }
        if (currentRequest.processoVersionChanged === true && !currentRequest.processoVersionTarget?.trim()) {
          window.alert('Informe a versão quando houver mudança de versão no posto.');
          return;
        }
        updateData.processo_finished_at = now;
        updateData.status = 'PENDING_AUTOMACAO';
        if (!currentRequest.automacaoPendingAt) {
          updateData.automacao_pending_at = now;
        }
      } else if (effectiveRole === 'ENGENHARIA_AUTOMACAO') {
        if (!currentRequest.automacaoChecklistCompleted) {
          window.alert('Antes de finalizar a Eng. de Automação, conclua o checklist de automação.');
          return;
        }
        if (currentRequest.automacaoSyncValidated === undefined) {
          window.alert('Informe se o sistema SYNC foi validado (Sim ou Não).');
          return;
        }
        updateData.automacao_finished_at = now;
        updateData.status = 'COMPLETED';
        updateData.token = Math.random().toString(36).substring(2, 10).toUpperCase();
      }
    }

    updateData.history[updateData.history.length - 1].status = updateData.status;

    const { data, error } = await supabase
      .from('setup_requests')
      .update(updateData)
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Update request error:', error);
      window.alert(`Erro ao atualizar status: ${error.message}`);
      return;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return;
    }

    window.alert('O banco não confirmou a atualização deste chamado. Verifique RLS/policies no Supabase para permitir UPDATE em setup_requests.');
  };

  const handleChecklistComplete = async (requestId: string) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('setup_requests')
      .update({
        checklist_completed: true,
        checklist_completed_at: now,
      })
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Checklist update error:', error);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('checklist_completed') || msg.includes('column')) {
        window.alert('Checklist não atualizado no banco. Execute o SQL atualizado (supabase-schema.sql) para criar as colunas de checklist.');
      } else {
        window.alert(`Erro ao marcar checklist: ${error.message}`);
      }
      return;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return;
    }

    window.alert('O banco não confirmou o checklist deste chamado. Verifique RLS/policies no Supabase para permitir UPDATE em setup_requests.');
  };

  const handleMaterialInLineConfirm = async (requestId: string, confirmed: boolean) => {
    const now = new Date().toISOString();
    const patch: any = {
      material_in_line_confirmed: confirmed,
      material_in_line_checked_at: now,
    };

    if (!confirmed) {
      patch.status = 'PENDING_KIT_AFTER_SETUP';
      const currentRequest = requests.find((r) => r.id === requestId);
      if (currentRequest && !currentRequest.kitPendingAt) {
        patch.kit_pending_at = now;
      }
    }

    const { data, error } = await supabase
      .from('setup_requests')
      .update(patch)
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Material line confirm error:', error);
      window.alert(`Erro ao confirmar material em linha: ${error.message}`);
      return;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return;
    }

    window.alert('O banco não confirmou a atualização de material em linha.');
  };

  const handleTesteChecklistSave = async (requestId: string, checklist: TesteChecklistItem[]) => {
    const now = new Date().toISOString();
    const completed = checklist.some((item) => item.checked);
    const patch = {
      teste_checklist: checklist,
      teste_checklist_completed: completed,
      teste_checklist_completed_at: completed ? now : null,
    };

    const { data, error } = await supabase
      .from('setup_requests')
      .update(patch)
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Teste checklist save error:', error);
      window.alert(`Erro ao salvar checklist da Eng. de Teste: ${error.message}`);
      return;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return;
    }

    window.alert('O banco não confirmou o checklist da Eng. de Teste.');
  };

  const handleProcessoChecklistSave = async (
    requestId: string,
    checklist: ProcessoChecklistItem[],
    versionChanged: boolean,
    versionTarget: string
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    const completed = checklist.some((item) => item.checked);
    const cleanVersion = versionTarget.trim();

    if (versionChanged && !cleanVersion) {
      window.alert('Informe para qual versão houve a mudança.');
      return false;
    }

    const patch = {
      processo_checklist: checklist,
      processo_checklist_completed: completed,
      processo_checklist_completed_at: completed ? now : null,
      processo_version_changed: versionChanged,
      processo_version_target: versionChanged ? cleanVersion : null,
    };

    const { data, error } = await supabase
      .from('setup_requests')
      .update(patch)
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Processo checklist save error:', error);
      window.alert(`Erro ao salvar checklist da Eng. de Processo: ${error.message}`);
      return false;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return true;
    }

    window.alert('O banco não confirmou o checklist da Eng. de Processo.');
    return false;
  };

  const handleAutomacaoChecklistSave = async (
    requestId: string,
    checklist: AutomacaoChecklistItem[],
    syncValidated: boolean | undefined
  ): Promise<boolean> => {
    if (syncValidated === undefined) {
      window.alert('Informe se o sistema SYNC foi validado (Sim ou Não).');
      return false;
    }

    const now = new Date().toISOString();
    const completed = checklist.some((item) => item.checked);

    const patch = {
      automacao_checklist: checklist,
      automacao_checklist_completed: completed,
      automacao_checklist_completed_at: completed ? now : null,
      automacao_sync_validated: syncValidated,
    };

    const { data, error } = await supabase
      .from('setup_requests')
      .update(patch)
      .select('*')
      .eq('id', requestId);

    if (error) {
      console.error('Automacao checklist save error:', error);
      window.alert(`Erro ao salvar checklist da Eng. de Automação: ${error.message}`);
      return false;
    }

    const updatedRow = data?.[0] as SetupRequestRow | undefined;
    if (updatedRow) {
      const mapped = mapRequest(updatedRow);
      setRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
      return true;
    }

    window.alert('O banco não confirmou o checklist da Eng. de Automação.');
    return false;
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!isDevAdmin) {
      window.alert('Somente DEV pode excluir chamado.');
      return;
    }

    const confirmed = window.confirm('Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('setup_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Delete request error:', error);
      window.alert(`Erro ao excluir chamado: ${error.message}`);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const isDevAdmin = isDevAdminEmail(profile?.email || '');
  const currentRole: UserRole = isDevAdmin ? devActiveRole : (profile?.role || 'PRODUCAO');
  const canSeeTesteChecklistHub = currentRole === 'ENGENHARIA_TESTE';
  const effectiveDashboardView = canSeeTesteChecklistHub ? dashboardView : 'REQUESTS';
  const REQUESTS_PER_PAGE = 5;

  const checklistGroupMap: Record<string, TesteChecklistGroup> = requests.reduce((acc, req) => {
      const checkedItems = req.testeChecklist.filter((item) => item.checked);
      const hasChecklistSaved = checkedItems.length > 0 || !!req.testeChecklistCompletedAt;
      if (!hasChecklistSaved) return acc;

      const groupKey = `${req.line}__${req.product}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          line: req.line,
          product: req.product,
          requests: [] as Array<{
            id: string;
            createdAt: string;
            status: SetupRequest['status'];
            checkedCount: number;
            totalCount: number;
            checkedLabels: string[];
            savedAt?: string;
          }>,
        };
      }

      acc[groupKey].requests.push({
        id: req.id,
        createdAt: req.createdAt,
        status: req.status,
        checkedCount: checkedItems.length,
        totalCount: req.testeChecklist.length,
        checkedLabels: checkedItems.map((item) => item.label),
        savedAt: req.testeChecklistCompletedAt,
      });

      return acc;
    }, {} as Record<string, TesteChecklistGroup>);

  const testeChecklistGroups: TesteChecklistGroup[] = Object.values(checklistGroupMap).sort((a, b) => {
    const aLast = Math.max(...a.requests.map((r) => new Date(r.savedAt || r.createdAt).getTime()));
    const bLast = Math.max(...b.requests.map((r) => new Date(r.savedAt || r.createdAt).getTime()));
    return bLast - aLast;
  });

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((req) => {
      const statusText = req.status === 'COMPLETED' ? 'finalizado' : req.status.toLowerCase();
      return (
        req.product.toLowerCase().includes(query) ||
        req.line.toLowerCase().includes(query) ||
        (req.token || '').toLowerCase().includes(query) ||
        statusText.includes(query)
      );
    });
  }, [requests, requestSearch]);

  const averageSetupTimeLabel = useMemo(() => {
    const completed = requests.filter((r) => r.status === 'COMPLETED');
    if (completed.length === 0) return '--:--';

    const totalMs = completed.reduce((acc, r) => {
      const requestTotal =
        durationMsBetween(r.qualityAcceptedAt, r.qualityFinishedAt) +
        durationMsBetween(r.kitAcceptedAt, r.kitFinishedAt) +
        durationMsBetween(r.setupAcceptedAt, r.setupFinishedAt) +
        durationMsBetween(r.testeAcceptedAt, r.testeFinishedAt) +
        durationMsBetween(r.processoAcceptedAt, r.processoFinishedAt) +
        durationMsBetween(r.automacaoAcceptedAt, r.automacaoFinishedAt);
      return acc + requestTotal;
    }, 0);

    const averageMs = Math.floor(totalMs / completed.length);
    return formatDurationMs(averageMs);
  }, [requests]);

  const slaBySector = useMemo(() => {
    const targetsMinutes: Record<string, number> = {
      QUALIDADE: 15,
      AREA_KIT: 20,
      ENGENHARIA_SETUP: 60,
      ENGENHARIA_TESTE: 30,
      ENGENHARIA_PROCESSO: 20,
      ENGENHARIA_AUTOMACAO: 20,
    };

    const sectors = [
      {
        key: 'QUALIDADE',
        label: 'Qualidade',
        pending: (r: SetupRequest) => r.qualityPendingAt || r.createdAt,
        accepted: (r: SetupRequest) => r.qualityAcceptedAt,
        finished: (r: SetupRequest) => r.qualityFinishedAt,
      },
      {
        key: 'AREA_KIT',
        label: 'Área Kit',
        pending: (r: SetupRequest) => r.kitPendingAt || r.createdAt,
        accepted: (r: SetupRequest) => r.kitAcceptedAt,
        finished: (r: SetupRequest) => r.kitFinishedAt,
      },
      {
        key: 'ENGENHARIA_SETUP',
        label: 'Engenharia Setup',
        pending: (r: SetupRequest) => r.setupPendingAt || r.createdAt,
        accepted: (r: SetupRequest) => r.setupAcceptedAt,
        finished: (r: SetupRequest) => r.setupFinishedAt,
      },
      {
        key: 'ENGENHARIA_TESTE',
        label: 'Engenharia Teste',
        pending: (r: SetupRequest) => r.testePendingAt || r.setupFinishedAt || r.createdAt,
        accepted: (r: SetupRequest) => r.testeAcceptedAt,
        finished: (r: SetupRequest) => r.testeFinishedAt,
      },
      {
        key: 'ENGENHARIA_PROCESSO',
        label: 'Engenharia Processo',
        pending: (r: SetupRequest) => r.processoPendingAt || r.testeFinishedAt || r.createdAt,
        accepted: (r: SetupRequest) => r.processoAcceptedAt,
        finished: (r: SetupRequest) => r.processoFinishedAt,
      },
      {
        key: 'ENGENHARIA_AUTOMACAO',
        label: 'Engenharia Automação',
        pending: (r: SetupRequest) => r.automacaoPendingAt || r.processoFinishedAt || r.createdAt,
        accepted: (r: SetupRequest) => r.automacaoAcceptedAt,
        finished: (r: SetupRequest) => r.automacaoFinishedAt,
      },
    ] as const;

    return sectors.map((sector) => {
      const targetMs = targetsMinutes[sector.key] * 60 * 1000;

      let acceptCount = 0;
      let acceptTotalMs = 0;
      let acceptOnTime = 0;

      let execCount = 0;
      let execTotalMs = 0;
      let execOnTime = 0;

      requests.forEach((r) => {
        const acceptMs = durationMsBetween(sector.pending(r), sector.accepted(r));
        if (acceptMs > 0) {
          acceptCount += 1;
          acceptTotalMs += acceptMs;
          if (acceptMs <= targetMs) acceptOnTime += 1;
        }

        const execMs = durationMsBetween(sector.accepted(r), sector.finished(r));
        if (execMs > 0) {
          execCount += 1;
          execTotalMs += execMs;
          if (execMs <= targetMs) execOnTime += 1;
        }
      });

      return {
        key: sector.key,
        label: sector.label,
        targetMs,
        acceptCount,
        acceptAvgMs: acceptCount > 0 ? Math.floor(acceptTotalMs / acceptCount) : 0,
        acceptOnTimePct: acceptCount > 0 ? Math.round((acceptOnTime / acceptCount) * 100) : 0,
        execCount,
        execAvgMs: execCount > 0 ? Math.floor(execTotalMs / execCount) : 0,
        execOnTimePct: execCount > 0 ? Math.round((execOnTime / execCount) * 100) : 0,
      };
    });
  }, [requests]);

  const roleNotifications = useMemo(
    () => notifications.filter((n) => n.role === currentRole).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, currentRole]
  );
  const unreadRoleNotifications = roleNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user || !profile) return;

    const roleKey = currentRole;
    const previousSnapshot = requestStatusSnapshotByRole.current[roleKey] || {};
    const nextSnapshot: Record<string, SetupRequest['status']> = {};

    if (!bootstrappedRoleNotifications.current.has(roleKey)) {
      requests.forEach((req) => {
        nextSnapshot[req.id] = req.status;
      });
      requestStatusSnapshotByRole.current[roleKey] = nextSnapshot;
      bootstrappedRoleNotifications.current.add(roleKey);
      return;
    }

    const incoming: NotificationItem[] = [];

    requests.forEach((req) => {
      const prevStatus = previousSnapshot[req.id];
      nextSnapshot[req.id] = req.status;
      const isNewForSnapshot = !prevStatus;
      const changed = !!prevStatus && prevStatus !== req.status;
      if (!isNewForSnapshot && !changed) return;
      if (!isRequestAssignedToRole(roleKey, req)) return;

      incoming.push({
        id: `${roleKey}-${req.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: roleKey,
        requestId: req.id,
        status: req.status,
        message: `Chamado ${sanitizeDisplayText(req.product) || req.product} (linha ${sanitizeDisplayText(req.line) || req.line}) caiu para ${ROLE_OPTIONS.find((r) => r.id === roleKey)?.label || roleKey}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    requestStatusSnapshotByRole.current[roleKey] = nextSnapshot;
    if (incoming.length > 0) {
      setNotifications((prev) => [...incoming, ...prev].slice(0, 120));
    }
  }, [requests, currentRole, user, profile]);

  const totalRequestPages = Math.max(1, Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE));
  const currentRequestPage = Math.min(requestPage, totalRequestPages);
  const paginatedRequests = filteredRequests.slice(
    (currentRequestPage - 1) * REQUESTS_PER_PAGE,
    currentRequestPage * REQUESTS_PER_PAGE
  );

  useEffect(() => {
    setRequestPage(1);
  }, [requestSearch]);

  useEffect(() => {
    if (requestPage > totalRequestPages) {
      setRequestPage(totalRequestPages);
    }
  }, [requestPage, totalRequestPages]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <RoleSelection onSelect={handleRoleSelect} />;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">Setup Control</h1>
              <p className="text-xs text-zinc-500 font-medium">
                {isDevAdmin ? `DEV ADMIN - ATUANDO COMO ${currentRole.replace('_', ' ')}` : currentRole.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
              title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                if (!showNotifications && unreadRoleNotifications > 0) {
                  setNotifications((prev) => prev.map((n) => (n.role === currentRole ? { ...n, read: true } : n)));
                }
              }}
              className="relative p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
              title="Notificações do setor"
            >
              <Bell size={18} />
              {unreadRoleNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                  {unreadRoleNotifications > 9 ? '9+' : unreadRoleNotifications}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 z-30 w-[360px] max-w-[90vw] rounded-xl border border-zinc-200 bg-white shadow-xl dark:bg-zinc-900 dark:border-zinc-700">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                    Notificações - {ROLE_OPTIONS.find((r) => r.id === currentRole)?.label || currentRole}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNotifications((prev) => prev.map((n) => (n.role === currentRole ? { ...n, read: true } : n)))}
                      className="text-[11px] font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                    >
                      Marcar lidas
                    </button>
                    <button
                      onClick={() => setNotifications((prev) => prev.filter((n) => n.role !== currentRole))}
                      className="text-[11px] font-semibold text-red-600 hover:underline dark:text-red-400"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {roleNotifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">Sem notificações para este setor.</p>
                  ) : (
                    roleNotifications.map((n) => (
                      <div key={n.id} className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{n.message}</p>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {getStatusLabelGlobal(n.status)} - {formatSafeDistanceToNow(n.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {isDevAdmin && (
              <select
                value={devActiveRole}
                onChange={(e) => setDevActiveRole(e.target.value as UserRole)}
                className="hidden md:block rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 outline-none"
                title="Setor ativo"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            )}
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-zinc-900">{profile.displayName}</p>
              <p className="text-xs text-zinc-500">{profile.email}</p>
            </div>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <div className="flex items-start gap-4">
          <aside className="sticky top-20 hidden md:flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveMainTab('OPERACAO')}
              className={`rounded-xl p-3 transition ${activeMainTab === 'OPERACAO' ? 'bg-emerald-500 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'}`}
              title="Operação"
            >
              <Activity size={18} />
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('SLA')}
              className={`rounded-xl p-3 transition ${activeMainTab === 'SLA' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'}`}
              title="Painel SLA"
            >
              <BarChart3 size={18} />
            </button>
          </aside>

          <section className="flex-1">
        {activeMainTab === 'OPERACAO' && (
          <>
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Clock size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pendentes</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {requests.filter(r => r.status !== 'COMPLETED').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Finalizados</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {requests.filter(r => r.status === 'COMPLETED').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Timer size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tempo Médio</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{averageSetupTimeLabel}</p>
          </div>
        </div>

        {/* Actions */}
        {(currentRole === 'PRODUCAO' || isDevAdmin) && (
          <div className="mb-8">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <PlusCircle size={20} />
              Solicitar Novo Setup
            </button>
          </div>
        )}

        {canSeeTesteChecklistHub && (
          <div className="mb-6 inline-flex rounded-xl border border-zinc-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setDashboardView('REQUESTS')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                effectiveDashboardView === 'REQUESTS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Chamados
            </button>
            <button
              type="button"
              onClick={() => setDashboardView('TESTE_CHECKLISTS')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                effectiveDashboardView === 'TESTE_CHECKLISTS' ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Checklists de Teste
            </button>
          </div>
        )}

        {/* Request List */}
        {effectiveDashboardView === 'REQUESTS' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText size={20} className="text-zinc-400" />
            Chamados Recentes
          </h2>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
              Pesquisar chamados
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="Buscar por finalizado, token, linha ou produto..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
                  <p className="text-zinc-400">Nenhum chamado encontrado para essa pesquisa.</p>
                </div>
              ) : (
                paginatedRequests.map((req) => (
                  <RequestCard 
                    key={req.id} 
                    request={req} 
                    role={currentRole}
                    isDevAdmin={isDevAdmin}
                    onUpdateStatus={handleUpdateStatus}
                    onChecklistComplete={handleChecklistComplete}
                    onMaterialInLineConfirm={handleMaterialInLineConfirm}
                    onTesteChecklistSave={handleTesteChecklistSave}
                    onProcessoChecklistSave={handleProcessoChecklistSave}
                    onAutomacaoChecklistSave={handleAutomacaoChecklistSave}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-zinc-500">
              Exibindo {(filteredRequests.length === 0 ? 0 : ((currentRequestPage - 1) * REQUESTS_PER_PAGE) + 1)}
              -
              {Math.min(currentRequestPage * REQUESTS_PER_PAGE, filteredRequests.length)} de {filteredRequests.length} chamado(s)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRequestPage((prev) => Math.max(1, prev - 1))}
                disabled={currentRequestPage <= 1}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-zinc-600">
                Página {currentRequestPage} de {totalRequestPages}
              </span>
              <button
                type="button"
                onClick={() => setRequestPage((prev) => Math.min(totalRequestPages, prev + 1))}
                disabled={currentRequestPage >= totalRequestPages}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
        )}

        {effectiveDashboardView === 'TESTE_CHECKLISTS' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-indigo-500" />
              Checklists Salvos (Engenharia de Teste)
            </h2>

            {testeChecklistGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-12 text-center">
                <p className="text-zinc-500">Nenhum checklist salvo ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testeChecklistGroups.map((group) => (
                  <div key={`${group.line}-${group.product}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                        Linha: {group.line}
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase text-indigo-700">
                        Produto: {group.product}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {group.requests
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((entry) => (
                          <div key={entry.id} className="rounded-xl border border-zinc-200 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-zinc-900">Chamado #{entry.id.slice(0, 8).toUpperCase()}</p>
                              <p className="text-xs font-medium text-zinc-500">
                                Salvo em: {formatSafeDate(entry.savedAt || entry.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-zinc-600 mb-2">
                              Itens marcados: {entry.checkedCount}/{entry.totalCount}
                            </p>
                            {entry.checkedLabels.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {entry.checkedLabels.map((label) => (
                                  <span key={`${entry.id}-${label}`} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase text-emerald-700">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-400">Nenhum item marcado neste checklist.</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}

        {activeMainTab === 'SLA' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-600" />
                Painel SLA por Setor
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                SLA considerado em dois pontos: tempo até aceite e tempo de execução (aceite até finalização).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {slaBySector.map((sector) => (
                <div key={sector.key} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900">{sector.label}</h3>
                    <span className="text-xs font-semibold text-zinc-500">Meta: {formatDurationMs(sector.targetMs)}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-zinc-600">
                      SLA Aceite: <span className="font-bold text-zinc-900">{sector.acceptOnTimePct}%</span>
                      {' '}no prazo ({sector.acceptCount} chamados)
                    </p>
                    <p className="text-zinc-600">
                      Média até aceite: <span className="font-bold text-zinc-900">{formatDurationMs(sector.acceptAvgMs)}</span>
                    </p>
                    <p className="text-zinc-600">
                      SLA Execução: <span className="font-bold text-zinc-900">{sector.execOnTimePct}%</span>
                      {' '}no prazo ({sector.execCount} chamados)
                    </p>
                    <p className="text-zinc-600">
                      Média execução: <span className="font-bold text-zinc-900">{formatDurationMs(sector.execAvgMs)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </section>
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Nova Solicitação de Setup</h3>
                <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600">
                  <LogOut size={20} className="rotate-180" />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateRequest({
                    line: formData.get('line'),
                    product: formData.get('product'),
                    setupType: formData.get('setupType'),
                    lineDrainage: formData.get('lineDrainage') === 'true',
                    hasDocument: formData.get('hasDocument') === 'true',
                    saPaidByKit: formData.get('saPaidByKit') === 'true',
                  });
                }}
                className="p-6 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Linha</label>
                  <input name="line" required className="w-full p-3 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" placeholder="Ex: Linha 01" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Produto</label>
                  <input name="product" required className="w-full p-3 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" placeholder="Nome do produto" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Tipo de Setup</label>
                    <select name="setupType" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                      <option value="LINHAO">Linhão</option>
                      <option value="MEIA_LINHA">Meia Linha</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Escoamento de Linha?</label>
                    <select name="lineDrainage" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Documento está em linha?</label>
                  <select name="hasDocument" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Material já pago para a linha?</label>
                  <select name="saPaidByKit" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all">
                    Finalizar Chamado
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestCard({ request, role, isDevAdmin, onUpdateStatus, onChecklistComplete, onMaterialInLineConfirm, onTesteChecklistSave, onProcessoChecklistSave, onAutomacaoChecklistSave, onDeleteRequest }: {
  key?: React.Key;
  request: SetupRequest;
  role: UserRole;
  isDevAdmin: boolean;
  onUpdateStatus: (id: string, status: string, data?: any, actorRole?: UserRole) => Promise<void>;
  onChecklistComplete: (id: string) => Promise<void>;
  onMaterialInLineConfirm: (id: string, confirmed: boolean) => Promise<void>;
  onTesteChecklistSave: (id: string, checklist: TesteChecklistItem[]) => Promise<void>;
  onProcessoChecklistSave: (id: string, checklist: ProcessoChecklistItem[], versionChanged: boolean, versionTarget: string) => Promise<boolean>;
  onAutomacaoChecklistSave: (id: string, checklist: AutomacaoChecklistItem[], syncValidated: boolean | undefined) => Promise<boolean>;
  onDeleteRequest: (id: string) => Promise<void>;
}) {
  const [showTesteChecklist, setShowTesteChecklist] = useState(false);
  const [testeChecklistDraft, setTesteChecklistDraft] = useState<TesteChecklistItem[]>(request.testeChecklist);
  const [showProcessoChecklist, setShowProcessoChecklist] = useState(false);
  const [processoChecklistDraft, setProcessoChecklistDraft] = useState<ProcessoChecklistItem[]>(request.processoChecklist);
  const [processoVersionChangedDraft, setProcessoVersionChangedDraft] = useState<boolean>(request.processoVersionChanged ?? false);
  const [processoVersionTargetDraft, setProcessoVersionTargetDraft] = useState<string>(request.processoVersionTarget || '');
  const [showAutomacaoChecklist, setShowAutomacaoChecklist] = useState(false);
  const [automacaoChecklistDraft, setAutomacaoChecklistDraft] = useState<AutomacaoChecklistItem[]>(request.automacaoChecklist);
  const [automacaoSyncValidatedDraft, setAutomacaoSyncValidatedDraft] = useState<boolean | undefined>(request.automacaoSyncValidated);

  useEffect(() => {
    setTesteChecklistDraft(request.testeChecklist);
  }, [request.id, request.testeChecklist]);

  useEffect(() => {
    setProcessoChecklistDraft(request.processoChecklist);
    setProcessoVersionChangedDraft(request.processoVersionChanged ?? false);
    setProcessoVersionTargetDraft(request.processoVersionTarget || '');
  }, [request.id, request.processoChecklist, request.processoVersionChanged, request.processoVersionTarget]);

  useEffect(() => {
    setAutomacaoChecklistDraft(request.automacaoChecklist);
    setAutomacaoSyncValidatedDraft(request.automacaoSyncValidated);
  }, [request.id, request.automacaoChecklist, request.automacaoSyncValidated]);

  const toggleTesteChecklistItem = (key: string) => {
    setTesteChecklistDraft((prev) =>
      prev.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item))
    );
  };

  const toggleProcessoChecklistItem = (key: string) => {
    setProcessoChecklistDraft((prev) =>
      prev.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item))
    );
  };

  const toggleAutomacaoChecklistItem = (key: string) => {
    setAutomacaoChecklistDraft((prev) =>
      prev.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item))
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_QUALITY': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'PENDING_KIT': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'PENDING_QUALITY_AND_KIT': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'PENDING_SETUP_AND_KIT': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'PENDING_SETUP': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'PENDING_KIT_AFTER_SETUP': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
      case 'PENDING_TESTE': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'TESTE_IN_PROGRESS': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'PENDING_PROCESSO': return 'bg-zinc-200 text-zinc-700 border-zinc-300';
      case 'PROCESSO_IN_PROGRESS': return 'bg-stone-200 text-stone-700 border-stone-300';
      case 'PENDING_AUTOMACAO': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'AUTOMACAO_IN_PROGRESS': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_QUALITY': return 'Aguardando Qualidade';
      case 'PENDING_KIT': return 'Aguardando Área Kit';
      case 'PENDING_QUALITY_AND_KIT': return 'Aguardando Qualidade e Área Kit';
      case 'PENDING_SETUP_AND_KIT': return 'Aguardando Setup e Área Kit';
      case 'PENDING_SETUP': return 'Aguardando Setup';
      case 'IN_PROGRESS': return 'Em Execucao';
      case 'PENDING_KIT_AFTER_SETUP': return 'Aguardando Área Kit (Pós Setup)';
      case 'PENDING_TESTE': return 'Aguardando Eng. Teste';
      case 'TESTE_IN_PROGRESS': return 'Teste em Execucao';
      case 'PENDING_PROCESSO': return 'Aguardando Eng. Processo';
      case 'PROCESSO_IN_PROGRESS': return 'Processo em Execucao';
      case 'PENDING_AUTOMACAO': return 'Aguardando Eng. Automação';
      case 'AUTOMACAO_IN_PROGRESS': return 'Automação em Execucao';
      case 'COMPLETED': return 'Finalizado';
      default: return status;
    }
  };

  const canAction = () => {
    if (isDevAdmin && request.status !== 'COMPLETED') return true;
    if (role === 'QUALIDADE' && (request.status === 'PENDING_QUALITY' || request.status === 'PENDING_QUALITY_AND_KIT')) return true;
    if (role === 'AREA_KIT' && (request.status === 'PENDING_KIT' || request.status === 'PENDING_QUALITY_AND_KIT' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'PENDING_KIT_AFTER_SETUP')) return true;
    if (role === 'ENGENHARIA_SETUP' && (request.status === 'PENDING_SETUP' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'IN_PROGRESS')) return true;
    if (role === 'ENGENHARIA_TESTE' && (request.status === 'PENDING_TESTE' || request.status === 'TESTE_IN_PROGRESS')) return true;
    if (role === 'ENGENHARIA_PROCESSO' && (request.status === 'PENDING_PROCESSO' || request.status === 'PROCESSO_IN_PROGRESS')) return true;
    if (role === 'ENGENHARIA_AUTOMACAO' && (request.status === 'PENDING_AUTOMACAO' || request.status === 'AUTOMACAO_IN_PROGRESS')) return true;
    return false;
  };

  const handleAction = () => {
    if (role === 'QUALIDADE') {
      if (request.status === 'PENDING_QUALITY' || request.status === 'PENDING_QUALITY_AND_KIT') {
        onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'QUALIDADE');
      }
    } else if (role === 'AREA_KIT') {
      if (request.status === 'PENDING_KIT' || request.status === 'PENDING_QUALITY_AND_KIT' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'PENDING_KIT_AFTER_SETUP') {
        onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'AREA_KIT');
      }
    } else if (role === 'ENGENHARIA_SETUP') {
      if (request.status === 'PENDING_SETUP' || request.status === 'PENDING_SETUP_AND_KIT') {
        onUpdateStatus(request.id, 'IN_PROGRESS');
      } else if (request.status === 'IN_PROGRESS') {
        onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_SETUP');
      }
    } else if (role === 'ENGENHARIA_TESTE') {
      if (request.status === 'PENDING_TESTE') {
        onUpdateStatus(request.id, 'TESTE_IN_PROGRESS', {}, 'ENGENHARIA_TESTE');
      } else if (request.status === 'TESTE_IN_PROGRESS') {
        onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_TESTE');
      }
    } else if (role === 'ENGENHARIA_PROCESSO') {
      if (request.status === 'PENDING_PROCESSO') {
        onUpdateStatus(request.id, 'PROCESSO_IN_PROGRESS', {}, 'ENGENHARIA_PROCESSO');
      } else if (request.status === 'PROCESSO_IN_PROGRESS') {
        onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_PROCESSO');
      }
    } else if (role === 'ENGENHARIA_AUTOMACAO') {
      if (request.status === 'PENDING_AUTOMACAO') {
        onUpdateStatus(request.id, 'AUTOMACAO_IN_PROGRESS', {}, 'ENGENHARIA_AUTOMACAO');
      } else if (request.status === 'AUTOMACAO_IN_PROGRESS') {
        onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_AUTOMACAO');
      }
    }
  };

  const renderActionButtons = () => {
    if (isDevAdmin) {
      if (request.status === 'PENDING_QUALITY') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'QUALIDADE')}
            className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
          >
            Finalizar (Qualidade)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'PENDING_KIT') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'AREA_KIT')}
            className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
          >
            Confirmar Material (Área Kit)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'PENDING_SETUP_AND_KIT') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onUpdateStatus(request.id, 'IN_PROGRESS', {}, 'ENGENHARIA_SETUP')}
              className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
            >
              Aceitar (Setup)
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'AREA_KIT')}
              className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
            >
              Confirmar Material (Área Kit)
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'PENDING_KIT_AFTER_SETUP') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'AREA_KIT')}
            className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
          >
            Confirmar Material (Área Kit)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'PENDING_QUALITY_AND_KIT') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'QUALIDADE')}
              className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
            >
              Finalizar (Qualidade)
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'PENDING_SETUP', {}, 'AREA_KIT')}
              className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
            >
              Confirmar Material (Área Kit)
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'PENDING_SETUP') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'IN_PROGRESS', {}, 'ENGENHARIA_SETUP')}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
          >
            Aceitar (Setup)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'PENDING_TESTE') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onMaterialInLineConfirm(request.id, true)}
              className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
            >
              Material em linha: Sim
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onMaterialInLineConfirm(request.id, false)}
              className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
            >
              Material em linha: Não
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'TESTE_IN_PROGRESS', {}, 'ENGENHARIA_TESTE')}
              disabled={request.materialInLineConfirmed !== true}
              className="flex items-center gap-2 bg-cyan-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Aceitar (Eng. Teste)
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'TESTE_IN_PROGRESS') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTesteChecklist(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
            >
              Checklist Teste
              <ClipboardCheck size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_TESTE')}
              disabled={!request.testeChecklistCompleted}
              className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Finalizar Teste
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'PENDING_PROCESSO') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'PROCESSO_IN_PROGRESS', {}, 'ENGENHARIA_PROCESSO')}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
          >
            Aceitar (Eng. Processo)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'PROCESSO_IN_PROGRESS') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setShowProcessoChecklist(true)}
              className="flex items-center gap-2 bg-stone-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-stone-800 transition-all shadow-sm"
            >
              Checklist Processo
              <ClipboardCheck size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_PROCESSO')}
              disabled={!request.processoChecklistCompleted || (request.processoVersionChanged === true && !request.processoVersionTarget?.trim())}
              className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Finalizar (Eng. Processo)
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'PENDING_AUTOMACAO') {
        return (
          <button
            onClick={() => onUpdateStatus(request.id, 'AUTOMACAO_IN_PROGRESS', {}, 'ENGENHARIA_AUTOMACAO')}
            className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm"
          >
            Aceitar (Eng. Automação)
            <ChevronRight size={14} />
          </button>
        );
      }
      if (request.status === 'AUTOMACAO_IN_PROGRESS') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAutomacaoChecklist(true)}
              className="flex items-center gap-2 bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-teal-800 transition-all shadow-sm"
            >
              Checklist Automação
              <ClipboardCheck size={14} />
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_AUTOMACAO')}
              disabled={!request.automacaoChecklistCompleted || request.automacaoSyncValidated === undefined}
              className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Finalizar (Eng. Automação)
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
      if (request.status === 'IN_PROGRESS') {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => window.open(request.checklistUrl || SETUP_CHECKLIST_URL, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 bg-cyan-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-all shadow-sm"
            >
              Abrir Checklist
              <ExternalLink size={14} />
            </button>
            {!request.checklistCompleted && (
              <button
                onClick={() => onChecklistComplete(request.id)}
                className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
              >
                Marcar Checklist
                <ClipboardCheck size={14} />
              </button>
            )}
            <button
              onClick={() => onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_SETUP')}
              disabled={!request.checklistCompleted}
              className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Finalizar Setup
              <ChevronRight size={14} />
            </button>
          </div>
        );
      }
    }

    if (role === 'ENGENHARIA_SETUP' && request.status === 'IN_PROGRESS') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => window.open(request.checklistUrl || SETUP_CHECKLIST_URL, '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-2 bg-cyan-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-all shadow-sm"
          >
            Abrir Checklist
            <ExternalLink size={14} />
          </button>
          {!request.checklistCompleted && (
            <button
              onClick={() => onChecklistComplete(request.id)}
              className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
            >
              Marcar Checklist
              <ClipboardCheck size={14} />
            </button>
          )}
          <button
            onClick={handleAction}
            disabled={!request.checklistCompleted}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalizar Setup
            <ChevronRight size={14} />
          </button>
        </div>
      );
    }

    if (role === 'ENGENHARIA_TESTE' && request.status === 'PENDING_TESTE') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onMaterialInLineConfirm(request.id, true)}
            className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
          >
            Material em linha: Sim
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onMaterialInLineConfirm(request.id, false)}
            className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all shadow-sm"
          >
            Material em linha: Não
            <ChevronRight size={14} />
          </button>
          <button
            onClick={handleAction}
            disabled={request.materialInLineConfirmed !== true}
            className="flex items-center gap-2 bg-cyan-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aceitar (Eng. Teste)
            <ChevronRight size={14} />
          </button>
        </div>
      );
    }

    if (role === 'ENGENHARIA_TESTE' && request.status === 'TESTE_IN_PROGRESS') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => setShowTesteChecklist(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
          >
            Checklist Teste
            <ClipboardCheck size={14} />
          </button>
          <button
            onClick={handleAction}
            disabled={!request.testeChecklistCompleted}
            className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalizar Teste
            <ChevronRight size={14} />
          </button>
        </div>
      );
    }

    if (role === 'ENGENHARIA_PROCESSO' && request.status === 'PENDING_PROCESSO') {
      return (
        <button
          onClick={handleAction}
          className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
        >
          Aceitar (Eng. Processo)
          <ChevronRight size={14} />
        </button>
      );
    }

    if (role === 'ENGENHARIA_PROCESSO' && request.status === 'PROCESSO_IN_PROGRESS') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => setShowProcessoChecklist(true)}
            className="flex items-center gap-2 bg-stone-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-stone-800 transition-all shadow-sm"
          >
            Checklist Processo
            <ClipboardCheck size={14} />
          </button>
          <button
            onClick={handleAction}
            disabled={!request.processoChecklistCompleted || (request.processoVersionChanged === true && !request.processoVersionTarget?.trim())}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalizar (Eng. Processo)
            <ChevronRight size={14} />
          </button>
        </div>
      );
    }

    if (role === 'ENGENHARIA_AUTOMACAO' && request.status === 'PENDING_AUTOMACAO') {
      return (
        <button
          onClick={handleAction}
          className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm"
        >
          Aceitar (Eng. Automação)
          <ChevronRight size={14} />
        </button>
      );
    }

    if (role === 'ENGENHARIA_AUTOMACAO' && request.status === 'AUTOMACAO_IN_PROGRESS') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAutomacaoChecklist(true)}
            className="flex items-center gap-2 bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-teal-800 transition-all shadow-sm"
          >
            Checklist Automação
            <ClipboardCheck size={14} />
          </button>
          <button
            onClick={handleAction}
            disabled={!request.automacaoChecklistCompleted || request.automacaoSyncValidated === undefined}
            className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalizar (Eng. Automação)
            <ChevronRight size={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleAction}
        className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
      >
        {request.status === 'IN_PROGRESS'
          ? 'Finalizar Setup'
          : role === 'ENGENHARIA_TESTE'
            ? 'Aceite Teste'
          : role === 'ENGENHARIA_PROCESSO'
            ? 'Aceite Processo'
          : role === 'ENGENHARIA_AUTOMACAO'
            ? 'Aceite Automação'
          : role === 'AREA_KIT'
            ? 'Confirmar Material'
            : role === 'QUALIDADE'
              ? 'Finalizar Qualidade'
              : 'Aceitar Chamado'}
        <ChevronRight size={14} />
      </button>
    );
  };

  const isDocDone = request.hasDocument || !!request.qualityFinishedAt;
  const isKitDone = request.saPaidByKit || !!request.kitFinishedAt;
  const formatTime = (value?: string) => formatSafeDate(value, 'dd/MM HH:mm:ss');
  const formatDuration = (start?: string, end?: string) => {
    return formatDurationMs(durationMsBetween(start, end));
  };
  const derivedSetupStart = [request.createdAt, request.qualityFinishedAt, request.kitFinishedAt]
    .filter(Boolean)
    .reduce((latest, current) => {
      const latestMs = new Date(latest as string).getTime();
      const currentMs = new Date(current as string).getTime();
      return currentMs > latestMs ? (current as string) : (latest as string);
    }, request.createdAt as string);
  const setupStart = request.setupPendingAt || derivedSetupStart;
  const displayLine = sanitizeDisplayText(request.line) || request.line;
  const displayProduct = sanitizeDisplayText(request.product) || request.product;
  const totalSetupMs =
    durationMsBetween(request.qualityAcceptedAt, request.qualityFinishedAt) +
    durationMsBetween(request.kitAcceptedAt, request.kitFinishedAt) +
    durationMsBetween(request.setupAcceptedAt, request.setupFinishedAt) +
    durationMsBetween(request.testeAcceptedAt, request.testeFinishedAt) +
    durationMsBetween(request.processoAcceptedAt, request.processoFinishedAt) +
    durationMsBetween(request.automacaoAcceptedAt, request.automacaoFinishedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(request.status)}`}>
            {request.status === 'COMPLETED' ? <CheckCircle size={20} /> : <Clock size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Linha {displayLine}</span>
              <span className="text-zinc-300">-</span>
              <span className="text-xs font-medium text-zinc-500">
                {formatSafeDistanceToNow(request.createdAt)}
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Aberto por: <span className="font-semibold text-zinc-700">{request.createdByName || (request.createdBy ? request.createdBy.slice(0, 8).toUpperCase() : 'SEM USUÁRIO')}</span>
            </p>
            <h3 className="text-lg font-bold text-zinc-900">{displayProduct}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1 rounded-full border setup-chip border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
                <Settings size={11} />
                {request.setupType.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.lineDrainage ? 'border-sky-200 bg-sky-50' : 'border-zinc-200 bg-zinc-100'}`}>
                <Activity size={11} />
                Escoamento: {request.lineDrainage ? 'Sim' : 'Não'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${isDocDone ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                <FileText size={11} />
                Doc: {isDocDone ? 'Em Linha' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${isKitDone ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
                <CheckCircle2 size={11} />
                Material: {isKitDone ? 'Pago' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.checklistCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-zinc-100'}`}>
                <Settings size={11} />
                Checklist Setup: {request.checklistCompleted ? 'Concluido' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.testeChecklistCompleted ? 'border-indigo-200 bg-indigo-50' : 'border-zinc-200 bg-zinc-100'}`}>
                <ClipboardCheck size={11} />
                Checklist Teste: {request.testeChecklistCompleted ? 'Concluido' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.processoChecklistCompleted ? 'border-stone-300 bg-stone-100' : 'border-zinc-200 bg-zinc-100'}`}>
                <ClipboardCheck size={11} />
                Checklist Processo: {request.processoChecklistCompleted ? 'Concluido' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.automacaoChecklistCompleted ? 'border-teal-200 bg-teal-50' : 'border-zinc-200 bg-zinc-100'}`}>
                <ClipboardCheck size={11} />
                Checklist Automacao: {request.automacaoChecklistCompleted ? 'Concluido' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${request.automacaoSyncValidated === true ? 'border-emerald-200 bg-emerald-50' : request.automacaoSyncValidated === false ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-100'}`}>
                <Cpu size={11} />
                SYNC: {request.automacaoSyncValidated === true ? 'Validado' : request.automacaoSyncValidated === false ? 'Não validado' : 'Pendente'}
              </span>
              {request.processoVersionChanged && request.processoVersionTarget && (
                <span className="inline-flex items-center gap-1 rounded-full border setup-chip border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
                  <Cog size={11} />
                  Versão: {request.processoVersionTarget}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${getStatusColor(request.status)}`}>
            {getStatusLabel(request.status)}
          </div>

          {request.status === 'COMPLETED' && request.token && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
              <ShieldCheck size={14} />
              <span className="text-xs font-mono font-bold tracking-widest">{request.token}</span>
            </div>
          )}

          {canAction() && (
            <div className="flex gap-2">
              {renderActionButtons()}
            </div>
          )}
          {isDevAdmin && (
            <button
              onClick={() => onDeleteRequest(request.id)}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
              title="Excluir chamado (somente DEV)"
            >
              <Trash2 size={13} />
              Excluir
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100">
        <div className="mb-3 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="text-xs font-bold text-emerald-700">
            Tempo total de setup: {formatDurationMs(totalSetupMs)}
          </span>
        </div>
        <p className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wide">Linha do tempo</p>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Qualidade</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.qualityPendingAt || request.createdAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.qualityAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.qualityPendingAt || request.createdAt, request.qualityAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.qualityFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.qualityAcceptedAt, request.qualityFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Área Kit</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.kitPendingAt || request.createdAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.kitAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.kitPendingAt || request.createdAt, request.kitAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.kitFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.kitAcceptedAt, request.kitFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Engenharia (Setup)</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(setupStart)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.setupAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(setupStart, request.setupAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.setupFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.setupAcceptedAt, request.setupFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Engenharia (Teste)</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.testePendingAt || request.setupFinishedAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.testeAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.testePendingAt || request.setupFinishedAt, request.testeAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.testeFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.testeAcceptedAt, request.testeFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Engenharia (Processo)</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.processoPendingAt || request.testeFinishedAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.processoAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.processoPendingAt || request.testeFinishedAt, request.processoAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.processoFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.processoAcceptedAt, request.processoFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Engenharia (Automação)</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.automacaoPendingAt || request.processoFinishedAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.automacaoAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.automacaoPendingAt || request.processoFinishedAt, request.automacaoAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.automacaoFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.automacaoAcceptedAt, request.automacaoFinishedAt)}</span>
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTesteChecklist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h4 className="text-lg font-bold text-zinc-900 mb-2">Checklist da Engenharia de Teste</h4>
              <p className="text-xs text-zinc-500 mb-4">Marque os itens concluídos para liberar a finalização.</p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {testeChecklistDraft.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleTesteChecklistItem(item.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-zinc-800">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">
                  {testeChecklistDraft.filter((i) => i.checked).length}/{testeChecklistDraft.length} concluídos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTesteChecklist(false)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={async () => {
                      await onTesteChecklistSave(request.id, testeChecklistDraft);
                      setShowTesteChecklist(false);
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Salvar Checklist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showProcessoChecklist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h4 className="text-lg font-bold text-zinc-900 mb-2">Checklist da Engenharia de Processo</h4>
              <p className="text-xs text-zinc-500 mb-4">Marque os postos validados e confirme a mudança de versão.</p>

              <div className="space-y-2 mb-4">
                {processoChecklistDraft.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleProcessoChecklistItem(item.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-zinc-800">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2 mb-5">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">Teve mudança de versão no posto?</label>
                <select
                  value={processoVersionChangedDraft ? 'SIM' : 'NAO'}
                  onChange={(e) => {
                    const changed = e.target.value === 'SIM';
                    setProcessoVersionChangedDraft(changed);
                    if (!changed) setProcessoVersionTargetDraft('');
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="NAO">Não</option>
                  <option value="SIM">Sim</option>
                </select>
                {processoVersionChangedDraft && (
                  <input
                    value={processoVersionTargetDraft}
                    onChange={(e) => setProcessoVersionTargetDraft(e.target.value)}
                    placeholder="Para qual versão? Ex: V2.3.1"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                )}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">
                  {processoChecklistDraft.filter((i) => i.checked).length}/{processoChecklistDraft.length} concluídos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProcessoChecklist(false)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={async () => {
                      if (processoVersionChangedDraft && !processoVersionTargetDraft.trim()) {
                        window.alert('Informe para qual versão houve a mudança.');
                        return;
                      }
                      const saved = await onProcessoChecklistSave(request.id, processoChecklistDraft, processoVersionChangedDraft, processoVersionTargetDraft);
                      if (saved) {
                        setShowProcessoChecklist(false);
                      }
                    }}
                    className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800"
                  >
                    Salvar Checklist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showAutomacaoChecklist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h4 className="text-lg font-bold text-zinc-900 mb-2">Checklist da Engenharia de Automação</h4>
              <p className="text-xs text-zinc-500 mb-4">Marque o posto validado e informe se o sistema SYNC foi validado.</p>

              <div className="space-y-2 mb-4">
                {automacaoChecklistDraft.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleAutomacaoChecklistItem(item.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-zinc-800">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2 mb-5">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">Sistema SYNC validado?</label>
                <select
                  value={automacaoSyncValidatedDraft === undefined ? 'PENDENTE' : automacaoSyncValidatedDraft ? 'SIM' : 'NAO'}
                  onChange={(e) => {
                    if (e.target.value === 'SIM') setAutomacaoSyncValidatedDraft(true);
                    else if (e.target.value === 'NAO') setAutomacaoSyncValidatedDraft(false);
                    else setAutomacaoSyncValidatedDraft(undefined);
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="PENDENTE">Selecione...</option>
                  <option value="SIM">Sim</option>
                  <option value="NAO">Não</option>
                </select>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">
                  {automacaoChecklistDraft.filter((i) => i.checked).length}/{automacaoChecklistDraft.length} concluídos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAutomacaoChecklist(false)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={async () => {
                      const saved = await onAutomacaoChecklistSave(request.id, automacaoChecklistDraft, automacaoSyncValidatedDraft);
                      if (saved) {
                        setShowAutomacaoChecklist(false);
                      }
                    }}
                    className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
                  >
                    Salvar Checklist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



