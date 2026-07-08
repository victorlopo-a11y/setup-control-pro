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
  ChevronDown,
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
  BarChart3,
  Filter
  ,
  Trash2,
  RefreshCw,
  Package,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  isSupabaseAnonKeyLikelyInvalid,
  isSupabaseConfigured,
  isSupabaseUrlPlaceholder,
  supabase,
  supabaseAnonKeyHint,
  supabaseConfigError,
  supabaseBaseUrlForDebug,
  supabaseUrlForDebug,
} from './supabase';

const formatSupabaseErrorDetails = (err: any) => {
  const status = err?.status ?? err?.statusCode ?? err?.code;
  const message = `${err?.message || ''}`.trim();
  const details = `${err?.details || ''}`.trim();
  const hint = `${err?.hint || ''}`.trim();
  const errorCode = `${err?.code || ''}`.trim();
  const parts = [
    status ? `status: ${status}` : '',
    errorCode ? `code: ${errorCode}` : '',
    message ? `message: ${message}` : '',
    details ? `details: ${details}` : '',
    hint ? `hint: ${hint}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join('\n- ') : 'sem detalhes';
};

// Types
type UserRole =
  | 'PRODUCAO'
  | 'QUALIDADE'
  | 'AREA_KIT'
  | 'PCP'
  | 'ENGENHARIA_SETUP'
  | 'ENGENHARIA_TESTE'
  | 'ENGENHARIA_AUTOMACAO'
  | 'ENGENHARIA_PROCESSO'
  | 'ALMOXERIFADO'
  | 'DEV_ADMIN';

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
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'PENDING_PROCESSO' | 'PROCESSO_IN_PROGRESS' | 'PENDING_AUTOMACAO' | 'AUTOMACAO_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  qualityDocumentReceivedBy?: string;
  kitMaterialReceivedBy?: string;
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
  status: 'PENDING_QUALITY' | 'PENDING_KIT' | 'PENDING_QUALITY_AND_KIT' | 'PENDING_SETUP_AND_KIT' | 'PENDING_SETUP' | 'IN_PROGRESS' | 'PENDING_KIT_AFTER_SETUP' | 'PENDING_TESTE' | 'TESTE_IN_PROGRESS' | 'PENDING_PROCESSO' | 'PROCESSO_IN_PROGRESS' | 'PENDING_AUTOMACAO' | 'AUTOMACAO_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  quality_document_received_by: string | null;
  kit_material_received_by: string | null;
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
  status: SetupRequest['status'] | OppoRequestStatus;
  source: 'SETUP' | 'OPPO_ALMOX';
  message: string;
  createdAt: string;
  read: boolean;
}
type NotificationSignatureMap = Partial<Record<UserRole, string[]>>;

type InterfaceTheme = 'default' | 'ocean' | 'graphite' | 'sunset';
const FIRST_ACCESS_ONBOARDING_VERSION = 'v1';

type OppoCallType = 'SOLICITACAO_DISPOSITIVO' | 'DEVOLUCAO_DISPOSITIVO';
type OppoRequestStatus = 'ABERTO' | 'SEPARACAO' | 'CONFERINDO' | 'FINALIZADO_ALMOXERIFADO' | 'CONCLUIDO' | 'DIVERGENCIA';
type OppoLineType = 'MONTAGEM' | 'MONTAGEM/TESTE' | 'EMBALAGEM';
type OppoSetupSolicitationStatus = 'PENDING_PROCESSO' | 'ACCEPTED' | 'CANCELLED';
interface OppoPaidItem {
  code: string;
  quantity: number;
}

interface OppoRequest {
  id: string;
  callType: OppoCallType;
  status: OppoRequestStatus;
  line?: string;
  product?: string;
  lineType?: OppoLineType;
  createdBy: string;
  createdByName?: string;
  almoxBy?: string;
  almoxByName?: string;
  requestedAt: string;
  acceptedAt?: string;
  finalizedAt?: string;
  requesterConfirmedAt?: string;
  requesterConfirmed?: boolean;
  requesterConfirmedBy?: string;
  requesterConfirmedByName?: string;
  returnItemsNote?: string;
  returnItemsSelected: OppoPaidItem[];
  paidItems: OppoPaidItem[];
  paidItemsNote?: string;
  notes?: string;
}

interface OppoSetupStartDraft {
  line: string;
  product: string;
  lineType: OppoLineType;
  sessionId: string;
  productionOrder?: string;
}

interface OppoSetupSolicitation {
  id: string;
  line: string;
  product: string;
  lineType: OppoLineType;
  productionOrder?: string;
  targetRole: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE';
  status: OppoSetupSolicitationStatus;
  sessionId: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: string;
  finishedAt?: string;
  cancelledAt?: string;
}

interface OppoSetupSolicitationRow {
  id: string;
  line: string | null;
  product: string | null;
  line_type: OppoLineType | null;
  production_order: string | null;
  target_role: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' | null;
  status: OppoSetupSolicitationStatus | null;
  session_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string | null;
  accepted_by: string | null;
  accepted_by_name: string | null;
  accepted_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
}

interface OppoPressChecklistDraft {
  trocaFixtures: boolean;
  debug: boolean;
  papelSensivel: boolean;
  ionizador: boolean;
  lupa: boolean;
}

interface OppoSetupPostTemplate {
  code: string;
  description: string;
  isMachinePress: boolean;
  hasIonizer: boolean;
  hasLupa: boolean;
  order: number;
}

interface QuantityEditorState {
  open: boolean;
  code: string;
  quantityInput: string;
  source: 'RETURN' | 'ALMOX';
  clearInputAfterSave: boolean;
}

interface OppoRequestRow {
  id: string;
  call_type: OppoCallType | null;
  status: OppoRequestStatus | null;
  line: string | null;
  product: string | null;
  line_type: OppoLineType | null;
  created_by: string | null;
  created_by_name: string | null;
  almox_by: string | null;
  almox_by_name: string | null;
  requested_at: string | null;
  accepted_at: string | null;
  finalized_at: string | null;
  requester_confirmed_at: string | null;
  requester_confirmed: boolean | null;
  requester_confirmed_by: string | null;
  requester_confirmed_by_name: string | null;
  return_items_note: string | null;
  return_items_selected: any[] | null;
  paid_items_selected: any[] | null;
  paid_items_note: string | null;
  notes: string | null;
}

interface OppoSetupLayoutRow {
  product_key: string;
  target_role?: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' | null;
  posts: any[] | null;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
}

const parseOppoPaidItems = (value: any): OppoPaidItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { code: item.replace(/\s+/g, '').trim(), quantity: 1 };
      }
      if (item && typeof item === 'object') {
        const code = `${item.code ?? ''}`.replace(/\s+/g, '').trim();
        const quantityRaw = Number(item.quantity);
        const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;
        if (!code) return null;
        return { code, quantity };
      }
      return null;
    })
    .filter((item): item is OppoPaidItem => !!item && !!item.code);
};

const OPPO_LEGACY_CONFERINDO_TAG = '[LEGACY_CONFERINDO]';

const mapOppoRequest = (row: OppoRequestRow): OppoRequest => {
  const rawNotes = row.notes || '';
  const isLegacyConferindo = row.status === 'SEPARACAO' && rawNotes.includes(OPPO_LEGACY_CONFERINDO_TAG);
  const status: OppoRequestStatus =
    row.status === 'ABERTO' ||
    row.status === 'SEPARACAO' ||
    row.status === 'CONFERINDO' ||
    row.status === 'FINALIZADO_ALMOXERIFADO' ||
    row.status === 'CONCLUIDO' ||
    row.status === 'DIVERGENCIA'
      ? (isLegacyConferindo ? 'CONFERINDO' : row.status)
      : 'ABERTO';

  return {
    id: row.id,
    callType: row.call_type === 'DEVOLUCAO_DISPOSITIVO' ? 'DEVOLUCAO_DISPOSITIVO' : 'SOLICITACAO_DISPOSITIVO',
    status,
    line: row.line || undefined,
    product: row.product || undefined,
    lineType:
      row.line_type === 'MONTAGEM' || row.line_type === 'MONTAGEM/TESTE' || row.line_type === 'EMBALAGEM' ? row.line_type : undefined,
    createdBy: row.created_by || 'SEM_USUARIO',
    createdByName: row.created_by_name || undefined,
    almoxBy: row.almox_by || undefined,
    almoxByName: row.almox_by_name || undefined,
    requestedAt: row.requested_at || new Date().toISOString(),
    acceptedAt: row.accepted_at || undefined,
    finalizedAt: row.finalized_at || undefined,
    requesterConfirmedAt: row.requester_confirmed_at || undefined,
    requesterConfirmed: row.requester_confirmed ?? undefined,
    requesterConfirmedBy: row.requester_confirmed_by || undefined,
    requesterConfirmedByName: row.requester_confirmed_by_name || undefined,
    returnItemsNote: row.return_items_note || undefined,
    returnItemsSelected: parseOppoPaidItems(row.return_items_selected),
    paidItems: parseOppoPaidItems(row.paid_items_selected),
    paidItemsNote: row.paid_items_note || undefined,
    notes: rawNotes.replace(OPPO_LEGACY_CONFERINDO_TAG, '').trim() || undefined,
  };
};

const mapOppoSetupSolicitation = (row: OppoSetupSolicitationRow): OppoSetupSolicitation => {
  const status: OppoSetupSolicitationStatus =
    row.status === 'ACCEPTED' || row.status === 'CANCELLED' || row.status === 'PENDING_PROCESSO'
      ? row.status
      : 'PENDING_PROCESSO';

  const lineType: OppoLineType =
    row.line_type === 'EMBALAGEM' ? 'EMBALAGEM' : row.line_type === 'MONTAGEM' ? 'MONTAGEM' : 'MONTAGEM/TESTE';

  return {
    id: row.id,
    line: row.line || '',
    product: row.product || '',
    lineType,
    productionOrder: row.production_order || undefined,
    targetRole: row.target_role === 'ENGENHARIA_TESTE' ? 'ENGENHARIA_TESTE' : 'ENGENHARIA_PROCESSO',
    status,
    sessionId: row.session_id || '',
    createdBy: row.created_by || 'SEM_USUARIO',
    createdByName: row.created_by_name || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    acceptedBy: row.accepted_by || undefined,
    acceptedByName: row.accepted_by_name || undefined,
    acceptedAt: row.accepted_at || undefined,
    finishedAt: row.finished_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
  };
};

const getOppoCallTypeLabel = (callType: OppoCallType) =>
  callType === 'SOLICITACAO_DISPOSITIVO'
    ? 'Solicitação de Equipamentos/Dispositivos'
    : 'Devolução de Equipamentos/Dispositivos';

const getOppoStatusLabel = (status: OppoRequestStatus) => {
  switch (status) {
    case 'ABERTO':
      return 'Aberto';
    case 'SEPARACAO':
      return 'Separação';
    case 'CONFERINDO':
      return 'Conferindo';
    case 'FINALIZADO_ALMOXERIFADO':
      return 'Finalizado Almoxerifado';
    case 'CONCLUIDO':
      return 'Concluído';
    case 'DIVERGENCIA':
      return 'Divergência';
    default:
      return status;
  }
};

const getOppoStatusStyle = (status: OppoRequestStatus) => {
  switch (status) {
    case 'ABERTO':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'SEPARACAO':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'CONFERINDO':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'FINALIZADO_ALMOXERIFADO':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'CONCLUIDO':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'DIVERGENCIA':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
  }
};
const formatOppoPaidItems = (items: OppoPaidItem[]) =>
  items.length ? items.map((item) => `${item.code} (QTD: ${item.quantity})`).join(', ') : '--';
const getOppoSetupStatusLabel = (status: OppoRequestStatus) => {
  switch (status) {
    case 'ABERTO':
      return 'Aberto';
    case 'SEPARACAO':
      return 'Em preparação';
    case 'CONFERINDO':
      return 'Em conferência';
    case 'FINALIZADO_ALMOXERIFADO':
      return 'Pronto para finalizar';
    case 'DIVERGENCIA':
      return 'Revisão necessária';
    case 'CONCLUIDO':
      return 'Concluído';
    default:
      return 'Em andamento';
  }
};

const OPPO_LINE_OPTIONS = ['N111', 'N112', 'N113', 'N121', 'N122', 'N123'] as const;
  const resolveOppoLineType = (line?: string): OppoLineType | '' => {
    if (!line) return '';
    if (line === 'N111' || line === 'N112' || line === 'N113') return 'MONTAGEM/TESTE';
    if (line === 'N121' || line === 'N122' || line === 'N123') return 'EMBALAGEM';
    return '';
  };

const OPPO_IDENTIFICATION_CODES = Array.from(
  new Set(
    [
      '711050026878','711050011202','711050009126','711050009211','711050009213','711050021655','711050061417','711050040387',
      '711050040394','711050041555','711050041536','711050041554','711050041519','711050042681','711050048236','711050042676',
      '711050041569','711050041570','711050041571','711050042657','711050041574','711050041537','711050041586','711050041511',
      '711050041544','711050041535','711050041564','711050045284','711050041531','711050041508','711050047425','711050041567',
      '711050042848','711050042863','711050042850','711050045159','711050041572','711050041513','711050059301','711050058440',
      '711050059449','711050059450','711050059448','711050059451','711050059452','711050059453','711050062919','711050060080',
      '711050056904','711050057963','711050057962','711050060083','711050056897','711050060086','711050060085','711050060082',
      '711050062918','711050062920','711050057950','711050060087','711050056978','711050056900','711050056896','711050060081',
      '711050056977','711050057951','711050057949','711050056965','711050057952','711050057953','711050056957','711050056906',
      '711050060427','711050057960','711050058044','711050057965','711050057959','711050056885','711050057961','71105005691',
      '711050056907','711050056975','711050058992','711050057948','711050056963','711050056964','711050059770','711050056972',
      '711050057945','711050058263','711050058989','711050060084','711050056895','711050056898','711050062917','711050059000',
      '711050059001','711050058998','711050058999','711050057499','711050057538','711050057539','711050059399','711050058171',
      '711050057536','711050058170','711050060255','711050060225','711050060226','711050060228','711050060227','711050060245',
      '711050060205','711050060229','711050060242','711050060244','711050060243','711050062968','711050014960','711050010769',
      '711050010810','711050010809','711050010836','711050010792','711051014341','711050014340','N/A','711050010909',
      '711050011201','711050010808','711050014578','711050010784','711050010804','711050011193','711050011194','711050011541',
      '711050010770','711050010783','711050014577','711050011203','711050010908','711050014342','711050010802','711050010800',
      '711050013011','711050010793','711050010780','711050011138','711050011199','711050010789','711050010790','711050014339',
      '711050010788','711050019396','711050010787','711050010791','711050011184','711050011186','711050011187','711050013301',
      '711050013311','711050013300','711050013303','711050010667','711050011197','711050010209','711050009182','711050009230',
      '711050011617','711050009175','711050009170','711050009220','711050009134','711050009199','711050009130','711050009150',
      '7110350009195','711050009153','711050009142','711050009137','711050010636','711050009154','711050011634','711050010210',
      '711050009169','711050009198','711050009208','711050009210','711050009218','711050009177','711050011633','711050012287',
      '711050009197','711050009140','711050011618','711050011622','711050009214','711050009217','711050009160','711050009161',
      '711050011635','711050009196','711050009159','711050009207','711050009178','711050009176','711050009221','711050009191',
      '711050009219','711050009174','711050010638','711050010633','711050010213','711050011623','711050009148','711050009149',
      '711050009162','711050009209','711050009147','711050009151','711050009216','711050009184','711050009179','711050009183',
      '711050009180','711050010643','711050010634','711050010639','711050010635','711050010642','711050010640','711050010641',
      '711050010644','711050009152','711050009185','711050021749','711050022956','711050026039','711050024921','711050024939',
      '711050026134','711050025941','711050024913','711050024910','711050024898','711050024917','711050027265','711050024938',
      '711050024937','711050024936','711050024920','711050025955','711050026978','711050024934','711050024933','711050024907',
      '711050024943','711050024935','711050024940','711050024941','711050024930','711050034905','711050024900','711050024942',
      '711050024904','711050024946','711050024928','711050024945','711050024916','711050024915','711050024914','711050024944',
      '711050025175','711050024922','711050024902','711050025763','711050037201','711050040019','711050036077','711050036078',
      '711050036076','711050034254','711050034297','711050034252','711050034281','711050035192','711050034267','711050034292',
      '711050034289','711050034258','711050034295','711050034253','711050034888','711050041807','711050034892','711050034280',
      '711050034278','711050034277','711050034291','711050040415','711050034276','711050034477','711050034282','711050042953',
      '711050036759','711050037246','711050037247','711050034993','71105003671','711050034284','711050042044','711050038493',
      '711050034251','711050039770','711050034489','711050034482','711050034488','711050034481','711050034487','711050034479',
      '711050034485','711050034484','711050034483','711050934480','711050034486','711050034478','711050054968','711050054970',
      '711050034270','711050034279','711050034244','711050035193','711050034293','711050034990','711050034271','711050034241',
      '711050034248','711050034294','711050034989','711050034992','711050034889','711050034243','711050034255','711050034239',
      '711050034238','711050036758','711050035841','711050034268','711050035291','711050035290','711050035292','711050034991',
      '711050042861','711050040032','711050043395','711950039817','711050039772','711050039833','711050039759','711050039782',
      '711050039793','711050039812','711050039785','711050041806','711050039783','711060039790','711050039787','711050039809',
      '711050043316','711050043688','711050039811','711050049128','711050039765','711050039813','711050039820','711050043317',
      '711050043643','711050043313','711050043314','711050043320','711050043687','711050043318','711050039810','711050049127',
      '71105003982','711050043319','711050043393','711050039815','711050043255','711050039816','711050039806','711050039807',
      '711050039773','711050039768','711050039792','711050039776','711050039775','711050039788','711050040178','711050043350',
      '711050039808','711050039814','711050043394','7110500041433','711050049132','711050039764','711050039798','711050039755',
      '711050049133','711050049130','711050049131','711060043319','711050042466','711050043663','711050039780','711050039763',
      '711050041433','711050039824','711050046482','711060039801','711050039761','711050039791','711050039799','711050039818',
      '711050039774','711050039822','711050039758','711050039789','711050039762','711050039802','711050046357','711060039802',
      '711050039760','711050039784','711050039769','711050042851','711050039786','71105004912','711050039766','711050039821',
      '711050039819','711060049128','711050049129','711080049131','711050039826','711050039832','711050039825','711050044272',
      '711060039804','711050039805','711050039779','711050041805','711050043662','711050042702','711050040431','711050040436',
      '711050040391','711050040444','711050041312','711050040413','711050040974','711050040440','711050039834','711050040443',
      '711050040389','711050040432','711050040442','711050040429','711050040430','711050041323','711050041324','711050040414',
      '711050043913','711050041310','711050040390','711050040438','711050040426','711050040435','711050040437','711050040434',
      '711050040427','711050040423','711050042728','711050041309','711050040404','711050047061','7110500422727','711050040422',
      '711050040439','711050040428','711050040433','711050040410','711050040420','711050041326','711050041335','711050041332',
      '711050040424','711050040385','711050040383','711050041330','711050041329','711050041325','711050041327','711050040386',
      '711050041311','711050040973','711050043912','711050040397','711050040388','711050042729','711050042730','711050040412',
      '711050040411','711050040396','711050040416','711050041334','711050041333','711050041328','711050040393','711050040418',
      '711050041409','71105004140','711050040441','711050040406','711050042494','711050040405','711050040400','711050041520',
      '711050042687','711050042698','711050041561','711050048237','711050041568','7111050041523','711050041495','711050048472',
      '711050041556','711050043353','711050041566','711050041509','711050041545','711050041549','711050042680','711050042679',
      '711050041557','711050046570','711050041496','711050041494','711050050544','711050042682','711050042699','711050042696',
      '711050042689','711050042691','711050042697','711050041550','711050041518','711050041552','711050042849','711050042491',
      '711050041575','711050041522','711050041553','711040041573','711050041565','711050042836','711050043995','711050042874',
      '711050042875','711050048073','711050048074','711050042688','711050041510','711050041559','711050042675','711050041491',
      '711050072525','711050041512','711050041584','711050048158','711050041587','711050042492','711050048154','711050041547',
      '711050042683','711050041551','711050042674','711050042678','711050042677','711050040419','711050041525','711050041548',
      '711050041498','711050041497','711050048348','711050042684','711050042685','711050042695','711050045402','711050042694',
      '711050042692','711050042690','711050045282','711050042686','711050042700','711050043732','711050041527','711050041492',
      '711050041563','711050041524','711050045161','711050045160','711050042864','711050041538','711050041493','711050042693',
      '711050049640','711050049641','711050050369','711050049525','711050057471','711050057473','711050049490','711050050851',
      '711050049493','711050049647','711050049503','711050049547','711050049486','711050049535','711050050852','711050049540',
      '711050049654','711050049500','711050050371','711050049516','711050050496','711050054466','711050049508','711050049526',
      '711050049513','711050050495','711050050491','71105006472','711050058047','711050057469','711050057474','711050057475',
      '711050057472','711050049499','711050049498','711050050494','711050049546','711050050370','711050049467','711050049492',
      '711050049532','711050049655','711050051282','711050049496','711050053707','711050050850','711050049533','711050049501',
      '711050049502','711050949501','711050054474','711050049639','711050050840','711050057467','711050057470','711050058046',
      '711050050941','711050049558','711050049485','711050057476','711050049534','711050049530','71105004930','711050049527',
      '711050050838','711050049483','711050049505','711050057468','711050049482','711050050837','711050049531','711050049653',
      '711050049557','711050050845','711050050842','711050049489','711050054467','711050049507','711050049506','711050049583',
      '711050055296','711050049511','711050049491','711050049717','711050049494','711050055297','711050049522','711050050490',
      '711050050603','711050050601','711050050599','711050050602','711050050600','711050050585','711050050586','711050050604',
      '711050059303','711050059299','711050058478','711050059277','711050059281','711050059300','711050058485','7110500058477',
      '711050058517','711050058486','711050059276','711050058484','711050058492','711050058479','711050058480','711050058427',
      '711050059279','711050058491','711050058462','711050065299','711050059285','711050058481'
    ].map((code) => code.replace(/\s+/g, '').trim()).filter(Boolean)
  )
);

const OPPO_SETUP_SESSION_TAG_PREFIX = '[SETUP_SESSION:';
const OPPO_SETUP_POST_TAG_PREFIX = '[SETUP_POST:';
const OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX = '[SETUP_OP:';
const OPPO_SETUP_SESSION_COMPLETED_TAG = '[SETUP_SESSION_COMPLETED]';
const OPPO_SETUP_TARGET_ROLE_TAG_PREFIX = '[SETUP_TARGET_ROLE:';
const OPPO_PRESS_CHECKLIST_TAG_PREFIX = '[PRESS_CHECKLIST:';
const DEFAULT_OPPO_SETUP_POSTS = [
  ...Array.from({ length: 5 }, (_v, i) => `PP${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 31 }, (_v, i) => `P${String(i + 1).padStart(2, '0')}`),
];
const OPPO_SETUP_PLANNED_MINUTES_PER_POST = 3;

const extractTaggedValue = (notes: string | undefined, prefix: string): string => {
  if (!notes) return '';
  const idx = notes.indexOf(prefix);
  if (idx < 0) return '';
  const start = idx + prefix.length;
  const end = notes.indexOf(']', start);
  if (end < 0) return '';
  return notes.slice(start, end).trim();
};

const resolveOppoSetupTargetRoleTag = (role: UserRole): 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' | '' => {
  if (role === 'ENGENHARIA_TESTE') return 'ENGENHARIA_TESTE';
  if (role === 'ENGENHARIA_PROCESSO') return 'ENGENHARIA_PROCESSO';
  return '';
};

const extractOppoProductionOrder = (notes?: string): string => {
  if (!notes) return '';
  const tagged = extractTaggedValue(notes, OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX);
  if (tagged) return tagged;

  // Compat: notas antigas salvavam como "OP: XXXX."
  const match = notes.match(/\bOP:\s*([^\.\]\n\r]+)\.?/i);
  return (match?.[1] || '').trim();
};

const buildOppoPressChecklistTag = (draft: OppoPressChecklistDraft) =>
  `${OPPO_PRESS_CHECKLIST_TAG_PREFIX}${draft.trocaFixtures ? '1' : '0'}${draft.debug ? '1' : '0'}${draft.papelSensivel ? '1' : '0'}${draft.ionizador ? '1' : '0'}${draft.lupa ? '1' : '0'}]`;

const parseOppoPressChecklistTag = (notes?: string): OppoPressChecklistDraft | null => {
  if (!notes) return null;
  const idx = notes.indexOf(OPPO_PRESS_CHECKLIST_TAG_PREFIX);
  if (idx < 0) return null;
  const start = idx + OPPO_PRESS_CHECKLIST_TAG_PREFIX.length;
  const end = notes.indexOf(']', start);
  if (end < 0) return null;
  const raw = notes.slice(start, end);
  if (raw.length < 3) return null;
  return {
    trocaFixtures: raw[0] === '1',
    debug: raw[1] === '1',
    papelSensivel: raw[2] === '1',
    ionizador: raw[3] === '1',
    lupa: raw[4] === '1',
  };
};

const OPPO_SETUP_A6T_POST_DESCRIPTIONS: Record<string, string> = {
  PP01: 'Prensa de FPC C e Placa-Mãe',
  PP02: 'Pré-montagem da placa secundária',
  PP03: 'Verificar a aparência do display',
};

const normalizeOppoSetupProductKey = (value?: string) => `${value || ''}`.trim().toUpperCase();

const OPPO_SETUP_LAYOUT_KEY_SEPARATOR = '::';
const normalizeOppoSetupLayoutTargetRole = (value?: string | null): 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' =>
  value === 'ENGENHARIA_TESTE' ? 'ENGENHARIA_TESTE' : 'ENGENHARIA_PROCESSO';
const buildOppoSetupLayoutStoreKey = (targetRole: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE', productKey: string) =>
  `${targetRole}${OPPO_SETUP_LAYOUT_KEY_SEPARATOR}${normalizeOppoSetupProductKey(productKey)}`;
const isLocalRecordId = (id: string) => id.startsWith('local-') || id.startsWith('local-oppo-');

const buildDefaultOppoSetupTemplate = (): OppoSetupPostTemplate[] =>
  DEFAULT_OPPO_SETUP_POSTS.map((code, idx) => ({
    code,
    description: OPPO_SETUP_A6T_POST_DESCRIPTIONS[code] || `Execução do posto ${code}`,
    isMachinePress: code === 'PP01',
    hasIonizer: false,
    hasLupa: false,
    order: idx,
  }));

const normalizeOppoSetupTemplates = (value: any): OppoSetupPostTemplate[] => {
  const fallback = buildDefaultOppoSetupTemplate();
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const normalized = value
    .map((item: any, idx: number) => {
      const code = `${item?.code || ''}`.trim().toUpperCase();
      if (!code) return null;
      return {
        code,
        description: `${item?.description || ''}`.trim() || `Execução do posto ${code}`,
        isMachinePress: !!item?.isMachinePress,
        hasIonizer: !!item?.hasIonizer,
        hasLupa: !!item?.hasLupa,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : idx,
      } as OppoSetupPostTemplate;
    })
    .filter((item: OppoSetupPostTemplate | null): item is OppoSetupPostTemplate => !!item)
    .sort((a, b) => a.order - b.order);
  if (normalized.length === 0) return fallback;
  return normalized.map((item, idx) => ({ ...item, order: idx }));
};

const normalizeOppoSetupDraftsFromMetadata = (value: any): Record<string, OppoSetupPostTemplate[]> => {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, any>).map(([productKey, posts]) => [
    normalizeOppoSetupProductKey(productKey),
    normalizeOppoSetupTemplates(posts),
  ]);
  return Object.fromEntries(entries) as Record<string, OppoSetupPostTemplate[]>;
};

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
  qualityDocumentReceivedBy: row.quality_document_received_by || undefined,
  kitMaterialReceivedBy: row.kit_material_received_by || undefined,
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
  { id: 'PCP', label: 'PCP', icon: BarChart3, color: 'bg-blue-100 text-blue-700' },
  { id: 'ENGENHARIA_SETUP', label: 'Engenharia (Setup)', icon: Settings, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'ENGENHARIA_TESTE', label: 'Engenharia (Teste)', icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'ENGENHARIA_AUTOMACAO', label: 'Engenharia (Automação)', icon: Cpu, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'ENGENHARIA_PROCESSO', label: 'Engenharia (Processo)', icon: Cog, color: 'bg-zinc-100 text-zinc-700' },
  { id: 'ALMOXERIFADO', label: 'Almoxerifado', icon: Package, color: 'bg-violet-100 text-violet-700' },
];

const DEV_ADMIN_EMAILS = new Set([
  'victor.lopo@grupomultilaser.com.br',
  'victorlopo77@gmail.com',
  'devsistemasetup@gmail.com.br',
]);
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
    case 'CANCELLED': return 'Cancelado';
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

const normalizeNotificationSignaturesFromMetadata = (value: any): NotificationSignatureMap => {
  if (!value || typeof value !== 'object') return {};
  const next: NotificationSignatureMap = {};
  Object.entries(value as Record<string, any>).forEach(([roleKey, signatures]) => {
    if (!Array.isArray(signatures)) return;
    const clean = signatures.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(-400) as string[];
    if (clean.length > 0) {
      next[roleKey as UserRole] = clean;
    }
  });
  return next;
};

const isOppoRequestNotificationTarget = (role: UserRole, request: OppoRequest, userId?: string) => {
  if (role === 'ALMOXERIFADO') {
    if (request.callType === 'SOLICITACAO_DISPOSITIVO') {
      return request.status === 'ABERTO' || request.status === 'DIVERGENCIA';
    }
    if (request.callType === 'DEVOLUCAO_DISPOSITIVO') {
      return request.status === 'ABERTO' || request.status === 'DIVERGENCIA';
    }
    return false;
  }
  if (!userId) return false;
  if (request.createdBy !== userId) return false;
  return request.status === 'FINALIZADO_ALMOXERIFADO' || request.status === 'DIVERGENCIA' || request.status === 'CONCLUIDO';
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

const ConfigErrorScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-zinc-50 p-6 flex items-center justify-center">
    <div className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-zinc-900 mb-2">Configuração pendente no deploy</h1>
      <p className="text-sm text-zinc-700 mb-3">{message}</p>
      <p className="text-sm text-zinc-700 mb-1">Na Netlify, configure estas variáveis de ambiente:</p>
      <ul className="text-sm text-zinc-800 list-disc pl-5">
        <li><code>VITE_SUPABASE_URL</code></li>
        <li><code>VITE_SUPABASE_ANON_KEY</code></li>
      </ul>
      <p className="text-xs text-zinc-500 mt-4">Após salvar, faça novo deploy.</p>
    </div>
  </div>
);

