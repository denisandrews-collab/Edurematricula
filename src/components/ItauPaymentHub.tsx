import React, { useState } from 'react';
import { Student, IntegrationSettings } from '../types';
import { apiService } from '../services/apiService';
import { formatCurrency, formatDateBr } from '../utils/contractFormatter';
import {
  CreditCard,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Search,
  Receipt,
  DollarSign,
  Building,
} from 'lucide-react';

interface Props {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onOpenPortal: (student: Student) => void;
  settings: IntegrationSettings;
}

export function ItauPaymentHub({
  students,
  onUpdateStudents,
  onOpenPortal,
  settings,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptStudent, setSelectedReceiptStudent] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Eligible students: contracts signed or already paid
  const signedOrPaidStudents = students.filter(
    (s) =>
      s.status === 'assinado' ||
      s.status === 'pagamento_pendente' ||
      s.status === 'pago' ||
      s.status === 'matricula_confirmada' ||
      s.autentiqueStatus === 'ASSINADO'
  );

  const paidStudents = students.filter(
    (s) => s.status === 'pago' || s.status === 'matricula_confirmada'
  );

  const totalCollected = paidStudents.reduce((acc, curr) => acc + curr.finalValue, 0);
  const totalPending = signedOrPaidStudents
    .filter((s) => s.status !== 'pago' && s.status !== 'matricula_confirmada')
    .reduce((acc, curr) => acc + curr.finalValue, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulatePaymentConfirmation = async (student: Student) => {
    const paymentId = student.itauPaymentId || 'pay_sim_' + student.id;
    await apiService.simulateItauPaymentConfirm(paymentId);

    const updated = students.map((s) => {
      if (s.id === student.id) {
        return {
          ...s,
          status: 'matricula_confirmada' as const,
          itauPaymentStatus: 'PAID' as const,
          itauPaidAt: new Date().toISOString(),
          itauPaymentType: s.itauPaymentType || 'PIX',
          historyLogs: [
            ...s.historyLogs,
            {
              timestamp: new Date().toISOString(),
              action: 'Pagamento Itaú Confirmado (Liquidação Instantânea)',
              details: `Valor de ${formatCurrency(student.finalValue)} liquidado. Rematrícula 2026 100% concluída.`,
            },
          ],
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    showToast(`Pagamento de ${student.name} confirmado pelo Itaú! Rematrícula 2026 oficializada.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-500" />
            Central de Cobranças e Checkout • API Itaú Empresas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recebimento automatizado da rematrícula após a assinatura do contrato via <strong>PIX Dinâmico</strong>, <strong>Boleto Bancário Itaú</strong> ou <strong>Cartão de Crédito/Débito</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            <span>API Itaú Cobrança e Pix v2</span>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs flex items-center justify-between shadow-lg border border-slate-800 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total Liquidado (Itaú)</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{formatCurrency(totalCollected)}</div>
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">{paidStudents.length} matrículas quitadas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Aguardando Pagamento</span>
            <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{formatCurrency(totalPending)}</div>
            <span className="text-[11px] text-slate-400 font-medium">
              {signedOrPaidStudents.length - paidStudents.length} contratos assinados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Formas Habilitadas</span>
            <div className="text-sm font-bold text-slate-900 mt-1">PIX • Boleto • Cartão</div>
            <span className="text-[11px] text-slate-400 font-medium">Desconto de 5% no PIX ativo</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800">
            Fila de Pagamento dos Contratos Assinados ({signedOrPaidStudents.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 font-semibold">Aluno & Matrícula</th>
                <th className="py-3.5 px-4 font-semibold">Responsável Financeiro</th>
                <th className="py-3.5 px-4 font-semibold">Valor Rematrícula</th>
                <th className="py-3.5 px-4 font-semibold">Status no Itaú</th>
                <th className="py-3.5 px-4 text-right font-semibold">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {signedOrPaidStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Nenhum contrato assinado disponível para pagamento no momento.
                  </td>
                </tr>
              ) : (
                signedOrPaidStudents
                  .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((student) => {
                    const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-slate-500 text-[11px]">{student.serie} • {student.ra}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{student.responsibleName}</div>
                          <div className="text-slate-400 text-[11px]">{student.responsibleEmail}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{formatCurrency(student.finalValue)}</div>
                          <div className="text-[10px] text-slate-400">Vencimento: {formatDateBr(student.dueDate)}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Pago ({student.itauPaymentType || 'PIX'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 mr-1 text-amber-600" />
                              Aguardando Pagamento
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPaid ? (
                              <button
                                onClick={() => setSelectedReceiptStudent(student)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Ver Comprovante</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSimulatePaymentConfirmation(student)}
                                title="Simular confirmação de pagamento instantânea no Itaú para teste"
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Confirmar Pagamento</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenPortal(student)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Abrir Checkout</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Receipt Modal */}
      {selectedReceiptStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Comprovante de Rematrícula 2026</h3>
                  <p className="text-xs text-slate-500">Itaú Unibanco S.A. • Liquidação Confirmada</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceiptStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Protocolo de Rematrícula:</span>
                <span className="font-bold text-slate-900 font-mono">{selectedReceiptStudent.protocolNumber || 'REM-2026-001'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aluno:</span>
                <span className="font-bold text-slate-900">{selectedReceiptStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Série / Ano 2026:</span>
                <span className="text-slate-800">{selectedReceiptStudent.serie}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Responsável Financeiro:</span>
                <span className="text-slate-800">{selectedReceiptStudent.responsibleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Pago:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {formatCurrency(selectedReceiptStudent.finalValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-semibold text-slate-800">{selectedReceiptStudent.itauPaymentType || 'PIX'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data da Liquidação:</span>
                <span className="text-slate-700">
                  {selectedReceiptStudent.itauPaidAt
                    ? new Date(selectedReceiptStudent.itauPaidAt).toLocaleString('pt-BR')
                    : '14/08/2026 11:30'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Imprimir Comprovante
              </button>
              <button
                onClick={() => setSelectedReceiptStudent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
