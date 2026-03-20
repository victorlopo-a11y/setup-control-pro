/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Cog 
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

interface SetupRequest {
  id: string;
  line: string;
  product: string;
  setupType: 'LINHAO' | 'MEIA_LINHA';
  lineDrainage: boolean;
  hasDocument: boolean;
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'COMPLETED';
  token?: string;
  createdBy: string;
  saPaidByKit: boolean;
  checklistUrl?: string;
  checklistCompleted: boolean;
  checklistCompletedAt?: string;
  setupPendingAt?: string;
  createdAt: string;
  qualityAcceptedAt?: string;
  qualityFinishedAt?: string;
  kitAcceptedAt?: string;
  kitFinishedAt?: string;
  setupAcceptedAt?: string;
  setupFinishedAt?: string;
  testeAcceptedAt?: string;
  testeFinishedAt?: string;
  materialInLineConfirmed?: boolean;
  materialInLineCheckedAt?: string;
  history: RequestHistoryItem[];
}

interface SetupRequestRow {
  id: string;
  line: string;
  product: string;
  setup_type: 'LINHAO' | 'MEIA_LINHA';
  line_drainage: boolean;
  has_document: boolean;
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'COMPLETED';
  token: string | null;
  created_by: string;
  sa_paid_by_kit: boolean | null;
  checklist_url: string | null;
  checklist_completed: boolean | null;
  checklist_completed_at: string | null;
  setup_pending_at: string | null;
  created_at: string;
  quality_accepted_at: string | null;
  quality_finished_at: string | null;
  kit_accepted_at: string | null;
  kit_finished_at: string | null;
  setup_accepted_at: string | null;
  setup_finished_at: string | null;
  teste_accepted_at: string | null;
  teste_finished_at: string | null;
  material_in_line_confirmed: boolean | null;
  material_in_line_checked_at: string | null;
  history: RequestHistoryItem[] | null;
}

const mapRequest = (row: SetupRequestRow): SetupRequest => ({
  id: row.id,
  line: row.line,
  product: row.product,
  setupType: row.setup_type,
  lineDrainage: row.line_drainage,
  hasDocument: row.has_document,
  status: row.status,
  token: row.token || undefined,
  createdBy: row.created_by,
  saPaidByKit: row.sa_paid_by_kit ?? true,
  checklistUrl: row.checklist_url || undefined,
  checklistCompleted: row.checklist_completed ?? false,
  checklistCompletedAt: row.checklist_completed_at || undefined,
  setupPendingAt: row.setup_pending_at || undefined,
  createdAt: row.created_at,
  qualityAcceptedAt: row.quality_accepted_at || undefined,
  qualityFinishedAt: row.quality_finished_at || undefined,
  kitAcceptedAt: row.kit_accepted_at || undefined,
  kitFinishedAt: row.kit_finished_at || undefined,
  setupAcceptedAt: row.setup_accepted_at || undefined,
  setupFinishedAt: row.setup_finished_at || undefined,
  testeAcceptedAt: row.teste_accepted_at || undefined,
  testeFinishedAt: row.teste_finished_at || undefined,
  materialInLineConfirmed: row.material_in_line_confirmed ?? undefined,
  materialInLineCheckedAt: row.material_in_line_checked_at || undefined,
  history: row.history || [],
});