const LoginScreen = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PRODUCAO');
  const [showSignupRoleMenu, setShowSignupRoleMenu] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const signupRoleMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedSignupRole = ROLE_OPTIONS.find((item) => item.id === role) || ROLE_OPTIONS[0];
  const SelectedSignupRoleIcon = selectedSignupRole.icon;

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

  useEffect(() => {
    if (!showSignupRoleMenu) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!signupRoleMenuRef.current) return;
      if (!signupRoleMenuRef.current.contains(event.target as Node)) {
        setShowSignupRoleMenu(false);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showSignupRoleMenu]);

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
    const signupRole = isDevAdminEmail(emailValue) ? 'DEV_ADMIN' : role;
    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: {
        data: {
          full_name: name.trim(),
          role: signupRole,
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
              onClick={() => {
                setMode('login');
                setShowSignupRoleMenu(false);
              }}
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
                <div ref={signupRoleMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSignupRoleMenu((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${selectedSignupRole.color}`}>
                        <SelectedSignupRoleIcon size={14} />
                      </span>
                      <span className="text-sm font-bold text-zinc-800">{selectedSignupRole.label}</span>
                    </span>
                    <ChevronDown size={16} className={`text-zinc-500 transition-transform ${showSignupRoleMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSignupRoleMenu && (
                    <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl">
                      {ROLE_OPTIONS.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = role === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setRole(item.id);
                              setShowSignupRoleMenu(false);
                            }}
                            className={`mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${item.color}`}>
                              <ItemIcon size={14} />
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {isActive && <CheckCircle size={15} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
  const [operacaoLineFilter, setOperacaoLineFilter] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [interfaceTheme, setInterfaceTheme] = useState<InterfaceTheme>('default');
  const [showDevRoleMenu, setShowDevRoleMenu] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'OPERACAO' | 'SLA' | 'OPPO' | 'OPPO_SETUP' | 'ALMOXERIFADO'>('OPERACAO');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [clearedNotificationSignaturesByRole, setClearedNotificationSignaturesByRole] = useState<NotificationSignatureMap>({});
  const [notificationSignaturesHydrated, setNotificationSignaturesHydrated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshingRequests, setIsRefreshingRequests] = useState(false);
  const [requests, setRequests] = useState<SetupRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showOppoCallTypeModal, setShowOppoCallTypeModal] = useState(false);
  const [showOppoSetupStartModal, setShowOppoSetupStartModal] = useState(false);
  const [showOppoSetupPostsModal, setShowOppoSetupPostsModal] = useState(false);
  const [showOppoSetupLayoutModal, setShowOppoSetupLayoutModal] = useState(false);
  const [showOppoSetupLayoutsListModal, setShowOppoSetupLayoutsListModal] = useState(false);
  const [showOppoPressChecklistModal, setShowOppoPressChecklistModal] = useState(false);
  const [showOppoReturnInfoModal, setShowOppoReturnInfoModal] = useState(false);
  const [showAlmoxPaidItemsModal, setShowAlmoxPaidItemsModal] = useState(false);
  const [showOppoRequesterConferenceModal, setShowOppoRequesterConferenceModal] = useState(false);
  const [showJobTitleModal, setShowJobTitleModal] = useState(false);
  const [showFirstAccessOnboarding, setShowFirstAccessOnboarding] = useState(false);
  const [firstAccessStepIndex, setFirstAccessStepIndex] = useState(0);
  const [jobTitleDraft, setJobTitleDraft] = useState('');
  const [quantityEditor, setQuantityEditor] = useState<QuantityEditorState>({
    open: false,
    code: '',
    quantityInput: '1',
    source: 'RETURN',
    clearInputAfterSave: false,
  });
  const [almoxPaidItemsRequestId, setAlmoxPaidItemsRequestId] = useState<string | null>(null);
  const [oppoRequesterConferenceRequestId, setOppoRequesterConferenceRequestId] = useState<string | null>(null);
  const [oppoRequesterConferenceConfirmedQtyByCode, setOppoRequesterConferenceConfirmedQtyByCode] = useState<Record<string, number>>({});
  const [oppoRequesterConferenceNoteDraft, setOppoRequesterConferenceNoteDraft] = useState('');
  const [almoxPaidCodeInput, setAlmoxPaidCodeInput] = useState('');
  const [almoxPaidSelectedItemsDraft, setAlmoxPaidSelectedItemsDraft] = useState<OppoPaidItem[]>([]);
  const [almoxPaidItemsNoteDraft, setAlmoxPaidItemsNoteDraft] = useState('');
  const [oppoLineDraft, setOppoLineDraft] = useState('');
  const [oppoProductDraft, setOppoProductDraft] = useState('');
  const [oppoReturnItemsNoteDraft, setOppoReturnItemsNoteDraft] = useState('');
  const [oppoReturnCodeInput, setOppoReturnCodeInput] = useState('');
  const [oppoReturnSelectedCodesDraft, setOppoReturnSelectedCodesDraft] = useState<OppoPaidItem[]>([]);
  const [oppoCallType, setOppoCallType] = useState<OppoCallType | null>(null);
  const [oppoSetupLineDraft, setOppoSetupLineDraft] = useState('');
  const [oppoSetupProductDraft, setOppoSetupProductDraft] = useState('');
  const [oppoSetupTypeDraft, setOppoSetupTypeDraft] = useState<OppoLineType | ''>('');
  const [oppoSetupProductionOrderDraft, setOppoSetupProductionOrderDraft] = useState('');
  const [oppoSetupStartDraft, setOppoSetupStartDraft] = useState<OppoSetupStartDraft | null>(null);
  const [oppoSetupSolicitations, setOppoSetupSolicitations] = useState<OppoSetupSolicitation[]>([]);
  const [oppoSetupCompletedSessionIds, setOppoSetupCompletedSessionIds] = useState<string[]>([]);
  const [oppoSetupMinimizedSessions, setOppoSetupMinimizedSessions] = useState<OppoSetupStartDraft[]>([]);
  const [oppoSetupNowMs, setOppoSetupNowMs] = useState(() => Date.now());
  const [oppoSetupPostDetailsOpen, setOppoSetupPostDetailsOpen] = useState<Record<string, boolean>>({});
  const [oppoSetupLayoutsByStoreKey, setOppoSetupLayoutsByStoreKey] = useState<Record<string, OppoSetupPostTemplate[]>>({});
  const [oppoSetupLayoutDraftsByProduct, setOppoSetupLayoutDraftsByProduct] = useState<Record<string, OppoSetupPostTemplate[]>>({});
  const [oppoSetupLayoutProductDraft, setOppoSetupLayoutProductDraft] = useState('');
  const [oppoSetupLayoutPostsDraft, setOppoSetupLayoutPostsDraft] = useState<OppoSetupPostTemplate[]>(buildDefaultOppoSetupTemplate());
  const [oppoSetupLayoutResourcesRowOpen, setOppoSetupLayoutResourcesRowOpen] = useState<number | null>(null);
  const [oppoSetupLayoutNewPostResourcesOpen, setOppoSetupLayoutNewPostResourcesOpen] = useState(false);
  const [oppoSetupLayoutNewPostCode, setOppoSetupLayoutNewPostCode] = useState('');
  const [oppoSetupLayoutNewPostDescription, setOppoSetupLayoutNewPostDescription] = useState('');
  const [oppoSetupLayoutNewPostMachine, setOppoSetupLayoutNewPostMachine] = useState(false);
  const [oppoSetupLayoutNewPostIonizer, setOppoSetupLayoutNewPostIonizer] = useState(false);
  const [oppoSetupLayoutNewPostLupa, setOppoSetupLayoutNewPostLupa] = useState(false);
  const [oppoPressChecklistDraft, setOppoPressChecklistDraft] = useState<OppoPressChecklistDraft>({
    trocaFixtures: false,
    debug: false,
    papelSensivel: false,
    ionizador: false,
    lupa: false,
  });
  const [oppoPressChecklistTarget, setOppoPressChecklistTarget] = useState<{
    requestId: string;
    post: string;
    stepDescription: string;
    sessionId: string;
  } | null>(null);
  const [oppoRequests, setOppoRequests] = useState<OppoRequest[]>([]);
  const [hiddenDerivedOppoRequestIds, setHiddenDerivedOppoRequestIds] = useState<string[]>([]);
  const [oppoSetupActorTab, setOppoSetupActorTab] = useState<'PCP' | 'PROCESSO' | 'TESTE'>('PCP');

  const isDevAdmin = useMemo(() => {
    if (!profile) return false;
    return isDevAdminEmail(profile.email || '') || profile.role === 'DEV_ADMIN';
  }, [profile]);
  const currentActingRole: UserRole = useMemo(() => {
    if (!profile) return 'PRODUCAO';
    return isDevAdmin ? devActiveRole : profile.role;
  }, [devActiveRole, isDevAdmin, profile]);
  const currentRole = currentActingRole;
  const currentOppoSetupLayoutRole: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' = useMemo(() => {
    if (oppoSetupActorTab === 'TESTE') return 'ENGENHARIA_TESTE';
    if (oppoSetupActorTab === 'PROCESSO') return 'ENGENHARIA_PROCESSO';
    return currentActingRole === 'ENGENHARIA_TESTE' ? 'ENGENHARIA_TESTE' : 'ENGENHARIA_PROCESSO';
  }, [currentActingRole, oppoSetupActorTab]);
  const [oppoView, setOppoView] = useState<'PENDENTES' | 'HISTORICO'>('PENDENTES');
  const [slaView, setSlaView] = useState<'PENDENTES' | 'HISTORICO'>('PENDENTES');
  const [slaSectorTab, setSlaSectorTab] = useState<'TODOS' | 'PROCESSO' | 'TESTE'>('TODOS');
  const [almoxView, setAlmoxView] = useState<'PENDENTES' | 'DEVOLUCOES' | 'HISTORICO'>('PENDENTES');
  const [oppoSetupView, setOppoSetupView] = useState<'EM_ANDAMENTO' | 'HISTORICO' | 'OEE'>('EM_ANDAMENTO');
  const [oppoSetupDashboardLineFilter, setOppoSetupDashboardLineFilter] = useState('');
  const [oppoSetupDashboardProductFilter, setOppoSetupDashboardProductFilter] = useState('');
  const [almoxSectorTab, setAlmoxSectorTab] = useState<'TODOS' | 'PROCESSO' | 'TESTE'>('TODOS');
  const [oppoSectorTab, setOppoSectorTab] = useState<'TODOS' | 'PROCESSO' | 'TESTE'>('TODOS');
  const [almoxReturnCheckedItemsByRequest, setAlmoxReturnCheckedItemsByRequest] = useState<Record<string, string[]>>({});
  const requestStatusSnapshotByRole = useRef<Record<string, Record<string, SetupRequest['status']>>>({});
  const oppoStatusSnapshotByRole = useRef<Record<string, Record<string, OppoRequestStatus>>>({});
  const bootstrappedRoleNotifications = useRef<Set<UserRole>>(new Set());
  const bootstrappedOppoRoleNotifications = useRef<Set<UserRole>>(new Set());
  const devRoleMenuRef = useRef<HTMLDivElement | null>(null);
  const oppoSetupActorTabInitializedRef = useRef(false);
  const firstAccessOnboardingSteps = useMemo(
    () => [
      {
        title: 'Visão Geral do Painel',
        description: 'Aqui você acompanha os chamados, status por setor e indicadores em tempo real.',
        icon: LayoutDashboard,
        accentClass: 'from-cyan-50 to-blue-50 border-cyan-200',
        iconClass: 'bg-cyan-100 text-cyan-700',
        tips: [
          'Use os cards do topo para ver pendentes, finalizados e tempo médio.',
          'Selecione a linha para filtrar seus resultados mais rápido.',
        ],
      },
      {
        title: 'Abrir Novo Chamado',
        description: 'Clique em Solicitar Novo Setup e preencha linha, produto e tipo para iniciar o fluxo.',
        icon: PlusCircle,
        accentClass: 'from-emerald-50 to-teal-50 border-emerald-200',
        iconClass: 'bg-emerald-100 text-emerald-700',
        tips: [
          'Preencha dados corretamente para evitar retrabalho entre setores.',
          'Cada chamado percorre as etapas até a conclusão final.',
        ],
      },
      {
        title: 'Fluxo por Setores',
        description: 'Cada área recebe, executa e finaliza sua etapa com rastreabilidade completa.',
        icon: Cog,
        accentClass: 'from-amber-50 to-orange-50 border-amber-200',
        iconClass: 'bg-amber-100 text-amber-700',
        tips: [
          'Setup, Teste, Processo, Automação e Almox seguem status separados.',
          'No OPPO Setup, você controla postos, tempos e checklist por etapa.',
        ],
      },
      {
        title: 'Notificações do Setor',
        description: 'As notificações são separadas por setor para não misturar informações.',
        icon: Bell,
        accentClass: 'from-violet-50 to-fuchsia-50 border-violet-200',
        iconClass: 'bg-violet-100 text-violet-700',
        tips: [
          'Use Marcar lidas para organizar sua fila diária.',
          'Use Limpar para remover histórico visual já tratado.',
        ],
      },
      {
        title: 'Histórico e Auditoria',
        description: 'No histórico você revisa quem fez cada etapa, tempos e itens conferidos.',
        icon: ShieldCheck,
        accentClass: 'from-zinc-50 to-slate-100 border-zinc-200',
        iconClass: 'bg-zinc-200 text-zinc-700',
        tips: [
          'Use busca por token, linha ou produto para localizar chamados.',
          'Os dados ficam salvos no Supabase para não perder progresso.',
        ],
      },
    ],
    []
  );
  const firstAccessCurrentStep =
    firstAccessOnboardingSteps[firstAccessStepIndex] || firstAccessOnboardingSteps[0];
  const firstAccessProgress =
    firstAccessOnboardingSteps.length > 0
      ? Math.round(((firstAccessStepIndex + 1) / firstAccessOnboardingSteps.length) * 100)
      : 0;

  useEffect(() => {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(!!prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-theme', interfaceTheme);
  }, [interfaceTheme]);

  useEffect(() => {
    const metadataTheme = `${user?.user_metadata?.theme_preference || ''}`.toLowerCase();
    if (metadataTheme === 'dark') {
      setIsDarkMode(true);
      return;
    }
    if (metadataTheme === 'light') {
      setIsDarkMode(false);
    }
  }, [user?.id, user?.user_metadata?.theme_preference]);

  useEffect(() => {
    const savedInterfaceTheme = `${user?.user_metadata?.interface_theme || ''}`.toLowerCase();
    if (savedInterfaceTheme === 'ocean' || savedInterfaceTheme === 'graphite' || savedInterfaceTheme === 'sunset' || savedInterfaceTheme === 'default') {
      setInterfaceTheme(savedInterfaceTheme as InterfaceTheme);
      return;
    }
    setInterfaceTheme('default');
  }, [user?.id, user?.user_metadata?.interface_theme]);

  useEffect(() => {
    if (!user) {
      setOppoSetupLayoutDraftsByProduct({});
      return;
    }
    setOppoSetupLayoutDraftsByProduct(normalizeOppoSetupDraftsFromMetadata(user.user_metadata?.oppo_setup_layout_drafts));
  }, [user?.id, user?.user_metadata?.oppo_setup_layout_drafts]);

  useEffect(() => {
    if (!user) {
      setClearedNotificationSignaturesByRole({});
      setNotificationSignaturesHydrated(false);
      return;
    }
    setClearedNotificationSignaturesByRole(
      normalizeNotificationSignaturesFromMetadata(user.user_metadata?.cleared_notification_signatures_by_role)
    );
    setNotificationSignaturesHydrated(true);
  }, [user?.id, user?.user_metadata?.cleared_notification_signatures_by_role]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    const currentPreference = `${user.user_metadata?.theme_preference || ''}`.toLowerCase();
    const desiredPreference = isDarkMode ? 'dark' : 'light';
    if (currentPreference === desiredPreference) return;
    supabase.auth.updateUser({
      data: {
        theme_preference: desiredPreference,
      },
    }).catch((error) => {
      console.error('Erro ao salvar tema no Supabase:', error);
    });
  }, [isDarkMode, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    const currentInterfaceTheme = `${user.user_metadata?.interface_theme || ''}`.toLowerCase();
    if (currentInterfaceTheme === interfaceTheme) return;
    supabase.auth.updateUser({
      data: {
        interface_theme: interfaceTheme,
      },
    }).catch((error) => {
      console.error('Erro ao salvar tema de interface no Supabase:', error);
    });
  }, [interfaceTheme, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    const currentDrafts = normalizeOppoSetupDraftsFromMetadata(user.user_metadata?.oppo_setup_layout_drafts);
    if (JSON.stringify(currentDrafts) === JSON.stringify(oppoSetupLayoutDraftsByProduct)) return;
    const timer = window.setTimeout(() => {
      supabase.auth.updateUser({
        data: {
          oppo_setup_layout_drafts: oppoSetupLayoutDraftsByProduct,
        },
      }).catch((error) => {
        console.error('Erro ao salvar rascunhos de layout no Supabase:', error);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [oppoSetupLayoutDraftsByProduct, user?.id, user?.user_metadata?.oppo_setup_layout_drafts]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    const currentSignatures = normalizeNotificationSignaturesFromMetadata(user.user_metadata?.cleared_notification_signatures_by_role);
    if (JSON.stringify(currentSignatures) === JSON.stringify(clearedNotificationSignaturesByRole)) return;
    const timer = window.setTimeout(() => {
      supabase.auth.updateUser({
        data: {
          cleared_notification_signatures_by_role: clearedNotificationSignaturesByRole,
        },
      }).catch((error) => {
        console.error('Erro ao salvar assinaturas de limpeza de notificações no Supabase:', error);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [clearedNotificationSignaturesByRole, user?.id, user?.user_metadata?.cleared_notification_signatures_by_role]);

  useEffect(() => {
    if (!showOppoSetupPostsModal) return;
    const timer = window.setInterval(() => setOppoSetupNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [showOppoSetupPostsModal]);

  useEffect(() => {
    if (!showOppoSetupLayoutModal) return;
    const productKey = normalizeOppoSetupProductKey(oppoSetupLayoutProductDraft);
    if (!productKey) return;
    const storeKey = buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey);
    const normalized = normalizeOppoSetupTemplates(oppoSetupLayoutPostsDraft);
    setOppoSetupLayoutDraftsByProduct((prev) => {
      const prevSerialized = JSON.stringify(prev[storeKey] || []);
      const nextSerialized = JSON.stringify(normalized);
      if (prevSerialized === nextSerialized) return prev;
      return { ...prev, [storeKey]: normalized };
    });
  }, [currentOppoSetupLayoutRole, showOppoSetupLayoutModal, oppoSetupLayoutProductDraft, oppoSetupLayoutPostsDraft]);

  const loadOppoSetupLayoutsFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      setOppoSetupLayoutsByStoreKey({});
      return;
    }
    const { data, error } = await supabase
      .from('oppo_setup_layouts')
      .select('product_key, target_role, posts')
      .order('product_key', { ascending: true });

    if (error) {
      const message = `${error.message || ''}`.toLowerCase();
      const tableMissing = message.includes('oppo_setup_layouts') && (message.includes('does not exist') || message.includes('relation'));
      console.error('Erro ao carregar layout de setup OPPO no Supabase:', error);
      if (tableMissing) {
        setOppoSetupLayoutsByStoreKey({});
      }
      return;
    }

    const rows = (data || []) as OppoSetupLayoutRow[];
    const mapped = Object.fromEntries(
      rows.map((row) => {
        const targetRole = normalizeOppoSetupLayoutTargetRole(row.target_role || null);
        const productKey = normalizeOppoSetupProductKey(row.product_key);
        return [buildOppoSetupLayoutStoreKey(targetRole, productKey), normalizeOppoSetupTemplates(row.posts)];
      })
    ) as Record<string, OppoSetupPostTemplate[]>;
    setOppoSetupLayoutsByStoreKey(mapped);
  };

  useEffect(() => {
    loadOppoSetupLayoutsFromSupabase();
  }, [user?.id]);

  // Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
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

  const handleSignOut = async () => {
    // Em cenários onde a API está instável (ex: 520 no gateway),
    // o logout remoto pode falhar. Garantimos ao menos limpeza local.
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut failed, falling back to local signOut:', err);
      try {
        await supabase.auth.signOut({ scope: 'local' } as any);
      } catch (localErr) {
        console.error('Supabase local signOut also failed:', localErr);
      }
    } finally {
      setUser(null);
      setProfile(null);
      // Força reset completo do estado (tokens/localStorage)
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
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

  useEffect(() => {
    if (!user || !profile) {
      setShowFirstAccessOnboarding(false);
      setFirstAccessStepIndex(0);
      return;
    }
    const onboardingVersion = `${user.user_metadata?.onboarding_setup_version || ''}`.trim().toLowerCase();
    if (onboardingVersion !== FIRST_ACCESS_ONBOARDING_VERSION) {
      setShowFirstAccessOnboarding(true);
      return;
    }
    setShowFirstAccessOnboarding(false);
  }, [profile?.uid, user?.id, user?.user_metadata?.onboarding_setup_version]);

  // Requests Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
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

  // OPPO Setup Layouts Listener (shared across users)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user || !profile) return;

    const channel = supabase
      .channel('oppo_setup_layouts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oppo_setup_layouts' },
        () => {
          loadOppoSetupLayoutsFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // OPPO / Almoxerifado Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user || !profile) return;

    const loadOppoRequests = async () => {
      const { data, error } = await supabase
        .from('oppo_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('OPPO requests load error:', error);
        return;
      }

      const remoteRequests = (data || []).map((row) => mapOppoRequest(row as OppoRequestRow));
      setOppoRequests((prev) => {
        const localRequests = prev.filter((req) => isLocalRecordId(req.id));
        const remoteIds = new Set(remoteRequests.map((req) => req.id));
        const remoteSetupKeys = new Set(
          remoteRequests
            .map((req) => {
              const sessionId = extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
              const targetRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
              const post = extractTaggedValue(req.notes, OPPO_SETUP_POST_TAG_PREFIX) || '__SESSION__';
              return sessionId && targetRole ? `${sessionId}:${targetRole}:${post}` : '';
            })
            .filter(Boolean)
        );
        const keptLocalRequests = localRequests.filter((req) => {
          if (remoteIds.has(req.id)) return false;
          const sessionId = extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
          const targetRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
          const post = extractTaggedValue(req.notes, OPPO_SETUP_POST_TAG_PREFIX) || '__SESSION__';
          return !(sessionId && targetRole && remoteSetupKeys.has(`${sessionId}:${targetRole}:${post}`));
        });
        return [...keptLocalRequests, ...remoteRequests];
      });
    };

    loadOppoRequests();

    const channel = supabase
      .channel('oppo_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oppo_requests' },
        () => {
          loadOppoRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // OPPO Setup Solicitações (PCP -> Eng. Processo)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user || !profile) return;

    const loadOppoSetupSolicitations = async () => {
      const { data, error } = await supabase
        .from('oppo_setup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('OPPO setup solicitations load error:', error);
        return;
      }

      const remoteSolicitations = (data || []).map((row) => mapOppoSetupSolicitation(row as OppoSetupSolicitationRow));
      setOppoSetupSolicitations((prev) => {
        const localSolicitations = prev.filter((sol) => isLocalRecordId(sol.id));
        const remoteIds = new Set(remoteSolicitations.map((sol) => sol.id));
        const remoteSetupKeys = new Set(remoteSolicitations.map((sol) => `${sol.sessionId}:${sol.targetRole}`));
        const keptLocalSolicitations = localSolicitations.filter((sol) => {
          if (remoteIds.has(sol.id)) return false;
          return !remoteSetupKeys.has(`${sol.sessionId}:${sol.targetRole}`);
        });
        return [...keptLocalSolicitations, ...remoteSolicitations];
      });
    };

    loadOppoSetupSolicitations();

    const channel = supabase
      .channel('oppo_setup_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oppo_setup_requests' },
        () => {
          loadOppoSetupSolicitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleCreateOppoRequest = async (
    type: OppoCallType,
    extra: {
      line?: string;
      product?: string;
      lineType?: OppoLineType;
      returnItemsNote?: string;
      returnItemsSelected?: OppoPaidItem[];
      notes?: string;
      initialStatus?: OppoRequestStatus;
    } = {}
  ): Promise<OppoRequest | null> => {
    if (!user || !profile) return null;
    const appOrigin = window.location.origin;
    const supabaseHealthUrl = `${supabaseUrlForDebug}`.replace(/\/$/, '') + '/auth/v1/health';
    if (!isSupabaseConfigured || isSupabaseUrlPlaceholder) {
      window.alert(
        `Erro ao abrir chamado OPPO: Supabase não configurado.\n\n${supabaseConfigError || 'Verifique VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'}\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${supabaseUrlForDebug}\n- supabase_base: ${supabaseBaseUrlForDebug}\n\nDica: atualize o arquivo .env.local e reinicie o servidor (npm run dev).`
      );
      return null;
    }
    if (isSupabaseAnonKeyLikelyInvalid) {
      window.alert(
        `Erro ao abrir chamado OPPO: chave do Supabase inválida.\n\n${supabaseAnonKeyHint}\n\nDebug:\n- supabase_url: ${supabaseUrlForDebug}\n\nOnde pegar: Supabase → Settings → API Keys → aba \"Legacy anon\" → copie a anon key.\nDepois cole no .env.local e reinicie o npm run dev.`
      );
      return null;
    }
    const isSetupGenerated = `${extra.notes || ''}`.includes(OPPO_SETUP_SESSION_TAG_PREFIX);
    const canReuseExistingRequest = type === 'SOLICITACAO_DISPOSITIVO' && !isSetupGenerated;
    const rawNotes = extra.notes || null;
    const shouldTagSector =
      type === 'DEVOLUCAO_DISPOSITIVO' &&
      !isSetupGenerated &&
      !(rawNotes || '').includes(OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
    const sectorRoleForNewRequest: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE' =
      currentActingRole === 'ENGENHARIA_TESTE'
        ? 'ENGENHARIA_TESTE'
        : currentActingRole === 'ENGENHARIA_PROCESSO'
          ? 'ENGENHARIA_PROCESSO'
          : extra.lineType === 'EMBALAGEM'
            ? 'ENGENHARIA_TESTE'
            : 'ENGENHARIA_PROCESSO';
    const notesWithSectorTag = shouldTagSector
      ? `${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${sectorRoleForNewRequest}]${rawNotes ? ` ${rawNotes}` : ''}`
      : rawNotes;

    if (canReuseExistingRequest) {
      let openRequests: any[] | null = null;
      let openRequestsError: any = null;
      try {
        const resp = await supabase
          .from('oppo_requests')
          .select('*')
          .eq('created_by', user.id)
          .eq('call_type', type)
          .in('status', ['ABERTO', 'SEPARACAO', 'CONFERINDO', 'FINALIZADO_ALMOXERIFADO', 'DIVERGENCIA'])
          .order('requested_at', { ascending: false });
        openRequests = resp.data as any[] | null;
        openRequestsError = resp.error;
      } catch (err) {
        console.error('Lookup OPPO open requests threw:', err);
        window.alert(
          `Erro ao consultar chamados OPPO (falha de rede).\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${supabaseUrlForDebug}\n- origin: ${appOrigin}\n\nSe o Console mostrar CORS:\n- No Supabase: Settings → Integrations → Data API → Settings → CORS/Allowed origins\n- Adicione: ${appOrigin}\n\nTeste rápido:\n- Abra no navegador: ${supabaseHealthUrl}`
        );
        return null;
      }

      if (openRequestsError) {
        console.error('Lookup OPPO open requests error:', openRequestsError);
        // Se nem consegue listar os próprios chamados, não adianta tentar inserir.
        if (openRequestsError?.status === 401 || openRequestsError?.status === 403) {
          window.alert(
            `Erro ao consultar chamados OPPO (acesso negado).\n\nDetalhes:\n- ${formatSupabaseErrorDetails(openRequestsError)}\n\nDica: confirme que você está logado e que seu e-mail está confirmado no Supabase.`
          );
          return null;
        }
      } else {
        const normalizedLine = (extra.line || '').trim().toLowerCase();
        const normalizedProduct = (extra.product || '').trim().toLowerCase();
        const normalizedLineType = (extra.lineType || '').trim().toLowerCase();

        const reusable = (openRequests || [])
          .map((row) => row as OppoRequestRow)
          .find((row) => {
            const rowLine = `${row.line || ''}`.trim().toLowerCase();
            const rowProduct = `${row.product || ''}`.trim().toLowerCase();
            const rowLineType = `${row.line_type || ''}`.trim().toLowerCase();
            return rowLine === normalizedLine && rowProduct === normalizedProduct && rowLineType === normalizedLineType;
          });

        if (reusable) {
          const mapped = mapOppoRequest(reusable);
          setOppoRequests((prev) => [mapped, ...prev.filter((req) => req.id !== mapped.id)]);
          setOppoCallType(type);
          window.alert('Já existe uma solicitação em andamento para esta linha/produto. O sistema manteve o mesmo chamado para seguir a 2ª conferência.');
          return mapped;
        }
      }
    }

    const requestId = crypto.randomUUID();
    const baseInsertPayload = {
      id: requestId,
      call_type: type,
      status: extra.initialStatus || 'ABERTO',
      line: extra.line || null,
      product: extra.product || null,
      line_type: extra.lineType || null,
      created_by: user.id,
      created_by_name: profile.displayName || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
      requested_at: new Date().toISOString(),
    };

    const insertWithReturnFields = {
      ...baseInsertPayload,
      return_items_note: extra.returnItemsNote || null,
      return_items_selected: Array.isArray(extra.returnItemsSelected) ? extra.returnItemsSelected : [],
      notes: notesWithSectorTag,
    };

    let data: any = null;
    let error: any = null;
    try {
      const resp = await supabase
        .from('oppo_requests')
        .insert(insertWithReturnFields)
        .select('*')
        .single();
      data = resp.data;
      error = resp.error;
    } catch (err) {
      console.error('Create OPPO request threw:', err);
      window.alert(
        `Erro ao abrir chamado OPPO (falha de rede).\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${supabaseUrlForDebug}\n- origin: ${appOrigin}\n\nSe o Console mostrar CORS:\n- No Supabase: Settings → Integrations → Data API → Settings → CORS/Allowed origins\n- Adicione: ${appOrigin}\n\nTeste rápido:\n- Abra no navegador: ${supabaseHealthUrl}`
      );
      return null;
    }

    // Fallback para ambientes onde a migração ainda não criou as novas colunas.
    const errorTextForFallback = error
      ? [
          (error as any)?.message,
          (error as any)?.details,
          (error as any)?.hint,
          (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return '';
            }
          })(),
        ]
          .filter(Boolean)
          .join(' ')
      : '';
    if (
      error &&
      (errorTextForFallback.includes('return_items_') ||
        errorTextForFallback.includes('line_type') ||
        errorTextForFallback.includes("column 'line'") ||
        errorTextForFallback.includes("column 'product'") ||
        errorTextForFallback.includes('column \"line\"') ||
        errorTextForFallback.includes('column \"product\"'))
    ) {
      try {
        const fallbackResult = await supabase
          .from('oppo_requests')
          .insert({
            id: requestId,
            call_type: type,
            status: 'ABERTO',
            created_by: user.id,
            created_by_name: profile.displayName || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
            requested_at: new Date().toISOString(),
          })
          .select('*')
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      } catch (err) {
        console.error('Create OPPO request fallback threw:', err);
        window.alert(
          `Erro ao abrir chamado OPPO (falha de rede).\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${supabaseUrlForDebug}\n- origin: ${appOrigin}\n\nSe o Console mostrar CORS:\n- No Supabase: Settings → Integrations → Data API → Settings → CORS/Allowed origins\n- Adicione: ${appOrigin}\n\nTeste rápido:\n- Abra no navegador: ${supabaseHealthUrl}`
        );
        return null;
      }
    }

    if (error) {
      console.error('Create OPPO request error:', error);
      const errorMessage = `${(error as any)?.message || ''}`;
      const rlsBlocked = errorMessage.toLowerCase().includes('row-level security') || errorMessage.toLowerCase().includes('violates row-level security');
      if (rlsBlocked) {
        console.warn('RLS bloqueou oppo_requests; criando chamado OPPO localmente.', error);
        const localRow: OppoRequestRow = {
          id: `local-oppo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          call_type: type,
          status: (extra.initialStatus || 'ABERTO') as OppoRequestStatus,
          line: extra.line || null,
          product: extra.product || null,
          line_type: extra.lineType || null,
          created_by: user.id,
          created_by_name:
            profile.displayName ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Usuario'),
          almox_by: null,
          almox_by_name: null,
          requested_at: new Date().toISOString(),
          accepted_at: null,
          finalized_at: null,
          requester_confirmed_at: null,
          requester_confirmed: null,
          requester_confirmed_by: null,
          requester_confirmed_by_name: null,
          return_items_note: extra.returnItemsNote || null,
          return_items_selected: Array.isArray(extra.returnItemsSelected) ? extra.returnItemsSelected : [],
          paid_items_selected: [],
          paid_items_note: null,
          notes: notesWithSectorTag,
        };
        const mapped = mapOppoRequest(localRow);
        setOppoRequests((prev) => {
          const mappedSessionId = extractTaggedValue(mapped.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
          const mappedTargetRole = extractTaggedValue(mapped.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
          const mappedPost = extractTaggedValue(mapped.notes, OPPO_SETUP_POST_TAG_PREFIX) || '__SESSION__';
          const alreadyExists = prev.some(
            (req) =>
              mappedSessionId &&
              mappedTargetRole &&
              extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX) === mappedSessionId &&
              extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === mappedTargetRole &&
              (extractTaggedValue(req.notes, OPPO_SETUP_POST_TAG_PREFIX) || '__SESSION__') === mappedPost
          );
          return alreadyExists ? prev : [mapped, ...prev];
        });
        setOppoCallType(type);
        return mapped;
      }
      if (
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('networkerror') ||
        errorMessage.toLowerCase().includes('load failed') ||
        errorMessage.toLowerCase().includes('fetch') && errorMessage.toLowerCase().includes('failed')
      ) {
        window.alert(
          `Erro ao abrir chamado OPPO (falha de rede).\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${supabaseUrlForDebug}\n- origin: ${appOrigin}\n\nSe o Console mostrar CORS:\n- No Supabase: Settings → Integrations → Data API → Settings → CORS/Allowed origins\n- Adicione: ${appOrigin}\n\nTeste rápido:\n- Abra no navegador: ${supabaseHealthUrl}`
        );
        return null;
      }
      const friendlyMessage =
        `${(error as any)?.message || (error as any)?.error_description || ''}`.trim() ||
        (typeof error === 'string' ? error : '') ||
        'Erro desconhecido';
      const extraInfo = [
        (error as any)?.details,
        (error as any)?.hint,
        (error as any)?.code,
        (error as any)?.status,
      ]
        .filter(Boolean)
        .join(' | ');
      window.alert(
        `Erro ao abrir chamado OPPO: ${friendlyMessage}${extraInfo ? ` (${extraInfo})` : ''}\n\nDetalhes:\n- ${formatSupabaseErrorDetails(error)}`
      );
      return null;
    }

    if (data) {
      const mapped = mapOppoRequest(data as OppoRequestRow);
      setOppoRequests((prev) => [mapped, ...prev]);
      setOppoCallType(type);
      console.info('[OPPO] Chamado criado:', {
        id: mapped.id,
        callType: mapped.callType,
        status: mapped.status,
        line: mapped.line,
        product: mapped.product,
        lineType: mapped.lineType,
        createdBy: mapped.createdBy,
        hasSetupSession: !!extractTaggedValue(mapped.notes, OPPO_SETUP_SESSION_TAG_PREFIX),
      });
      return mapped;
    }
    return null;
  };

  const createOppoSetupAlmoxRequests = async (
    payload: {
      line: string;
      product: string;
      lineType: OppoLineType;
      productionOrder: string;
    },
    sessionId: string,
    targetRoles: Array<'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE'>
  ) => {
    const ensureLocalAlmoxRequest = (targetRole: 'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE') => {
      const notes = `${OPPO_SETUP_SESSION_TAG_PREFIX}${sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX}${payload.productionOrder}] Solicitação automática de materiais para setup.`;
      setOppoRequests((prev) => {
        const alreadyExists = prev.some(
          (req) =>
            req.callType === 'SOLICITACAO_DISPOSITIVO' &&
            extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX) === sessionId &&
            extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === targetRole
        );
        if (alreadyExists) return prev;
        const localRequest: OppoRequest = {
          id: `local-oppo-${sessionId}-${targetRole}`,
          callType: 'SOLICITACAO_DISPOSITIVO',
          status: 'ABERTO',
          line: payload.line,
          product: payload.product,
          lineType: payload.lineType,
          createdBy: user?.id || 'LOCAL',
          createdByName:
            profile?.displayName ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            (user?.email ? user.email.split('@')[0] : 'Usuario'),
          requestedAt: new Date().toISOString(),
          returnItemsSelected: [],
          paidItems: [],
          notes,
        };
        return [localRequest, ...prev];
      });
    };

    try {
      for (const targetRole of targetRoles) {
        ensureLocalAlmoxRequest(targetRole);
        const { data: existing, error: existingError } = await supabase
          .from('oppo_requests')
          .select('id, notes')
          .eq('call_type', 'SOLICITACAO_DISPOSITIVO')
          .like('notes', `${OPPO_SETUP_SESSION_TAG_PREFIX}${sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}]%`)
          .order('requested_at', { ascending: false })
          .limit(1);

        if (existingError) {
          console.error('Erro ao checar chamado automático do Almox (OPPO):', existingError);
          ensureLocalAlmoxRequest(targetRole);
          continue;
        }

        const alreadyCreated = Array.isArray(existing) && existing.length > 0;
        if (!alreadyCreated) {
          const createdAlmoxRequest = await handleCreateOppoRequest('SOLICITACAO_DISPOSITIVO', {
            line: payload.line,
            product: payload.product,
            lineType: payload.lineType,
            notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX}${payload.productionOrder}] Solicitação automática de materiais para setup.`,
            initialStatus: 'ABERTO',
          });
          if (!createdAlmoxRequest) {
            console.warn('A solicitação de setup foi criada, mas falhou ao abrir o chamado automático do Almox.', {
              sessionId,
              targetRole,
            });
            ensureLocalAlmoxRequest(targetRole);
          }
        }
      }
    } catch (err) {
      console.error('Falha ao criar chamado automático do Almox (OPPO):', err);
      window.alert('A solicitação de setup foi criada, mas falhou ao abrir o chamado automático do Almox (falha inesperada).');
    }
  };

  const handleCreateOppoSetupSolicitation = async (payload: {
    line: string;
    product: string;
    lineType: OppoLineType;
    productionOrder: string;
  }) => {
    if (!user || !profile) return;

    const sessionId = `S${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const targetRoles: Array<'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE'> = [
      'ENGENHARIA_PROCESSO',
      'ENGENHARIA_TESTE',
    ];
    setHiddenDerivedOppoRequestIds((prev) =>
      prev.filter((id) => !targetRoles.some((targetRole) => id === `local-oppo-${sessionId}-${targetRole}`))
    );
    const createdByName =
      profile.displayName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split('@')[0] : 'Usuario');
    const solicitationRows = targetRoles.map((targetRole) => ({
      line: payload.line,
      product: payload.product,
      line_type: payload.lineType,
      production_order: payload.productionOrder,
      target_role: targetRole,
      status: 'PENDING_PROCESSO',
      session_id: sessionId,
      created_by: user.id,
      created_by_name: createdByName,
      created_at: now,
    }));

    const { data, error } = await supabase
      .from('oppo_setup_requests')
      .insert(solicitationRows)
      .select('*')

    if (error) {
      console.error('Create OPPO setup solicitation error:', error);
      const message = `${error.message || ''}`.toLowerCase();
      const rlsBlocked = message.includes('row-level security') || message.includes('violates row-level security');
      if (rlsBlocked) {
        console.warn('RLS bloqueou oppo_setup_requests; mantendo solicitação local e criando chamados do Almox.', error);
        const localSolicitations = solicitationRows.map((row) =>
          mapOppoSetupSolicitation({
            id: `local-${sessionId}-${row.target_role}`,
            line: row.line,
            product: row.product,
            line_type: row.line_type,
            production_order: row.production_order,
            target_role: row.target_role,
            status: row.status as OppoSetupSolicitationStatus,
            session_id: row.session_id,
            created_by: row.created_by,
            created_by_name: row.created_by_name,
            created_at: row.created_at,
            accepted_by: null,
            accepted_by_name: null,
            accepted_at: null,
            finished_at: null,
            cancelled_at: null,
          })
        );
        setOppoSetupSolicitations((prev) => [...localSolicitations, ...prev]);
        await createOppoSetupAlmoxRequests(payload, sessionId, targetRoles);
        return;
      }
      const extraInfo = [error.details, error.hint, error.code].filter(Boolean).join(' | ');
      window.alert(`Erro ao abrir solicitação de setup: ${error.message}${extraInfo ? ` (${extraInfo})` : ''}`);
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map((row) => mapOppoSetupSolicitation(row as OppoSetupSolicitationRow));
      setOppoSetupSolicitations((prev) => [...mapped, ...prev]);

        // Ao criar a solicitação do PCP, também abre automaticamente
        // um chamado para o Almoxerifado iniciar separação/conferência de materiais (por setor).
        // Se existir automação no banco (trigger), o chamado já vai estar criado.
        // Para bancos sem trigger, ou com retorno parcial por RLS, garante 1 chamado por setor.
        await createOppoSetupAlmoxRequests(payload, sessionId, targetRoles);
      }
  };

  const handleAcceptOppoSetupSolicitation = async (solicitation: OppoSetupSolicitation) => {
    if (!user || !profile) return;
    const now = new Date().toISOString();
    const acceptedByName = profile.displayName || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario');

    if (isLocalRecordId(solicitation.id)) {
      const mapped: OppoSetupSolicitation = {
        ...solicitation,
        status: 'ACCEPTED',
        acceptedBy: user.id,
        acceptedByName,
        acceptedAt: now,
      };
      setOppoSetupSolicitations((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      setOppoSetupStartDraft({
        line: mapped.line,
        product: mapped.product,
        lineType: mapped.lineType,
        sessionId: mapped.sessionId,
        productionOrder: mapped.productionOrder,
      });
      setShowOppoSetupPostsModal(true);
      return;
    }

    const { data, error } = await supabase
      .from('oppo_setup_requests')
      .update({
        status: 'ACCEPTED',
        accepted_by: user.id,
        accepted_by_name: acceptedByName,
        accepted_at: now,
      })
      .eq('id', solicitation.id)
      .select('*')
      .single();

    if (error) {
      console.error('Accept OPPO setup solicitation error:', error);
      window.alert(`Erro ao aceitar solicitação: ${error.message}`);
      return;
    }

    if (data) {
      const mapped = mapOppoSetupSolicitation(data as OppoSetupSolicitationRow);
      setOppoSetupSolicitations((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));

      setOppoSetupStartDraft({
        line: mapped.line,
        product: mapped.product,
        lineType: mapped.lineType,
        sessionId: mapped.sessionId,
        productionOrder: mapped.productionOrder,
      });
      setShowOppoSetupPostsModal(true);
    }
  };

  const handleCancelOppoSetupSolicitation = async (solicitation: OppoSetupSolicitation) => {
    if (!user) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('oppo_setup_requests')
      .update({
        status: 'CANCELLED',
        cancelled_at: now,
      })
      .eq('session_id', solicitation.sessionId)
      .eq('created_by', user.id)
      .eq('status', 'PENDING_PROCESSO')
      .select('*');

    if (error) {
      console.error('Cancel OPPO setup solicitation error:', error);
      window.alert(`Erro ao cancelar solicitação: ${error.message}`);
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map((row) => mapOppoSetupSolicitation(row as OppoSetupSolicitationRow));
      setOppoSetupSolicitations((prev) => prev.map((item) => mapped.find((m) => m.id === item.id) || item));
    }
  };

  const handleDeleteOppoSetupSolicitation = async (solicitationId: string) => {
    if (!isDevAdmin) {
      window.alert('Apenas admin do sistema pode excluir solicitação de setup.');
      return;
    }

    if (isLocalRecordId(solicitationId)) {
      setOppoSetupSolicitations((prev) => prev.filter((item) => item.id !== solicitationId));
      return;
    }

    const { error } = await supabase.from('oppo_setup_requests').delete().eq('id', solicitationId);
    if (error) {
      console.error('Delete OPPO setup solicitation error:', error);
      window.alert(`Erro ao excluir solicitação de setup: ${error.message}`);
      return;
    }

    setOppoSetupSolicitations((prev) => prev.filter((item) => item.id !== solicitationId));
  };

  const oppoLineTypeDraft = resolveOppoLineType(oppoLineDraft);
  const normalizedReturnCodeInput = oppoReturnCodeInput.replace(/\s+/g, '').trim();
  const filteredReturnCodeOptions = useMemo(() => {
    if (!normalizedReturnCodeInput) return [];
    const query = normalizedReturnCodeInput.toLowerCase();
    return OPPO_IDENTIFICATION_CODES
      .filter((code) => code.toLowerCase().includes(query) && !oppoReturnSelectedCodesDraft.some((item) => item.code === code))
      .slice(0, 12);
  }, [normalizedReturnCodeInput, oppoReturnSelectedCodesDraft]);

  const addReturnCodeToDraft = (code: string) => {
    const normalized = code.replace(/\s+/g, '').trim();
    if (!normalized) return;
    const existing = oppoReturnSelectedCodesDraft.find((item) => item.code === normalized);
    const defaultQty = existing?.quantity || 1;
    setQuantityEditor({
      open: true,
      code: normalized,
      quantityInput: `${defaultQty}`,
      source: 'RETURN',
      clearInputAfterSave: true,
    });
  };

  const normalizedAlmoxPaidCodeInput = almoxPaidCodeInput.replace(/\s+/g, '').trim();
  const filteredAlmoxPaidCodeOptions = useMemo(() => {
    if (!normalizedAlmoxPaidCodeInput) return [];
    const query = normalizedAlmoxPaidCodeInput.toLowerCase();
    return OPPO_IDENTIFICATION_CODES
      .filter((code) => code.toLowerCase().includes(query) && !almoxPaidSelectedItemsDraft.some((item) => item.code === code))
      .slice(0, 12);
  }, [normalizedAlmoxPaidCodeInput, almoxPaidSelectedItemsDraft]);

  const addAlmoxPaidCodeToDraft = (code: string) => {
    const normalized = code.replace(/\s+/g, '').trim();
    if (!normalized) return;
    const existing = almoxPaidSelectedItemsDraft.find((item) => item.code === normalized);
    const defaultQty = existing?.quantity || 1;
    setQuantityEditor({
      open: true,
      code: normalized,
      quantityInput: `${defaultQty}`,
      source: 'ALMOX',
      clearInputAfterSave: true,
    });
  };

  const closeQuantityEditor = () => {
    setQuantityEditor((prev) => ({ ...prev, open: false }));
  };

  const adjustQuantityEditor = (delta: number) => {
    setQuantityEditor((prev) => {
      const current = Number(prev.quantityInput);
      const safeCurrent = Number.isFinite(current) ? Math.floor(current) : 1;
      const next = Math.max(1, safeCurrent + delta);
      return { ...prev, quantityInput: `${next}` };
    });
  };

  const confirmQuantityEditor = () => {
    const qty = Number(quantityEditor.quantityInput);
    if (!Number.isFinite(qty) || qty <= 0) {
      window.alert('Informe uma quantidade válida maior que zero.');
      return;
    }
    const quantity = Math.floor(qty);
    const code = quantityEditor.code;
    if (quantityEditor.source === 'RETURN') {
      setOppoReturnSelectedCodesDraft((prev) => {
        const idx = prev.findIndex((item) => item.code === code);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity };
          return next;
        }
        return [...prev, { code, quantity }];
      });
      if (quantityEditor.clearInputAfterSave) setOppoReturnCodeInput('');
    } else {
      setAlmoxPaidSelectedItemsDraft((prev) => {
        const idx = prev.findIndex((item) => item.code === code);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity };
          return next;
        }
        return [...prev, { code, quantity }];
      });
      if (quantityEditor.clearInputAfterSave) setAlmoxPaidCodeInput('');
    }
    closeQuantityEditor();
  };

  const openAlmoxPaidItemsModal = (req: OppoRequest) => {
    setAlmoxPaidItemsRequestId(req.id);
    setAlmoxPaidSelectedItemsDraft(req.paidItems || []);
    setAlmoxPaidItemsNoteDraft(req.paidItemsNote || '');
    setAlmoxPaidCodeInput('');
    setShowAlmoxPaidItemsModal(true);
  };

  const closeAlmoxPaidItemsModal = () => {
    setShowAlmoxPaidItemsModal(false);
    setAlmoxPaidItemsRequestId(null);
    setAlmoxPaidSelectedItemsDraft([]);
    setAlmoxPaidItemsNoteDraft('');
    setAlmoxPaidCodeInput('');
  };

  const oppoRequesterConferenceRequest = useMemo(
    () => (oppoRequesterConferenceRequestId ? oppoRequests.find((req) => req.id === oppoRequesterConferenceRequestId) || null : null),
    [oppoRequesterConferenceRequestId, oppoRequests]
  );

  const openOppoRequesterConferenceModal = (req: OppoRequest) => {
    if (req.callType === 'SOLICITACAO_DISPOSITIVO' && req.paidItems.length === 0) {
      window.alert('O Almoxerifado ainda não informou os itens pagos deste chamado.');
      return;
    }
    const initialConfirmedQtyByCode = req.paidItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.code] = 0;
      return acc;
    }, {});
    setOppoRequesterConferenceRequestId(req.id);
    setOppoRequesterConferenceConfirmedQtyByCode(initialConfirmedQtyByCode);
    setOppoRequesterConferenceNoteDraft('');
    setShowOppoRequesterConferenceModal(true);
  };

  const closeOppoRequesterConferenceModal = () => {
    setShowOppoRequesterConferenceModal(false);
    setOppoRequesterConferenceRequestId(null);
    setOppoRequesterConferenceConfirmedQtyByCode({});
    setOppoRequesterConferenceNoteDraft('');
  };

  const setOppoRequesterConferenceConfirmedQty = (code: string, quantity: number, max: number) => {
    const normalized = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    const bounded = Math.max(0, Math.min(max, normalized));
    setOppoRequesterConferenceConfirmedQtyByCode((prev) => ({ ...prev, [code]: bounded }));
  };

  const buildOppoRequesterConferenceItems = (req: OppoRequest) => {
    const confirmedItems: OppoPaidItem[] = [];
    const divergentItems: OppoPaidItem[] = [];
    let totalExpectedQty = 0;
    let totalConfirmedQty = 0;

    req.paidItems.forEach((item) => {
      const expectedQty = Math.max(0, Math.floor(item.quantity));
      const confirmedQty = Math.max(
        0,
        Math.min(expectedQty, Math.floor(oppoRequesterConferenceConfirmedQtyByCode[item.code] || 0))
      );
      const pendingQty = Math.max(0, expectedQty - confirmedQty);
      totalExpectedQty += expectedQty;
      totalConfirmedQty += confirmedQty;
      if (confirmedQty > 0) confirmedItems.push({ code: item.code, quantity: confirmedQty });
      if (pendingQty > 0) divergentItems.push({ code: item.code, quantity: pendingQty });
    });

    return { confirmedItems, divergentItems, totalExpectedQty, totalConfirmedQty };
  };

  const toggleAlmoxReturnItemChecked = (requestId: string, code: string) => {
    setAlmoxReturnCheckedItemsByRequest((prev) => {
      const current = prev[requestId] || [];
      if (current.includes(code)) {
        return { ...prev, [requestId]: current.filter((itemCode) => itemCode !== code) };
      }
      return { ...prev, [requestId]: [...current, code] };
    });
  };

  const areAllReturnItemsChecked = (req: OppoRequest) => {
    if (req.returnItemsSelected.length === 0) return false;
    const checked = almoxReturnCheckedItemsByRequest[req.id] || [];
    return req.returnItemsSelected.every((item) => checked.includes(item.code));
  };

  const currentSetupProductKey = normalizeOppoSetupProductKey(oppoSetupStartDraft?.product || oppoSetupProductDraft);
  const activeOppoSetupTemplate = useMemo(() => {
    const storeKey = currentSetupProductKey ? buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, currentSetupProductKey) : '';
    const custom = storeKey ? oppoSetupLayoutsByStoreKey[storeKey] : undefined;
    return normalizeOppoSetupTemplates(custom || buildDefaultOppoSetupTemplate());
  }, [currentOppoSetupLayoutRole, currentSetupProductKey, oppoSetupLayoutsByStoreKey]);
  const activeOppoSetupPosts = useMemo(
    () => activeOppoSetupTemplate.map((item) => item.code),
    [activeOppoSetupTemplate]
  );

  const openOppoSetupLayoutModal = (productValue?: string) => {
    const productKey = normalizeOppoSetupProductKey(productValue || oppoSetupStartDraft?.product || oppoSetupProductDraft);
    const storeKey = productKey ? buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey) : '';
    const draftTemplate = storeKey ? oppoSetupLayoutDraftsByProduct[storeKey] : undefined;
    const template = storeKey ? oppoSetupLayoutsByStoreKey[storeKey] : undefined;
    setOppoSetupLayoutProductDraft(productKey || '');
    setOppoSetupLayoutPostsDraft(normalizeOppoSetupTemplates(draftTemplate || template || buildDefaultOppoSetupTemplate()));
    setOppoSetupLayoutResourcesRowOpen(null);
    setOppoSetupLayoutNewPostResourcesOpen(false);
    setOppoSetupLayoutNewPostCode('');
    setOppoSetupLayoutNewPostDescription('');
    setOppoSetupLayoutNewPostMachine(false);
    setOppoSetupLayoutNewPostIonizer(false);
    setOppoSetupLayoutNewPostLupa(false);
    setShowOppoSetupLayoutModal(true);
  };

  const addPostToOppoSetupLayoutDraft = () => {
    if (!canManageOppoSetupLayouts) {
      window.alert('Somente a Eng. (Processo/Teste) pode alterar layouts do seu setor.');
      return;
    }
    const code = oppoSetupLayoutNewPostCode.trim().toUpperCase();
    if (!code) {
      window.alert('Informe o código do posto.');
      return;
    }
    if (oppoSetupLayoutPostsDraft.some((item) => item.code === code)) {
      window.alert('Este código de posto já existe no layout.');
      return;
    }
    setOppoSetupLayoutPostsDraft((prev) => [
      ...prev,
      {
        code,
        description: oppoSetupLayoutNewPostDescription.trim() || `Execução do posto ${code}`,
        isMachinePress: oppoSetupLayoutNewPostMachine,
        hasIonizer: oppoSetupLayoutNewPostIonizer,
        hasLupa: oppoSetupLayoutNewPostLupa,
        order: prev.length,
      },
    ]);
    setOppoSetupLayoutNewPostCode('');
    setOppoSetupLayoutNewPostDescription('');
    setOppoSetupLayoutNewPostMachine(false);
    setOppoSetupLayoutNewPostIonizer(false);
    setOppoSetupLayoutNewPostLupa(false);
    setOppoSetupLayoutNewPostResourcesOpen(false);
  };

  const removePostFromOppoSetupLayoutDraft = (index: number) => {
    if (!canManageOppoSetupLayouts) {
      window.alert('Somente a Eng. de Processo pode alterar layouts.');
      return;
    }
    setOppoSetupLayoutPostsDraft((prev) => prev.filter((_item, idx) => idx !== index).map((item, idx) => ({ ...item, order: idx })));
  };

  const saveOppoSetupLayoutDraft = async () => {
    if (!canManageOppoSetupLayouts) {
      window.alert('Usuários do PCP não podem salvar/alterar layouts. Apenas visualização.');
      return;
    }
    const productKey = normalizeOppoSetupProductKey(oppoSetupLayoutProductDraft);
    if (!productKey) {
      window.alert('Informe o produto para salvar o layout.');
      return;
    }
    const storeKey = buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey);
    const normalizedTemplate = normalizeOppoSetupTemplates(oppoSetupLayoutPostsDraft);
    if (normalizedTemplate.length === 0) {
      window.alert('Adicione ao menos um posto no layout.');
      return;
    }
    let sharedLayoutSaveBlocked = false;
    if (isSupabaseConfigured) {
      const maxAttempts = 3;
      let lastErrorMessage = '';
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          // Prefer RPC (workaround para instabilidades no upsert via PostgREST)
          const updatedByName =
            profile?.displayName ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email ||
            'Usuário';

          const { error: rpcError } = await supabase.rpc('upsert_oppo_setup_layout', {
            p_product_key: productKey,
            p_target_role: currentOppoSetupLayoutRole,
            p_posts: normalizedTemplate as any,
            p_updated_by: user?.id || null,
            p_updated_by_name: updatedByName,
          });

          // Fallback para ambientes sem RPC ou com RPC antiga validando metadata incorreto.
          const rpcMessage = `${rpcError?.message || ''}`.toLowerCase();
          const rpcMissing = !!rpcError && rpcMessage.includes('does not exist');
          const rpcAuthBlocked = !!rpcError && (rpcMessage.includes('forbidden') || rpcMessage.includes('unauthorized'));
          if (rpcAuthBlocked) {
            console.warn('Permissão do banco bloqueou a RPC de layout; salvando layout localmente.', rpcError);
            sharedLayoutSaveBlocked = true;
            break;
          }

          const { error } = rpcError && !rpcMissing
            ? { error: rpcError }
            : await supabase
                .from('oppo_setup_layouts')
                .upsert(
                  {
                    product_key: productKey,
                    target_role: currentOppoSetupLayoutRole,
                    posts: normalizedTemplate,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id || null,
                    updated_by_name: updatedByName,
                  },
                  { onConflict: 'product_key,target_role' }
                );

          if (!error) break;

          console.error('Erro ao salvar layout de setup no Supabase:', { attempt, error });
          const msg = `${error.message || ''}`.toLowerCase();
          const tableMissing = msg.includes('oppo_setup_layouts') && (msg.includes('does not exist') || msg.includes('relation'));
          if (tableMissing) {
            console.warn('Tabela oppo_setup_layouts não existe no Supabase; salvando layout localmente.', error);
            sharedLayoutSaveBlocked = true;
            break;
          }
          const rlsBlocked = msg.includes('row-level security') || msg.includes('violates row-level security');
          if (rlsBlocked) {
            console.warn('RLS bloqueou o salvamento do layout no Supabase; salvando layout localmente.', error);
            sharedLayoutSaveBlocked = true;
            break;
          }
          lastErrorMessage = error.message || 'Erro desconhecido';

          const status = (error as any)?.status as number | undefined;
          if (status === 520 && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            continue;
          }

          window.alert(
            `Erro ao salvar layout no Supabase: ${lastErrorMessage}\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${import.meta.env.VITE_SUPABASE_URL || '(vazio)'}`
          );
          return;
        } catch (err: any) {
          const message = `${err?.message || err}`.trim();
          console.error('Erro ao salvar layout no Supabase (fetch):', { attempt, err });
          lastErrorMessage = message || 'Falha de rede';
          const isNetwork = err instanceof TypeError || /failed to fetch/i.test(message);
          if (isNetwork && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            continue;
          }
          window.alert(
            `Erro ao salvar layout no Supabase: ${lastErrorMessage}\n\nDica: verifique VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, sua internet, e se o Supabase está respondendo.\n\nDebug:\n- online: ${navigator.onLine ? 'sim' : 'não'}\n- supabase_url: ${import.meta.env.VITE_SUPABASE_URL || '(vazio)'}`
          );
          return;
        }
      }
    }
    setOppoSetupLayoutsByStoreKey((prev) => ({ ...prev, [storeKey]: normalizedTemplate }));
    setOppoSetupLayoutDraftsByProduct((prev) => {
      if (sharedLayoutSaveBlocked) return { ...prev, [storeKey]: normalizedTemplate };
      if (!prev[storeKey]) return prev;
      const next = { ...prev };
      delete next[storeKey];
      return next;
    });
    setShowOppoSetupLayoutModal(false);
    if (oppoSetupStartDraft && normalizeOppoSetupProductKey(oppoSetupStartDraft.product) === productKey) {
      setOppoSetupStartDraft({ ...oppoSetupStartDraft, product: productKey });
    }
  };

  const removeOppoSetupLayoutDraft = async () => {
    if (!canManageOppoSetupLayouts) {
      window.alert('Usuários do PCP não podem excluir layouts. Apenas visualização.');
      return;
    }
    const productKey = normalizeOppoSetupProductKey(oppoSetupLayoutProductDraft);
    if (!productKey) return;
    const storeKey = buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey);
    if (!window.confirm(`Excluir o layout personalizado do produto ${productKey}?`)) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('oppo_setup_layouts')
        .delete()
        .eq('product_key', productKey)
        .eq('target_role', currentOppoSetupLayoutRole);
      if (error) {
        console.error('Erro ao excluir layout de setup no Supabase:', error);
        const msg = `${error.message || ''}`.toLowerCase();
        const tableMissing = msg.includes('oppo_setup_layouts') && (msg.includes('does not exist') || msg.includes('relation'));
        if (!tableMissing) {
          window.alert(`Erro ao excluir layout no Supabase: ${error.message}`);
          return;
        }
      }
    }
    setOppoSetupLayoutsByStoreKey((prev) => {
      const next = { ...prev };
      delete next[storeKey];
      return next;
    });
    setOppoSetupLayoutDraftsByProduct((prev) => {
      if (!prev[storeKey]) return prev;
      const next = { ...prev };
      delete next[storeKey];
      return next;
    });
    setOppoSetupLayoutPostsDraft(buildDefaultOppoSetupTemplate());
  };

  const renderOppoSetupPostCard = (post: string) => {
    const canActOnSetupPosts = isDevAdmin || currentRole === 'ENGENHARIA_PROCESSO' || currentRole === 'ENGENHARIA_TESTE';
    const templateItem = activeOppoSetupTemplate.find((item) => item.code === post);
    const stepDescription = templateItem?.description || `Execução do posto ${post}`;
    const postRequest = oppoSetupSessionRequests.find((req) => extractTaggedValue(req.notes, OPPO_SETUP_POST_TAG_PREFIX) === post);
    const isMachinePressPost = !!templateItem?.isMachinePress;
    const hasIonizerPost = !!templateItem?.hasIonizer;
    const hasLupaPost = !!templateItem?.hasLupa;
    const hasSpecialChecklist = isMachinePressPost || hasIonizerPost || hasLupaPost;
    const pressChecklist = parseOppoPressChecklistTag(postRequest?.notes);
    const isCompleted = postRequest?.status === 'CONCLUIDO';
    const isRunning = !!postRequest && !isCompleted;
    const detailsKey = `${oppoSetupStartDraft?.sessionId || 'no-session'}:${post}`;
    const detailsOpen = !!oppoSetupPostDetailsOpen[detailsKey];
    const startedAt = postRequest?.requestedAt;
    const finishedAt = postRequest?.requesterConfirmedAt || postRequest?.finalizedAt;
    const startedMs = startedAt ? new Date(startedAt).getTime() : 0;
    const endedMs = isCompleted ? (finishedAt ? new Date(finishedAt).getTime() : startedMs) : oppoSetupNowMs;
    const elapsedMs = startedMs > 0 && Number.isFinite(startedMs) && Number.isFinite(endedMs) ? Math.max(0, endedMs - startedMs) : 0;
    const statusLabel = isCompleted ? 'Finalizado' : isRunning ? (postRequest.status === 'ABERTO' ? 'Em início' : 'Em setup') : 'Aguardando início';
    const statusClass = isCompleted
      ? 'border-emerald-300 bg-white text-emerald-700'
      : isRunning
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-zinc-200 bg-zinc-50 text-zinc-600';
    const cardClass = isCompleted
      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
      : isRunning
        ? 'border-amber-300 bg-amber-50 shadow-sm'
        : 'border-zinc-300 bg-white hover:shadow-sm';

    return (
      <div key={post} className={`rounded-2xl border p-3 transition-all ${cardClass}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xl font-black leading-none text-zinc-900">{post}</p>
          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-600 line-clamp-2">{stepDescription}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {isMachinePressPost && (
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">Máquina</span>
          )}
          {hasIonizerPost && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Ionizador</span>
          )}
          {hasLupaPost && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Lupa</span>
          )}
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() =>
              setOppoSetupPostDetailsOpen((prev) => ({
                ...prev,
                [detailsKey]: !prev[detailsKey],
              }))
            }
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100"
          >
            {detailsOpen ? 'Ocultar detalhes' : 'Detalhes'}
          </button>
        </div>
        {detailsOpen && (
          <div className="mt-2 space-y-0.5 text-[10px] text-zinc-600">
            <p>
              Executor: <span className="font-semibold text-zinc-700">{postRequest ? (postRequest.createdByName || postRequest.createdBy) : '--'}</span>
            </p>
            {hasSpecialChecklist && (
              <p>
                Checklist posto:{' '}
                <span className="font-semibold text-zinc-700">
                  {pressChecklist
                    ? [
                        ...(isMachinePressPost ? [pressChecklist.trocaFixtures ? 'Fixtures OK' : 'Fixtures --', pressChecklist.debug ? 'Debug OK' : 'Debug --', pressChecklist.papelSensivel ? 'Papel sensível OK' : 'Papel sensível --'] : []),
                        ...(hasIonizerPost ? [pressChecklist.ionizador ? 'Ionizador OK' : 'Ionizador --'] : []),
                        ...(hasLupaPost ? [pressChecklist.lupa ? 'Lupa OK' : 'Lupa --'] : []),
                      ].join(' | ')
                    : 'pendente'}
                </span>
              </p>
            )}
            <p>
              Início: <span className="font-semibold text-zinc-700">{postRequest ? formatSafeDate(startedAt, 'dd/MM/yyyy HH:mm:ss') : '--'}</span>
            </p>
            {isCompleted && (
              <p>
                Fim: <span className="font-semibold text-zinc-700">{formatSafeDate(finishedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
              </p>
            )}
            <p>
              Tempo gasto: <span className="font-semibold text-zinc-700">{postRequest ? formatDurationMs(elapsedMs) : '--'}</span>
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {!postRequest && canActOnSetupPosts && (
            <button
              type="button"
              onClick={async () => {
                if (!canActOnSetupPosts) {
                  window.alert('Apenas a Eng. de Processo ou Eng. de Teste pode iniciar os postos do setup.');
                  return;
                }
                if (!oppoSetupStartDraft) return;
                const targetRole = resolveOppoSetupTargetRoleTag(currentRole) || 'ENGENHARIA_PROCESSO';
                await handleCreateOppoRequest('SOLICITACAO_DISPOSITIVO', {
                  line: oppoSetupStartDraft.line,
                  product: oppoSetupStartDraft.product,
                  lineType: oppoSetupStartDraft.lineType,
                  initialStatus: 'SEPARACAO',
                  notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${oppoSetupStartDraft.sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_POST_TAG_PREFIX}${post}] Posto iniciado: ${post}. ${stepDescription}`,
                });
                setActiveMainTab('OPPO_SETUP');
              }}
              className="rounded-md bg-cyan-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-cyan-700"
            >
              Iniciar
            </button>
          )}
          {isRunning && canActOnSetupPosts && (isDevAdmin || postRequest?.createdBy === user?.id) && (
            <button
              type="button"
              onClick={() => {
                if (!canActOnSetupPosts) {
                  window.alert('Apenas a Eng. de Processo ou Eng. de Teste pode finalizar os postos do setup.');
                  return;
                }
                if (!postRequest) return;
                const sessionId = oppoSetupStartDraft?.sessionId || extractTaggedValue(postRequest.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
                const targetRole = extractTaggedValue(postRequest.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || resolveOppoSetupTargetRoleTag(currentRole) || 'ENGENHARIA_PROCESSO';
                if (hasSpecialChecklist) {
                  setOppoPressChecklistTarget({
                    requestId: postRequest.id,
                    post,
                    stepDescription,
                    sessionId,
                  });
                  setOppoPressChecklistDraft(
                    pressChecklist || {
                      trocaFixtures: false,
                      debug: false,
                      papelSensivel: false,
                      ionizador: false,
                      lupa: false,
                    }
                  );
                  setShowOppoPressChecklistModal(true);
                  return;
                }
                handleUpdateOppoStatus(postRequest.id, 'CONCLUIDO', {
                  requester_confirmed: true,
                  requester_confirmed_at: new Date().toISOString(),
                  finalized_at: new Date().toISOString(),
                  requester_confirmed_by: user?.id || null,
                  requester_confirmed_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuário',
                  notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_POST_TAG_PREFIX}${post}] Posto finalizado: ${post}. ${stepDescription}`,
                });
              }}
              className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
            >
              Finalizar posto
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateOppoStatus = async (requestId: string, nextStatus: OppoRequestStatus, patch: Record<string, any> = {}) => {
    const sanitizedNotes = `${patch.notes || ''}`.replace(OPPO_LEGACY_CONFERINDO_TAG, '').trim();
    const existingNotes = oppoRequests.find((req) => req.id === requestId)?.notes || '';

    const mergeOppoSetupTags = (base: string, next: string) => {
      const sessionId = extractTaggedValue(base, OPPO_SETUP_SESSION_TAG_PREFIX);
      const targetRole = extractTaggedValue(base, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
      const productionOrder = extractTaggedValue(base, OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX);

      const parts: string[] = [];
      if (sessionId) parts.push(`${OPPO_SETUP_SESSION_TAG_PREFIX}${sessionId}]`);
      if (targetRole) parts.push(`${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}]`);
      if (productionOrder) parts.push(`${OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX}${productionOrder}]`);

      if (parts.length === 0) return next;

      // Se o texto já tiver essas tags, não duplica.
      const alreadyHasAll = parts.every((p) => next.includes(p));
      if (alreadyHasAll) return next;

      const prefix = parts.join(' ');
      return `${prefix} ${next}`.trim();
    };

    const mergedNotes =
      Object.prototype.hasOwnProperty.call(patch, 'notes') ? mergeOppoSetupTags(existingNotes, sanitizedNotes || '') : undefined;
    const basePatch: Record<string, any> = {
      ...patch,
      ...(Object.prototype.hasOwnProperty.call(patch, 'notes') ? { notes: mergedNotes || null } : {}),
    };

    if (isLocalRecordId(requestId)) {
      setOppoRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: nextStatus,
                notes: Object.prototype.hasOwnProperty.call(basePatch, 'notes') ? basePatch.notes || undefined : req.notes,
                acceptedAt: basePatch.accepted_at || req.acceptedAt,
                finalizedAt: basePatch.finalized_at || req.finalizedAt,
                requesterConfirmedAt: basePatch.requester_confirmed_at || req.requesterConfirmedAt,
                requesterConfirmed:
                  Object.prototype.hasOwnProperty.call(basePatch, 'requester_confirmed')
                    ? basePatch.requester_confirmed ?? undefined
                    : req.requesterConfirmed,
                requesterConfirmedBy: basePatch.requester_confirmed_by || req.requesterConfirmedBy,
                requesterConfirmedByName: basePatch.requester_confirmed_by_name || req.requesterConfirmedByName,
                almoxBy: basePatch.almox_by || req.almoxBy,
                almoxByName: basePatch.almox_by_name || req.almoxByName,
                paidItems: Array.isArray(basePatch.paid_items_selected) ? basePatch.paid_items_selected : req.paidItems,
                paidItemsNote:
                  Object.prototype.hasOwnProperty.call(basePatch, 'paid_items_note') ? basePatch.paid_items_note || undefined : req.paidItemsNote,
                returnItemsSelected: Array.isArray(basePatch.return_items_selected) ? basePatch.return_items_selected : req.returnItemsSelected,
                returnItemsNote:
                  Object.prototype.hasOwnProperty.call(basePatch, 'return_items_note') ? basePatch.return_items_note || undefined : req.returnItemsNote,
              }
            : req
        )
      );
      return;
    }

    let { data, error } = await supabase
      .from('oppo_requests')
      .update({
        status: nextStatus,
        ...basePatch,
      })
      .eq('id', requestId)
      .select('*')
      .single();

    // Fallback para bancos sem "CONFERINDO" na constraint de status.
    if (
      error &&
      nextStatus === 'CONFERINDO' &&
      (`${error.message}`.includes('oppo_requests_status_check') || `${error.message}`.toLowerCase().includes('violates check constraint'))
    ) {
      const legacyConferindoNotes = [mergedNotes || sanitizedNotes, OPPO_LEGACY_CONFERINDO_TAG].filter(Boolean).join(' ');
      const legacyResult = await supabase
        .from('oppo_requests')
        .update({
          status: 'SEPARACAO',
          ...basePatch,
          notes: legacyConferindoNotes,
        })
        .eq('id', requestId)
        .select('*')
        .single();
      data = legacyResult.data;
      error = legacyResult.error;
    }

    // Fallback para ambientes sem as colunas novas de itens pagos.
    if (error && (`${error.message}`.includes('paid_items_') || `${error.message}`.includes('requester_confirmed_by'))) {
      const patchWithoutPaid = { ...basePatch };
      delete patchWithoutPaid.paid_items_selected;
      delete patchWithoutPaid.paid_items_note;
      delete patchWithoutPaid.requester_confirmed_by;
      delete patchWithoutPaid.requester_confirmed_by_name;
      const fallbackStatus = nextStatus === 'CONFERINDO' ? 'SEPARACAO' : nextStatus;
      if (nextStatus === 'CONFERINDO') {
        const fallbackNotes = [
          mergeOppoSetupTags(existingNotes, `${patchWithoutPaid.notes || ''}`.replace(OPPO_LEGACY_CONFERINDO_TAG, '').trim()),
          OPPO_LEGACY_CONFERINDO_TAG,
        ]
          .filter(Boolean)
          .join(' ');
        patchWithoutPaid.notes = fallbackNotes;
      }
      const fallbackResult = await supabase
        .from('oppo_requests')
        .update({
          status: fallbackStatus,
          ...patchWithoutPaid,
        })
        .eq('id', requestId)
        .select('*')
        .single();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Update OPPO request error:', error);
      window.alert(`Erro ao atualizar chamado OPPO: ${error.message}`);
      return;
    }

    if (data) {
      const mapped = mapOppoRequest(data as OppoRequestRow);
      setOppoRequests((prev) => prev.map((req) => (req.id === requestId ? mapped : req)));
    }
  };

  const handleDeleteOppoRequest = async (requestId: string) => {
    if (!isDevAdmin) {
      window.alert('Apenas admin do sistema pode excluir chamado OPPO.');
      return;
    }

    if (isLocalRecordId(requestId)) {
      setHiddenDerivedOppoRequestIds((prev) => (prev.includes(requestId) ? prev : [...prev, requestId]));
      setOppoRequests((prev) => prev.filter((req) => req.id !== requestId));
      return;
    }

    const { error } = await supabase.from('oppo_requests').delete().eq('id', requestId);
    if (error) {
      console.error('Delete OPPO request error:', error);
      window.alert(`Erro ao excluir chamado OPPO: ${error.message}`);
      return;
    }
    setOppoRequests((prev) => prev.filter((req) => req.id !== requestId));
  };

  const handleDeleteOppoRequestsBulk = async (requestIds: string[]) => {
    if (!isDevAdmin) {
      window.alert('Apenas admin do sistema pode excluir chamados OPPO.');
      return;
    }

    if (!requestIds.length) return;
    const localIds = requestIds.filter(isLocalRecordId);
    const remoteIds = requestIds.filter((id) => !isLocalRecordId(id));
    if (localIds.length > 0) {
      setHiddenDerivedOppoRequestIds((prev) => Array.from(new Set([...prev, ...localIds])));
    }
    if (remoteIds.length > 0) {
      const { error } = await supabase.from('oppo_requests').delete().in('id', remoteIds);
      if (error) {
        console.error('Bulk delete OPPO requests error:', error);
        window.alert(`Erro ao excluir histórico OPPO: ${error.message}`);
        return;
      }
    }
    // Confirmação rápida: se a RLS bloquear, o erro acima aparece; se a deleção for parcial, o realtime deve reajustar.
    const idSet = new Set([...localIds, ...remoteIds]);
    setOppoRequests((prev) => prev.filter((req) => !idSet.has(req.id)));
  };

  const handleRefreshRequests = async () => {
    if (!isSupabaseConfigured || !user || !profile || isRefreshingRequests) return;
    setIsRefreshingRequests(true);
    const { data, error } = await supabase
      .from('setup_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Manual requests refresh error:', error);
      window.alert(`Erro ao atualizar chamados: ${error.message}`);
      setIsRefreshingRequests(false);
      return;
    }

    setRequests((data || []).map((row) => mapRequest(row as SetupRequestRow)));
    setIsRefreshingRequests(false);
  };

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

  const handleUpdateJobTitle = () => {
    if (!user) return;
    const currentTitle = `${user.user_metadata?.job_title || user.user_metadata?.cargo || ''}`.trim();
    setJobTitleDraft(currentTitle);
    setShowJobTitleModal(true);
  };

  const persistFirstAccessOnboardingAsSeen = async () => {
    if (!isSupabaseConfigured || !user) return;
    const currentVersion = `${user.user_metadata?.onboarding_setup_version || ''}`.trim().toLowerCase();
    if (currentVersion === FIRST_ACCESS_ONBOARDING_VERSION) return;
    const { data, error } = await supabase.auth.updateUser({
      data: {
        onboarding_setup_version: FIRST_ACCESS_ONBOARDING_VERSION,
        onboarding_setup_seen_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.error('Erro ao salvar onboarding de primeiro acesso:', error);
      return;
    }
    if (data.user) {
      setUser(data.user);
    }
  };

  const closeFirstAccessOnboarding = async () => {
    setShowFirstAccessOnboarding(false);
    setFirstAccessStepIndex(0);
    await persistFirstAccessOnboardingAsSeen();
  };

  const goToNextFirstAccessStep = async () => {
    if (firstAccessStepIndex >= firstAccessOnboardingSteps.length - 1) {
      await closeFirstAccessOnboarding();
      return;
    }
    setFirstAccessStepIndex((prev) => Math.min(prev + 1, firstAccessOnboardingSteps.length - 1));
  };

  const saveJobTitleFromModal = async () => {
    if (!user) return;
    const cleanTitle = jobTitleDraft.trim();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        job_title: cleanTitle || null,
      },
    });

    if (error) {
      window.alert(`Erro ao salvar cargo: ${error.message}`);
      return;
    }

    if (data.user) {
      setUser(data.user);
    }
    setShowJobTitleModal(false);
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
      const qualityReceiver = (
        typeof updateData.quality_document_received_by === 'string'
          ? updateData.quality_document_received_by
          : currentRequest.qualityDocumentReceivedBy
      )?.trim();
      if (!qualityReceiver) {
        window.alert('Informe quem recebeu o documento para finalizar na Qualidade.');
        return;
      }
      updateData.quality_document_received_by = qualityReceiver;
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
      const kitReceiver = (
        typeof updateData.kit_material_received_by === 'string'
          ? updateData.kit_material_received_by
          : currentRequest.kitMaterialReceivedBy
      )?.trim();
      if (!kitReceiver) {
        window.alert('Informe quem recebeu o material para finalizar na Área Kit.');
        return;
      }
      updateData.kit_material_received_by = kitReceiver;
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

  const currentRoleOption = ROLE_OPTIONS.find((item) => item.id === currentRole);
  const userInitials = (profile?.displayName || 'US')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'US';
  const selectedRoleLabel = currentRoleOption?.label || currentRole;
  const ActiveRoleIcon = currentRoleOption?.icon || Settings;
  const userJobTitle = `${user?.user_metadata?.job_title || user?.user_metadata?.cargo || ''}`.trim();
  const displayJobTitle = userJobTitle || selectedRoleLabel;
  const canSeeTesteChecklistHub = currentRole === 'ENGENHARIA_TESTE';
  const effectiveDashboardView = canSeeTesteChecklistHub ? dashboardView : 'REQUESTS';
  const canActAsAlmox = currentRole === 'ALMOXERIFADO' || isDevAdmin;
  const canManageOppoSetupLayouts = isDevAdmin || currentRole === 'ENGENHARIA_PROCESSO' || currentRole === 'ENGENHARIA_TESTE';
  const canNavigateNonSetupTabs = isDevAdmin || currentRole !== 'PCP';
  const allowedMainTabs = useMemo(() => {
    if (isDevAdmin) return ['OPERACAO', 'SLA', 'OPPO', 'OPPO_SETUP', 'ALMOXERIFADO'] as const;
    // PCP pode visualizar as demais abas, mas não deve executar ações de abertura/gestão fora do OPPO Setup.
    if (currentRole === 'PCP') return ['OPERACAO', 'SLA', 'OPPO', 'OPPO_SETUP', 'ALMOXERIFADO'] as const;
    return ['OPERACAO', 'SLA', 'OPPO', 'OPPO_SETUP', 'ALMOXERIFADO'] as const;
  }, [currentRole, isDevAdmin]);

  useEffect(() => {
    if (oppoSetupActorTabInitializedRef.current) return;
    setOppoSetupActorTab(
      currentRole === 'ENGENHARIA_TESTE' ? 'TESTE' : currentRole === 'ENGENHARIA_PROCESSO' ? 'PROCESSO' : 'PCP'
    );
    oppoSetupActorTabInitializedRef.current = true;
  }, [currentRole]);

  useEffect(() => {
    // No Sistema Materiais, o padrão deve ser o setor do usuário (quando aplicável).
    setOppoSectorTab(currentRole === 'ENGENHARIA_TESTE' ? 'TESTE' : currentRole === 'ENGENHARIA_PROCESSO' ? 'PROCESSO' : 'TODOS');
  }, [currentRole]);

  useEffect(() => {
    if (!allowedMainTabs.includes(activeMainTab)) {
      setActiveMainTab(allowedMainTabs[0]);
    }
  }, [activeMainTab, allowedMainTabs]);

  useEffect(() => {
    if (canNavigateNonSetupTabs) return;
    // PCP: trava navegação interna de abas fora do OPPO Setup.
    if (oppoView !== 'PENDENTES') setOppoView('PENDENTES');
    if (almoxView !== 'PENDENTES') setAlmoxView('PENDENTES');
  }, [almoxView, canNavigateNonSetupTabs, oppoView]);
  const isOppoSetupGeneratedRequest = (req: OppoRequest) =>
    !!extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX);

  const oppoRequesterVisibleRequests = useMemo(() => {
    if (isDevAdmin) {
      // DEV ADMIN atuando como setor deve respeitar a visão do setor no OPPO Setup.
      if (currentRole === 'ENGENHARIA_PROCESSO') {
        return oppoRequests.filter(
          (req) =>
            req.callType === 'SOLICITACAO_DISPOSITIVO' &&
            isOppoSetupGeneratedRequest(req) &&
            (extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_PROCESSO'
        );
      }
      if (currentRole === 'ENGENHARIA_TESTE') {
        return oppoRequests.filter(
          (req) =>
            req.callType === 'SOLICITACAO_DISPOSITIVO' &&
            isOppoSetupGeneratedRequest(req) &&
            extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === 'ENGENHARIA_TESTE'
        );
      }
      return oppoRequests;
    }
    if (currentRole === 'ENGENHARIA_PROCESSO') {
      return oppoRequests.filter(
        (req) =>
          req.callType === 'SOLICITACAO_DISPOSITIVO' &&
          isOppoSetupGeneratedRequest(req) &&
          // Legado (sem tag) fica visível para Processo; novos registros são filtrados por setor.
          (extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_PROCESSO'
      );
    }
    if (currentRole === 'ENGENHARIA_TESTE') {
      return oppoRequests.filter(
        (req) =>
          req.callType === 'SOLICITACAO_DISPOSITIVO' &&
          isOppoSetupGeneratedRequest(req) &&
          extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === 'ENGENHARIA_TESTE'
      );
    }
    return oppoRequests.filter((req) => req.createdBy === user?.id);
  }, [currentRole, isDevAdmin, oppoRequests, user?.id]);
  const oppoRequesterPendingRequests = useMemo(
    () =>
      oppoRequesterVisibleRequests.filter(
        (req) =>
          req.status !== 'CONCLUIDO' &&
          !(req.callType === 'DEVOLUCAO_DISPOSITIVO' && req.status === 'FINALIZADO_ALMOXERIFADO')
      ),
    [oppoRequesterVisibleRequests]
  );
  const oppoRequesterPendingRequestsFilteredBySector = useMemo(() => {
    if (oppoSectorTab === 'TODOS') return oppoRequesterPendingRequests;
    return oppoRequesterPendingRequests.filter((req) => {
      if (!isOppoSetupGeneratedRequest(req)) return oppoSectorTab === 'PROCESSO';
      const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO';
      return oppoSectorTab === 'PROCESSO' ? taggedRole === 'ENGENHARIA_PROCESSO' : taggedRole === 'ENGENHARIA_TESTE';
    });
  }, [oppoRequesterPendingRequests, oppoSectorTab]);
  const oppoRequesterHistoryRequests = useMemo(
    () =>
      [...oppoRequesterVisibleRequests]
        .filter(
          (req) =>
            req.status === 'CONCLUIDO' ||
            (req.callType === 'DEVOLUCAO_DISPOSITIVO' && req.status === 'FINALIZADO_ALMOXERIFADO')
        )
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [oppoRequesterVisibleRequests]
  );
  const oppoRequesterHistoryRequestsFilteredBySector = useMemo(() => {
    if (oppoSectorTab === 'TODOS') return oppoRequesterHistoryRequests;
    return oppoRequesterHistoryRequests.filter((req) => {
      if (!isOppoSetupGeneratedRequest(req)) return oppoSectorTab === 'PROCESSO';
      const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO';
      return oppoSectorTab === 'PROCESSO' ? taggedRole === 'ENGENHARIA_PROCESSO' : taggedRole === 'ENGENHARIA_TESTE';
    });
  }, [oppoRequesterHistoryRequests, oppoSectorTab]);
  const oppoSetupInProgressRequests = useMemo(
    () =>
      [...oppoRequesterVisibleRequests]
        .filter((req) => req.callType === 'SOLICITACAO_DISPOSITIVO' && req.status !== 'CONCLUIDO')
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [oppoRequesterVisibleRequests]
  );
  const oppoSetupCompletedRequests = useMemo(
    () =>
      [...oppoRequesterVisibleRequests]
        .filter((req) => req.callType === 'SOLICITACAO_DISPOSITIVO' && req.status === 'CONCLUIDO')
        .sort((a, b) => new Date(b.requesterConfirmedAt || b.finalizedAt || b.requestedAt).getTime() - new Date(a.requesterConfirmedAt || a.finalizedAt || a.requestedAt).getTime()),
    [oppoRequesterVisibleRequests]
  );
  const oppoSetupOeeRows = useMemo(
    () =>
      oppoSetupCompletedRequests
        .map((req) => {
          const finishedAt = req.requesterConfirmedAt || req.finalizedAt || req.requestedAt;
          const startedMs = new Date(req.requestedAt).getTime();
          const finishedMs = new Date(finishedAt).getTime();
          const realMs = Number.isFinite(startedMs) && Number.isFinite(finishedMs) ? Math.max(0, finishedMs - startedMs) : 0;
          const productKey = normalizeOppoSetupProductKey(req.product);
          const targetRole = normalizeOppoSetupLayoutTargetRole(extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX));
          const storeKey = buildOppoSetupLayoutStoreKey(targetRole, productKey);
          const template = normalizeOppoSetupTemplates(oppoSetupLayoutsByStoreKey[storeKey] || buildDefaultOppoSetupTemplate());
          const plannedMs = template.length * OPPO_SETUP_PLANNED_MINUTES_PER_POST * 60 * 1000;
          const efficiency = realMs > 0 ? Math.min(300, (plannedMs / realMs) * 100) : 0;
          return {
            id: req.id,
            line: req.line || '--',
            product: req.product || '--',
            realMs,
            plannedMs,
            efficiency,
          };
        })
        .filter((row) => row.realMs > 0),
    [oppoSetupCompletedRequests, oppoSetupLayoutsByStoreKey]
  );
  const oppoSetupOeeLineOptions = useMemo(
    () => Array.from(new Set(oppoSetupOeeRows.map((row) => row.line))).sort((a, b) => String(a).localeCompare(String(b))),
    [oppoSetupOeeRows]
  );

  const oppoSetupOeeProductOptions = useMemo(
    () => Array.from(new Set(oppoSetupOeeRows.map((row) => row.product))).sort((a, b) => String(a).localeCompare(String(b))),
    [oppoSetupOeeRows]
  );
  const oppoSetupFilteredOeeRows = useMemo(
    () =>
      oppoSetupOeeRows.filter(
        (row) =>
          (!oppoSetupDashboardLineFilter || row.line === oppoSetupDashboardLineFilter) &&
          (!oppoSetupDashboardProductFilter || row.product === oppoSetupDashboardProductFilter)
      ),
    [oppoSetupDashboardLineFilter, oppoSetupDashboardProductFilter, oppoSetupOeeRows]
  );
  const oppoSetupOeeSummary = useMemo(() => {
    if (oppoSetupFilteredOeeRows.length === 0) {
      return {
        totalSetups: 0,
        avgRealMs: 0,
        avgPlannedMs: 0,
        avgEfficiency: 0,
        onTargetRate: 0,
      };
    }
    const totalRealMs = oppoSetupFilteredOeeRows.reduce((acc, row) => acc + row.realMs, 0);
    const totalPlannedMs = oppoSetupFilteredOeeRows.reduce((acc, row) => acc + row.plannedMs, 0);
    const onTargetCount = oppoSetupFilteredOeeRows.filter((row) => row.realMs <= row.plannedMs).length;
    return {
      totalSetups: oppoSetupFilteredOeeRows.length,
      avgRealMs: Math.floor(totalRealMs / oppoSetupFilteredOeeRows.length),
      avgPlannedMs: Math.floor(totalPlannedMs / oppoSetupFilteredOeeRows.length),
      avgEfficiency: Math.round((totalPlannedMs / totalRealMs) * 100),
      onTargetRate: Math.round((onTargetCount / oppoSetupFilteredOeeRows.length) * 100),
    };
  }, [oppoSetupFilteredOeeRows]);
  const oppoSetupUnifiedInProgressCards = useMemo(
    () => {
      const activeSessionIds = new Set<string>();

      oppoSetupInProgressRequests.forEach((req) => {
        const sessionId = extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
        if (sessionId) activeSessionIds.add(sessionId);
      });

      oppoSetupMinimizedSessions.forEach((session) => {
        if (session.sessionId) activeSessionIds.add(session.sessionId);
      });

      const solicitationCards = oppoSetupSolicitations
        .filter((sol) => sol.status === 'ACCEPTED' && !sol.finishedAt)
        .filter((sol) => !!sol.sessionId && !activeSessionIds.has(sol.sessionId))
        .map((sol) => ({
          kind: 'SOLICITATION' as const,
          key: `sol-${sol.id}`,
          solicitation: sol,
        }));

      return [
        ...solicitationCards,
        ...oppoSetupInProgressRequests.map((req) => ({
          kind: 'REQUEST' as const,
          key: `req-${req.id}`,
          request: req,
        })),
        ...oppoSetupMinimizedSessions.map((session) => ({
          kind: 'MINIMIZED' as const,
          key: `min-${session.sessionId}`,
          session,
        })),
      ];
    },
    [oppoSetupInProgressRequests, oppoSetupMinimizedSessions, oppoSetupSolicitations]
  );
  const oppoSetupSessionRequests = useMemo(() => {
    if (!oppoSetupStartDraft?.sessionId) return [] as OppoRequest[];
    const targetRole = resolveOppoSetupTargetRoleTag(currentRole);
    return oppoRequests
      .filter((req) => req.callType === 'SOLICITACAO_DISPOSITIVO')
      .filter((req) => extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX) === oppoSetupStartDraft.sessionId)
      .filter((req) => {
        if (!targetRole) return true;
        const tagged = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
        if (!tagged) return targetRole === 'ENGENHARIA_PROCESSO'; // legado só para Processo
        return tagged === targetRole;
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [currentRole, oppoRequests, oppoSetupStartDraft]);
  const oppoSetupSessionCompletedPostsCount = useMemo(
    () =>
      activeOppoSetupPosts.filter((post) => {
        const req = oppoSetupSessionRequests.find((item) => extractTaggedValue(item.notes, OPPO_SETUP_POST_TAG_PREFIX) === post);
        return req?.status === 'CONCLUIDO';
      }).length,
    [activeOppoSetupPosts, oppoSetupSessionRequests]
  );
  const oppoSetupSessionAllPostsCompleted = activeOppoSetupPosts.length > 0 && oppoSetupSessionCompletedPostsCount === activeOppoSetupPosts.length;
  const oppoSetupSessionCompleted = useMemo(() => {
    const sessionId = oppoSetupStartDraft?.sessionId;
    if (!sessionId) return false;
    if (oppoSetupCompletedSessionIds.includes(sessionId)) return true;
    return oppoSetupSessionRequests.some((req) => (req.notes || '').includes(OPPO_SETUP_SESSION_COMPLETED_TAG));
  }, [oppoSetupCompletedSessionIds, oppoSetupSessionRequests, oppoSetupStartDraft]);
  const oppoSetupRegisteredLayoutProducts = useMemo(
    () =>
      Object.keys(oppoSetupLayoutsByStoreKey)
        .filter((key) => key.startsWith(`${currentOppoSetupLayoutRole}${OPPO_SETUP_LAYOUT_KEY_SEPARATOR}`))
        .map((key) => key.split(OPPO_SETUP_LAYOUT_KEY_SEPARATOR)[1] || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [currentOppoSetupLayoutRole, oppoSetupLayoutsByStoreKey]
  );
  const oppoSetupProductsByLayoutRole = useMemo(() => {
    const processo = new Set<string>();
    const teste = new Set<string>();
    for (const storeKey of Object.keys(oppoSetupLayoutsByStoreKey)) {
      const [role, product] = storeKey.split(OPPO_SETUP_LAYOUT_KEY_SEPARATOR);
      if (!role || !product) continue;
      if (role === 'ENGENHARIA_TESTE') teste.add(product);
      else processo.add(product);
    }
    return { processo, teste };
  }, [oppoSetupLayoutsByStoreKey]);
  const oppoSetupPcpProductOptions = useMemo(() => {
    const requiredRoles: Array<'ENGENHARIA_PROCESSO' | 'ENGENHARIA_TESTE'> =
      oppoSetupTypeDraft === 'MONTAGEM'
        ? ['ENGENHARIA_PROCESSO']
        : oppoSetupTypeDraft === 'EMBALAGEM'
          ? ['ENGENHARIA_TESTE']
          : oppoSetupTypeDraft === 'MONTAGEM/TESTE'
            ? ['ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE']
            : [];
    if (requiredRoles.length === 0) return [] as string[];

    const sets = requiredRoles.map((role) => (role === 'ENGENHARIA_TESTE' ? oppoSetupProductsByLayoutRole.teste : oppoSetupProductsByLayoutRole.processo));
    const [first, ...rest] = sets;
    const intersection = new Set<string>(Array.from(first));
    for (const s of rest) {
      for (const value of Array.from(intersection)) {
        if (!s.has(value)) intersection.delete(value);
      }
    }
    return Array.from(intersection).sort((a, b) => a.localeCompare(b));
  }, [oppoSetupProductsByLayoutRole, oppoSetupTypeDraft]);

  useEffect(() => {
    if (oppoSetupActorTab !== 'PCP') return;
    if (!oppoSetupTypeDraft) return;
    if (!oppoSetupProductDraft) return;
    const normalized = normalizeOppoSetupProductKey(oppoSetupProductDraft);
    if (oppoSetupPcpProductOptions.length === 0) return;
    if (!oppoSetupPcpProductOptions.includes(normalized)) {
      setOppoSetupProductDraft('');
    }
  }, [oppoSetupActorTab, oppoSetupPcpProductOptions, oppoSetupProductDraft, oppoSetupTypeDraft]);

  useEffect(() => {
    if (oppoSetupSolicitations.length === 0) return;

    const setupBySession = new Map<string, OppoSetupSolicitation>();
    oppoSetupSolicitations
      .filter((sol) => sol.status !== 'CANCELLED' && !!sol.sessionId)
      .forEach((sol) => {
        const existing = setupBySession.get(sol.sessionId);
        if (!existing || (existing.targetRole !== 'ENGENHARIA_PROCESSO' && sol.targetRole === 'ENGENHARIA_PROCESSO')) {
          setupBySession.set(sol.sessionId, sol);
        }
      });

    if (setupBySession.size === 0) return;

    setOppoRequests((prev) => {
      const next = [...prev];
      let changed = false;

      setupBySession.forEach((sol) => {
        (['ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE'] as const).forEach((targetRole) => {
          const localId = `local-oppo-${sol.sessionId}-${targetRole}`;
          if (hiddenDerivedOppoRequestIds.includes(localId)) return;

          const alreadyExists = next.some(
            (req) =>
              req.callType === 'SOLICITACAO_DISPOSITIVO' &&
              extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX) === sol.sessionId &&
              extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === targetRole
          );
          if (alreadyExists) return;

          next.unshift({
            id: localId,
            callType: 'SOLICITACAO_DISPOSITIVO',
            status: 'ABERTO',
            line: sol.line,
            product: sol.product,
            lineType: sol.lineType,
            createdBy: sol.createdBy,
            createdByName: sol.createdByName,
            requestedAt: sol.createdAt,
            returnItemsSelected: [],
            paidItems: [],
            notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${sol.sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX}${sol.productionOrder || ''}] Solicitação automática de materiais para setup.`,
          });
          changed = true;
        });
      });

      return changed ? next : prev;
    });
  }, [hiddenDerivedOppoRequestIds, oppoSetupSolicitations]);

  const oppoPressChecklistTemplateTarget = useMemo(() => {
    const postCode = oppoPressChecklistTarget?.post;
    if (!postCode) return null;
    return activeOppoSetupTemplate.find((item) => item.code === postCode) || null;
  }, [activeOppoSetupTemplate, oppoPressChecklistTarget?.post]);
  const oppoPressChecklistNeedsMachine = !!oppoPressChecklistTemplateTarget?.isMachinePress;
  const oppoPressChecklistNeedsIonizer = !!oppoPressChecklistTemplateTarget?.hasIonizer;
  const oppoPressChecklistNeedsLupa = !!oppoPressChecklistTemplateTarget?.hasLupa;
  const oppoAlmoxPendingRequests = useMemo(
    () => {
      const basePending = oppoRequests.filter(
        (req) =>
          req.callType === 'SOLICITACAO_DISPOSITIVO' &&
          (req.status === 'ABERTO' || req.status === 'SEPARACAO' || req.status === 'DIVERGENCIA' || req.status === 'FINALIZADO_ALMOXERIFADO')
      );
      const bySetupSector = new Set(
        basePending
          .map((req) => {
            const sessionId = extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX);
            const targetRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
            return sessionId && targetRole ? `${sessionId}:${targetRole}` : '';
          })
          .filter(Boolean)
      );
      const setupBySession = new Map<string, OppoSetupSolicitation>();

      oppoSetupSolicitations
        .filter((sol) => sol.status !== 'CANCELLED' && !!sol.sessionId)
        .forEach((sol) => {
          const existing = setupBySession.get(sol.sessionId);
          if (!existing || (existing.targetRole !== 'ENGENHARIA_PROCESSO' && sol.targetRole === 'ENGENHARIA_PROCESSO')) {
            setupBySession.set(sol.sessionId, sol);
          }
        });

      const derivedPending: OppoRequest[] = [];
      setupBySession.forEach((sol) => {
        (['ENGENHARIA_PROCESSO', 'ENGENHARIA_TESTE'] as const).forEach((targetRole) => {
          const key = `${sol.sessionId}:${targetRole}`;
          if (bySetupSector.has(key)) return;
          const derivedId = `local-oppo-${sol.sessionId}-${targetRole}`;
          if (hiddenDerivedOppoRequestIds.includes(derivedId)) return;
          derivedPending.push({
            id: derivedId,
            callType: 'SOLICITACAO_DISPOSITIVO',
            status: 'ABERTO',
            line: sol.line,
            product: sol.product,
            lineType: sol.lineType,
            createdBy: sol.createdBy,
            createdByName: sol.createdByName,
            requestedAt: sol.createdAt,
            returnItemsSelected: [],
            paidItems: [],
            notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${sol.sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${targetRole}] ${OPPO_SETUP_PRODUCTION_ORDER_TAG_PREFIX}${sol.productionOrder || ''}] Solicitação automática de materiais para setup.`,
          });
        });
      });

      return [...derivedPending, ...basePending];
    },
    [hiddenDerivedOppoRequestIds, oppoRequests, oppoSetupSolicitations]
  );
  const oppoAlmoxPendingRequestsFilteredBySector = useMemo(() => {
    if (almoxSectorTab === 'TODOS') return oppoAlmoxPendingRequests;
    return oppoAlmoxPendingRequests.filter((req) => {
      const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO';
      return almoxSectorTab === 'PROCESSO' ? taggedRole === 'ENGENHARIA_PROCESSO' : taggedRole === 'ENGENHARIA_TESTE';
    });
  }, [almoxSectorTab, oppoAlmoxPendingRequests]);
  const oppoAlmoxReturnOpenRequests = useMemo(
    () =>
      oppoRequests.filter(
        (req) =>
          req.callType === 'DEVOLUCAO_DISPOSITIVO' &&
          (req.status === 'ABERTO' || req.status === 'CONFERINDO' || req.status === 'SEPARACAO' || req.status === 'DIVERGENCIA')
      ),
    [oppoRequests]
  );
  const oppoAlmoxReturnOpenRequestsFilteredBySector = useMemo(() => {
    if (almoxSectorTab === 'TODOS') return oppoAlmoxReturnOpenRequests;
    return oppoAlmoxReturnOpenRequests.filter((req) => {
      const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
      if (!taggedRole) return almoxSectorTab === 'PROCESSO';
      return almoxSectorTab === 'PROCESSO' ? taggedRole === 'ENGENHARIA_PROCESSO' : taggedRole === 'ENGENHARIA_TESTE';
    });
  }, [almoxSectorTab, oppoAlmoxReturnOpenRequests]);
  const oppoAlmoxHistoryRequests = useMemo(
    () => [...oppoRequests].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [oppoRequests]
  );
  const oppoAlmoxHistoryRequestsFilteredBySector = useMemo(() => {
    if (almoxSectorTab === 'TODOS') return oppoAlmoxHistoryRequests;
    return oppoAlmoxHistoryRequests.filter((req) => {
      const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX);
      if (!taggedRole) return almoxSectorTab === 'PROCESSO';
      return almoxSectorTab === 'PROCESSO' ? taggedRole === 'ENGENHARIA_PROCESSO' : taggedRole === 'ENGENHARIA_TESTE';
    });
  }, [almoxSectorTab, oppoAlmoxHistoryRequests]);
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
    const base = requests.filter((req) => !operacaoLineFilter || req.line === operacaoLineFilter);
    if (!query) return base;

    return base.filter((req) => {
      const statusText = req.status === 'COMPLETED' ? 'finalizado' : req.status.toLowerCase();
      return (
        req.product.toLowerCase().includes(query) ||
        req.line.toLowerCase().includes(query) ||
        (req.token || '').toLowerCase().includes(query) ||
        statusText.includes(query)
      );
    });
  }, [requests, requestSearch, operacaoLineFilter]);

  const operacaoLineOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => r.line).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b))),
    [requests]
  );
  const operacaoLineOptionsForSelect = useMemo(() => {
    if (!operacaoLineFilter) return operacaoLineOptions;
    return [
      operacaoLineFilter,
      ...operacaoLineOptions.filter((line) => line !== operacaoLineFilter),
    ];
  }, [operacaoLineFilter, operacaoLineOptions]);

  const operacaoRequestsByLine = useMemo(
    () => requests.filter((r) => !operacaoLineFilter || r.line === operacaoLineFilter),
    [requests, operacaoLineFilter]
  );

  const averageSetupTimeLabel = useMemo(() => {
    const completed = operacaoRequestsByLine.filter((r) => r.status === 'COMPLETED');
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
  }, [operacaoRequestsByLine]);

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
  const slaGlobalSummary = useMemo(() => {
    const acceptCount = slaBySector.reduce((acc, sector) => acc + sector.acceptCount, 0);
    const execCount = slaBySector.reduce((acc, sector) => acc + sector.execCount, 0);
    const weightedAcceptPct =
      acceptCount > 0
        ? Math.round(slaBySector.reduce((acc, sector) => acc + sector.acceptOnTimePct * sector.acceptCount, 0) / acceptCount)
        : 0;
    const weightedExecPct =
      execCount > 0
        ? Math.round(slaBySector.reduce((acc, sector) => acc + sector.execOnTimePct * sector.execCount, 0) / execCount)
        : 0;
    const avgAcceptMs =
      acceptCount > 0
        ? Math.floor(slaBySector.reduce((acc, sector) => acc + sector.acceptAvgMs * sector.acceptCount, 0) / acceptCount)
        : 0;
    const avgExecMs =
      execCount > 0
        ? Math.floor(slaBySector.reduce((acc, sector) => acc + sector.execAvgMs * sector.execCount, 0) / execCount)
        : 0;

    return {
      acceptCount,
      execCount,
      weightedAcceptPct,
      weightedExecPct,
      avgAcceptMs,
      avgExecMs,
    };
  }, [slaBySector]);

  const slaBySectorFiltered = useMemo(() => {
    if (slaSectorTab === 'TODOS') return slaBySector;
    return slaBySector.filter((sector) =>
      slaSectorTab === 'PROCESSO' ? sector.key === 'ENGENHARIA_PROCESSO' : sector.key === 'ENGENHARIA_TESTE'
    );
  }, [slaBySector, slaSectorTab]);
  const slaHasAnyData = useMemo(
    () => slaBySector.some((sector) => (sector.acceptCount || 0) + (sector.execCount || 0) > 0),
    [slaBySector]
  );

  const getSlaPctStyles = (pct: number) => {
    if (pct >= 95) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (pct >= 80) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const roleNotifications = useMemo(
    () => notifications.filter((n) => n.role === currentRole).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, currentRole]
  );
  const roleSetupNotifications = useMemo(
    () => roleNotifications.filter((n) => n.source === 'SETUP'),
    [roleNotifications]
  );
  const roleOppoAlmoxNotifications = useMemo(
    () => roleNotifications.filter((n) => n.source === 'OPPO_ALMOX'),
    [roleNotifications]
  );
  const unreadRoleNotifications = roleNotifications.filter((n) => !n.read).length;
  const notificationAudioCtxRef = useRef<AudioContext | null>(null);
  const getNotificationStatusLabel = (n: NotificationItem) =>
    n.source === 'SETUP'
      ? getStatusLabelGlobal(n.status as SetupRequest['status'])
      : getOppoStatusLabel(n.status as OppoRequestStatus);
  const getNotificationStatusClass = (n: NotificationItem) => {
    if (n.source === 'SETUP') {
      const status = n.status as SetupRequest['status'];
      if (status === 'COMPLETED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      if (status === 'IN_PROGRESS' || status === 'TESTE_IN_PROGRESS' || status === 'PROCESSO_IN_PROGRESS' || status === 'AUTOMACAO_IN_PROGRESS') {
        return 'border-amber-200 bg-amber-50 text-amber-700';
      }
      return 'border-sky-200 bg-sky-50 text-sky-700';
    }
    return getOppoStatusStyle(n.status as OppoRequestStatus);
  };

  const buildSetupNotificationSignature = (req: SetupRequest, role: UserRole) =>
    `SETUP:${role}:${req.id}:${req.status}`;
  const buildOppoNotificationSignature = (req: OppoRequest, role: UserRole) =>
    `OPPO:${role}:${req.id}:${req.status}`;

  const clearCurrentRoleNotifications = () => {
    const roleKey = currentRole;
    const setupSigs = requests
      .filter((req) => isRequestAssignedToRole(roleKey, req))
      .map((req) => buildSetupNotificationSignature(req, roleKey));
    const oppoSigs = oppoRequests
      .filter((req) => isOppoRequestNotificationTarget(roleKey, req, user.id))
      .map((req) => buildOppoNotificationSignature(req, roleKey));
    const all = Array.from(new Set([...setupSigs, ...oppoSigs])).slice(-400);

    setClearedNotificationSignaturesByRole((prev) => ({
      ...prev,
      [roleKey]: all,
    }));
    setNotifications((prev) => prev.filter((n) => n.role !== roleKey));

    requestStatusSnapshotByRole.current[roleKey] = Object.fromEntries(requests.map((req) => [req.id, req.status])) as Record<string, SetupRequest['status']>;
    oppoStatusSnapshotByRole.current[roleKey] = Object.fromEntries(oppoRequests.map((req) => [req.id, req.status])) as Record<string, OppoRequestStatus>;
    bootstrappedRoleNotifications.current.add(roleKey);
    bootstrappedOppoRoleNotifications.current.add(roleKey);
    if (isSupabaseConfigured && user) {
      supabase.auth.updateUser({
        data: {
          cleared_notification_signatures_by_role: {
            ...normalizeNotificationSignaturesFromMetadata(user.user_metadata?.cleared_notification_signatures_by_role),
            [roleKey]: all,
          },
        },
      }).catch((error) => {
        console.error('Erro ao salvar limpeza de notificações no Supabase:', error);
      });
    }
  };

  const markCurrentRoleNotificationsAsRead = () => {
    const roleKey = currentRole;
    setNotifications((prev) => prev.map((n) => (n.role === roleKey ? { ...n, read: true } : n)));
  };

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!notificationAudioCtxRef.current) {
        notificationAudioCtxRef.current = new AudioCtx();
      }
      const ctx = notificationAudioCtxRef.current;
      const startAt = ctx.currentTime + 0.01;
      const beep = (freq: number, offset: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startAt + offset);
        gain.gain.exponentialRampToValueAtTime(0.08, startAt + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(startAt + offset);
        oscillator.stop(startAt + offset + duration + 0.02);
      };
      beep(880, 0, 0.09);
      beep(660, 0.12, 0.11);
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error);
    }
  };

  useEffect(() => {
    if (!user || !profile || !notificationSignaturesHydrated) return;

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
    const clearedForRole = new Set(clearedNotificationSignaturesByRole[roleKey] || []);

    requests.forEach((req) => {
      const prevStatus = previousSnapshot[req.id];
      nextSnapshot[req.id] = req.status;
      const isNewForSnapshot = !prevStatus;
      const changed = !!prevStatus && prevStatus !== req.status;
      if (!isNewForSnapshot && !changed) return;
      if (!isRequestAssignedToRole(roleKey, req)) return;
      const signature = buildSetupNotificationSignature(req, roleKey);
      if (clearedForRole.has(signature)) return;

      incoming.push({
        id: `${roleKey}-${req.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: roleKey,
        requestId: req.id,
        status: req.status,
        source: 'SETUP',
        message: `Chamado ${sanitizeDisplayText(req.product) || req.product} (linha ${sanitizeDisplayText(req.line) || req.line}) caiu para ${ROLE_OPTIONS.find((r) => r.id === roleKey)?.label || roleKey}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    requestStatusSnapshotByRole.current[roleKey] = nextSnapshot;
    if (incoming.length > 0) {
      setNotifications((prev) => [...incoming, ...prev].slice(0, 120));
      if (roleKey === 'ALMOXERIFADO') playNotificationSound();
    }
  }, [requests, currentRole, user, profile, clearedNotificationSignaturesByRole, notificationSignaturesHydrated]);

  useEffect(() => {
    if (!user || !profile || !notificationSignaturesHydrated) return;

    const roleKey = currentRole;
    const previousSnapshot = oppoStatusSnapshotByRole.current[roleKey] || {};
    const nextSnapshot: Record<string, OppoRequestStatus> = {};

    if (!bootstrappedOppoRoleNotifications.current.has(roleKey)) {
      oppoRequests.forEach((req) => {
        nextSnapshot[req.id] = req.status;
      });
      oppoStatusSnapshotByRole.current[roleKey] = nextSnapshot;
      bootstrappedOppoRoleNotifications.current.add(roleKey);
      return;
    }

    const incoming: NotificationItem[] = [];
    const clearedForRole = new Set(clearedNotificationSignaturesByRole[roleKey] || []);

    oppoRequests.forEach((req) => {
      const prevStatus = previousSnapshot[req.id];
      nextSnapshot[req.id] = req.status;
      const isNewForSnapshot = !prevStatus;
      const changed = !!prevStatus && prevStatus !== req.status;
      if (!isNewForSnapshot && !changed) return;
      if (!isOppoRequestNotificationTarget(roleKey, req, user.id)) return;
      const signature = buildOppoNotificationSignature(req, roleKey);
      if (clearedForRole.has(signature)) return;

      const flowLabel = req.callType === 'SOLICITACAO_DISPOSITIVO' ? 'solicitação de material' : 'devolução de itens';
      const destination =
        roleKey === 'ALMOXERIFADO'
          ? 'Almoxerifado'
          : (ROLE_OPTIONS.find((r) => r.id === roleKey)?.label || roleKey);

      incoming.push({
        id: `oppo-${roleKey}-${req.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: roleKey,
        requestId: req.id,
        status: req.status,
        source: 'OPPO_ALMOX',
        message:
          roleKey === 'ALMOXERIFADO'
            ? `Novo chamado de ${flowLabel} para o ${destination}: produto ${sanitizeDisplayText(req.product) || req.product || '--'} (linha ${sanitizeDisplayText(req.line) || req.line || '--'}).`
            : `Atualização no chamado de ${flowLabel}: status ${getOppoStatusLabel(req.status)} para produto ${sanitizeDisplayText(req.product) || req.product || '--'}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    oppoStatusSnapshotByRole.current[roleKey] = nextSnapshot;
    if (incoming.length > 0) {
      setNotifications((prev) => [...incoming, ...prev].slice(0, 120));
      if (roleKey === 'ALMOXERIFADO') playNotificationSound();
    }
  }, [oppoRequests, currentRole, user, profile, clearedNotificationSignaturesByRole, notificationSignaturesHydrated]);

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

  useEffect(() => {
    if (!showDevRoleMenu) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!devRoleMenuRef.current) return;
      if (!devRoleMenuRef.current.contains(event.target as Node)) {
        setShowDevRoleMenu(false);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showDevRoleMenu]);

  if (loading) return <LoadingScreen />;
  if (!isSupabaseConfigured) return <ConfigErrorScreen message={supabaseConfigError} />;
  if (!user) return <LoginScreen />;
  if (!profile) return <RoleSelection onSelect={handleRoleSelect} />;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-3 md:px-4 py-3 sticky top-0 z-10">
        <div className="w-full mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-200">
              <img src="/multi-m-logo.svg" alt="Multi" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">Setup Control</h1>
              <p className="text-xs text-zinc-500 font-medium">
                {isDevAdmin ? `DEV ADMIN - ATUANDO COMO ${currentRole.replace('_', ' ')}` : currentRole.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="relative flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:gap-3">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
              title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                <Settings size={13} />
              </span>
              <select
                value={interfaceTheme}
                onChange={(e) => setInterfaceTheme(e.target.value as InterfaceTheme)}
                className="rounded-lg bg-transparent px-1.5 py-1 text-[11px] font-bold text-zinc-700 outline-none dark:text-zinc-200"
                title="Tema da interface"
              >
                <option value="default">Tema: Padrão</option>
                <option value="ocean">Tema: Ocean</option>
                <option value="graphite">Tema: Graphite</option>
                <option value="sunset">Tema: Sunset</option>
              </select>
            </div>
            <select
              value={interfaceTheme}
              onChange={(e) => setInterfaceTheme(e.target.value as InterfaceTheme)}
              className="sm:hidden rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-[11px] font-bold text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              title="Tema da interface"
            >
              <option value="default">Tema</option>
              <option value="ocean">Ocean</option>
              <option value="graphite">Graphite</option>
              <option value="sunset">Sunset</option>
            </select>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:text-amber-700 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-amber-700 dark:hover:text-amber-300"
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
              <div className="absolute right-0 top-12 z-30 w-[390px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-[92vw]">
                <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-cyan-50 px-4 py-3 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                        <Bell size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
                          Notificações
                        </p>
                        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {ROLE_OPTIONS.find((r) => r.id === currentRole)?.label || currentRole}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700 dark:border-cyan-700 dark:bg-zinc-900 dark:text-cyan-300">
                      {unreadRoleNotifications} novas
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={markCurrentRoleNotificationsAsRead}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-[11px] font-bold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:bg-zinc-900 dark:text-cyan-300"
                    >
                      <CheckCircle size={12} />
                      Marcar lidas
                    </button>
                    <button
                      onClick={clearCurrentRoleNotifications}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400"
                    >
                      <Trash2 size={12} />
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900">
                  {roleNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Bell size={16} />
                      </span>
                      <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sem notificações para este setor.</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {roleSetupNotifications.length > 0 && (
                        <div className="mb-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                            <p className="text-[11px] font-black uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                              Sistema Setup
                            </p>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {roleSetupNotifications.length}
                            </span>
                          </div>
                          <div className="space-y-1 p-2">
                            {roleSetupNotifications.map((n) => (
                              <div key={n.id} className={`rounded-lg border p-2 ${n.read ? 'border-zinc-100 bg-zinc-50/70 opacity-80 dark:border-zinc-800 dark:bg-zinc-800/40' : 'border-cyan-200 bg-cyan-50/60 ring-1 ring-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/20'}`}>
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                    <BarChart3 size={12} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-100">{n.message}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-500" title="Não lida" />}
                                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getNotificationStatusClass(n)}`}>
                                        {getNotificationStatusLabel(n)}
                                      </span>
                                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{formatSafeDistanceToNow(n.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {roleOppoAlmoxNotifications.length > 0 && (
                        <div className="rounded-xl border border-cyan-200 bg-white dark:border-cyan-800 dark:bg-zinc-900">
                          <div className="flex items-center justify-between border-b border-cyan-100 bg-cyan-50 px-3 py-2 dark:border-cyan-900 dark:bg-cyan-900/20">
                            <p className="text-[11px] font-black uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                              Solicitação Material / Almox
                            </p>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-zinc-900 dark:text-cyan-300">
                              {roleOppoAlmoxNotifications.length}
                            </span>
                          </div>
                          <div className="space-y-1 p-2">
                            {roleOppoAlmoxNotifications.map((n) => (
                              <div key={n.id} className={`rounded-lg border p-2 ${n.read ? 'border-cyan-100 bg-cyan-50/30 opacity-80 dark:border-cyan-900 dark:bg-cyan-900/10' : 'border-cyan-300 bg-cyan-50/70 ring-1 ring-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/20'}`}>
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                                    <Package size={12} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-100">{n.message}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-500" title="Não lida" />}
                                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getNotificationStatusClass(n)}`}>
                                        {getNotificationStatusLabel(n)}
                                      </span>
                                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{formatSafeDistanceToNow(n.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {isDevAdmin && (
              <div ref={devRoleMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowDevRoleMenu((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700"
                  title="Setor ativo"
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${currentRoleOption?.color || 'bg-zinc-100 text-zinc-700'}`}>
                    <ActiveRoleIcon size={13} />
                  </span>
                  <span className="max-w-[140px] truncate">{selectedRoleLabel}</span>
                  <ChevronDown size={14} className={`transition-transform ${showDevRoleMenu ? 'rotate-180' : ''}`} />
                </button>
                {showDevRoleMenu && (
                  <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Atuando como</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5">
                      {ROLE_OPTIONS.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = devActiveRole === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setDevActiveRole(item.id);
                              setShowDevRoleMenu(false);
                            }}
                            className={`mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${item.color}`}>
                              <ItemIcon size={13} />
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {isActive && <CheckCircle size={14} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="profile-light-card hidden md:flex items-center gap-3 rounded-2xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-50 px-3.5 py-2.5 shadow-sm dark:border-zinc-700 dark:bg-gradient-to-r dark:from-zinc-900 dark:to-zinc-800">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-white grid place-items-center text-xs font-black tracking-wide ring-2 ring-zinc-200 dark:ring-zinc-700">
                {userInitials}
              </div>
              <div className="min-w-[200px]">
                <p className="text-[15px] font-black leading-tight text-zinc-900 dark:text-zinc-100">{profile.displayName}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">{displayJobTitle}</p>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{profile.email}</p>
              </div>
              <button
                type="button"
                onClick={handleUpdateJobTitle}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                title="Editar cargo"
              >
                Cargo
              </button>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto p-3 md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <aside className="sticky top-20 hidden md:flex w-56 flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            {allowedMainTabs.includes('OPERACAO') && (
              <button
                type="button"
                onClick={() => setActiveMainTab('OPERACAO')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  activeMainTab === 'OPERACAO'
                    ? 'bg-zinc-900 text-white shadow dark:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <img src="/multi-m-logo.svg" alt="Multi" className="h-5 w-5 rounded-md object-cover" />
                <span className="flex-1 text-left">Setup industrial</span>
              </button>
            )}
            {allowedMainTabs.includes('SLA') && (
              <button
                type="button"
                onClick={() => setActiveMainTab('SLA')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  activeMainTab === 'SLA'
                    ? 'bg-zinc-900 text-white shadow dark:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <BarChart3 size={18} />
                <span className="flex-1 text-left">Painel SLA</span>
              </button>
            )}

            {allowedMainTabs.includes('OPPO') && (
              <button
                type="button"
                onClick={() => setActiveMainTab('OPPO')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  activeMainTab === 'OPPO'
                    ? 'bg-zinc-900 text-white shadow dark:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <Package size={18} />
                <span className="flex-1 text-left">Sistema Materiais</span>
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  oppo
                </span>
              </button>
            )}

            {allowedMainTabs.includes('OPPO_SETUP') && (
              <button
                type="button"
                onClick={() => setActiveMainTab('OPPO_SETUP')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  activeMainTab === 'OPPO_SETUP'
                    ? 'bg-zinc-900 text-white shadow dark:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <Settings size={18} />
                <span className="flex-1 text-left">Oppo Setup</span>
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  <img src="/oppo-setup-logo.svg" alt="Oppo Setup" className="h-3 w-6 rounded-sm object-cover" />
                </span>
              </button>
            )}

            {allowedMainTabs.includes('ALMOXERIFADO') && (
              <button
                type="button"
                onClick={() => setActiveMainTab('ALMOXERIFADO')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  activeMainTab === 'ALMOXERIFADO'
                    ? 'bg-zinc-900 text-white shadow dark:bg-zinc-800'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <Package size={18} />
                <span className="flex-1 text-left">Almoxerifado</span>
              </button>
            )}
          </aside>

          <section className="flex-1">
        <div className="mb-4 flex gap-1 overflow-x-auto whitespace-nowrap rounded-xl border border-zinc-200 bg-white p-1 md:hidden">
          {allowedMainTabs.includes('OPERACAO') && (
            <button
              type="button"
              onClick={() => setActiveMainTab('OPERACAO')}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${activeMainTab === 'OPERACAO' ? 'bg-emerald-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Setup industrial
            </button>
          )}
          {allowedMainTabs.includes('SLA') && (
            <button
              type="button"
              onClick={() => setActiveMainTab('SLA')}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${activeMainTab === 'SLA' ? 'bg-cyan-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              SLA
            </button>
          )}
          {allowedMainTabs.includes('OPPO') && (
            <button
              type="button"
              onClick={() => setActiveMainTab('OPPO')}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${activeMainTab === 'OPPO' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              <span className="inline-flex items-center gap-2">
                <img src="/oppo-logo.svg" alt="OPPO" className="h-3.5 w-7 rounded-sm object-cover" />
                OPPO
              </span>
            </button>
          )}
          {allowedMainTabs.includes('OPPO_SETUP') && (
            <button
              type="button"
              onClick={() => setActiveMainTab('OPPO_SETUP')}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${activeMainTab === 'OPPO_SETUP' ? 'bg-emerald-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              <span className="inline-flex items-center gap-2">
                <img src="/oppo-setup-logo.svg" alt="Oppo Setup" className="h-3.5 w-7 rounded-sm object-cover" />
                Oppo Setup
              </span>
            </button>
          )}
          {allowedMainTabs.includes('ALMOXERIFADO') && (
            <button
              type="button"
              onClick={() => setActiveMainTab('ALMOXERIFADO')}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${activeMainTab === 'ALMOXERIFADO' ? 'bg-violet-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Almox
            </button>
          )}
        </div>
        {activeMainTab === 'OPERACAO' && allowedMainTabs.includes('OPERACAO') && (
          <>
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black text-zinc-900">
            Bem-vindo, {profile.displayName}! <span className="align-middle">👋</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Aqui está um resumo geral do Setup industrial.</p>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">Indicadores por linha</label>
          <select
            value={operacaoLineFilter}
            onChange={(e) => setOperacaoLineFilter(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">Todas as linhas</option>
            {operacaoLineOptionsForSelect.map((line) => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-24 -right-24 h-52 w-80 rounded-[72px] bg-gradient-to-br from-blue-100/70 to-white rotate-12 dark:from-blue-500/15 dark:to-transparent" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Clock size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider dark:text-zinc-300">Pendentes</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {operacaoRequestsByLine.filter(r => r.status !== 'COMPLETED').length}
            </p>
          </div>
          <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-24 -right-24 h-52 w-80 rounded-[72px] bg-gradient-to-br from-emerald-100/70 to-white rotate-12 dark:from-emerald-500/15 dark:to-transparent" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider dark:text-zinc-300">Finalizados</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {operacaoRequestsByLine.filter(r => r.status === 'COMPLETED').length}
            </p>
          </div>
          <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="absolute left-0 top-0 h-full w-1 bg-purple-500" />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -bottom-24 -right-24 h-52 w-80 rounded-[72px] bg-gradient-to-br from-purple-100/70 to-white rotate-12 dark:from-purple-500/15 dark:to-transparent" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Timer size={20} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider dark:text-zinc-300">Tempo Médio</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{averageSetupTimeLabel}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {(currentRole === 'PRODUCAO' || isDevAdmin) && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <PlusCircle size={20} />
              Solicitar Novo Setup
            </button>
          )}
          <button
            onClick={handleRefreshRequests}
            disabled={isRefreshingRequests}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshingRequests ? 'animate-spin' : ''} />
            {isRefreshingRequests ? 'Atualizando...' : 'Atualizar Chamados'}
          </button>
        </div>

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

        {activeMainTab === 'SLA' && allowedMainTabs.includes('SLA') && (
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-lg font-black text-white">Painel SLA por Setor</h2>
              <p className="mt-1 text-sm text-slate-300">
                Monitoramento em dois pontos: tempo até aceite e tempo de execução.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {slaBySector.map((sector) => {
                const overallPct =
                  (sector.acceptCount || 0) + (sector.execCount || 0) > 0
                    ? Math.round((sector.acceptOnTimePct + sector.execOnTimePct) / 2)
                    : 0;

                const ringColor =
                  sector.key === 'QUALIDADE'
                    ? '#38bdf8'
                    : sector.key === 'AREA_KIT'
                      ? '#22c55e'
                      : sector.key === 'ENGENHARIA_SETUP'
                        ? '#f59e0b'
                        : sector.key === 'ENGENHARIA_TESTE'
                          ? '#a855f7'
                          : sector.key === 'ENGENHARIA_PROCESSO'
                            ? '#34d399'
                            : '#10b981';

                const ringBg = 'rgba(255,255,255,0.12)';
                const ringStyle = {
                  background: `conic-gradient(${ringColor} ${Math.max(0, Math.min(100, overallPct))}%, ${ringBg} 0)`,
                } as React.CSSProperties;

                return (
                  <div
                    key={sector.key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur transition hover:bg-white/10"
                  >
                    <p className="text-xs font-black text-slate-100">{sector.label}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="relative h-16 w-16 rounded-full p-[6px]" style={ringStyle}>
                        <div className="grid h-full w-full place-items-center rounded-full bg-slate-950/80">
                          <div className="text-center leading-tight">
                            <p className="text-base font-black text-white">
                              {(sector.acceptCount || 0) + (sector.execCount || 0) > 0 ? `${overallPct}%` : '--'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-300">SLA Médio</p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 text-[11px] text-slate-200">
                        <p className="font-bold">
                          SLA Aceite: <span className="text-slate-100">{sector.acceptOnTimePct}%</span>
                        </p>
                        <p className="font-bold">
                          SLA Execução: <span className="text-slate-100">{sector.execOnTimePct}%</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 text-[11px] text-slate-300">
                      <p>
                        Média até aceite: <span className="font-bold text-slate-100">{formatDurationMs(sector.acceptAvgMs)}</span>
                      </p>
                      <p>
                        Média execução: <span className="font-bold text-slate-100">{formatDurationMs(sector.execAvgMs)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeMainTab === 'OPPO' && allowedMainTabs.includes('OPPO') && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="pointer-events-none absolute -top-24 -left-14 h-64 w-[130%] skew-y-[-6deg] rounded-[60px] bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700" />
              <div className="relative z-10 grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white ring-1 ring-white/20">
                      oppo
                    </span>
                    Sistema Materiais
                  </h2>
                  <p className="mt-1 text-sm text-emerald-50/90">
                    Solicitações de materiais pagos, separação/conferência e validação pelo solicitante.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={currentRole === 'PCP' && !isDevAdmin}
                      onClick={() => {
                        if (currentRole === 'PCP' && !isDevAdmin) {
                          window.alert('Usuários do PCP não podem abrir chamados nesta aba. Use apenas o OPPO Setup.');
                          return;
                        }
                        setOppoLineDraft('');
                        setOppoProductDraft('');
                        setShowOppoCallTypeModal(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlusCircle size={16} />
                      Abertura de Chamado
                    </button>
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs text-zinc-700 backdrop-blur dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      <ShieldCheck size={16} />
                    </span>
                    <p className="font-medium">
                      Após finalização no Almoxerifado, o solicitante deve conferir se os equipamentos/dispositivos estão conforme.
                    </p>
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                  <img src="/oppo-hero.svg" alt="Ilustração" className="h-44 w-auto select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.18)]" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-xl border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setOppoView('PENDENTES')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${oppoView === 'PENDENTES' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  disabled={!canNavigateNonSetupTabs}
                  onClick={() => {
                    if (!canNavigateNonSetupTabs) return;
                    setOppoView('HISTORICO');
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${oppoView === 'HISTORICO' ? 'bg-emerald-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Histórico
                </button>
              </div>

              {oppoView === 'PENDENTES' && (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">Chamados pendentes</h3>
                    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('PROCESSO')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'PROCESSO' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Processo
                      </button>
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('TESTE')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'TESTE' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Teste
                      </button>
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('TODOS')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'TODOS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Todos
                      </button>
                    </div>
                  </div>
                  {oppoRequesterPendingRequestsFilteredBySector.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-14 text-center">
                      <div className="mx-auto w-fit">
                        <img src="/empty-oppo.svg" alt="Sem chamados" className="mx-auto h-28 w-auto select-none" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-zinc-900">Nenhum chamado pendente no OPPO.</p>
                      <p className="mt-1 text-xs text-zinc-500">Você não possui chamados pendentes no momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {oppoRequesterPendingRequestsFilteredBySector.map((req) => (
                        <div key={req.id} className="rounded-xl border border-zinc-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900">{getOppoCallTypeLabel(req.callType)}</p>
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getOppoStatusStyle(req.status)}`}>
                              {getOppoStatusLabel(req.status)}
                            </span>
                          </div>
                          {isOppoSetupGeneratedRequest(req) && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Setor:{' '}
                              <span className="font-semibold text-zinc-700">
                                {(extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_TESTE'
                                  ? 'Eng. Teste'
                                  : 'Eng. Processo'}
                              </span>
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Aberto por: <span className="font-semibold text-zinc-700">{req.createdByName || req.createdBy}</span> - {formatSafeDistanceToNow(req.requestedAt)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{req.product || '--'}</span> | Tipo de linha: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Almox responsável: <span className="font-semibold text-zinc-700">{req.almoxByName || '--'}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Itens pagos pelo almox: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.paidItems)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Obs. itens pagos: <span className="font-semibold text-zinc-700">{req.paidItemsNote || '--'}</span>
                          </p>
                          {req.callType === 'DEVOLUCAO_DISPOSITIVO' && (
                            <>
                              <p className="mt-1 text-xs text-zinc-500">
                                Códigos devolução: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Observação: <span className="font-semibold text-zinc-700">{req.returnItemsNote || '--'}</span>
                              </p>
                            </>
                          )}

                          {(req.status === 'FINALIZADO_ALMOXERIFADO' && req.callType === 'DEVOLUCAO_DISPOSITIVO') && (
                            <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">Status da conferência</p>
                              <p className="mt-1 text-xs text-zinc-700">
                                Itens conferidos pelo almox: <span className="font-semibold">{formatOppoPaidItems(req.paidItems)}</span>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Conferido por: <span className="font-semibold text-zinc-700">{req.almoxByName || '--'}</span>
                              </p>
                            </div>
                          )}

                          {(req.status === 'FINALIZADO_ALMOXERIFADO' &&
                            req.callType === 'SOLICITACAO_DISPOSITIVO' &&
                            (() => {
                              if (isDevAdmin) return true;
                              if (!isOppoSetupGeneratedRequest(req)) return req.createdBy === user?.id;
                              const taggedRole = extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO';
                              return (
                                (currentRole === 'ENGENHARIA_PROCESSO' && taggedRole === 'ENGENHARIA_PROCESSO') ||
                                (currentRole === 'ENGENHARIA_TESTE' && taggedRole === 'ENGENHARIA_TESTE')
                              );
                            })()) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openOppoRequesterConferenceModal(req)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Conferir: Conforme
                              </button>
                              <button
                                type="button"
                                onClick={() => openOppoRequesterConferenceModal(req)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                              >
                                Conferir: Divergência
                              </button>
                            </div>
                          )}

                          {req.status === 'DIVERGENCIA' && (
                            <p className="mt-3 text-xs font-semibold text-amber-700">
                              Divergência enviada para o Almoxerifado realizar 2ª conferência.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {oppoView === 'HISTORICO' && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">Histórico de Chamados Finalizados</h3>
                    {isDevAdmin && oppoRequesterHistoryRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Excluir TODOS os chamados deste histórico OPPO? Esta ação não pode ser desfeita.')) return;
                          handleDeleteOppoRequestsBulk(oppoRequesterHistoryRequests.map((req) => req.id));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={12} />
                        Excluir todos
                      </button>
                    )}
                  </div>
                  <div className="mb-3 flex justify-end">
                    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('PROCESSO')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'PROCESSO' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Processo
                      </button>
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('TESTE')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'TESTE' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Teste
                      </button>
                      <button
                        type="button"
                        onClick={() => setOppoSectorTab('TODOS')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          oppoSectorTab === 'TODOS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Todos
                      </button>
                    </div>
                  </div>
                  {oppoRequesterHistoryRequestsFilteredBySector.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-14 text-center">
                      <div className="mx-auto w-fit">
                        <img src="/empty-oppo.svg" alt="Sem chamados" className="mx-auto h-28 w-auto select-none" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-zinc-900">Nenhum chamado finalizado no histórico.</p>
                      <p className="mt-1 text-xs text-zinc-500">Quando houver chamados concluídos, eles aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {oppoRequesterHistoryRequestsFilteredBySector.map((req) => (
                    <div key={req.id} className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-zinc-900">{getOppoCallTypeLabel(req.callType)}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getOppoStatusStyle(req.status)}`}>
                            {getOppoStatusLabel(req.status)}
                          </span>
                          {isDevAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm('Excluir este chamado do histórico OPPO?')) return;
                                handleDeleteOppoRequest(req.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={11} />
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                      {isOppoSetupGeneratedRequest(req) && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Setor:{' '}
                          <span className="font-semibold text-zinc-700">
                            {(extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_TESTE'
                              ? 'Eng. Teste'
                              : 'Eng. Processo'}
                          </span>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">
                        Aberto por: <span className="font-semibold text-zinc-700">{req.createdByName || req.createdBy}</span> - {formatSafeDistanceToNow(req.requestedAt)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{req.product || '--'}</span> | Tipo de linha: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Almox responsável: <span className="font-semibold text-zinc-700">{req.almoxByName || '--'}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Conferido por: <span className="font-semibold text-zinc-700">{req.requesterConfirmedByName || '--'}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Itens pagos pelo almox: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.paidItems)}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Obs. itens pagos: <span className="font-semibold text-zinc-700">{req.paidItemsNote || '--'}</span>
                      </p>
                      {req.callType === 'DEVOLUCAO_DISPOSITIVO' && (
                        <>
                          <p className="mt-1 text-xs text-zinc-500">
                            Códigos devolução: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Observação: <span className="font-semibold text-zinc-700">{req.returnItemsNote || '--'}</span>
                          </p>
                        </>
                      )}
                    </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeMainTab === 'OPPO_SETUP' && allowedMainTabs.includes('OPPO_SETUP') && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="pointer-events-none absolute -top-24 -left-14 h-64 w-[130%] skew-y-[-6deg] rounded-[60px] bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700" />
              <div className="relative z-10 grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white ring-1 ring-white/20">
                      <img src="/oppo-setup-logo.svg" alt="Oppo Setup" className="h-4 w-8 rounded-sm object-cover" />
                      oppo setup
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">Oppo Setup</h2>
                  <p className="mt-1 text-sm text-emerald-50/90">
                    Inicie o setup informando linha, produto e tipo (Montagem/Embalagem).
                  </p>

                  {(isDevAdmin || currentRole === 'PCP' || currentRole === 'ENGENHARIA_PROCESSO' || currentRole === 'ENGENHARIA_TESTE') && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex rounded-2xl border border-white/15 bg-white/80 p-1 backdrop-blur dark:border-white/10 dark:bg-zinc-900/45">
                        {(isDevAdmin || currentRole === 'PCP') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOppoSetupActorTab('PCP');
                              oppoSetupActorTabInitializedRef.current = true;
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                              oppoSetupActorTab === 'PCP' ? 'bg-zinc-900 text-white shadow' : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            PCP
                          </button>
                        )}
                        {(isDevAdmin || currentRole === 'ENGENHARIA_PROCESSO') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOppoSetupActorTab('PROCESSO');
                              oppoSetupActorTabInitializedRef.current = true;
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                              oppoSetupActorTab === 'PROCESSO' ? 'bg-zinc-900 text-white shadow' : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            Eng. Processo
                          </button>
                        )}
                        {(isDevAdmin || currentRole === 'ENGENHARIA_TESTE') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOppoSetupActorTab('TESTE');
                              oppoSetupActorTabInitializedRef.current = true;
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                              oppoSetupActorTab === 'TESTE' ? 'bg-zinc-900 text-white shadow' : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            Eng. Teste
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-50/90">
                        <span>Visualização atual:</span>
                        <span className="rounded-full bg-white/80 px-3 py-1 font-black uppercase tracking-wide text-emerald-700 dark:text-black">
                          {oppoSetupActorTab === 'PCP' ? 'PCP' : oppoSetupActorTab === 'PROCESSO' ? 'Processo' : 'Teste'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {oppoSetupActorTab === 'PCP' && (isDevAdmin || currentRole === 'PCP') && (
                      <button
                        type="button"
                        onClick={() => {
                          setOppoSetupStartDraft(null);
                          setOppoSetupLineDraft('');
                          setOppoSetupProductDraft('');
                          setOppoSetupTypeDraft('');
                          setOppoSetupProductionOrderDraft('');
                          setShowOppoSetupStartModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
                      >
                        <PlusCircle size={16} />
                        Abrir Solicitação
                      </button>
                    )}
                    {(oppoSetupActorTab === 'PROCESSO' || oppoSetupActorTab === 'TESTE') &&
                      (isDevAdmin || currentRole === 'ENGENHARIA_PROCESSO' || currentRole === 'ENGENHARIA_TESTE') && (
                      <>
                         <button
                           type="button"
                           onClick={() => openOppoSetupLayoutModal(oppoSetupProductDraft)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/85 px-4 py-2.5 text-sm font-bold text-zinc-800 hover:bg-white dark:text-black"
                          >
                          <Settings size={16} />
                          Configurar Layout
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOppoSetupLayoutsListModal(true)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-white/20 dark:bg-white/85 dark:text-black dark:hover:bg-white"
                        >
                          <Search size={16} />
                          Ver Layouts Cadastrados
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-center md:justify-end">
                  <img
                    src="/oppo-setup-hero.svg"
                    alt="Ilustração"
                    className="h-44 w-auto select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Activity size={18} />
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wide text-zinc-800">Como funciona</h3>
                </div>

                <ol className="space-y-2 text-sm text-zinc-700">
                  {oppoSetupActorTab === 'PCP' ? (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">1</span>
                        <span>
                          Clique em <span className="font-bold text-zinc-900">Abrir Solicitação</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">2</span>
                        <span>
                          Preencha <span className="font-bold text-zinc-900">Linha</span>, <span className="font-bold text-zinc-900">Produto</span> e{' '}
                          <span className="font-bold text-zinc-900">Tipo de Setup</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">3</span>
                        <span>A Engenharia de Processo ou de Teste dará o aceite e iniciará o setup.</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">1</span>
                        <span>
                          Aguarde uma <span className="font-bold text-zinc-900">Solicitação do PCP</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">2</span>
                        <span>
                          Dê <span className="font-bold text-zinc-900">Aceite</span> para liberar o início do setup.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">3</span>
                        <span>
                          Após o aceite, a tela de <span className="font-bold text-zinc-900">Selecionar Posto do Setup</span> ficará disponível.
                        </span>
                      </li>
                    </>
                  )}
                </ol>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setOppoSetupView('EM_ANDAMENTO')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    oppoSetupView === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-800 shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <Clock size={16} />
                  Em andamento
                </button>
                <button
                  type="button"
                  onClick={() => setOppoSetupView('HISTORICO')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    oppoSetupView === 'HISTORICO' ? 'bg-zinc-900 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <Clock size={16} />
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => setOppoSetupView('OEE')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    oppoSetupView === 'OEE' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <BarChart3 size={16} />
                  OEE
                </button>
              </div>

              {oppoSetupView === 'EM_ANDAMENTO' && (
                <>
                  {(() => {
                    const baseVisible = oppoSetupSolicitations.filter((sol) => sol.status !== 'CANCELLED');

                    const visibleSolicitations =
                      oppoSetupActorTab === 'PCP'
                        ? (() => {
                            const scoped = baseVisible.filter((sol) => {
                              if (isDevAdmin) return true;
                              return currentRole === 'PCP' && sol.createdBy === user?.id;
                            });

                            // De-dup por sessão: quando existir Processo + Teste, mostra apenas 1 card.
                            const bySession = new Map<string, OppoSetupSolicitation>();
                            scoped.forEach((sol) => {
                              const existing = bySession.get(sol.sessionId);
                              if (!existing) {
                                bySession.set(sol.sessionId, sol);
                                return;
                              }
                              // Prefere mostrar o card de Processo como "principal" quando houver os 2.
                              if (existing.targetRole !== 'ENGENHARIA_PROCESSO' && sol.targetRole === 'ENGENHARIA_PROCESSO') {
                                bySession.set(sol.sessionId, sol);
                              }
                            });

                            return Array.from(bySession.values());
                          })()
                        : oppoSetupActorTab === 'PROCESSO'
                          ? baseVisible.filter((sol) => {
                              if (sol.targetRole !== 'ENGENHARIA_PROCESSO') return false;
                              if (isDevAdmin) return true;
                              return currentRole === 'ENGENHARIA_PROCESSO';
                            })
                          : oppoSetupActorTab === 'TESTE'
                            ? baseVisible.filter((sol) => {
                                if (sol.targetRole !== 'ENGENHARIA_TESTE') return false;
                                if (isDevAdmin) return true;
                                return currentRole === 'ENGENHARIA_TESTE';
                              })
                            : [];

                    const limitedSolicitations = visibleSolicitations.slice(0, 20);

                    if (limitedSolicitations.length === 0) return null;

                    return (
                      <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-600">
                          {oppoSetupActorTab === 'PCP' ? 'Minhas Solicitações' : 'Solicitações do PCP'}
                        </h3>
                        <div className="space-y-2">
                          {limitedSolicitations.map((sol) => {
                            const sessionHasActivity = oppoRequests.some(
                              (req) => extractTaggedValue(req.notes, OPPO_SETUP_SESSION_TAG_PREFIX) === sol.sessionId
                            );
                            const isFinished = sol.status === 'ACCEPTED' && !!sol.finishedAt;
                            const statusStyle =
                              sol.status === 'ACCEPTED'
                                ? isFinished
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700';
                            const statusLabel = sol.status === 'ACCEPTED' ? (isFinished ? 'Finalizado' : 'Aceito') : 'Pendente';

                            return (
                              <div key={sol.id} className="rounded-xl border border-zinc-200 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900">Setup: {sol.product}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      Linha: <span className="font-semibold text-zinc-700">{sol.line}</span> | Tipo:{' '}
                                      <span className="font-semibold text-zinc-700">{sol.lineType}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      OP: <span className="font-semibold text-zinc-700">{sol.productionOrder || '--'}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      Solicitante: <span className="font-semibold text-zinc-700">{sol.createdByName || sol.createdBy}</span> -{' '}
                                      {formatSafeDistanceToNow(sol.createdAt)}
                                    </p>
                                    {sol.status === 'ACCEPTED' && (
                                      <p className="mt-1 text-xs text-zinc-500">
                                        Aceite: <span className="font-semibold text-zinc-700">{sol.acceptedByName || sol.acceptedBy || '--'}</span> -{' '}
                                        {sol.acceptedAt ? formatSafeDistanceToNow(sol.acceptedAt) : '--'}
                                      </p>
                                    )}
                                    {isFinished && (
                                      <p className="mt-1 text-xs text-zinc-500">
                                        Finalizado: <span className="font-semibold text-zinc-700">{formatSafeDistanceToNow(sol.finishedAt as string)}</span>
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyle}`}>
                                      {statusLabel}
                                    </span>
                                    {isDevAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!window.confirm('Excluir esta solicitação de setup? Esta ação não pode ser desfeita.')) return;
                                          handleDeleteOppoSetupSolicitation(sol.id);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                      >
                                        <Trash2 size={11} />
                                        Excluir
                                      </button>
                                    )}
                                    {(oppoSetupActorTab === 'PROCESSO' || oppoSetupActorTab === 'TESTE') &&
                                      (isDevAdmin ||
                                        (currentRole === 'ENGENHARIA_PROCESSO' && sol.targetRole === 'ENGENHARIA_PROCESSO') ||
                                        (currentRole === 'ENGENHARIA_TESTE' && sol.targetRole === 'ENGENHARIA_TESTE')) &&
                                      sol.status === 'PENDING_PROCESSO' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAcceptOppoSetupSolicitation(sol)}
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                      >
                                        Aceitar
                                      </button>
                                    )}
                                    {(sol.status === 'ACCEPTED' &&
                                      (isDevAdmin ||
                                        currentRole === 'ENGENHARIA_PROCESSO' ||
                                        currentRole === 'ENGENHARIA_TESTE' ||
                                        (currentRole === 'PCP' && sol.createdBy === user?.id))) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOppoSetupStartDraft({
                                            line: sol.line,
                                            product: sol.product,
                                            lineType: sol.lineType,
                                            sessionId: sol.sessionId,
                                            productionOrder: sol.productionOrder,
                                          });
                                          setShowOppoSetupPostsModal(true);
                                        }}
                                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                      >
                                        Visualizar chamado
                                      </button>
                                    )}
                                    {oppoSetupActorTab === 'PCP' &&
                                      (isDevAdmin || (currentRole === 'PCP' && sol.createdBy === user?.id)) &&
                                      sol.status === 'PENDING_PROCESSO' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!window.confirm('Cancelar esta solicitação?')) return;
                                          handleCancelOppoSetupSolicitation(sol);
                                        }}
                                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {sol.status === 'ACCEPTED' && sessionHasActivity && (
                                  <p className="mt-2 text-xs font-semibold text-zinc-600">
                                      Setup já iniciado — acompanhe nos <span className="font-bold">Chamados em andamento</span> abaixo.
                                    </p>
                                  )}
                                </div>
                              );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-10 w-1 rounded-full bg-amber-500" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-zinc-800">Chamados em andamento</h3>
                        <p className="mt-1 text-xs text-zinc-500">Acompanhe os chamados em andamento no Oppo Setup.</p>
                      </div>
                    </div>
                  </div>
                  {oppoSetupUnifiedInProgressCards.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-white py-14 text-center">
                      <div className="mx-auto w-fit">
                        <img src="/empty-oppo-setup.svg" alt="Sem chamados" className="mx-auto h-28 w-auto select-none" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-zinc-900">Nenhum chamado em andamento no Oppo Setup.</p>
                      <p className="mt-1 text-xs text-zinc-500">Você não possui chamados em andamento no momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {oppoSetupUnifiedInProgressCards.map((card) => {
                        if (card.kind === 'MINIMIZED') {
                          const session = card.session;
                          return (
                            <div key={card.key} className="rounded-xl border border-zinc-200 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-zinc-900">Setup: {session.product}</p>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                                    Em andamento
                                  </span>
                                  {isDevAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!window.confirm('Excluir este chamado em andamento? Esta ação não pode ser desfeita.')) return;
                                        setOppoSetupMinimizedSessions((prev) => prev.filter((item) => item.sessionId !== session.sessionId));
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                    >
                                      <Trash2 size={11} />
                                      Excluir
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                Linha: <span className="font-semibold text-zinc-700">{session.line}</span> | Tipo: <span className="font-semibold text-zinc-700">{session.lineType}</span>
                                {session.productionOrder ? (
                                  <>
                                    {' '}
                                    | OP: <span className="font-semibold text-zinc-700">{session.productionOrder}</span>
                                  </>
                                ) : null}
                              </p>
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOppoSetupStartDraft(session);
                                    setOppoSetupMinimizedSessions((prev) => prev.filter((item) => item.sessionId !== session.sessionId));
                                    setShowOppoSetupPostsModal(true);
                                  }}
                                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Visualizar chamado
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (card.kind === 'SOLICITATION') {
                          const sol = card.solicitation;
                          return (
                            <div key={card.key} className="rounded-xl border border-zinc-200 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-zinc-900">Setup: {sol.product || '--'}</p>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                                    Em andamento
                                  </span>
                                  {isDevAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!window.confirm('Excluir esta solicitação de setup? Esta ação não pode ser desfeita.')) return;
                                        handleDeleteOppoSetupSolicitation(sol.id);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                    >
                                      <Trash2 size={11} />
                                      Excluir
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                Linha: <span className="font-semibold text-zinc-700">{sol.line || '--'}</span> | Tipo:{' '}
                                <span className="font-semibold text-zinc-700">{sol.lineType || '--'}</span>
                                {sol.productionOrder ? (
                                  <>
                                    {' '}
                                    | OP: <span className="font-semibold text-zinc-700">{sol.productionOrder}</span>
                                  </>
                                ) : null}
                              </p>
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOppoSetupStartDraft({
                                      line: sol.line,
                                      product: sol.product,
                                      lineType: sol.lineType,
                                      sessionId: sol.sessionId,
                                      productionOrder: sol.productionOrder,
                                    });
                                    setShowOppoSetupPostsModal(true);
                                  }}
                                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Visualizar chamado
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const req = card.request;
                        return (
                          <div key={card.key} className="rounded-xl border border-zinc-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-zinc-900">Setup: {req.product || '--'}</p>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                                  Em andamento
                                </span>
                                {isDevAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm('Excluir este chamado em andamento? Esta ação não pode ser desfeita.')) return;
                                      handleDeleteOppoRequest(req.id);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 size={11} />
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Tipo: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Status atual: <span className="font-semibold text-zinc-700">{getOppoSetupStatusLabel(req.status)}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Abertura: <span className="font-semibold text-zinc-700">{formatSafeDate(req.requestedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {oppoSetupView === 'HISTORICO' && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">Histórico de chamados finalizados</h3>
                    {isDevAdmin && oppoSetupCompletedRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Excluir TODOS os chamados finalizados de Setup? Esta ação não pode ser desfeita.')) return;
                          handleDeleteOppoRequestsBulk(oppoSetupCompletedRequests.map((req) => req.id));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={12} />
                        Excluir todos
                      </button>
                    )}
                  </div>
                  {oppoSetupCompletedRequests.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum chamado finalizado no Oppo Setup.</p>
                  ) : (
                    <div className="space-y-3">
                      {oppoSetupCompletedRequests.map((req) => {
                        const finishedAt = req.requesterConfirmedAt || req.finalizedAt || req.requestedAt;
                        const startedMs = new Date(req.requestedAt).getTime();
                        const finishedMs = new Date(finishedAt).getTime();
                        const elapsedMs = Number.isFinite(startedMs) && Number.isFinite(finishedMs) ? Math.max(0, finishedMs - startedMs) : 0;
                        return (
                        <div key={`completed-${req.id}`} className="rounded-xl border border-zinc-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900">Setup: {req.product || '--'}</p>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                Finalizado
                              </span>
                              {isDevAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm('Excluir este chamado do histórico de Setup?')) return;
                                    handleDeleteOppoRequest(req.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 size={11} />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Tipo: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Status final: <span className="font-semibold text-zinc-700">{getOppoSetupStatusLabel(req.status)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Finalizado em: <span className="font-semibold text-zinc-700">{formatSafeDate(finishedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Tempo total do setup: <span className="font-semibold text-zinc-700">{formatDurationMs(elapsedMs)}</span>
                          </p>
                        </div>
                      )})}
                    </div>
                  )}
                </>
              )}

              {oppoSetupView === 'OEE' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">OEE Simples do Setup</h3>
                    <span className="text-[11px] font-semibold text-zinc-500">
                      Planejado: {OPPO_SETUP_PLANNED_MINUTES_PER_POST} min por posto
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <select
                      value={oppoSetupDashboardLineFilter}
                      onChange={(e) => setOppoSetupDashboardLineFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    >
                      <option value="">Todas as linhas</option>
                      {oppoSetupOeeLineOptions.map((line) => (
                        <option key={line} value={line}>{line}</option>
                      ))}
                    </select>
                    <select
                      value={oppoSetupDashboardProductFilter}
                      onChange={(e) => setOppoSetupDashboardProductFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    >
                      <option value="">Todos os produtos</option>
                      {oppoSetupOeeProductOptions.map((product) => (
                        <option key={product} value={product}>{product}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Setups finalizados</p>
                      <p className="mt-1 text-lg font-bold text-zinc-900">{oppoSetupOeeSummary.totalSetups}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Tempo real médio</p>
                      <p className="mt-1 text-lg font-bold text-zinc-900">{formatDurationMs(oppoSetupOeeSummary.avgRealMs)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Tempo planejado médio</p>
                      <p className="mt-1 text-lg font-bold text-zinc-900">{formatDurationMs(oppoSetupOeeSummary.avgPlannedMs)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Eficiência média</p>
                      <p className="mt-1 text-lg font-bold text-zinc-900">{oppoSetupOeeSummary.totalSetups ? `${oppoSetupOeeSummary.avgEfficiency}%` : '--'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600">
                    Aderência ao planejado: <span className="font-semibold text-zinc-800">{oppoSetupOeeSummary.totalSetups ? `${oppoSetupOeeSummary.onTargetRate}%` : '--'}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeMainTab === 'ALMOXERIFADO' && allowedMainTabs.includes('ALMOXERIFADO') && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="pointer-events-none absolute -top-24 -left-14 h-64 w-[130%] skew-y-[-6deg] rounded-[60px] bg-gradient-to-r from-violet-800 via-violet-700 to-indigo-700" />
              <div className="relative z-10 grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
                      <Package size={20} />
                    </span>
                    <span>Sistema Almoxerifado</span>
                  </h2>
                  <p className="mt-1 text-sm text-violet-50/90">
                    Fluxo: Aceite do chamado <span className="font-black text-violet-100">›</span> Separação/Conferência{' '}
                    <span className="font-black text-violet-100">›</span> Finalização do Almoxerifado.
                  </p>
                  {!canActAsAlmox && (
                    <p className="mt-3 text-xs font-semibold text-amber-100">
                      Você está em modo visualização. Para agir aqui use o setor ALMOXERIFADO.
                    </p>
                  )}
                </div>
                <div className="flex justify-center md:justify-end">
                  <img src="/almox-hero.svg" alt="Ilustração" className="h-44 w-auto select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.18)]" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAlmoxView('PENDENTES')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    almoxView === 'PENDENTES' ? 'bg-violet-600 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <ClipboardCheck size={16} />
                  Pendentes
                </button>
                <button
                  type="button"
                  disabled={!canNavigateNonSetupTabs}
                  onClick={() => {
                    if (!canNavigateNonSetupTabs) return;
                    setAlmoxView('DEVOLUCOES');
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    almoxView === 'DEVOLUCOES' ? 'bg-violet-600 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <RefreshCw size={16} />
                  Devoluções
                </button>
                <button
                  type="button"
                  disabled={!canNavigateNonSetupTabs}
                  onClick={() => {
                    if (!canNavigateNonSetupTabs) return;
                    setAlmoxView('HISTORICO');
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    almoxView === 'HISTORICO' ? 'bg-violet-600 text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Clock size={16} />
                  Histórico
                </button>
              </div>

              {almoxView === 'PENDENTES' && (
                <>
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-10 w-1 rounded-full bg-violet-600" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-zinc-800">Chamados pendentes de solicitação</h3>
                        <p className="mt-1 text-xs text-zinc-500">Acompanhe e gerencie as solicitações pendentes no almoxerifado.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('TODOS')}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                          almoxSectorTab === 'TODOS'
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <Filter size={14} />
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('PROCESSO')}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                          almoxSectorTab === 'PROCESSO'
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        Eng. Processo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('TESTE')}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                          almoxSectorTab === 'TESTE'
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        Eng. Teste
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500">Setor:</span>
                      <select
                        value={almoxSectorTab}
                        onChange={(e) => setAlmoxSectorTab(e.target.value as typeof almoxSectorTab)}
                        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 outline-none focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="TODOS">Todos</option>
                        <option value="PROCESSO">Eng. Processo</option>
                        <option value="TESTE">Eng. Teste</option>
                      </select>
                    </div>
                  </div>

                  {oppoAlmoxPendingRequestsFilteredBySector.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-violet-200 bg-white py-14 text-center">
                      <div className="mx-auto w-fit">
                        <img src="/empty-almox.svg" alt="Sem chamados" className="mx-auto h-28 w-auto select-none" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-zinc-900">Nenhum chamado pendente para o almoxerifado.</p>
                      <p className="mt-1 text-xs text-zinc-500">Você não possui chamados pendentes no momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {oppoAlmoxPendingRequestsFilteredBySector.map((req) => (
                        <div key={req.id} className="rounded-xl border border-zinc-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900">{getOppoCallTypeLabel(req.callType)}</p>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getOppoStatusStyle(req.status)}`}>
                                {getOppoStatusLabel(req.status)}
                              </span>
                              {isDevAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm('Excluir este chamado do almoxarifado? Esta ação não pode ser desfeita.')) return;
                                    handleDeleteOppoRequest(req.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 size={11} />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                          {isOppoSetupGeneratedRequest(req) && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Setor:{' '}
                              <span className="font-semibold text-zinc-700">
                                {(extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_TESTE'
                                  ? 'Eng. Teste'
                                  : 'Eng. Processo'}
                              </span>
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Solicitante: <span className="font-semibold text-zinc-700">{req.createdByName || req.createdBy}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{req.product || '--'}</span> | Tipo de linha: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                          </p>
                          {!!extractOppoProductionOrder(req.notes) && (
                            <p className="mt-1 text-xs text-zinc-500">
                              OP: <span className="font-semibold text-zinc-700">{extractOppoProductionOrder(req.notes)}</span>
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Itens pagos pelo almox: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.paidItems)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Obs. itens pagos: <span className="font-semibold text-zinc-700">{req.paidItemsNote || '--'}</span>
                          </p>
                          {req.callType === 'DEVOLUCAO_DISPOSITIVO' && (
                            <>
                              <p className="mt-1 text-xs text-zinc-500">
                                Códigos devolução: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Observação: <span className="font-semibold text-zinc-700">{req.returnItemsNote || '--'}</span>
                              </p>
                            </>
                          )}

                          {canActAsAlmox && req.status === 'ABERTO' && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => handleUpdateOppoStatus(req.id, 'SEPARACAO', {
                                  accepted_at: new Date().toISOString(),
                                  almox_by: user?.id || null,
                                  almox_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                                })}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
                              >
                                Aceitar Chamado
                              </button>
                            </div>
                          )}

                          {canActAsAlmox && req.status === 'DIVERGENCIA' && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-red-700">Divergência sinalizada. Necessária 2ª conferência.</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateOppoStatus(req.id, 'SEPARACAO', {
                                  accepted_at: new Date().toISOString(),
                                  almox_by: user?.id || req.almoxBy || null,
                                  almox_by_name: profile?.displayName || req.almoxByName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                                  requester_confirmed: null,
                                  requester_confirmed_at: null,
                                  requester_confirmed_by: null,
                                  requester_confirmed_by_name: null,
                                  notes: 'Retornado ao Almoxerifado para 2ª conferência após divergência.',
                                })}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                              >
                                Iniciar 2ª Conferência
                              </button>
                            </div>
                          )}

                          {canActAsAlmox && req.status === 'SEPARACAO' && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => openAlmoxPaidItemsModal(req)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Selecionar Itens Pagos
                              </button>
                            </div>
                          )}

                          {req.status === 'FINALIZADO_ALMOXERIFADO' && (
                            <p className="mt-3 text-xs font-semibold text-violet-700">
                              {isOppoSetupGeneratedRequest(req)
                                ? 'Aguardando conferência da Eng. Processo.'
                                : 'Aguardando conferência do solicitante.'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {almoxView === 'DEVOLUCOES' && (
                <>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-600">Chamados abertos de devolução</h3>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('TODOS')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          almoxSectorTab === 'TODOS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('PROCESSO')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          almoxSectorTab === 'PROCESSO' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Processo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlmoxSectorTab('TESTE')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          almoxSectorTab === 'TESTE' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Eng. Teste
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500">
                      Setor:{' '}
                      <span className="font-bold text-zinc-800">
                        {almoxSectorTab === 'TODOS' ? 'Todos' : almoxSectorTab === 'PROCESSO' ? 'Eng. Processo' : 'Eng. Teste'}
                      </span>
                    </span>
                  </div>
                  {oppoAlmoxReturnOpenRequestsFilteredBySector.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum chamado aberto de devolução para o almoxerifado.</p>
                  ) : (
                    <div className="space-y-3">
                      {oppoAlmoxReturnOpenRequestsFilteredBySector.map((req) => {
                        const checkedCodes = almoxReturnCheckedItemsByRequest[req.id] || [];
                        const allItemsChecked = areAllReturnItemsChecked(req);
                        return (
                          <div key={req.id} className="rounded-xl border border-zinc-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-zinc-900">{getOppoCallTypeLabel(req.callType)}</p>
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getOppoStatusStyle(req.status)}`}>
                                {getOppoStatusLabel(req.status)}
                              </span>
                            </div>
                            {extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) && (
                              <p className="mt-1 text-xs text-zinc-500">
                                Setor:{' '}
                                <span className="font-semibold text-zinc-700">
                                  {extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) === 'ENGENHARIA_TESTE' ? 'Eng. Teste' : 'Eng. Processo'}
                                </span>
                              </p>
                            )}
                            <p className="mt-1 text-xs text-zinc-500">
                              Solicitante: <span className="font-semibold text-zinc-700">{req.createdByName || req.createdBy}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{req.product || '--'}</span> | Tipo de linha: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Códigos devolução: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Observação: <span className="font-semibold text-zinc-700">{req.returnItemsNote || '--'}</span>
                            </p>

                            {(req.status === 'ABERTO' || req.status === 'SEPARACAO') && canActAsAlmox && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateOppoStatus(req.id, 'CONFERINDO', {
                                      accepted_at: new Date().toISOString(),
                                      almox_by: user?.id || null,
                                      almox_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                                    })
                                  }
                                  className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                                >
                                  Aceitar e Iniciar Conferência
                                </button>
                              </div>
                            )}

                            {req.status === 'DIVERGENCIA' && canActAsAlmox && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-red-700">Divergência sinalizada. Necessária nova conferência da devolução.</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateOppoStatus(req.id, 'CONFERINDO', {
                                      accepted_at: new Date().toISOString(),
                                      almox_by: user?.id || req.almoxBy || null,
                                      almox_by_name: profile?.displayName || req.almoxByName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                                      requester_confirmed: null,
                                      requester_confirmed_at: null,
                                      requester_confirmed_by: null,
                                      requester_confirmed_by_name: null,
                                      notes: 'Retornado ao Almoxerifado para nova conferência da devolução.',
                                    })
                                  }
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                >
                                  Iniciar Nova Conferência
                                </button>
                              </div>
                            )}

                            {req.status === 'CONFERINDO' && (
                              <div className="mt-3 space-y-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">Conferência de Itens Devolvidos</p>
                                {req.returnItemsSelected.length === 0 ? (
                                  <p className="text-xs text-red-700">Nenhum item de devolução informado neste chamado.</p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs text-zinc-600">
                                      Itens devolvidos: <span className="font-semibold text-zinc-800">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {req.returnItemsSelected.map((item) => {
                                        const checked = checkedCodes.includes(item.code);
                                        return (
                                          <button
                                            key={item.code}
                                            type="button"
                                            onClick={() => toggleAlmoxReturnItemChecked(req.id, item.code)}
                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                              checked
                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                                : 'border-zinc-300 bg-white text-zinc-700'
                                            }`}
                                            title={checked ? 'Item conferido (clique para desmarcar)' : 'Marcar item como conferido'}
                                          >
                                            {item.code} (QTD: {item.quantity})
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {req.returnItemsSelected.length > 0 && (
                                  <p className="text-[11px] text-cyan-800">
                                    Conferidos: {checkedCodes.length}/{req.returnItemsSelected.length}
                                  </p>
                                )}
                                {canActAsAlmox && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!allItemsChecked) {
                                        window.alert('Confirme todos os itens devolvidos antes de finalizar.');
                                        return;
                                      }
                                      handleUpdateOppoStatus(req.id, 'FINALIZADO_ALMOXERIFADO', {
                                        finalized_at: new Date().toISOString(),
                                        almox_by: user?.id || req.almoxBy || null,
                                        almox_by_name: profile?.displayName || req.almoxByName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                                        notes: 'Devolução conferida pelo Almoxerifado.',
                                      });
                                      setAlmoxReturnCheckedItemsByRequest((prev) => {
                                        const next = { ...prev };
                                        delete next[req.id];
                                        return next;
                                      });
                                    }}
                                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
                                  >
                                    Finalizar Conferência
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {almoxView === 'HISTORICO' && (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">Histórico de Todos os Chamados</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setAlmoxSectorTab('TODOS')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            almoxSectorTab === 'TODOS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlmoxSectorTab('PROCESSO')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            almoxSectorTab === 'PROCESSO' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Eng. Processo
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlmoxSectorTab('TESTE')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            almoxSectorTab === 'TESTE' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Eng. Teste
                        </button>
                      </div>
                      {isDevAdmin && oppoAlmoxHistoryRequestsFilteredBySector.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Excluir TODOS os chamados exibidos no histórico de Almoxerifado? Esta ação não pode ser desfeita.')) return;
                            handleDeleteOppoRequestsBulk(oppoAlmoxHistoryRequestsFilteredBySector.map((req) => req.id));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={12} />
                          Excluir todos
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 flex items-center justify-end">
                    <span className="text-xs font-semibold text-zinc-500">
                      Setor:{' '}
                      <span className="font-bold text-zinc-800">
                        {almoxSectorTab === 'TODOS' ? 'Todos' : almoxSectorTab === 'PROCESSO' ? 'Eng. Processo' : 'Eng. Teste'}
                      </span>
                    </span>
                  </div>
                  {oppoAlmoxHistoryRequestsFilteredBySector.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum chamado registrado ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {oppoAlmoxHistoryRequestsFilteredBySector.map((req) => (
                        <div key={req.id} className="rounded-xl border border-zinc-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900">{getOppoCallTypeLabel(req.callType)}</p>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getOppoStatusStyle(req.status)}`}>
                                {getOppoStatusLabel(req.status)}
                              </span>
                              {isDevAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm('Excluir este chamado do histórico de Almoxerifado?')) return;
                                    handleDeleteOppoRequest(req.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 size={11} />
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                          {isOppoSetupGeneratedRequest(req) && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Setor:{' '}
                              <span className="font-semibold text-zinc-700">
                                {(extractTaggedValue(req.notes, OPPO_SETUP_TARGET_ROLE_TAG_PREFIX) || 'ENGENHARIA_PROCESSO') === 'ENGENHARIA_TESTE'
                                  ? 'Eng. Teste'
                                  : 'Eng. Processo'}
                              </span>
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Solicitante: <span className="font-semibold text-zinc-700">{req.createdByName || req.createdBy}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Linha: <span className="font-semibold text-zinc-700">{req.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{req.product || '--'}</span> | Tipo de linha: <span className="font-semibold text-zinc-700">{req.lineType || '--'}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Almox responsável: <span className="font-semibold text-zinc-700">{req.almoxByName || '--'}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Itens pagos pelo almox: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.paidItems)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Obs. itens pagos: <span className="font-semibold text-zinc-700">{req.paidItemsNote || '--'}</span>
                          </p>
                          {req.callType === 'DEVOLUCAO_DISPOSITIVO' && (
                            <>
                              <p className="mt-1 text-xs text-zinc-500">
                                Códigos devolução: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(req.returnItemsSelected)}</span>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Observação: <span className="font-semibold text-zinc-700">{req.returnItemsNote || '--'}</span>
                              </p>
                            </>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Abertura: <span className="font-semibold text-zinc-700">{formatSafeDate(req.requestedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Aceite: <span className="font-semibold text-zinc-700">{formatSafeDate(req.acceptedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Finalização Almox: <span className="font-semibold text-zinc-700">{formatSafeDate(req.finalizedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Conferência Solicitante: <span className="font-semibold text-zinc-700">{formatSafeDate(req.requesterConfirmedAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Conferido por: <span className="font-semibold text-zinc-700">{req.requesterConfirmedByName || '--'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        )}
      </section>
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {showFirstAccessOnboarding && firstAccessCurrentStep && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                    Primeiro acesso
                  </p>
                  <h3 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">
                    Guia rápido do sistema
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Passo {firstAccessStepIndex + 1} de {firstAccessOnboardingSteps.length}
                  </p>
                </div>
                <button
                  onClick={closeFirstAccessOnboarding}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Pular
                </button>
              </div>

              <div className="mb-5 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${firstAccessProgress}%` }}
                />
              </div>

              <div className={`rounded-2xl border bg-gradient-to-r p-4 ${firstAccessCurrentStep.accentClass} dark:from-zinc-900 dark:to-zinc-900 dark:border-zinc-700`}>
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${firstAccessCurrentStep.iconClass}`}>
                    <firstAccessCurrentStep.icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{firstAccessCurrentStep.title}</h4>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{firstAccessCurrentStep.description}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {firstAccessCurrentStep.tips.map((tip, idx) => (
                    <div key={`${firstAccessCurrentStep.title}-${idx}`} className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
                      <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  onClick={() => setFirstAccessStepIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={firstAccessStepIndex === 0}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Voltar
                </button>
                <button
                  onClick={goToNextFirstAccessStep}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                >
                  {firstAccessStepIndex === firstAccessOnboardingSteps.length - 1 ? 'Concluir' : 'Próximo passo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showJobTitleModal && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <Settings size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-zinc-900">Atualizar Cargo</h3>
                    <p className="text-xs text-zinc-500">Informação opcional do perfil</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJobTitleModal(false)}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Cargo (opcional)
                </label>
                <input
                  value={jobTitleDraft}
                  onChange={(e) => setJobTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveJobTitleFromModal();
                  }}
                  placeholder="Ex.: Auxiliar de Engenharia"
                  className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowJobTitleModal(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveJobTitleFromModal}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                >
                  Salvar Cargo
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
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
        {showOppoSetupStartModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="my-6 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Abrir Solicitação - OPPO Setup</h3>
                <button
                  onClick={() => {
                    setShowOppoSetupStartModal(false);
                    setOppoSetupStartDraft(null);
                    setOppoSetupLineDraft('');
                    setOppoSetupProductDraft('');
                    setOppoSetupTypeDraft('');
                    setOppoSetupProductionOrderDraft('');
                  }}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

                <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Linha</label>
                  <select
                    value={oppoSetupLineDraft}
                    onChange={(e) => setOppoSetupLineDraft(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">Selecione a linha</option>
                    {OPPO_LINE_OPTIONS.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Tipo de Setup</label>
                  <select
                    value={oppoSetupTypeDraft}
                    onChange={(e) => setOppoSetupTypeDraft(e.target.value as OppoLineType | '')}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="MONTAGEM">Montagem</option>
                    <option value="MONTAGEM/TESTE">Montagem/Teste</option>
                    <option value="EMBALAGEM">Embalagem</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Produto</label>
                  {oppoSetupActorTab === 'PCP' ? (
                    <>
                      <select
                        value={normalizeOppoSetupProductKey(oppoSetupProductDraft)}
                        onChange={(e) => setOppoSetupProductDraft(e.target.value)}
                        disabled={!oppoSetupTypeDraft || oppoSetupPcpProductOptions.length === 0}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-100"
                      >
                        <option value="">
                          {!oppoSetupTypeDraft
                            ? 'Selecione o tipo de setup primeiro'
                            : oppoSetupPcpProductOptions.length === 0
                              ? 'Nenhum produto com layout cadastrado para este tipo'
                              : 'Selecione o produto'}
                        </option>
                        {oppoSetupPcpProductOptions.map((productKey) => (
                          <option key={productKey} value={productKey}>
                            {productKey}
                          </option>
                        ))}
                      </select>
                      {oppoSetupTypeDraft && oppoSetupPcpProductOptions.length === 0 && (
                        <p className="text-xs font-semibold text-amber-700">
                          Cadastre o layout do produto no setor correspondente antes de abrir a solicitação.
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      value={oppoSetupProductDraft}
                      onChange={(e) => setOppoSetupProductDraft(e.target.value)}
                      placeholder="Nome do produto"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-700">Ordem de Produção</label>
                  <input
                    value={oppoSetupProductionOrderDraft}
                    onChange={(e) => setOppoSetupProductionOrderDraft(e.target.value)}
                    placeholder="Ex: OP123456"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowOppoSetupStartModal(false);
                    setOppoSetupLineDraft('');
                    setOppoSetupProductDraft('');
                    setOppoSetupTypeDraft('');
                    setOppoSetupProductionOrderDraft('');
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const product = oppoSetupProductDraft.trim();
                    const productionOrder = oppoSetupProductionOrderDraft.trim();
                    if (!oppoSetupLineDraft || !product || !oppoSetupTypeDraft) {
                      window.alert('Preencha Linha, Produto e Tipo de Setup.');
                      return;
                    }

                    if (oppoSetupActorTab === 'PCP') {
                      if (!productionOrder) {
                        window.alert('Preencha a Ordem de Produção.');
                        return;
                      }
                      handleCreateOppoSetupSolicitation({
                        line: oppoSetupLineDraft,
                        product,
                        lineType: oppoSetupTypeDraft,
                        productionOrder,
                      });
                      setShowOppoSetupStartModal(false);
                    } else {
                      setOppoSetupStartDraft({
                        line: oppoSetupLineDraft,
                        product,
                        lineType: oppoSetupTypeDraft,
                        sessionId: `S${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                        productionOrder: productionOrder || undefined,
                      });
                      setShowOppoSetupStartModal(false);
                      setShowOppoSetupPostsModal(true);
                    }
                    setOppoSetupLineDraft('');
                    setOppoSetupProductDraft('');
                    setOppoSetupTypeDraft('');
                    setOppoSetupProductionOrderDraft('');
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {oppoSetupActorTab === 'PCP' ? 'Enviar Solicitação' : 'Iniciar Setup'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoSetupPostsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-4 rounded-2xl border border-zinc-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                      <Cog size={18} className="text-cyan-700" />
                      Selecionar Posto do Setup
                    </h3>
                    <p className="mt-1 text-xs text-zinc-600">
                      {oppoSetupStartDraft
                        ? `Produto: ${oppoSetupStartDraft.product} | Linha: ${oppoSetupStartDraft.line} | Tipo: ${oppoSetupStartDraft.lineType}${
                            oppoSetupStartDraft.productionOrder ? ` | OP: ${oppoSetupStartDraft.productionOrder}` : ''
                          }`
                        : 'Selecione o posto para iniciar automaticamente o chamado.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(isDevAdmin || currentRole === 'ENGENHARIA_PROCESSO') && (
                      <button
                        type="button"
                        onClick={() => openOppoSetupLayoutModal(oppoSetupStartDraft?.product)}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
                      >
                        <Settings size={12} />
                        Configurar layout
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (oppoSetupStartDraft) {
                          setOppoSetupMinimizedSessions((prev) =>
                            prev.some((item) => item.sessionId === oppoSetupStartDraft.sessionId) ? prev : [...prev, oppoSetupStartDraft]
                          );
                        }
                        setShowOppoSetupPostsModal(false);
                      }}
                      className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                      title="Minimizar"
                    >
                      <LogOut size={18} className="rotate-180" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                      <ClipboardCheck size={11} />
                      Progresso
                    </p>
                    <p className="mt-0.5 text-base font-black text-zinc-900">{oppoSetupSessionCompletedPostsCount}/{activeOppoSetupPosts.length}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                      <Activity size={11} />
                      Em setup
                    </p>
                    <p className="mt-0.5 text-base font-black text-amber-700">
                      {activeOppoSetupPosts.filter((post) => {
                        const req = oppoSetupSessionRequests.find((r) => extractTaggedValue(r.notes, OPPO_SETUP_POST_TAG_PREFIX) === post);
                        return !!req && req.status !== 'CONCLUIDO';
                      }).length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Finalizados
                    </p>
                    <p className="mt-0.5 text-base font-black text-emerald-700">{oppoSetupSessionCompletedPostsCount}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-zinc-200">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${activeOppoSetupPosts.length ? Math.round((oppoSetupSessionCompletedPostsCount / activeOppoSetupPosts.length) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-700 flex items-center gap-1">
                    <Cog size={12} className="text-cyan-600" />
                    Pré-Postos (PP01 a PP05)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {activeOppoSetupPosts.filter((post) => post.startsWith('PP')).map((post) => renderOppoSetupPostCard(post))}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-700 flex items-center gap-1">
                    <Activity size={12} className="text-indigo-600" />
                    Postos da linha (P01 a P31)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {activeOppoSetupPosts.filter((post) => !post.startsWith('PP')).map((post) => renderOppoSetupPostCard(post))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4">
                <p className={`text-xs font-semibold ${oppoSetupSessionAllPostsCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {oppoSetupSessionAllPostsCompleted
                    ? 'Todos os postos foram realizados. Você já pode finalizar o setup completo.'
                    : 'Finalize todos os postos para liberar a finalização do setup completo.'}
                </p>
                <button
                  type="button"
                  disabled={
                    !oppoSetupSessionAllPostsCompleted ||
                    oppoSetupSessionCompleted ||
                    (!isDevAdmin && currentRole !== 'ENGENHARIA_PROCESSO' && currentRole !== 'ENGENHARIA_TESTE')
                  }
                  onClick={async () => {
                    if (!isDevAdmin && currentRole !== 'ENGENHARIA_PROCESSO' && currentRole !== 'ENGENHARIA_TESTE') {
                      window.alert('Apenas a Eng. de Processo ou Eng. de Teste pode finalizar o setup completo.');
                      return;
                    }
                    if (!oppoSetupStartDraft) return;
                    if (!oppoSetupSessionAllPostsCompleted) {
                      window.alert('Ainda existem postos pendentes. Conclua todos para finalizar o setup completo.');
                      return;
                    }

                    const sessionId = oppoSetupStartDraft.sessionId;
                    const targetRole =
                      currentRole === 'ENGENHARIA_TESTE' ? 'ENGENHARIA_TESTE' : 'ENGENHARIA_PROCESSO';
                    const solicitation = oppoSetupSolicitations.find(
                      (item) => item.sessionId === sessionId && item.targetRole === targetRole
                    );
                    if (solicitation && solicitation.status === 'ACCEPTED' && !solicitation.finishedAt) {
                      const { data, error } = await supabase
                        .from('oppo_setup_requests')
                        .update({ finished_at: new Date().toISOString() })
                        .eq('id', solicitation.id)
                        .select('*')
                        .single();

                      if (error) {
                        console.error('Finish OPPO setup solicitation error:', error);
                      } else if (data) {
                        const mapped = mapOppoSetupSolicitation(data as OppoSetupSolicitationRow);
                        setOppoSetupSolicitations((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
                      }
                    }

                    setOppoSetupCompletedSessionIds((prev) =>
                      prev.includes(oppoSetupStartDraft.sessionId) ? prev : [...prev, oppoSetupStartDraft.sessionId]
                    );
                    setOppoSetupMinimizedSessions((prev) => prev.filter((item) => item.sessionId !== oppoSetupStartDraft.sessionId));
                    setShowOppoSetupPostsModal(false);
                    setOppoSetupStartDraft(null);
                    window.alert('Setup completo finalizado com sucesso.');
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {oppoSetupSessionCompleted ? 'Setup completo finalizado' : 'Finalizar Setup Completo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoSetupLayoutsListModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Layouts Cadastrados por Produto</h3>
                <button
                  onClick={() => setShowOppoSetupLayoutsListModal(false)}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              {oppoSetupRegisteredLayoutProducts.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum layout personalizado cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {oppoSetupRegisteredLayoutProducts.map((productKey) => {
                    const storeKey = buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey);
                    const postsCount = oppoSetupLayoutsByStoreKey[storeKey]?.length || 0;
                    return (
                      <div key={productKey} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{productKey}</p>
                          <p className="text-xs text-zinc-500">{postsCount} postos cadastrados</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowOppoSetupLayoutsListModal(false);
                              setOppoSetupProductDraft(productKey);
                              setOppoSetupProductionOrderDraft('');
                              setShowOppoSetupStartModal(true);
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Iniciar Setup
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOppoSetupLayoutsListModal(false);
                              openOppoSetupLayoutModal(productKey);
                            }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                          >
                            Editar Layout
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
        {showOppoSetupLayoutModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Configurar Layout de Postos</h3>
                <button
                  onClick={() => setShowOppoSetupLayoutModal(false)}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              {!canManageOppoSetupLayouts && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Modo visualização: somente Eng. Processo/Teste pode cadastrar/alterar layouts do seu setor.
                  </p>
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">Produto</label>
                  <input
                    value={oppoSetupLayoutProductDraft}
                    onChange={(e) => setOppoSetupLayoutProductDraft(e.target.value.toUpperCase())}
                    placeholder="Exemplo: A6T 4G 128GB"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                {oppoSetupRegisteredLayoutProducts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Layouts já cadastrados</p>
                    <div className="flex flex-wrap gap-2">
                      {oppoSetupRegisteredLayoutProducts.map((productKey) => (
                        <button
                          key={productKey}
                          type="button"
                          onClick={() => {
                            setOppoSetupLayoutProductDraft(productKey);
                            setOppoSetupLayoutResourcesRowOpen(null);
                            setOppoSetupLayoutNewPostResourcesOpen(false);
                            const storeKey = buildOppoSetupLayoutStoreKey(currentOppoSetupLayoutRole, productKey);
                            setOppoSetupLayoutPostsDraft(
                              normalizeOppoSetupTemplates(oppoSetupLayoutDraftsByProduct[storeKey] || oppoSetupLayoutsByStoreKey[storeKey])
                            );
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            normalizeOppoSetupProductKey(oppoSetupLayoutProductDraft) === productKey
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-zinc-300 bg-white text-zinc-700'
                          }`}
                        >
                          {productKey}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-600">Adicionar novo posto</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                  <input
                    value={oppoSetupLayoutNewPostCode}
                    disabled={!canManageOppoSetupLayouts}
                    onChange={(e) => setOppoSetupLayoutNewPostCode(e.target.value.toUpperCase())}
                    placeholder="Código (PP01, P01...)"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                  <input
                    value={oppoSetupLayoutNewPostDescription}
                    disabled={!canManageOppoSetupLayouts}
                    onChange={(e) => setOppoSetupLayoutNewPostDescription(e.target.value)}
                    placeholder="Descrição do posto"
                    className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                  <div className="md:col-span-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canManageOppoSetupLayouts}
                      onClick={() => setOppoSetupLayoutNewPostResourcesOpen((prev) => !prev)}
                      className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Recursos
                    </button>
                    <span className="text-xs font-semibold text-zinc-500">
                      {[
                        oppoSetupLayoutNewPostMachine ? 'Máquina' : null,
                        oppoSetupLayoutNewPostIonizer ? 'Ionizador' : null,
                        oppoSetupLayoutNewPostLupa ? 'Lupa' : null,
                      ]
                        .filter(Boolean)
                        .join(' | ') || 'Sem recurso'}
                    </span>
                  </div>
                </div>
                {oppoSetupLayoutNewPostResourcesOpen && (
                  <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                        <input
                          type="checkbox"
                          disabled={!canManageOppoSetupLayouts}
                          checked={oppoSetupLayoutNewPostMachine}
                          onChange={(e) => setOppoSetupLayoutNewPostMachine(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Máquina de prensa
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                        <input
                          type="checkbox"
                          disabled={!canManageOppoSetupLayouts}
                          checked={oppoSetupLayoutNewPostIonizer}
                          onChange={(e) => setOppoSetupLayoutNewPostIonizer(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Ionizador
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                        <input
                          type="checkbox"
                          disabled={!canManageOppoSetupLayouts}
                          checked={oppoSetupLayoutNewPostLupa}
                          onChange={(e) => setOppoSetupLayoutNewPostLupa(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Lupa
                      </label>
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={!canManageOppoSetupLayouts}
                    onClick={addPostToOppoSetupLayoutDraft}
                    className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar posto
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Postos do layout ({oppoSetupLayoutPostsDraft.length})
                </p>
                {oppoSetupLayoutPostsDraft.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum posto no layout.</p>
                ) : (
                  <div className="space-y-2">
                    {oppoSetupLayoutPostsDraft.map((item, idx) => (
                      <div key={`${item.code}-${idx}`} className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-white p-2 md:grid-cols-12">
                        <input
                          value={item.code}
                          disabled={!canManageOppoSetupLayouts}
                          onChange={(e) =>
                            setOppoSetupLayoutPostsDraft((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, code: e.target.value.toUpperCase() } : p))
                            )
                          }
                          className="md:col-span-2 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                        />
                        <input
                          value={item.description}
                          disabled={!canManageOppoSetupLayouts}
                          onChange={(e) =>
                            setOppoSetupLayoutPostsDraft((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p))
                            )
                          }
                          className="md:col-span-5 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                        />
                        <button
                          type="button"
                          onClick={() => setOppoSetupLayoutResourcesRowOpen((prev) => (prev === idx ? null : idx))}
                          className="md:col-span-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100"
                        >
                          Recursos
                        </button>
                        <div className="md:col-span-4 flex items-center justify-end gap-1">
                          <span className="hidden md:inline text-[10px] font-semibold text-zinc-500">
                            {[
                              item.isMachinePress ? 'Máquina' : null,
                              item.hasIonizer ? 'Ionizador' : null,
                              item.hasLupa ? 'Lupa' : null,
                            ]
                              .filter(Boolean)
                              .join(' | ') || 'Sem recurso'}
                          </span>
                          <button
                            type="button"
                            disabled={!canManageOppoSetupLayouts || idx === 0}
                            onClick={() =>
                              setOppoSetupLayoutPostsDraft((prev) => {
                                if (idx === 0) return prev;
                                if (!canManageOppoSetupLayouts) return prev;
                                const next = [...prev];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                return next.map((row, order) => ({ ...row, order }));
                              })
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-bold text-zinc-700 disabled:opacity-40"
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            disabled={!canManageOppoSetupLayouts || idx === oppoSetupLayoutPostsDraft.length - 1}
                            onClick={() =>
                              setOppoSetupLayoutPostsDraft((prev) => {
                                if (idx >= prev.length - 1) return prev;
                                if (!canManageOppoSetupLayouts) return prev;
                                const next = [...prev];
                                [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                return next.map((row, order) => ({ ...row, order }));
                              })
                            }
                            className="rounded-md border border-zinc-300 px-2 py-1 text-[10px] font-bold text-zinc-700 disabled:opacity-40"
                          >
                            Descer
                          </button>
                          <button
                            type="button"
                            disabled={!canManageOppoSetupLayouts}
                            onClick={() => removePostFromOppoSetupLayoutDraft(idx)}
                            className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                        {oppoSetupLayoutResourcesRowOpen === idx && (
                          <div className="md:col-span-12 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                                <input
                                  type="checkbox"
                                  disabled={!canManageOppoSetupLayouts}
                                  checked={item.isMachinePress}
                                  onChange={(e) =>
                                    setOppoSetupLayoutPostsDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, isMachinePress: e.target.checked } : p))
                                    )
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Máquina de prensa
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                                <input
                                  type="checkbox"
                                  disabled={!canManageOppoSetupLayouts}
                                  checked={item.hasIonizer}
                                  onChange={(e) =>
                                    setOppoSetupLayoutPostsDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, hasIonizer: e.target.checked } : p))
                                    )
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Ionizador
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                                <input
                                  type="checkbox"
                                  disabled={!canManageOppoSetupLayouts}
                                  checked={item.hasLupa}
                                  onChange={(e) =>
                                    setOppoSetupLayoutPostsDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, hasLupa: e.target.checked } : p))
                                    )
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Lupa
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={!canManageOppoSetupLayouts}
                  onClick={() => {
                    setOppoSetupLayoutPostsDraft(buildDefaultOppoSetupTemplate());
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Restaurar padrão
                </button>
                <button
                  type="button"
                  disabled={!canManageOppoSetupLayouts}
                  onClick={removeOppoSetupLayoutDraft}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Excluir layout do produto
                </button>
                <button
                  type="button"
                  onClick={() => setShowOppoSetupLayoutModal(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!canManageOppoSetupLayouts}
                  onClick={saveOppoSetupLayoutDraft}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar layout
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoPressChecklistModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="my-6 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Checklist - Recursos do Posto</h3>
                <button
                  onClick={() => {
                    setShowOppoPressChecklistModal(false);
                    setOppoPressChecklistTarget(null);
                  }}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>
              <p className="mb-3 text-xs text-zinc-500">
                Registre as atividades realizadas antes de finalizar o posto {oppoPressChecklistTarget?.post || '--'}.
              </p>

              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                {oppoPressChecklistNeedsMachine && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={oppoPressChecklistDraft.trocaFixtures}
                        onChange={(e) => setOppoPressChecklistDraft((prev) => ({ ...prev, trocaFixtures: e.target.checked }))}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Troca de fixtures
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={oppoPressChecklistDraft.debug}
                        onChange={(e) => setOppoPressChecklistDraft((prev) => ({ ...prev, debug: e.target.checked }))}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Debug
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={oppoPressChecklistDraft.papelSensivel}
                        onChange={(e) => setOppoPressChecklistDraft((prev) => ({ ...prev, papelSensivel: e.target.checked }))}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Papel sensível
                    </label>
                  </>
                )}
                {oppoPressChecklistNeedsIonizer && (
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={oppoPressChecklistDraft.ionizador}
                      onChange={(e) => setOppoPressChecklistDraft((prev) => ({ ...prev, ionizador: e.target.checked }))}
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Ionizador
                  </label>
                )}
                {oppoPressChecklistNeedsLupa && (
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={oppoPressChecklistDraft.lupa}
                      onChange={(e) => setOppoPressChecklistDraft((prev) => ({ ...prev, lupa: e.target.checked }))}
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Lupa
                  </label>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowOppoPressChecklistModal(false);
                    setOppoPressChecklistTarget(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!oppoPressChecklistTarget) return;
                    const selectedCount =
                      (oppoPressChecklistNeedsMachine && oppoPressChecklistDraft.trocaFixtures ? 1 : 0) +
                      (oppoPressChecklistNeedsMachine && oppoPressChecklistDraft.debug ? 1 : 0) +
                      (oppoPressChecklistNeedsMachine && oppoPressChecklistDraft.papelSensivel ? 1 : 0) +
                      (oppoPressChecklistNeedsIonizer && oppoPressChecklistDraft.ionizador ? 1 : 0) +
                      (oppoPressChecklistNeedsLupa && oppoPressChecklistDraft.lupa ? 1 : 0);
                    if (selectedCount === 0) {
                      window.alert('Marque ao menos uma atividade realizada no checklist do posto.');
                      return;
                    }
                    handleUpdateOppoStatus(oppoPressChecklistTarget.requestId, 'CONCLUIDO', {
                      requester_confirmed: true,
                      requester_confirmed_at: new Date().toISOString(),
                      finalized_at: new Date().toISOString(),
                      requester_confirmed_by: user?.id || null,
                      requester_confirmed_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuário',
                      notes: `${OPPO_SETUP_SESSION_TAG_PREFIX}${oppoPressChecklistTarget.sessionId}] ${OPPO_SETUP_TARGET_ROLE_TAG_PREFIX}${
                        resolveOppoSetupTargetRoleTag(currentRole) || 'ENGENHARIA_PROCESSO'
                      }] ${OPPO_SETUP_POST_TAG_PREFIX}${oppoPressChecklistTarget.post}] ${buildOppoPressChecklistTag(oppoPressChecklistDraft)} Posto finalizado: ${oppoPressChecklistTarget.post}. ${oppoPressChecklistTarget.stepDescription}`,
                    });
                    setShowOppoPressChecklistModal(false);
                    setOppoPressChecklistTarget(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Validar e Finalizar Posto
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {quantityEditor.open && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <Package size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-zinc-900">Quantidade do item</h3>
                    <p className="text-xs text-zinc-500">Código: <span className="font-semibold text-zinc-700">{quantityEditor.code}</span></p>
                  </div>
                </div>
                <button
                  onClick={closeQuantityEditor}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600">Informe a quantidade</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQuantityEditor(-1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    title="Diminuir"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantityEditor.quantityInput}
                    onChange={(e) => setQuantityEditor((prev) => ({ ...prev, quantityInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmQuantityEditor();
                    }}
                    className="h-10 flex-1 rounded-lg border border-violet-300 px-3 text-center text-lg font-bold text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQuantityEditor(1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    title="Aumentar"
                  >
                    <PlusCircle size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeQuantityEditor}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmQuantityEditor}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoCallTypeModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative my-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[28px] border border-white/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-7 shadow-2xl sm:my-0 sm:p-8 overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl" />
                <div className="absolute -left-40 -bottom-40 h-96 w-96 rounded-full bg-teal-300/25 blur-3xl" />
                <div className="absolute right-10 top-28 h-40 w-40 rounded-full bg-white/60 blur-2xl" />
              </div>

              <div className="relative mb-6 flex items-start justify-between gap-4">
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">Abertura de Chamado OPPO</h3>
                <button
                  onClick={() => {
                    setShowOppoCallTypeModal(false);
                    setOppoLineDraft('');
                    setOppoProductDraft('');
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-emerald-900/70 transition hover:bg-emerald-900/10 hover:text-emerald-950"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>
              <div className="relative space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-base font-black text-emerald-950">Linha</label>
                  <select
                    value={oppoLineDraft}
                    onChange={(e) => setOppoLineDraft(e.target.value)}
                    className="w-full rounded-2xl border border-emerald-900/20 bg-white/80 px-4 py-3.5 text-base outline-none shadow-sm transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200/70"
                  >
                    <option value="">Selecione a linha</option>
                    {OPPO_LINE_OPTIONS.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-base font-black text-emerald-950">Produto</label>
                  <input
                    value={oppoProductDraft}
                    onChange={(e) => setOppoProductDraft(e.target.value)}
                    placeholder="Nome do produto"
                    className="w-full rounded-2xl border border-emerald-900/20 bg-white/80 px-4 py-3.5 text-base outline-none shadow-sm transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-base font-black text-emerald-950/45">Tipo de linha</label>
                  <input
                    value={oppoLineTypeDraft}
                    readOnly
                    placeholder="Será preenchido automaticamente"
                    className="w-full rounded-2xl border border-emerald-900/10 bg-white/50 px-4 py-3.5 text-base text-zinc-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="relative my-5 flex items-center gap-4">
                <p className="text-base font-semibold text-emerald-950/80">Selecione uma opção para continuar:</p>
                <div className="h-px flex-1 bg-emerald-900/15" />
              </div>

              <div className="relative space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    const product = oppoProductDraft.trim();
                    if (!oppoLineDraft || !product || !oppoLineTypeDraft) {
                      window.alert('Preencha Linha, Produto e aguarde o Tipo de linha automático.');
                      return;
                    }
                    await handleCreateOppoRequest('SOLICITACAO_DISPOSITIVO', {
                      line: oppoLineDraft,
                      product,
                      lineType: oppoLineTypeDraft as OppoLineType,
                    });
                     setShowOppoCallTypeModal(false);
                     setOppoLineDraft('');
                     setOppoProductDraft('');
                   }}
                  className="w-full rounded-3xl border border-emerald-200/70 bg-white/70 px-5 py-4 text-left shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white/85 hover:shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-50 shadow-sm">
                        <Package size={22} />
                      </span>
                      <div>
                        <p className="text-base font-black text-emerald-950">Solicitação de Equipamentos/Dispositivos</p>
                        <p className="mt-0.5 text-sm font-medium text-emerald-950/75">
                        Abrir chamado para pagamento e envio de material pelo Almox.
                      </p>
                      </div>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-950/25 bg-white text-emerald-950 shadow-sm">
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const product = oppoProductDraft.trim();
                    if (!oppoLineDraft || !product || !oppoLineTypeDraft) {
                      window.alert('Preencha Linha, Produto e aguarde o Tipo de linha automático.');
                      return;
                    }
                    setShowOppoCallTypeModal(false);
                     setShowOppoReturnInfoModal(true);
                     setOppoReturnItemsNoteDraft('');
                   }}
                  className="w-full rounded-3xl border border-amber-200/70 bg-white/70 px-5 py-4 text-left shadow-sm backdrop-blur transition hover:border-amber-300 hover:bg-white/85 hover:shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-700 text-amber-50 shadow-sm">
                        <LogOut size={22} className="rotate-180" />
                      </span>
                      <div>
                        <p className="text-base font-black text-amber-950">Devolução de Equipamentos/Dispositivos</p>
                        <p className="mt-0.5 text-sm font-medium text-amber-950/75">
                        Abrir chamado de retorno para conferência de itens no Almox.
                      </p>
                      </div>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-950/25 bg-white text-amber-950 shadow-sm">
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoReturnInfoModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="my-6 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Devolução para Almoxerifado</h3>
                <button
                  onClick={() => {
                    setShowOppoReturnInfoModal(false);
                    setOppoReturnItemsNoteDraft('');
                    setOppoReturnCodeInput('');
                    setOppoReturnSelectedCodesDraft([]);
                  }}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Digite o código de identificação e selecione a opção correta na janela de sugestões.
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Código de identificação
                </label>
                <input
                  value={oppoReturnCodeInput}
                  onChange={(e) => setOppoReturnCodeInput(e.target.value)}
                  placeholder="Digite o código e selecione"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
                {filteredReturnCodeOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                    {filteredReturnCodeOptions.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => addReturnCodeToDraft(code)}
                        className="block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 last:border-b-0"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
                {normalizedReturnCodeInput && !oppoReturnSelectedCodesDraft.some((item) => item.code === normalizedReturnCodeInput) && (
                  <button
                    type="button"
                    onClick={() => addReturnCodeToDraft(normalizedReturnCodeInput)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Usar código digitado: {normalizedReturnCodeInput}
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Códigos selecionados
                </label>
                {oppoReturnSelectedCodesDraft.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nenhum código selecionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {oppoReturnSelectedCodesDraft.map((item) => (
                      <div
                        key={item.code}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 pl-2.5 pr-1 py-1 text-[11px] font-bold text-amber-800"
                        title={`${item.code} - clique no item para editar quantidade`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setQuantityEditor({
                              open: true,
                              code: item.code,
                              quantityInput: `${item.quantity}`,
                              source: 'RETURN',
                              clearInputAfterSave: false,
                            })
                          }
                          className="rounded-full px-0.5 hover:text-amber-900"
                        >
                          {item.code} x {item.quantity}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOppoReturnSelectedCodesDraft((prev) => prev.filter((p) => p.code !== item.code))}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                          title={`Remover ${item.code}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Observação (opcional)
                </label>
                <textarea
                  value={oppoReturnItemsNoteDraft}
                  onChange={(e) => setOppoReturnItemsNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Detalhes adicionais da devolução (opcional)"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowOppoReturnInfoModal(false);
                    setOppoReturnItemsNoteDraft('');
                    setOppoReturnCodeInput('');
                    setOppoReturnSelectedCodesDraft([]);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (oppoReturnSelectedCodesDraft.length === 0) {
                      window.alert('Selecione ao menos um código de identificação para devolução.');
                      return;
                    }
                    const note = oppoReturnItemsNoteDraft.trim();
                    await handleCreateOppoRequest('DEVOLUCAO_DISPOSITIVO', {
                      line: oppoLineDraft,
                      product: oppoProductDraft.trim(),
                      lineType: oppoLineTypeDraft as OppoLineType,
                      returnItemsNote: note || formatOppoPaidItems(oppoReturnSelectedCodesDraft),
                      returnItemsSelected: oppoReturnSelectedCodesDraft,
                    });
                    setShowOppoReturnInfoModal(false);
                    setOppoReturnItemsNoteDraft('');
                    setOppoReturnCodeInput('');
                    setOppoReturnSelectedCodesDraft([]);
                    setOppoLineDraft('');
                    setOppoProductDraft('');
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Abrir Chamado de Devolução
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showAlmoxPaidItemsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="my-6 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Itens Pagos pelo Almoxerifado</h3>
                <button
                  onClick={closeAlmoxPaidItemsModal}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Código de identificação
                </label>
                <input
                  value={almoxPaidCodeInput}
                  onChange={(e) => setAlmoxPaidCodeInput(e.target.value)}
                  placeholder="Digite o código e selecione"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
                {filteredAlmoxPaidCodeOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                    {filteredAlmoxPaidCodeOptions.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => addAlmoxPaidCodeToDraft(code)}
                        className="block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 last:border-b-0"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
                {normalizedAlmoxPaidCodeInput && !almoxPaidSelectedItemsDraft.some((item) => item.code === normalizedAlmoxPaidCodeInput) && (
                  <button
                    type="button"
                    onClick={() => addAlmoxPaidCodeToDraft(normalizedAlmoxPaidCodeInput)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Usar código digitado: {normalizedAlmoxPaidCodeInput}
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Códigos pagos selecionados
                </label>
                {almoxPaidSelectedItemsDraft.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nenhum código selecionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {almoxPaidSelectedItemsDraft.map((item) => (
                      <div
                        key={item.code}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 pl-2.5 pr-1 py-1 text-[11px] font-bold text-emerald-800"
                        title={`${item.code} - clique no item para editar quantidade`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setQuantityEditor({
                              open: true,
                              code: item.code,
                              quantityInput: `${item.quantity}`,
                              source: 'ALMOX',
                              clearInputAfterSave: false,
                            })
                          }
                          className="rounded-full px-0.5 hover:text-emerald-900"
                        >
                          {item.code} x {item.quantity}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlmoxPaidSelectedItemsDraft((prev) => prev.filter((p) => p.code !== item.code))}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
                          title={`Remover ${item.code}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  Observação (opcional)
                </label>
                <textarea
                  value={almoxPaidItemsNoteDraft}
                  onChange={(e) => setAlmoxPaidItemsNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Detalhes do que foi pago para o time solicitante"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeAlmoxPaidItemsModal}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!almoxPaidItemsRequestId) return;
                    if (almoxPaidSelectedItemsDraft.length === 0) {
                      window.alert('Selecione ao menos um código de equipamento/dispositivo pago.');
                      return;
                    }
                    await handleUpdateOppoStatus(almoxPaidItemsRequestId, 'FINALIZADO_ALMOXERIFADO', {
                      finalized_at: new Date().toISOString(),
                      almox_by: user?.id || null,
                      almox_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Almox',
                      paid_items_selected: almoxPaidSelectedItemsDraft,
                      paid_items_note: almoxPaidItemsNoteDraft.trim() || null,
                    });
                    closeAlmoxPaidItemsModal();
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Salvar e Finalizar Separação
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showOppoRequesterConferenceModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Conferência de Itens Pagos</h3>
                <button
                  onClick={closeOppoRequesterConferenceModal}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title="Fechar"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>

              {oppoRequesterConferenceRequest ? (
                <>
                  {(() => {
                    const conferenceItems = buildOppoRequesterConferenceItems(oppoRequesterConferenceRequest);
                    return (
                      <>
                  <p className="text-xs text-zinc-500">
                    Linha: <span className="font-semibold text-zinc-700">{oppoRequesterConferenceRequest.line || '--'}</span> | Produto: <span className="font-semibold text-zinc-700">{oppoRequesterConferenceRequest.product || '--'}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Itens pagos pelo almox: <span className="font-semibold text-zinc-700">{formatOppoPaidItems(oppoRequesterConferenceRequest.paidItems)}</span>
                  </p>

                  <div className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 p-3">
                    <p className="text-sm font-bold uppercase tracking-wide text-cyan-800">Conferência de itens devolvidos</p>
                    {oppoRequesterConferenceRequest.paidItems.length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-600">Nenhum item informado pelo almox para conferência.</p>
                    ) : (
                      <div className="mt-2 max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                        {oppoRequesterConferenceRequest.paidItems.map((item) => (
                          <div key={item.code} className="rounded-lg border border-cyan-200 bg-white p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-zinc-800">{item.code} (QTD informada: {item.quantity})</span>
                              <button
                                type="button"
                                onClick={() => setOppoRequesterConferenceConfirmedQty(item.code, item.quantity, item.quantity)}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                Marcar total OK
                              </button>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">Qtd recebida em linha</label>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={oppoRequesterConferenceConfirmedQtyByCode[item.code] ?? 0}
                                onChange={(e) => setOppoRequesterConferenceConfirmedQty(item.code, Number(e.target.value), item.quantity)}
                                className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              />
                              <span className="text-xs text-zinc-500">
                                pendente: {Math.max(0, item.quantity - (oppoRequesterConferenceConfirmedQtyByCode[item.code] ?? 0))}
                              </span>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs font-semibold text-cyan-800">
                          Conferidos (qtd): {conferenceItems.totalConfirmedQty}/{conferenceItems.totalExpectedQty}
                        </p>
                        <p className="text-xs font-semibold text-amber-700">
                          Pendentes para 2ª conferência: {conferenceItems.totalExpectedQty - conferenceItems.totalConfirmedQty}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={oppoRequesterConferenceNoteDraft}
                      onChange={(e) => setOppoRequesterConferenceNoteDraft(e.target.value)}
                      rows={3}
                      placeholder="Digite alguma observação da conferência, se necessário"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeOppoRequesterConferenceModal}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const actorLabel =
                          currentRole === 'ENGENHARIA_PROCESSO' && isOppoSetupGeneratedRequest(oppoRequesterConferenceRequest)
                            ? 'Eng. Processo'
                            : 'solicitante';
                        const noteSuffix = oppoRequesterConferenceNoteDraft.trim() ? ` Observação: ${oppoRequesterConferenceNoteDraft.trim()}.` : '';
                        if (conferenceItems.divergentItems.length === 0) {
                          window.alert('Não há pendências para divergência. Todos os itens foram conferidos.');
                          return;
                        }
                        await handleUpdateOppoStatus(oppoRequesterConferenceRequest.id, 'DIVERGENCIA', {
                          requester_confirmed: false,
                          requester_confirmed_at: new Date().toISOString(),
                          requester_confirmed_by: user?.id || null,
                          requester_confirmed_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuário',
                          paid_items_selected: conferenceItems.divergentItems,
                          notes: `Divergência parcial apontada pelo ${actorLabel}. Itens conformes: ${formatOppoPaidItems(conferenceItems.confirmedItems)}. Itens pendentes para 2ª conferência: ${formatOppoPaidItems(conferenceItems.divergentItems)}.${noteSuffix}`,
                        });
                        closeOppoRequesterConferenceModal();
                      }}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Conferir: Divergência
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const actorLabel =
                          currentRole === 'ENGENHARIA_PROCESSO' && isOppoSetupGeneratedRequest(oppoRequesterConferenceRequest)
                            ? 'Eng. Processo'
                            : 'solicitante';
                        const noteSuffix = oppoRequesterConferenceNoteDraft.trim() ? ` Observação: ${oppoRequesterConferenceNoteDraft.trim()}.` : '';
                        if (conferenceItems.divergentItems.length > 0) {
                          const shouldSendPartial = window.confirm('Existem pendências de quantidade. Deseja enviar somente os itens pendentes para 2ª conferência do Almoxerifado?');
                          if (!shouldSendPartial) return;
                          await handleUpdateOppoStatus(oppoRequesterConferenceRequest.id, 'DIVERGENCIA', {
                            requester_confirmed: false,
                            requester_confirmed_at: new Date().toISOString(),
                            requester_confirmed_by: user?.id || null,
                            requester_confirmed_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuário',
                            paid_items_selected: conferenceItems.divergentItems,
                            notes: `Divergência parcial apontada pelo ${actorLabel}. Itens conformes: ${formatOppoPaidItems(conferenceItems.confirmedItems)}. Itens pendentes para 2ª conferência: ${formatOppoPaidItems(conferenceItems.divergentItems)}.${noteSuffix}`,
                          });
                          closeOppoRequesterConferenceModal();
                          return;
                        }
                        await handleUpdateOppoStatus(oppoRequesterConferenceRequest.id, 'CONCLUIDO', {
                          requester_confirmed: true,
                          requester_confirmed_at: new Date().toISOString(),
                          requester_confirmed_by: user?.id || null,
                          requester_confirmed_by_name: profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Usuário',
                          notes: `Conferência concluída pelo ${actorLabel}. Itens conferidos: ${formatOppoPaidItems(conferenceItems.confirmedItems)}.${noteSuffix}`,
                        });
                        closeOppoRequesterConferenceModal();
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Conferir: Conforme
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <p className="text-sm text-zinc-600">Chamado não encontrado para conferência.</p>
              )}
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
  const [showDetails, setShowDetails] = useState(false);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [receiverTargetRole, setReceiverTargetRole] = useState<'QUALIDADE' | 'AREA_KIT' | null>(null);
  const [receiverNameDraft, setReceiverNameDraft] = useState('');

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

  useEffect(() => {
    setShowDetails(false);
    setShowReceiverModal(false);
    setReceiverTargetRole(null);
    setReceiverNameDraft('');
  }, [request.id]);

  const openReceiverModal = (targetRole: 'QUALIDADE' | 'AREA_KIT') => {
    setReceiverTargetRole(targetRole);
    setReceiverNameDraft('');
    setShowReceiverModal(true);
  };

  const handleReceiverConfirm = async () => {
    if (!receiverTargetRole) return;
    const receivedBy = receiverNameDraft.trim();
    if (!receivedBy) {
      window.alert(
        receiverTargetRole === 'AREA_KIT'
          ? 'Informe quem recebeu o material.'
          : 'Informe quem recebeu o documento.'
      );
      return;
    }

    await onUpdateStatus(
      request.id,
      'PENDING_SETUP',
      receiverTargetRole === 'AREA_KIT'
        ? { kit_material_received_by: receivedBy }
        : { quality_document_received_by: receivedBy },
      receiverTargetRole
    );
    setShowReceiverModal(false);
    setReceiverTargetRole(null);
    setReceiverNameDraft('');
  };

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
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
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
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const WORKFLOW_STEPS = ['Abertura', 'Execução', 'Conferência', 'Finalização'];
  const getWorkflowStepIndex = (status: SetupRequest['status']) => {
    switch (status) {
      case 'PENDING_QUALITY':
      case 'PENDING_KIT':
      case 'PENDING_QUALITY_AND_KIT':
        return 1;
      case 'PENDING_SETUP_AND_KIT':
      case 'PENDING_SETUP':
      case 'IN_PROGRESS':
      case 'PENDING_KIT_AFTER_SETUP':
        return 2;
      case 'PENDING_TESTE':
      case 'TESTE_IN_PROGRESS':
      case 'PENDING_PROCESSO':
      case 'PROCESSO_IN_PROGRESS':
      case 'PENDING_AUTOMACAO':
      case 'AUTOMACAO_IN_PROGRESS':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 1;
    }
  };

  const getNextActionText = (status: SetupRequest['status']) => {
    switch (status) {
      case 'PENDING_QUALITY':
        return 'Qualidade deve receber documento e concluir.';
      case 'PENDING_KIT':
        return 'Área Kit deve confirmar material recebido.';
      case 'PENDING_QUALITY_AND_KIT':
        return 'Qualidade e Área Kit precisam concluir a etapa de abertura.';
      case 'PENDING_SETUP_AND_KIT':
        return 'Setup pode iniciar e Área Kit precisa confirmar material.';
      case 'PENDING_SETUP':
        return 'Engenharia Setup deve aceitar e iniciar execução.';
      case 'IN_PROGRESS':
        return request.checklistCompleted
          ? 'Checklist setup OK. Finalize para avançar.'
          : 'Abrir e concluir checklist de setup para finalizar execução.';
      case 'PENDING_KIT_AFTER_SETUP':
        return 'Área Kit deve confirmar material pós-setup.';
      case 'PENDING_TESTE':
        return request.materialInLineConfirmed === true
          ? 'Engenharia Teste pode aceitar e iniciar.'
          : 'Confirmar material em linha para liberar o aceite do teste.';
      case 'TESTE_IN_PROGRESS':
        return request.testeChecklistCompleted
          ? 'Checklist teste OK. Finalize o teste.'
          : 'Preencher checklist de teste para liberar finalização.';
      case 'PENDING_PROCESSO':
        return 'Engenharia Processo deve aceitar o chamado.';
      case 'PROCESSO_IN_PROGRESS':
        return request.processoChecklistCompleted
          ? 'Checklist processo OK. Finalize processo.'
          : 'Preencher checklist de processo para liberar finalização.';
      case 'PENDING_AUTOMACAO':
        return 'Engenharia Automação deve aceitar o chamado.';
      case 'AUTOMACAO_IN_PROGRESS':
        return request.automacaoChecklistCompleted && request.automacaoSyncValidated !== undefined
          ? 'Checklist e SYNC OK. Finalize automação.'
          : 'Preencher checklist de automação e validar SYNC.';
      case 'COMPLETED':
        return 'Fluxo concluído com sucesso.';
      default:
        return 'Aguardando próxima ação.';
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
        openReceiverModal('QUALIDADE');
      }
    } else if (role === 'AREA_KIT') {
      if (request.status === 'PENDING_KIT' || request.status === 'PENDING_QUALITY_AND_KIT' || request.status === 'PENDING_SETUP_AND_KIT' || request.status === 'PENDING_KIT_AFTER_SETUP') {
        openReceiverModal('AREA_KIT');
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
            onClick={() => openReceiverModal('QUALIDADE')}
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
            onClick={() => openReceiverModal('AREA_KIT')}
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
              onClick={() => openReceiverModal('AREA_KIT')}
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
            onClick={() => openReceiverModal('AREA_KIT')}
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
              onClick={() => openReceiverModal('QUALIDADE')}
              className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
            >
              Finalizar (Qualidade)
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => openReceiverModal('AREA_KIT')}
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
  type SectorChipState = 'DONE' | 'PENDING' | 'NOT_REACHED';
  const getSectorChipClass = (state: SectorChipState) => {
    if (state === 'DONE') return 'border-emerald-200 bg-emerald-50';
    if (state === 'PENDING') return 'border-red-200 bg-red-50';
    return 'border-zinc-200 bg-zinc-100';
  };

  const qualityActive = request.status === 'PENDING_QUALITY' || request.status === 'PENDING_QUALITY_AND_KIT';
  const kitActive =
    request.status === 'PENDING_KIT' ||
    request.status === 'PENDING_QUALITY_AND_KIT' ||
    request.status === 'PENDING_SETUP_AND_KIT' ||
    request.status === 'PENDING_KIT_AFTER_SETUP';
  const setupActive =
    request.status === 'PENDING_SETUP' ||
    request.status === 'PENDING_SETUP_AND_KIT' ||
    request.status === 'IN_PROGRESS';
  const testeActive = request.status === 'PENDING_TESTE' || request.status === 'TESTE_IN_PROGRESS';
  const processoActive = request.status === 'PENDING_PROCESSO' || request.status === 'PROCESSO_IN_PROGRESS';
  const automacaoActive = request.status === 'PENDING_AUTOMACAO' || request.status === 'AUTOMACAO_IN_PROGRESS';
  const syncReached =
    request.status === 'PENDING_AUTOMACAO' ||
    request.status === 'AUTOMACAO_IN_PROGRESS' ||
    request.status === 'COMPLETED';

  const docChipState: SectorChipState = isDocDone ? 'DONE' : qualityActive ? 'PENDING' : 'NOT_REACHED';
  const kitChipState: SectorChipState = isKitDone ? 'DONE' : kitActive ? 'PENDING' : 'NOT_REACHED';
  const setupChipState: SectorChipState = request.checklistCompleted ? 'DONE' : setupActive ? 'PENDING' : 'NOT_REACHED';
  const testeChipState: SectorChipState = request.testeChecklistCompleted ? 'DONE' : testeActive ? 'PENDING' : 'NOT_REACHED';
  const processoChipState: SectorChipState = request.processoChecklistCompleted ? 'DONE' : processoActive ? 'PENDING' : 'NOT_REACHED';
  const automacaoChipState: SectorChipState = request.automacaoChecklistCompleted ? 'DONE' : automacaoActive ? 'PENDING' : 'NOT_REACHED';
  const syncChipState: SectorChipState =
    request.automacaoSyncValidated === true ? 'DONE' : syncReached ? 'PENDING' : 'NOT_REACHED';

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
  const workflowStep = getWorkflowStepIndex(request.status);
  const workflowPercent = Math.max(0, Math.min(100, Math.round((workflowStep / WORKFLOW_STEPS.length) * 100)));

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
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(docChipState)}`}>
                <FileText size={11} />
                Doc: {isDocDone ? 'Em Linha' : docChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(kitChipState)}`}>
                <CheckCircle2 size={11} />
                Material: {isKitDone ? 'Pago' : kitChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(setupChipState)}`}>
                <Settings size={11} />
                Checklist Setup: {request.checklistCompleted ? 'Concluido' : setupChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(testeChipState)}`}>
                <ClipboardCheck size={11} />
                Checklist Teste: {request.testeChecklistCompleted ? 'Concluido' : testeChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(processoChipState)}`}>
                <ClipboardCheck size={11} />
                Checklist Processo: {request.processoChecklistCompleted ? 'Concluido' : processoChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(automacaoChipState)}`}>
                <ClipboardCheck size={11} />
                Checklist Automacao: {request.automacaoChecklistCompleted ? 'Concluido' : automacaoChipState === 'NOT_REACHED' ? 'Aguardando' : 'Pendente'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border setup-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-900 ${getSectorChipClass(syncChipState)}`}>
                <Cpu size={11} />
                SYNC: {request.automacaoSyncValidated === true ? 'Validado' : syncChipState === 'NOT_REACHED' ? 'Aguardando' : request.automacaoSyncValidated === false ? 'Não validado' : 'Pendente'}
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

        <div className="flex w-full md:w-auto flex-col items-start md:items-end gap-3">
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
            <div className="flex flex-wrap w-full md:w-auto gap-2 [&>div]:flex-wrap">
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

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">
            Progresso do fluxo: {workflowStep}/{WORKFLOW_STEPS.length}
          </p>
          <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700">
            Próxima ação: {getNextActionText(request.status)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${workflowPercent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {WORKFLOW_STEPS.map((stepLabel, idx) => {
            const stepNumber = idx + 1;
            const isDone = workflowStep > stepNumber || request.status === 'COMPLETED';
            const isCurrent = workflowStep === stepNumber && request.status !== 'COMPLETED';
            return (
              <span
                key={`${request.id}-${stepLabel}`}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : isCurrent
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                      : 'border-zinc-300 bg-white text-zinc-500'
                }`}
              >
                {stepLabel}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100">
        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100"
        >
          Detalhes
          <ChevronRight size={13} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>

        {showDetails && (
          <div className="mt-3">
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
                <p className="text-xs text-zinc-600">Recebido por: <span className="font-semibold text-zinc-800">{request.qualityDocumentReceivedBy || '--'}</span></p>
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
                <p className="text-xs text-zinc-600">Recebido por: <span className="font-semibold text-zinc-800">{request.kitMaterialReceivedBy || '--'}</span></p>
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
        )}
      </div>

      <AnimatePresence>
        {showTesteChecklist && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="my-6 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
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
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="my-6 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
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
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="my-6 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
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
        {showReceiverModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="my-6 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:my-0"
            >
              <h4 className="text-lg font-bold text-zinc-900 mb-2">
                {receiverTargetRole === 'AREA_KIT' ? 'Confirmação da Área Kit' : 'Confirmação da Qualidade'}
              </h4>
              <p className="text-xs text-zinc-500 mb-4">
                {receiverTargetRole === 'AREA_KIT'
                  ? 'Informe para quem o material foi entregue.'
                  : 'Informe quem recebeu o documento.'}
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  {receiverTargetRole === 'AREA_KIT' ? 'Quem recebeu o material?' : 'Quem recebeu o documento?'}
                </label>
                <input
                  value={receiverNameDraft}
                  onChange={(e) => setReceiverNameDraft(e.target.value)}
                  placeholder={receiverTargetRole === 'AREA_KIT' ? 'Nome de quem recebeu o material' : 'Nome de quem recebeu o documento'}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowReceiverModal(false);
                    setReceiverTargetRole(null);
                    setReceiverNameDraft('');
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReceiverConfirm}
                  className={`rounded-lg px-3 py-2 text-xs font-bold text-white ${receiverTargetRole === 'AREA_KIT' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



