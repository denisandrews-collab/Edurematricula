import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Student } from '../types';
import {
  Search,
  FileSpreadsheet,
  FileSignature,
  ShieldCheck,
  CreditCard,
  Settings,
  UserCheck,
  Upload,
  Plus,
  BellRing,
  Download,
  Keyboard,
  ArrowRight,
  ExternalLink,
  X,
  CornerDownLeft,
} from 'lucide-react';

export type AppTab = 'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal';

interface CommandItem {
  id: string;
  group: 'Navegação' | 'Ações Rápidas' | 'Alunos';
  title: string;
  subtitle: string;
  shortcut?: string[];
  icon: React.ReactNode;
  onExecute: () => void;
  secondaryActionLabel?: string;
  onSecondaryExecute?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onNavigate: (tab: AppTab, subOption?: string) => void;
  onQuickAction: (action: 'import' | 'new_student' | 'batch_send' | 'reminder' | 'export_excel') => void;
  onOpenStudentDetail: (student: Student) => void;
  onOpenStudentPortal: (student: Student) => void;
  onOpenShortcutsHelp: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  students,
  onNavigate,
  onQuickAction,
  onOpenStudentDetail,
  onOpenStudentPortal,
  onOpenShortcutsHelp,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    const navItems: CommandItem[] = [
      {
        id: 'nav-spreadsheet',
        group: 'Navegação',
        title: 'Alunos & Planilha',
        subtitle: 'Painel executivo, importação e gestão de rematrículas',
        shortcut: ['Alt', '1'],
        icon: <FileSpreadsheet className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onNavigate('spreadsheet');
          onClose();
        },
      },
      {
        id: 'nav-contract',
        group: 'Navegação',
        title: 'Contratos & Minutas',
        subtitle: 'Prévia jurídica, editor de cláusulas e dados da escola',
        shortcut: ['Alt', '2'],
        icon: <FileSignature className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onNavigate('contract');
          onClose();
        },
      },
      {
        id: 'nav-autentique',
        group: 'Navegação',
        title: 'Central Autentique',
        subtitle: 'Assinaturas eletrônicas, certificados e envelopes',
        shortcut: ['Alt', '3'],
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
        onExecute: () => {
          onNavigate('autentique');
          onClose();
        },
      },
      {
        id: 'nav-itau',
        group: 'Navegação',
        title: 'Cobrança & Itaú',
        subtitle: 'Recebíveis, PIX, boleto e liquidação de rematrículas',
        shortcut: ['Alt', '4'],
        icon: <CreditCard className="w-4 h-4 text-amber-600" />,
        onExecute: () => {
          onNavigate('itau');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        group: 'Navegação',
        title: 'Configurações & APIs',
        subtitle: 'Credenciais, permissões do portal e campanha regressiva',
        shortcut: ['Alt', '5'],
        icon: <Settings className="w-4 h-4 text-slate-600" />,
        onExecute: () => {
          onNavigate('settings');
          onClose();
        },
      },
      {
        id: 'nav-portal',
        group: 'Navegação',
        title: 'Portal do Responsável',
        subtitle: 'Visualizar experiência completa dos pais (4 etapas)',
        shortcut: ['Alt', '6'],
        icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onNavigate('portal');
          onClose();
        },
      },
    ];

    const actionItems: CommandItem[] = [
      {
        id: 'act-new-student',
        group: 'Ações Rápidas',
        title: 'Cadastrar Novo Aluno',
        subtitle: 'Abrir formulário de matrícula manual com validação de CPF/RA',
        shortcut: ['N'],
        icon: <Plus className="w-4 h-4 text-slate-700" />,
        onExecute: () => {
          onQuickAction('new_student');
          onClose();
        },
      },
      {
        id: 'act-import',
        group: 'Ações Rápidas',
        title: 'Importar Planilha Excel / CSV',
        subtitle: 'Carregar arquivo .xlsx, .xls ou CSV em lote',
        shortcut: ['I'],
        icon: <Upload className="w-4 h-4 text-emerald-600" />,
        onExecute: () => {
          onQuickAction('import');
          onClose();
        },
      },
      {
        id: 'act-reminder',
        group: 'Ações Rápidas',
        title: 'Enviar Lembrete de Rematrícula',
        subtitle: 'Disparar e-mail automático com link direto do portal',
        shortcut: ['L'],
        icon: <BellRing className="w-4 h-4 text-amber-600" />,
        onExecute: () => {
          onQuickAction('reminder');
          onClose();
        },
      },
      {
        id: 'act-export',
        group: 'Ações Rápidas',
        title: 'Exportar Planilha Excel (.xlsx)',
        subtitle: 'Gerar arquivo completo com 1º e 2º responsáveis e status',
        shortcut: ['E'],
        icon: <Download className="w-4 h-4 text-emerald-600" />,
        onExecute: () => {
          onQuickAction('export_excel');
          onClose();
        },
      },
      {
        id: 'act-shortcuts',
        group: 'Ações Rápidas',
        title: 'Ver Guia de Atalhos Globais',
        subtitle: 'Listar todos os comandos rápidos de teclado',
        shortcut: ['?'],
        icon: <Keyboard className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onClose();
          onOpenShortcutsHelp();
        },
      },
    ];

    const matchingStudents: CommandItem[] = students
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.ra.toLowerCase().includes(q) ||
          s.responsibleName.toLowerCase().includes(q) ||
          s.responsibleCpf.includes(q) ||
          s.serie.toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 8 : 4)
      .map((s) => ({
        id: `student-${s.id}`,
        group: 'Alunos',
        title: s.name,
        subtitle: `${s.ra} · ${s.serie} · Resp.: ${s.responsibleName}`,
        icon: (
          <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[10px] font-bold flex items-center justify-center">
            {s.name.slice(0, 2).toUpperCase()}
          </span>
        ),
        onExecute: () => {
          onOpenStudentDetail(s);
          onClose();
        },
        secondaryActionLabel: 'Portal',
        onSecondaryExecute: () => {
          onOpenStudentPortal(s);
          onClose();
        },
      }));

    const all = [...matchingStudents, ...actionItems, ...navItems];
    if (!q) return [...actionItems, ...navItems, ...matchingStudents];

    return all.filter(
      (item) =>
        item.group === 'Alunos' ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [query, students, onNavigate, onClose, onQuickAction, onOpenStudentDetail, onOpenStudentPortal, onOpenShortcutsHelp]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        e.preventDefault();
        if (e.shiftKey && items[selectedIndex].onSecondaryExecute) {
          items[selectedIndex].onSecondaryExecute!();
        } else {
          items[selectedIndex].onExecute();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, items, selectedIndex, onClose]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    items.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [items]);

  let flatIndexCounter = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/45 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Paleta de Comandos Rápidos"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar aluno (nome, RA, CPF), tela ou ação rápida..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={onClose}
                className="kbd-chip cursor-pointer hover:bg-slate-200 transition"
                title="Fechar (Esc)"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[56vh] overflow-y-auto p-2 space-y-3">
              {items.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Nenhum comando ou aluno encontrado para "{query}".
                </div>
              ) : (
                (Object.entries(grouped) as [string, CommandItem[]][]).map(([groupName, groupItems]) => (
                  <div key={groupName}>
                    <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                      {groupName}
                    </div>
                    <div className="space-y-0.5">
                      {groupItems.map((item) => {
                        const idx = flatIndexCounter++;
                        const isActive = idx === selectedIndex;
                        return (
                          <div
                            key={item.id}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            onClick={item.onExecute}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-indigo-50/90 text-slate-900'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0">
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {item.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.onSecondaryExecute && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    item.onSecondaryExecute!();
                                  }}
                                  className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-indigo-700 hover:bg-indigo-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
                                  title="Abrir direto no Portal do Responsável (Shift+Enter)"
                                >
                                  <span>{item.secondaryActionLabel}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                              {item.shortcut && (
                                <div className="flex items-center gap-1">
                                  {item.shortcut.map((k) => (
                                    <kbd key={k} className="kbd-chip">
                                      {k}
                                    </kbd>
                                  ))}
                                </div>
                              )}
                              {isActive && !item.shortcut && (
                                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="kbd-chip">↑↓</kbd> navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd-chip">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </kbd>{' '}
                  abrir
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="kbd-chip">Shift+↵</kbd> portal do aluno
                </span>
              </div>
              <span className="tabular-nums font-medium">{items.length} resultados</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  const sections = [
    {
      title: 'Navegação Global',
      items: [
        { label: 'Abrir Paleta de Comandos / Busca Rápida', keys: ['Ctrl / ⌘', 'K'] },
        { label: 'Alunos & Planilha', keys: ['Alt', '1'] },
        { label: 'Contratos & Minutas', keys: ['Alt', '2'] },
        { label: 'Central Autentique', keys: ['Alt', '3'] },
        { label: 'Cobrança & Itaú', keys: ['Alt', '4'] },
        { label: 'Configurações & APIs', keys: ['Alt', '5'] },
        { label: 'Portal do Responsável', keys: ['Alt', '6'] },
      ],
    },
    {
      title: 'Ações na Planilha e Atendimento',
      items: [
        { label: 'Cadastrar Novo Aluno', keys: ['N'] },
        { label: 'Importar Planilha Excel / CSV', keys: ['I'] },
        { label: 'Abrir Lembrete de Rematrícula', keys: ['L'] },
        { label: 'Exportar Planilha Excel (.xlsx)', keys: ['E'] },
        { label: 'Focar Busca de Alunos', keys: ['/'] },
        { label: 'Abrir Guia de Atalhos', keys: ['?'] },
        { label: 'Fechar Modal / Painel Ativo', keys: ['Esc'] },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Atalhos Globais do Teclado"
          >
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Atalhos Globais de Teclado</h2>
                  <p className="text-[11px] text-slate-500">Agilidade operacional sem tirar as mãos do teclado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {sections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">{section.title}</h3>
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                    {section.items.map((shortcut) => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-white text-xs"
                      >
                        <span className="text-slate-700 font-medium">{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((k) => (
                            <kbd key={k} className="kbd-chip">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
