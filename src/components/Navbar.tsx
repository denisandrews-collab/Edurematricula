import React, { useState, useRef, useEffect } from 'react';
import { Student, IntegrationSettings } from '../types';
import {
  GraduationCap,
  FileSpreadsheet,
  FileSignature,
  CreditCard,
  UserCheck,
  Settings,
  ExternalLink,
  ShieldCheck,
  Activity,
  Zap,
  ChevronDown,
  Upload,
  Download,
  UserPlus,
  Eye,
  Edit,
  Building,
  Calendar,
  CheckCircle2,
  Key,
  Menu,
  X,
  Sparkles,
  Send,
  HelpCircle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal';
  onSelectTab: (
    tab: 'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal',
    subOption?: string
  ) => void;
  students: Student[];
  selectedStudent: Student;
  onSelectStudent: (student: Student) => void;
  settings: IntegrationSettings;
  onQuickAction?: (action: 'import' | 'new_student' | 'batch_send') => void;
}

export function Navbar({
  currentTab,
  onSelectTab,
  students,
  selectedStudent,
  onSelectStudent,
  settings,
  onQuickAction,
}: NavbarProps) {
  // Dropdown states for each main menu
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>('students');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const signedCount = students.filter(
    (s) =>
      s.status === 'assinado' ||
      s.status === 'pagamento_pendente' ||
      s.status === 'pago' ||
      s.status === 'matricula_confirmada'
  ).length;

  const paidCount = students.filter(
    (s) => s.status === 'pago' || s.status === 'matricula_confirmada'
  ).length;

  const pendingSignatureCount = students.filter(
    (s) => s.status === 'enviado_autentique'
  ).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMouseEnter = (menuName: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(menuName);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const handleSubmenuClick = (
    tab: 'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal',
    subOption?: string,
    action?: 'import' | 'new_student' | 'batch_send'
  ) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    onSelectTab(tab, subOption);
    if (action && onQuickAction) {
      onQuickAction(action);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-2xs">
      {/* Top Micro Ticker & Health Bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              API Autentique v2: Online
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1.5 text-sky-400 font-semibold hidden sm:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              API Itaú Cobrança: Conectado
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline">
              Campanha Rematrícula 2026 (Parcelamento Regressivo Ativo)
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-400 hidden lg:inline">
              Base Total: <strong className="text-white font-mono">{students.length}</strong> alunos
            </span>
            <span className="text-slate-600 hidden lg:inline">•</span>
            <span className="text-emerald-400">
              Confirmados: <strong className="font-mono">{paidCount}</strong>/{students.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-17">
          {/* Brand & School Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group shrink-0"
            onClick={() => handleSubmenuClick('spreadsheet')}
            id="brand-logo-button"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  EduRematrícula
                </span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-200/70 font-mono tracking-tight">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                Colégio Modelo Alpha • Gestão Integrada
              </p>
            </div>
          </div>

          {/* Desktop Navigation Menus with Interactive Flyout Submenus */}
          <nav
            ref={dropdownRef}
            className="hidden md:flex items-center space-x-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 relative"
            aria-label="Navegação Principal"
          >
            {/* 1. MENU: ALUNOS & REMATRÍCULAS */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('students')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-menu-students"
                type="button"
                onClick={() => {
                  if (activeDropdown === 'students') {
                    setActiveDropdown(null);
                  } else {
                    setActiveDropdown('students');
                  }
                  if (currentTab !== 'spreadsheet') onSelectTab('spreadsheet');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer select-none ${
                  currentTab === 'spreadsheet'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Alunos & Planilha</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    currentTab === 'spreadsheet'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {students.length}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === 'students' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {/* Submenu Flyout for Students */}
              {activeDropdown === 'students' && (
                <div
                  id="dropdown-students-menu"
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseEnter={() => handleMouseEnter('students')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Gestão de Alunos & Base
                    </span>
                  </div>

                  <button
                    id="submenu-students-table"
                    onClick={() => handleSubmenuClick('spreadsheet')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                        Tabela Geral de Alunos
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Visualizar toda a base, filtros por série e status de matrícula.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-students-import"
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'import')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                        Importar Excel / CSV
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Carregar planilha com mapeamento automático de colunas.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-students-new"
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'new_student')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                        Cadastrar Novo Aluno
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Adicionar manualmente estudante e responsáveis.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-students-batch"
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'batch_send')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 flex items-center justify-between">
                        <span>Disparo em Lote</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                          {pendingSignatureCount} pendentes
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gerar minutas e enviar para todos os responsáveis via Autentique.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. MENU: CONTRATOS & MINUTAS */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('contract')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-menu-contract"
                type="button"
                onClick={() => {
                  if (activeDropdown === 'contract') {
                    setActiveDropdown(null);
                  } else {
                    setActiveDropdown('contract');
                  }
                  if (currentTab !== 'contract') onSelectTab('contract');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer select-none ${
                  currentTab === 'contract'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                <span>Contratos & Minutas</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === 'contract' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {/* Submenu Flyout for Contract */}
              {activeDropdown === 'contract' && (
                <div
                  id="dropdown-contract-menu"
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseEnter={() => handleMouseEnter('contract')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Editor & Personalização
                    </span>
                  </div>

                  <button
                    id="submenu-contract-preview"
                    onClick={() => handleSubmenuClick('contract', 'preview')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                        Prévia Dinâmica do Aluno
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Ver contrato renderizado com os dados reais do estudante selecionado.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-contract-editor"
                    onClick={() => handleSubmenuClick('contract', 'editor')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 group-hover:bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Edit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                        Editor de Cláusulas & Tags
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Editar texto padrão, cláusulas contratuais e variáveis dinâmicas.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-contract-school"
                    onClick={() => handleSubmenuClick('contract', 'school')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                        Dados da Escola & Testemunhas
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Qualificação jurídica da mantenedora e testemunhas fixas do contrato.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. MENU: COBRANÇA & ITAÚ */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('itau')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-menu-itau"
                type="button"
                onClick={() => {
                  if (activeDropdown === 'itau') {
                    setActiveDropdown(null);
                  } else {
                    setActiveDropdown('itau');
                  }
                  if (currentTab !== 'itau') onSelectTab('itau');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer select-none ${
                  currentTab === 'itau'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>Cobrança & Itaú</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    currentTab === 'itau'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-amber-100/80 text-amber-900'
                  }`}
                >
                  {paidCount}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === 'itau' ? 'rotate-180 text-amber-600' : ''
                  }`}
                />
              </button>

              {/* Submenu Flyout for Itau / Finance */}
              {activeDropdown === 'itau' && (
                <div
                  id="dropdown-itau-menu"
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseEnter={() => handleMouseEnter('itau')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Gateway Itaú & Regras Financeiras
                    </span>
                  </div>

                  <button
                    id="submenu-itau-hub"
                    onClick={() => handleSubmenuClick('itau')}
                    className="w-full text-left p-2 rounded-xl hover:bg-amber-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                        Painel de Recebíveis Itaú
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Conciliação de PIX, boletos bancários e liquidação em tempo real.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-itau-installments"
                    onClick={() => handleSubmenuClick('settings', 'campaign')}
                    className="w-full text-left p-2 rounded-xl hover:bg-amber-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                        Campanha & Parcelamento Regressivo
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Regras de parcelas (12x a 1x), faixas mensais e descontos por pontualidade.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-itau-status"
                    onClick={() => handleSubmenuClick('itau')}
                    className="w-full text-left p-2 rounded-xl hover:bg-amber-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 flex items-center justify-between">
                        <span>Extrato de Liquidações</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          {paidCount} pagos
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Relatório detalhado de valores compensados e comprovantes emitidos.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. MENU: INTEGRAÇÕES & APIS */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('integrations')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-menu-integrations"
                type="button"
                onClick={() => {
                  if (activeDropdown === 'integrations') {
                    setActiveDropdown(null);
                  } else {
                    setActiveDropdown('integrations');
                  }
                  if (currentTab !== 'autentique' && currentTab !== 'settings') {
                    onSelectTab('autentique');
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer select-none ${
                  currentTab === 'autentique' || currentTab === 'settings'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Integrações & APIs</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    currentTab === 'autentique'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-emerald-100/80 text-emerald-800'
                  }`}
                >
                  {signedCount}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === 'integrations' ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>

              {/* Submenu Flyout for Integrations */}
              {activeDropdown === 'integrations' && (
                <div
                  id="dropdown-integrations-menu"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseEnter={() => handleMouseEnter('integrations')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Conexões & Assinatura Digital
                    </span>
                  </div>

                  <button
                    id="submenu-autentique-hub"
                    onClick={() => handleSubmenuClick('autentique')}
                    className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 flex items-center justify-between">
                        <span>API Autentique (GraphQL)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          {signedCount} assinados
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gestão de envelopes de assinatura, webhooks e logs de auditoria.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-settings-credentials"
                    onClick={() => handleSubmenuClick('settings', 'credentials')}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-100 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                        Credenciais & Chaves de API
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tokens Autentique, Itaú Client ID/Secret e Sandbox.
                      </div>
                    </div>
                  </button>

                  <button
                    id="submenu-settings-diag"
                    onClick={() => handleSubmenuClick('settings')}
                    className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                        Diagnóstico & Webhooks
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Testar comunicação ativa e endpoints de retorno das APIs.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Quick Portal Switcher & Active Student */}
          <div className="flex items-center space-x-2.5">
            {/* Student Simulation Quick Dropdown */}
            <div className="hidden lg:flex items-center text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-slate-400 mr-2 font-medium text-[11px]">Aluno de Teste:</span>
              <select
                id="header-student-select"
                aria-label="Selecionar aluno para simulação"
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const s = students.find((item) => item.id === e.target.value);
                  if (s) onSelectStudent(s);
                }}
                className="bg-transparent text-slate-900 font-bold text-xs py-0.5 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.split(' ')[0]} ({s.ra})
                  </option>
                ))}
              </select>
            </div>

            {/* Portal Action Button (Highlight) */}
            <button
              id="btn-open-parent-portal"
              type="button"
              onClick={() => handleSubmenuClick('portal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-xs cursor-pointer select-none ${
                currentTab === 'portal'
                  ? 'bg-indigo-900 text-white ring-2 ring-indigo-400 ring-offset-2'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal do Responsável</span>
              <span className="sm:hidden">Portal</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 cursor-pointer"
              aria-label="Abrir Menu Mobile"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Expanded Menu Drawer / Accordion */}
        {isMobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            className="md:hidden py-4 border-t border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Student Simulation Picker on Mobile */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Aluno Selecionado para Teste / Simulação:
              </label>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const s = students.find((item) => item.id === e.target.value);
                  if (s) onSelectStudent(s);
                }}
                className="w-full text-xs font-bold text-slate-900 bg-white p-2 border border-slate-200 rounded-lg"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.serie}
                  </option>
                ))}
              </select>
            </div>

            {/* Category 1: Alunos & Planilha */}
            <div className="space-y-1">
              <button
                onClick={() =>
                  setExpandedMobileCategory(
                    expandedMobileCategory === 'students' ? null : 'students'
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Alunos & Planilha ({students.length})</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedMobileCategory === 'students' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedMobileCategory === 'students' && (
                <div className="pl-4 pr-1 py-1 space-y-1">
                  <button
                    onClick={() => handleSubmenuClick('spreadsheet')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tabela Geral de Alunos</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'import')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Importar Excel / CSV</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'new_student')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cadastrar Novo Aluno</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('spreadsheet', undefined, 'batch_send')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Disparo em Lote</span>
                  </button>
                </div>
              )}
            </div>

            {/* Category 2: Contratos & Minutas */}
            <div className="space-y-1">
              <button
                onClick={() =>
                  setExpandedMobileCategory(
                    expandedMobileCategory === 'contract' ? null : 'contract'
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-indigo-600" />
                  <span>Contratos & Minutas</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedMobileCategory === 'contract' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedMobileCategory === 'contract' && (
                <div className="pl-4 pr-1 py-1 space-y-1">
                  <button
                    onClick={() => handleSubmenuClick('contract', 'preview')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Prévia Dinâmica do Aluno</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('contract', 'editor')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-600" />
                    <span>Editor de Cláusulas & Tags</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('contract', 'school')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Building className="w-3.5 h-3.5 text-amber-700" />
                    <span>Dados da Escola & Testemunhas</span>
                  </button>
                </div>
              )}
            </div>

            {/* Category 3: Cobrança & Itaú */}
            <div className="space-y-1">
              <button
                onClick={() =>
                  setExpandedMobileCategory(expandedMobileCategory === 'itau' ? null : 'itau')
                }
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>Cobrança & Itaú ({paidCount} pagos)</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedMobileCategory === 'itau' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedMobileCategory === 'itau' && (
                <div className="pl-4 pr-1 py-1 space-y-1">
                  <button
                    onClick={() => handleSubmenuClick('itau')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 rounded-lg flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                    <span>Painel de Recebíveis Itaú</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('settings', 'campaign')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 rounded-lg flex items-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Campanha & Parcelamento Regressivo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Category 4: Integrações & APIs */}
            <div className="space-y-1">
              <button
                onClick={() =>
                  setExpandedMobileCategory(
                    expandedMobileCategory === 'integrations' ? null : 'integrations'
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Integrações & APIs ({signedCount} assinados)</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedMobileCategory === 'integrations' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedMobileCategory === 'integrations' && (
                <div className="pl-4 pr-1 py-1 space-y-1">
                  <button
                    onClick={() => handleSubmenuClick('autentique')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>API Autentique (Assinaturas)</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('settings', 'credentials')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-700" />
                    <span>Credenciais & Chaves</span>
                  </button>
                  <button
                    onClick={() => handleSubmenuClick('settings')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Diagnóstico & Conexões</span>
                  </button>
                </div>
              )}
            </div>

            {/* Portal Direct CTA in Mobile */}
            <div className="pt-2">
              <button
                onClick={() => handleSubmenuClick('portal')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Abrir Portal do Aluno (Visão do Responsável)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
