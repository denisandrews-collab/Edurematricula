import React, { useState } from 'react';
import { Student, ContractTemplate } from '../types';
import { formatCurrency, formatDateBr, formatCpf, formatPhone } from '../utils/contractFormatter';
import { EditStudentModal } from './EditStudentModal';
import {
  User,
  GraduationCap,
  FileSignature,
  CreditCard,
  History,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  Edit3,
} from 'lucide-react';

interface Props {
  student: Student;
  onClose: () => void;
  onOpenPortal: (student: Student) => void;
  onSendAutentique: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  template: ContractTemplate;
}

export function StudentDetailModal({
  student,
  onClose,
  onOpenPortal,
  onSendAutentique,
  onUpdateStudent,
  template,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  const isSigned =
    student.status === 'assinado' ||
    student.status === 'pagamento_pendente' ||
    student.status === 'pago' ||
    student.status === 'matricula_confirmada';

  const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';

  const handleSaveEdited = (updatedStudent: Student, shouldResendAutentique?: boolean) => {
    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent);
    }
    if (shouldResendAutentique) {
      onSendAutentique(updatedStudent);
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-mono text-slate-400">RA: {student.ra} • Protocolo: {student.protocolNumber || 'REM-2026'}</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{student.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Editar Dados</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Pipeline Status Ribbon */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Status Atual:</span>
            {isPaid ? (
              <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Rematrícula {template.academicYear} Confirmada!
              </span>
            ) : isSigned ? (
              <span className="font-bold text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Contrato Assinado • Aguardando Pagamento Itaú
              </span>
            ) : student.status === 'enviado_autentique' ? (
              <span className="font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Aguardando Assinatura via Autentique
              </span>
            ) : (
              <span className="font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Planilha Importada
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">Valor Rematrícula:</span>
            <span className="font-bold text-slate-900">{formatCurrency(student.finalValue)}</span>
          </div>
        </div>

        {/* Academic & Guardian Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Dados Acadêmicos
            </h4>
            <div>
              <span className="text-slate-500">Série / Ano:</span>
              <div className="font-semibold text-slate-800">{student.serie}</div>
            </div>
            <div>
              <span className="text-slate-500">Turma & Turno:</span>
              <div className="text-slate-800">{student.turma} • {student.shift}</div>
            </div>
            <div>
              <span className="text-slate-500">Vencimento da Rematrícula:</span>
              <div className="text-slate-800 font-medium">{formatDateBr(student.dueDate)}</div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              1º Contratante (Responsável 1)
            </h4>
            <div>
              <span className="text-slate-500">Nome:</span>
              <div className="font-semibold text-slate-800">{student.responsibleName}</div>
            </div>
            <div className="flex justify-between">
              <div>
                <span className="text-slate-500">CPF:</span>
                <div className="text-slate-800 font-mono">{formatCpf(student.responsibleCpf)}</div>
              </div>
              <div>
                <span className="text-slate-500">Telefone:</span>
                <div className="text-slate-800">{formatPhone(student.responsiblePhone)}</div>
              </div>
            </div>
            <div>
              <span className="text-slate-500">E-mail:</span>
              <div className="text-indigo-600 font-medium">{student.responsibleEmail}</div>
            </div>
          </div>

          {student.responsible2Name && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                2º Contratante (Responsável 2 - Solidário)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500">Nome:</span>
                  <div className="font-semibold text-slate-800">{student.responsible2Name}</div>
                </div>
                <div>
                  <span className="text-slate-500">CPF:</span>
                  <div className="text-slate-800 font-mono">{formatCpf(student.responsible2Cpf || '')}</div>
                </div>
                <div>
                  <span className="text-slate-500">E-mail:</span>
                  <div className="text-indigo-600 font-medium">{student.responsible2Email || ''}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail / History Logs */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <History className="w-4 h-4 text-indigo-600" />
            Linha do Tempo / Histórico de Eventos
          </h4>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 max-h-40 overflow-y-auto space-y-2 text-xs">
            {student.historyLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
                <div>
                  <div className="font-bold text-slate-800">
                    {log.action}{' '}
                    <span className="font-normal text-slate-400 font-mono text-[10px]">
                      ({new Date(log.timestamp).toLocaleTimeString('pt-BR')})
                    </span>
                  </div>
                  {log.details && <div className="text-slate-500">{log.details}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div>
            {student.status === 'importado' && (
              <button
                onClick={() => {
                  onSendAutentique(student);
                  onClose();
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar Contrato para Autentique</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                onOpenPortal(student);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir no Portal do Responsável</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Edit Student Modal */}
        {isEditing && (
          <EditStudentModal
            student={student}
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSave={handleSaveEdited}
            onOpenPortal={onOpenPortal}
            template={template}
          />
        )}
      </div>
    </div>
  );
}
