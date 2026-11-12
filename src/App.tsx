/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, ContractTemplate, IntegrationSettings } from './types';
import {
  INITIAL_STUDENTS,
  DEFAULT_CONTRACT_TEMPLATE,
  INITIAL_INTEGRATION_SETTINGS,
} from './data/initialData';
import { apiService } from './services/apiService';
import { validateNewEnrollment, filterNewEnrollmentsBatch } from './utils/studentValidation';
import { Navbar } from './components/Navbar';
import { StudentSpreadsheetManager } from './components/StudentSpreadsheetManager';
import { ContractTemplateEditor } from './components/ContractTemplateEditor';
import { AutentiqueHub } from './components/AutentiqueHub';
import { ItauPaymentHub } from './components/ItauPaymentHub';
import { SettingsHub } from './components/SettingsHub';
import { ParentPortal } from './components/ParentPortal';
import { StudentDetailModal } from './components/StudentDetailModal';

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
  const [currentTab, setCurrentTab] = useState<
    'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal'
  >('spreadsheet');
  const [contractSubTab, setContractSubTab] = useState<'editor' | 'preview' | 'school'>('preview');
  const [spreadsheetAction, setSpreadsheetAction] = useState<'import' | 'new_student' | 'batch_send' | null>(null);

  // Currently Selected Student for Detail / Preview / Portal
  const [selectedStudent, setSelectedStudent] = useState<Student>(() => students[0] || INITIAL_STUDENTS[0]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

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
  const handleSelectTab = (
    tab: 'spreadsheet' | 'contract' | 'autentique' | 'itau' | 'settings' | 'portal',
    subOption?: string
  ) => {
    setCurrentTab(tab);
    if (tab === 'contract' && (subOption === 'preview' || subOption === 'editor' || subOption === 'school')) {
      setContractSubTab(subOption);
    }
    if (tab === 'spreadsheet' && (subOption === 'import' || subOption === 'new_student' || subOption === 'batch_send')) {
      setSpreadsheetAction(subOption as any);
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
          setSelectedStudent(found);
        }
      }

      if (
        viewParam &&
        ['spreadsheet', 'contract', 'autentique', 'itau', 'settings', 'portal'].includes(viewParam)
      ) {
        setCurrentTab(viewParam as any);
      }
    } catch {}
  }, []); // Run only once on mount

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setGlobalToast({ message, type });
    setTimeout(() => setGlobalToast(null), 3500);
  };

  // Dispatch individual contract to Autentique
  const handleSendAutentique = async (student: Student) => {
    try {
      const res = await apiService.createAutentiqueDocument(student, contractTemplate, settings);

      const updated = students.map((s) => {
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
      });

      setStudents(updated);
      showToast(`Contrato de ${student.name} enviado para a API Autentique com sucesso!`);
    } catch (e: any) {
      showToast(`Erro ao enviar para Autentique: ${e.message}`, 'error');
    }
  };

  // Batch dispatch to Autentique
  const handleBatchSendAutentique = async (targetStudents: Student[]) => {
    let successCount = 0;
    const updated = [...students];

    for (const student of targetStudents) {
      try {
        const res = await apiService.createAutentiqueDocument(student, contractTemplate, settings);
        const idx = updated.findIndex((s) => s.id === student.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            status: 'enviado_autentique',
            autentiqueDocId: res.documentId,
            autentiqueSignUrl: res.signUrl,
            autentiqueStatus: 'PENDENTE',
            historyLogs: [
              ...updated[idx].historyLogs,
              {
                timestamp: new Date().toISOString(),
                action: 'Contrato Gerado em Lote (API Autentique)',
                details: `Disparado e-mail de assinatura para ${student.responsibleEmail}.`,
              },
            ],
          };
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setStudents(updated);
    showToast(`${successCount} contratos gerados e disparados via API Autentique em lote!`);
  };

  // Atualização segura do estado global dos alunos com validação de rematrícula
  const handleUpdateStudents = (updatedOrNewList: Student[]) => {
    // Se a lista aumentou de tamanho, novos alunos estão sendo inseridos (manual, lote ou importação)
    if (updatedOrNewList.length > students.length) {
      const existingIds = new Set(students.map((s) => s.id));
      const newlyAddedCandidates = updatedOrNewList.filter((s) => !existingIds.has(s.id));

      const { valid, blocked } = filterNewEnrollmentsBatch(newlyAddedCandidates, students);

      if (blocked.length > 0) {
        const sampleReason = blocked[0].reason;
        showToast(
          `Bloqueio de Rematrícula: ${blocked.length} registro(s) impedido(s) por já possuírem rematrícula em processamento ou concluída.`,
          'error'
        );
        console.warn('Tentativa de criação de rematrícula bloqueada pelo estado global:', blocked);

        // Se houver alunos válidos sem conflito, mescla apenas os válidos
        if (valid.length > 0) {
          setStudents([...valid, ...students]);
          showToast(`${valid.length} nova(s) rematrícula(s) permitida(s) e adicionada(s).`, 'success');
        }
        return;
      }
    }

    setStudents(updatedOrNewList);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    setSelectedStudent(updatedStudent);
  };

  const handleOpenPortal = (student: Student) => {
    setSelectedStudent(student);
    setCurrentTab('portal');
  };

  const handleSelectStudentFromTable = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  return (
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
          setCurrentTab('spreadsheet');
        }}
      />

      {/* Global Toast Notification */}
      {globalToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              globalToast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <span>{globalToast.message}</span>
            <button onClick={() => setGlobalToast(null)} className="text-slate-400 hover:text-white ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'spreadsheet' && (
          <StudentSpreadsheetManager
            students={students}
            onUpdateStudents={handleUpdateStudents}
            onSelectStudent={handleSelectStudentFromTable}
            onOpenPortal={handleOpenPortal}
            onSendAutentique={handleSendAutentique}
            onBatchSendAutentique={handleBatchSendAutentique}
            template={contractTemplate}
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
            onBackToAdmin={() => setCurrentTab('spreadsheet')}
          />
        )}
      </main>

      {/* Student Audit Trail & Quick Detail Modal */}
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistema Escolar de Rematrícula Automatizada • Ano Letivo 2026</span>
          <span className="text-[11px] text-slate-400">
            Integrado com <strong>API Autentique v2 GraphQL</strong> (Assinaturas) e <strong>API Itaú Cobrança</strong> (PIX, Boleto e Cartão)
          </span>
        </div>
      </footer>
    </div>
  );
}
