/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { Student, ContractTemplate, IntegrationSettings } from './types';
import {
  INITIAL_STUDENTS,
  DEFAULT_CONTRACT_TEMPLATE,
  INITIAL_INTEGRATION_SETTINGS,
} from './data/initialData';
import { apiService } from './services/apiService';
import { filterNewEnrollmentsBatch } from './utils/studentValidation';
import { Navbar } from './components/Navbar';
import { StudentSpreadsheetManager } from './components/StudentSpreadsheetManager';
import { CommandPalette, ShortcutsHelpModal, AppTab } from './components/CommandPalette';

// Code-split heavy secondary modules for instant first-paint performance
const ContractTemplateEditor = lazy(() =>
  import('./components/ContractTemplateEditor').then((m) => ({ default: m.ContractTemplateEditor }))
);
const AutentiqueHub = lazy(() =>
  import('./components/AutentiqueHub').then((m) => ({ default: m.AutentiqueHub }))
);
const ItauPaymentHub = lazy(() =>
  import('./components/ItauPaymentHub').then((m) => ({ default: m.ItauPaymentHub }))
);
const SettingsHub = lazy(() =>
  import('./components/SettingsHub').then((m) => ({ default: m.SettingsHub }))
);
const ParentPortal = lazy(() =>
  import('./components/ParentPortal').then((m) => ({ default: m.ParentPortal }))
);
const StudentDetailModal = lazy(() =>
  import('./components/StudentDetailModal').then((m) => ({ default: m.StudentDetailModal }))
);

function ViewLoadingFallback() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-52 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-3.5 w-80 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-36 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
        <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
        <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="h-64 bg-slate-50/70 border border-slate-100 rounded-xl animate-pulse" />
    </div>
  );
}

type SpreadsheetActionType =
  | 'import'
  | 'new_student'
  | 'batch_send'
  | 'reminder'
  | 'export_excel'
  | 'focus_search'
  | null;

