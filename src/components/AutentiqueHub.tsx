import React, { useState } from 'react';
import { Student, ContractTemplate, IntegrationSettings } from '../types';
import { apiService } from '../services/apiService';
import { formatCpf, formatDateBr } from '../utils/contractFormatter';
import { EditStudentModal } from './EditStudentModal';
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  FileCheck,
  AlertCircle,
  Sparkles,
  Search,
  Key,
  Edit3,
} from 'lucide-react';

interface Props {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onOpenPortal: (student: Student) => void;
  template: ContractTemplate;
  settings: IntegrationSettings;
}

export function AutentiqueHub({
  students,
  onUpdateStudents,
  onOpenPortal,
  template,
  settings,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocForCert, setSelectedDocForCert] = useState<Student | null>(null);
  const [editingStudentForResend, setEditingStudentForResend] = useState<Student | null>(null);
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const autentiqueStudents = students.filter(
    (s) => s.status !== 'importado' || s.autentiqueDocId
  );

  const pendingCount = autentiqueStudents.filter((s) => s.status === 'enviado_autentique' || s.autentiqueStatus === 'PENDENTE').length;
  const signedCount = autentiqueStudents.filter(
    (s) => s.status === 'assinado' || s.status === 'pagamento_pendente' || s.status === 'pago' || s.status === 'matricula_confirmada'
  ).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSimulateSign = async (student: Student) => {
    setLoadingStudentId(student.id);
    try {
      const docId = student.autentiqueDocId || 'autq_' + student.id;
      const res = await apiService.signAutentiqueDoc(docId, student.responsibleName);

      const updated: Student[] = students.map((s) => {
        if (s.id === student.id) {
          const nextStatus: Student['status'] =
            s.status === 'pago' || s.status === 'matricula_confirmada' ? s.status : 'assinado';
          return {
            ...s,
            status: nextStatus,
            autentiqueStatus: 'ASSINADO' as const,
            autentiqueSignedAt: res.signedAt || new Date().toISOString(),
            autentiqueSignerIp: res.certificate?.ip || '177.18.241.109',
            autentiqueCertHash: res.certificate?.authHash || 'sha256_mock_' + Math.random().toString(36).substring(2),
            historyLogs: [
              ...s.historyLogs,
              {
                timestamp: new Date().toISOString(),
                action: 'Assinatura Eletrônica Autentique Confirmada',
                details: `Assinado por ${student.responsibleName} via API Autentique. Liberado para pagamento Itaú.`,
              },
            ],
          };
        }
        return s;
      });

      onUpdateStudents(updated);
      showToast(`Contrato de ${student.name} assinado com sucesso via Autentique! Próximo passo: Pagamento Itaú.`);
    } catch (e: any) {
      showToast('Erro ao assinar: ' + e.message);
    } finally {
      setLoadingStudentId(null);
    }
  };

  const handleCopyLink = (student: Student) => {
    const url = `${window.location.origin}${window.location.pathname}?view=portal&studentId=${student.id}`;
    navigator.clipboard.writeText(url);
    showToast(`Link de assinatura e rematrícula copiado para ${student.name}!`);
  };

  const handleSaveEdited = async (updatedStudent: Student, shouldResendAutentique?: boolean) => {
    const updated = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    onUpdateStudents(updated);
    setEditingStudentForResend(null);

    if (shouldResendAutentique) {
      showToast(`Reenviando contrato atualizado de ${updatedStudent.name} para ${updatedStudent.responsibleEmail}...`);
      try {
        const res = await apiService.createAutentiqueDocument(updatedStudent, template, settings);

        const refreshed = updated.map((s) =>
          s.id === updatedStudent.id
            ? {
                ...s,
                status: 'enviado_autentique' as const,
                autentiqueDocId: res.documentId,
                autentiqueSignUrl: res.signUrl,
                autentiqueStatus: 'PENDENTE' as const,
                autentiqueSignedAt: undefined,
              }
            : s
        );
        onUpdateStudents(refreshed);
        showToast(`Novo contrato gerado e reenviado via Autentique com sucesso para ${updatedStudent.name}!`);
      } catch (err: any) {
        showToast('Erro ao reenviar via Autentique: ' + err.message);
      }
    } else {
      showToast(`Dados de ${updatedStudent.name} atualizados com sucesso!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Central de Assinaturas Digitais • API Autentique
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Geração de documentos dinâmicos e disparo de links de assinatura com validade jurídica (MP nº 2.200-2/2001 e Lei 14.063/2020).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>API Autentique v2 GraphQL Conectada</span>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs flex items-center justify-between shadow-lg border border-slate-800 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Contratos Disparados</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{autentiqueStudents.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Aguardando Assinatura</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Assinados Digitalmente</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{signedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800">
            Documentos Registrados no Autentique ({autentiqueStudents.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por aluno ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 font-semibold">Aluno & Série</th>
                <th className="py-3.5 px-4 font-semibold">Signatário (Responsável)</th>
                <th className="py-3.5 px-4 font-semibold">Identificador Autentique</th>
                <th className="py-3.5 px-4 font-semibold">Status da Assinatura</th>
                <th className="py-3.5 px-4 text-right font-semibold">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {autentiqueStudents
                .filter(
                  (s) =>
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.responsibleName.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((student) => {
                  const isSigned =
                    student.status === 'assinado' ||
                    student.status === 'pagamento_pendente' ||
                    student.status === 'pago' ||
                    student.status === 'matricula_confirmada';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-slate-500 text-[11px]">{student.serie}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{student.responsibleName}</div>
                        <div className="text-slate-400 text-[11px]">
                          CPF: {formatCpf(student.responsibleCpf)} • {student.responsibleEmail}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {student.autentiqueDocId || 'autq_' + student.id}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSigned ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Assinado com Certificado
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {student.autentiqueSignedAt
                                ? new Date(student.autentiqueSignedAt).toLocaleString('pt-BR')
                                : 'Assinado'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />
                            Pendente de Assinatura
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSigned ? (
                            <button
                              onClick={() => setSelectedDocForCert(student)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ver Certificado</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSimulateSign(student)}
                              disabled={loadingStudentId === student.id}
                              title="Simular assinatura instantânea via API Autentique para testar o fluxo"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Simular Assinatura</span>
                            </button>
                          )}

                          <button
                            onClick={() => setEditingStudentForResend(student)}
                            title="Editar dados cadastrais e reenviar contrato"
                            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCopyLink(student)}
                            title="Copiar Link para envio WhatsApp/Email"
                            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenPortal(student)}
                            title="Abrir no Portal do Responsável"
                            className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit & Resend Modal */}
      {editingStudentForResend && (
        <EditStudentModal
          student={editingStudentForResend}
          isOpen={Boolean(editingStudentForResend)}
          onClose={() => setEditingStudentForResend(null)}
          onSave={handleSaveEdited}
          onOpenPortal={onOpenPortal}
          template={template}
        />
      )}

      {/* Certificate Viewer Modal */}
      {selectedDocForCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Certificado de Autenticação Digital</h3>
                  <p className="text-xs text-slate-500">API Autentique • Validade Jurídica MP nº 2.200-2/2001</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForCert(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Documento:</span>
                <span className="font-semibold text-slate-800">
                  Contrato de Rematrícula 2026 - {selectedDocForCert.name}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Signatário:</span>
                <span className="font-semibold text-slate-800">
                  {selectedDocForCert.responsibleName} (CPF: {formatCpf(selectedDocForCert.responsibleCpf)})
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Data e Hora da Assinatura:</span>
                <span className="font-semibold text-slate-800">
                  {selectedDocForCert.autentiqueSignedAt
                    ? new Date(selectedDocForCert.autentiqueSignedAt).toLocaleString('pt-BR')
                    : '14/08/2026 10:30:00'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Endereço IP do Signatário:</span>
                <span className="font-mono text-slate-700">
                  {selectedDocForCert.autentiqueSignerIp || '177.18.241.109 (Brasil)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hash Criptográfico SHA-256:</span>
                <span className="font-mono text-[10px] text-indigo-700 break-all bg-white p-2 rounded-xl border border-slate-200 block">
                  {selectedDocForCert.autentiqueCertHash ||
                    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedDocForCert(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Fechar Certificado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