const ROLE_OPTIONS: { id: UserRole; label: string; icon: any; color: string }[] = [
  { id: 'PRODUCAO', label: 'ProduÃ§Ã£o', icon: LayoutDashboard, color: 'bg-sky-100 text-sky-700' },
  { id: 'QUALIDADE', label: 'Qualidade', icon: ShieldCheck, color: 'bg-amber-100 text-amber-700' },
  { id: 'AREA_KIT', label: 'Area Kit', icon: CheckCircle2, color: 'bg-orange-100 text-orange-700' },
  { id: 'ENGENHARIA_SETUP', label: 'Engenharia (Setup)', icon: Settings, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'ENGENHARIA_TESTE', label: 'Engenharia (Teste)', icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'ENGENHARIA_AUTOMACAO', label: 'Engenharia (AutomaÃ§Ã£o)', icon: Cpu, color: 'bg-cyan-100 text-cyan-700' },
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
      return 'E-mail ou senha invÃ¡lidos. Se acabou de criar a conta, confirme o e-mail no link enviado pelo Supabase.';
    }
    if (normalized.includes('email not confirmed')) {
      return 'E-mail ainda nÃ£o confirmado. Verifique sua caixa de entrada e confirme a conta.';
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

    setSuccessMessage('Enviamos o link de recuperaÃ§Ã£o de senha para seu e-mail.');
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
            {mode === 'signup' ? 'Ja tem conta? Troque para Entrar.' : 'Nao tem conta? Use Criar Conta.'}
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
        <p className="text-zinc-500 mb-8 text-center">Para continuar, identifique sua Ã¡rea de atuaÃ§Ã£o</p>
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
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SetupRequest[]>([]);
  const [showForm, setShowForm] = useState(false);

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
      displayName: user.user_metadata?.full_name || user.user_metadata?.name || 'UsuÃ¡rio',
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

    const { error } = await supabase.from('setup_requests').insert({
      line: data.line,
      product: data.product,
      setup_type: data.setupType,
      line_drainage: data.lineDrainage,
      has_document: data.hasDocument,
      sa_paid_by_kit: data.saPaidByKit,
      checklist_url: SETUP_CHECKLIST_URL,
      checklist_completed: false,
      setup_pending_at: initialStatus === 'PENDING_SETUP' ? new Date().toISOString() : null,
      material_in_line_confirmed: null,
      material_in_line_checked_at: null,
      status: initialStatus,
      created_by: user.id,
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
        updateData.setup_accepted_at = now;
      }
    } else if (newStatus === 'TESTE_IN_PROGRESS') {
      if (currentRequest.materialInLineConfirmed !== true) {
        window.alert('Antes do aceite da Eng. de Teste, confirme se o material consta em linha.');
        return;
      }
      if (effectiveRole === 'ENGENHARIA_TESTE') {
        updateData.teste_accepted_at = now;
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
        }
      } else if (effectiveRole === 'ENGENHARIA_TESTE') {
        updateData.teste_finished_at = now;
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

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <RoleSelection onSelect={handleRoleSelect} />;

  const isDevAdmin = isDevAdminEmail(profile.email);
  const currentRole = isDevAdmin ? devActiveRole : profile.role;

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
          <div className="flex items-center gap-4">
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
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tempo MÃ©dio</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">--:--</p>
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

        {/* Request List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText size={20} className="text-zinc-400" />
            Chamados Recentes
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
                  <p className="text-zinc-400">Nenhum chamado encontrado.</p>
                </div>
              ) : (
                requests.map((req) => (
                  <RequestCard 
                    key={req.id} 
                    request={req} 
                    role={currentRole}
                    isDevAdmin={isDevAdmin}
                    onUpdateStatus={handleUpdateStatus}
                    onChecklistComplete={handleChecklistComplete}
                    onMaterialInLineConfirm={handleMaterialInLineConfirm}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
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
                <h3 className="text-xl font-bold text-zinc-900">Nova SolicitaÃ§Ã£o de Setup</h3>
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
                      <option value="LINHAO">LinhÃ£o</option>
                      <option value="MEIA_LINHA">Meia Linha</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-700">Escoamento de Linha?</label>
                    <select name="lineDrainage" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                      <option value="true">Sim</option>
                      <option value="false">NÃ£o</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Documento estÃ¡ em linha?</label>
                  <select name="hasDocument" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                    <option value="true">Sim</option>
                    <option value="false">NÃ£o</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">SA jÃ¡ pago pela area kit?</label>
                  <select name="saPaidByKit" className="w-full p-3 rounded-xl border border-zinc-200 outline-none">
                    <option value="true">Sim</option>
                    <option value="false">NÃ£o</option>
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

function RequestCard({ request, role, isDevAdmin, onUpdateStatus, onChecklistComplete, onMaterialInLineConfirm }: {
  key?: React.Key;
  request: SetupRequest;
  role: UserRole;
  isDevAdmin: boolean;
  onUpdateStatus: (id: string, status: string, data?: any, actorRole?: UserRole) => Promise<void>;
  onChecklistComplete: (id: string) => Promise<void>;
  onMaterialInLineConfirm: (id: string, confirmed: boolean) => Promise<void>;
}) {
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
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_QUALITY': return 'Aguardando Qualidade';
      case 'PENDING_KIT': return 'Aguardando Area Kit';
      case 'PENDING_QUALITY_AND_KIT': return 'Aguardando Qualidade e Area Kit';
      case 'PENDING_SETUP_AND_KIT': return 'Aguardando Setup e Area Kit';
      case 'PENDING_SETUP': return 'Aguardando Setup';
      case 'IN_PROGRESS': return 'Em Execucao';
      case 'PENDING_KIT_AFTER_SETUP': return 'Aguardando Area Kit (Pos Setup)';
      case 'PENDING_TESTE': return 'Aguardando Eng. Teste';
      case 'TESTE_IN_PROGRESS': return 'Teste em Execucao';
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
            Confirmar SA (Area Kit)
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
              Confirmar SA (Area Kit)
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
            Confirmar SA (Area Kit)
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
              Confirmar SA (Area Kit)
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
              Material em linha: Nao
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
          <button
            onClick={() => onUpdateStatus(request.id, 'COMPLETED', {}, 'ENGENHARIA_TESTE')}
            className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm"
          >
            Finalizar (Eng. Teste)
            <ChevronRight size={14} />
          </button>
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
            Material em linha: Nao
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
        <button
          onClick={handleAction}
          className="flex items-center gap-2 bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 transition-all shadow-sm"
        >
          Finalizar (Eng. Teste)
          <ChevronRight size={14} />
        </button>
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
          : role === 'AREA_KIT'
            ? 'Confirmar SA'
            : role === 'QUALIDADE'
              ? 'Finalizar Qualidade'
              : 'Aceitar Chamado'}
        <ChevronRight size={14} />
      </button>
    );
  };

  const isDocDone = request.hasDocument || !!request.qualityFinishedAt;
  const isKitDone = request.saPaidByKit || !!request.kitFinishedAt;
  const formatTime = (value?: string) => (value ? format(new Date(value), 'dd/MM HH:mm:ss') : '--');
  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return '--';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs <= 0) return '0s';
    const totalSec = Math.floor(diffMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  };
  const derivedSetupStart = [request.createdAt, request.qualityFinishedAt, request.kitFinishedAt]
    .filter(Boolean)
    .reduce((latest, current) => {
      const latestMs = new Date(latest as string).getTime();
      const currentMs = new Date(current as string).getTime();
      return currentMs > latestMs ? (current as string) : (latest as string);
    }, request.createdAt as string);
  const setupStart = request.setupPendingAt || derivedSetupStart;

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
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Linha {request.line}</span>
              <span className="text-zinc-300">•</span>
              <span className="text-xs font-medium text-zinc-500">
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{request.product}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase">
                {request.setupType.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase">
                Escoamento: {request.lineDrainage ? 'Sim' : 'Nao'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase">
                Doc: {isDocDone ? 'Em Linha' : 'Pendente'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase">
                SA Kit: {isKitDone ? 'Pago' : 'Pendente'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase">
                Checklist: {request.checklistCompleted ? 'Concluido' : 'Pendente'}
              </span>
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
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100">
        <p className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wide">Linha do tempo</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Qualidade</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.createdAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.qualityAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.createdAt, request.qualityAcceptedAt || request.qualityFinishedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.qualityFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.createdAt, request.qualityFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Area Kit</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.createdAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.kitAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.createdAt, request.kitAcceptedAt || request.kitFinishedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.kitFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.createdAt, request.kitFinishedAt)}</span>
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
              Conclusao: {formatTime(request.setupFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(setupStart, request.setupFinishedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-sm font-bold text-zinc-900 mb-1">Engenharia (Teste)</p>
            <p className="text-xs text-zinc-600">Inicio: {formatTime(request.setupFinishedAt)}</p>
            <p className="text-xs text-zinc-600">Aceite: {formatTime(request.testeAcceptedAt)}</p>
            <p className="text-xs text-zinc-600">
              Tempo ate aceite: <span className="font-bold text-cyan-700">{formatDuration(request.setupFinishedAt, request.testeAcceptedAt)}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Conclusao: {formatTime(request.testeFinishedAt)} - <span className="font-bold text-emerald-600">Total: {formatDuration(request.setupFinishedAt, request.testeFinishedAt)}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