export default function App() {
  // Application State
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('edurematricula_students_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_STUDENTS;
  });

  const [contractTemplate, setContractTemplate] = useState<ContractTemplate>(() => {
    try {
      const saved = localStorage.getItem('edurematricula_contract_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_CONTRACT_TEMPLATE;
  });

  const [settings, setSettings] = useState<IntegrationSettings>(() => {
    try {
      const saved = localStorage.getItem('edurematricula_settings_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_INTEGRATION_SETTINGS;
  });

  // Active View Tab and Suboptions
  const [currentTab, setCurrentTab] = useState<AppTab>('spreadsheet');
  const [contractSubTab, setContractSubTab] = useState<'editor' | 'preview' | 'school'>('preview');
  const [spreadsheetAction, setSpreadsheetAction] = useState<SpreadsheetActionType>(null);

  // Single source of truth for selected student (prevents stale copies across views)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => (students[0] || INITIAL_STUDENTS[0]).id
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || students[0] || INITIAL_STUDENTS[0],
    [students, selectedStudentId]
  );
  const setSelectedStudent = (student: Student) => {
    setSelectedStudentId(student.id);
  };

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edurematricula_students_v1', JSON.stringify(students));
    } catch {}
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('edurematricula_contract_v1', JSON.stringify(contractTemplate));
    } catch {}
  }, [contractTemplate]);

  useEffect(() => {
    try {
      localStorage.setItem('edurematricula_settings_v1', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Handle Tab Switch cleanly with suboption support
  const handleSelectTab = (tab: AppTab, subOption?: string) => {
    setCurrentTab(tab);
    if (
      tab === 'contract' &&
      (subOption === 'preview' || subOption === 'editor' || subOption === 'school')
    ) {
      setContractSubTab(subOption);
    }
    if (
      tab === 'spreadsheet' &&
      (subOption === 'import' ||
        subOption === 'new_student' ||
        subOption === 'batch_send' ||
        subOption === 'reminder' ||
        subOption === 'export_excel' ||
        subOption === 'focus_search')
    ) {
      setSpreadsheetAction(subOption);
    }
    try {
      const url = new URL(window.location.href);
      if (tab === 'spreadsheet') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', tab);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // Check URL parameters ONCE on mount for direct portal link simulation (e.g. ?view=portal&studentId=std_01)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const studentIdParam = params.get('studentId');

      if (studentIdParam) {
        const found = students.find((s) => s.id === studentIdParam);
        if (found) {
          setSelectedStudentId(found.id);
        }
      }

      if (
        viewParam &&
        ['spreadsheet', 'contract', 'autentique', 'itau', 'settings', 'portal'].includes(viewParam)
      ) {
        setCurrentTab(viewParam as AppTab);
      }
    } catch {}
  }, []); // Run only once on mount

  // Global Keyboard Shortcuts & Command Palette Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Ctrl+K / Cmd+K -> Toggle Command Palette (works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsShortcutsHelpOpen(false);
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape -> Close active top overlays
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false);
          return;
        }
        if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
          return;
        }
      }

      // Alt + 1..6 -> Instant tab switching
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tabMap: Record<string, AppTab> = {
          '1': 'spreadsheet',
          '2': 'contract',
          '3': 'autentique',
          '4': 'itau',
          '5': 'settings',
          '6': 'portal',
        };
        const nextTab = tabMap[e.key];
        if (nextTab) {
          e.preventDefault();
          handleSelectTab(nextTab);
          return;
        }
      }

      // Single-key shortcuts (only outside inputs and when overlays are closed)
      if (
        isEditable ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        isCommandPaletteOpen ||
        isShortcutsHelpOpen ||
        isDetailModalOpen
      ) {
        return;
      }

      const keyLower = e.key.toLowerCase();

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
      } else if (keyLower === 'n') {
        e.preventDefault();
        handleSelectTab('spreadsheet', 'new_student');
      } else if (keyLower === 'i') {
        e.preventDefault();
        handleSelectTab('spreadsheet', 'import');
      } else if (keyLower === 'l') {
        e.preventDefault();
        handleSelectTab('spreadsheet', 'reminder');
      } else if (keyLower === 'e') {
        e.preventDefault();
        handleSelectTab('spreadsheet', 'export_excel');
      } else if (e.key === '/') {
        e.preventDefault();
        if (currentTab === 'spreadsheet') {
          setSpreadsheetAction('focus_search');
        } else {
          setIsCommandPaletteOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentTab, isCommandPaletteOpen, isShortcutsHelpOpen, isDetailModalOpen]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setGlobalToast({ message, type });
    toastTimerRef.current = setTimeout(() => setGlobalToast(null), 3500);
  };

  // Dispatch individual contract to Autentique
  const handleSendAutentique = async (student: Student) => {
    try {
      const res = await apiService.createAutentiqueDocument(student, contractTemplate, settings);

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === student.id) {
            return {
              ...s,
              status: 'enviado_autentique' as const,
              autentiqueDocId: res.documentId,
              autentiqueSignUrl: res.signUrl,
              autentiqueStatus: 'PENDENTE' as const,
              historyLogs: [
                ...s.historyLogs,
                {
                  timestamp: new Date().toISOString(),
                  action: 'Contrato Gerado e Enviado para Autentique',
                  details: `Documento ${res.documentId} criado e link enviado para ${student.responsibleEmail}.`,
                },
              ],
            };
          }
          return s;
        })
      );

      showToast(`Contrato de ${student.name} enviado para a API Autentique com sucesso!`);
    } catch (e: any) {
      showToast(`Erro ao enviar para Autentique: ${e.message}`, 'error');
    }
  };

  // Concurrent Batch dispatch to Autentique (single network roundtrip)
  const handleBatchSendAutentique = async (targetStudents: Student[]) => {
    if (targetStudents.length === 0) return;

    const batchResults = await apiService.createAutentiqueBatch(
      targetStudents,
      contractTemplate,
      settings
    );
    let successCount = 0;

    setStudents((prev) =>
      prev.map((s) => {
        const res = batchResults[s.id];
        if (!res || !res.success) return s;
        successCount++;
        return {
          ...s,
          status: 'enviado_autentique' as const,
          autentiqueDocId: res.documentId,
          autentiqueSignUrl: res.signUrl,
          autentiqueStatus: 'PENDENTE' as const,
          historyLogs: [
            ...s.historyLogs,
            {
              timestamp: new Date().toISOString(),
              action: 'Contrato Gerado em Lote (API Autentique)',
              details: `Disparado e-mail de assinatura para ${s.responsibleEmail}.`,
            },
          ],
        };
      })
    );

    const dispatchedTotal = Object.values(batchResults).filter((r) => r?.success).length;
    showToast(
      `${dispatchedTotal || successCount} contratos gerados e disparados via API Autentique em lote!`
    );
  };

  // Atualização segura do estado global dos alunos com validação de rematrícula
  const handleUpdateStudents = (updatedOrNewList: Student[]) => {
    if (updatedOrNewList.length > students.length) {
      const existingIds = new Set(students.map((s) => s.id));
      const newlyAddedCandidates = updatedOrNewList.filter((s) => !existingIds.has(s.id));

      const { valid, blocked } = filterNewEnrollmentsBatch(newlyAddedCandidates, students);

      if (blocked.length > 0) {
        showToast(
          `Bloqueio de Rematrícula: ${blocked.length} registro(s) impedido(s) por já possuírem rematrícula em processamento ou concluída.`,
          'error'
        );
        console.warn('Tentativa de criação de rematrícula bloqueada pelo estado global:', blocked);

        if (valid.length > 0) {
          setStudents([...valid, ...students]);
          showToast(
            `${valid.length} nova(s) rematrícula(s) permitida(s) e adicionada(s).`,
            'success'
          );
        }
        return;
      }
    }

    setStudents(updatedOrNewList);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  };

  const handleOpenPortal = (student: Student) => {
    setSelectedStudentId(student.id);
    handleSelectTab('portal');
  };

  const handleSelectStudentFromTable = (student: Student) => {
    setSelectedStudentId(student.id);
    setIsDetailModalOpen(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          students={students}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudent}
          settings={settings}
          onQuickAction={(action) => {
            setSpreadsheetAction(action);
            handleSelectTab('spreadsheet');
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        />

        {/* Animated Global Toast Notification */}
        <AnimatePresence>
          {globalToast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-6 right-6 z-50 max-w-md"
              role="status"
              aria-live="polite"
            >
              <div
                className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 ${
                  globalToast.type === 'error'
                    ? 'bg-rose-950 text-white border-rose-800'
                    : globalToast.type === 'info'
                    ? 'bg-indigo-950 text-white border-indigo-800'
                    : 'bg-slate-900 text-white border-slate-700'
                }`}
              >
                {globalToast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : globalToast.type === 'info' ? (
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="leading-snug">{globalToast.message}</span>
                <button
                  type="button"
                  onClick={() => setGlobalToast(null)}
                  className="text-slate-400 hover:text-white ml-1 p-0.5 rounded-md cursor-pointer transition shrink-0"
                  aria-label="Fechar notificação"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Body with Smooth Animated View Transitions */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentTab === 'spreadsheet' && (
                  <StudentSpreadsheetManager
                    students={students}
                    onUpdateStudents={handleUpdateStudents}
                    onSelectStudent={handleSelectStudentFromTable}
                    onOpenPortal={handleOpenPortal}
                    onSendAutentique={handleSendAutentique}
                    onBatchSendAutentique={handleBatchSendAutentique}
                    template={contractTemplate}
                    settings={settings}
                    onUpdateReminderTemplate={(updatedReminderTemplate) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminderTemplate: updatedReminderTemplate,
                      }))
                    }
                    initialAction={spreadsheetAction}
                    onClearInitialAction={() => setSpreadsheetAction(null)}
                  />
                )}

                {currentTab === 'contract' && (
                  <ContractTemplateEditor
                    template={contractTemplate}
                    onUpdateTemplate={setContractTemplate}
                    students={students}
                    selectedStudent={selectedStudent}
                    onSelectStudent={setSelectedStudent}
                    initialSubTab={contractSubTab}
                  />
                )}

                {currentTab === 'autentique' && (
                  <AutentiqueHub
                    students={students}
                    onUpdateStudents={setStudents}
                    onOpenPortal={handleOpenPortal}
                    template={contractTemplate}
                    settings={settings}
                  />
                )}

                {currentTab === 'itau' && (
                  <ItauPaymentHub
                    students={students}
                    onUpdateStudents={setStudents}
                    onOpenPortal={handleOpenPortal}
                    settings={settings}
                  />
                )}

                {currentTab === 'settings' && (
                  <SettingsHub settings={settings} onUpdateSettings={setSettings} />
                )}

                {currentTab === 'portal' && (
                  <ParentPortal
                    student={selectedStudent}
                    students={students}
                    onSelectStudent={setSelectedStudent}
                    onUpdateStudent={handleUpdateStudent}
                    template={contractTemplate}
                    settings={settings}
                    onBackToAdmin={() => handleSelectTab('spreadsheet')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>

        {/* Student Audit Trail & Quick Detail Modal */}
        <Suspense fallback={null}>
          {isDetailModalOpen && (
            <StudentDetailModal
              student={selectedStudent}
              onClose={() => setIsDetailModalOpen(false)}
              onOpenPortal={handleOpenPortal}
              onSendAutentique={handleSendAutentique}
              onUpdateStudent={handleUpdateStudent}
              template={contractTemplate}
            />
          )}
        </Suspense>

        {/* Global Command Palette (Ctrl+K / Cmd+K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          students={students}
          onNavigate={handleSelectTab}
          onQuickAction={(action) => handleSelectTab('spreadsheet', action)}
          onOpenStudentDetail={handleSelectStudentFromTable}
          onOpenStudentPortal={handleOpenPortal}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        />

        {/* Global Keyboard Shortcuts Help Modal (?) */}
        <ShortcutsHelpModal
          isOpen={isShortcutsHelpOpen}
          onClose={() => setIsShortcutsHelpOpen(false)}
        />

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Sistema Escolar de Rematrícula Automatizada • Ano Letivo 2026</span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="hidden md:inline-flex items-center gap-1.5">
                Atalhos: <kbd className="kbd-chip">⌘K</kbd> Busca · <kbd className="kbd-chip">?</kbd> Comandos
              </span>
              <span>
                Integrado com <strong>API Autentique v2</strong> e <strong>API Itaú / Rede</strong>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
