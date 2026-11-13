import React, { useState } from 'react';
import { Student, ContractTemplate, PortalEditablePermissions, IntegrationSettings } from '../types';
import { formatCurrency, formatDateBr, formatCpf, formatPhone } from '../utils/contractFormatter';
import { DEFAULT_PORTAL_PERMISSIONS } from '../data/initialData';
import { EditStudentModal } from './EditStudentModal';
import { formatCnpj, getMatchSourceLabel, resolveCompanyForStudent } from '../utils/companyResolver';
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
  Check,
  Shield,
  Lock,
  Unlock,
  Home,
  Phone,
  Mail,
  UserCheck,
  Building2,
} from 'lucide-react';

interface Props {
  student: Student;
  onClose: () => void;
  onOpenPortal: (student: Student) => void;
  onSendAutentique: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  template: ContractTemplate;
  settings?: IntegrationSettings;
}

export function StudentDetailModal({
  student,
  onClose,
  onOpenPortal,
  onSendAutentique,
  onUpdateStudent,
  template,
  settings,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';

  const hasSecondResp = Boolean(student.responsible2Name && student.responsible2Name.trim().length > 0);
  const isSigner1Ok = student.autentiqueSigner1Status === 'ASSINADO' || isPaid;
  const isSigner2Ok = hasSecondResp ? (student.autentiqueSigner2Status === 'ASSINADO' || isPaid) : true;
  const isFullySigned = (hasSecondResp ? (isSigner1Ok && isSigner2Ok) : isSigner1Ok) ||
    student.status === 'assinado' ||
    student.status === 'pagamento_pendente' ||
    isPaid;
  const isPartiallySigned = hasSecondResp && !isFullySigned && (isSigner1Ok || student.autentiqueSigner2Status === 'ASSINADO');

  const handleSaveEdited = (updatedStudent: Student, shouldResendAutentique?: boolean) => {
    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent);
    }
    if (shouldResendAutentique) {
      onSendAutentique(updatedStudent);
    }
    setIsEditing(false);
  };

  const currentPermissions = student.customPortalPermissions || DEFAULT_PORTAL_PERMISSIONS;

  const handleTogglePermission = (key: keyof PortalEditablePermissions) => {
    if (!onUpdateStudent) return;
    const base = student.customPortalPermissions
      ? { ...student.customPortalPermissions }
      : { ...DEFAULT_PORTAL_PERMISSIONS };
    const updatedPerms: PortalEditablePermissions = {
      ...base,
      [key]: !base[key],
    };
    const updated: Student = {
      ...student,
      customPortalPermissions: updatedPerms,
      historyLogs: [
        ...student.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Permissões de Edição do Portal Alteradas',
          details: `Permissão para "${key}" alterada para ${updatedPerms[key] ? 'Liberado' : 'Bloqueado'} pela secretaria.`,
        },
      ],
    };
    onUpdateStudent(updated);
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
            ) : isFullySigned ? (
              <span className="font-bold text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                {hasSecondResp ? 'Contrato Assinado por Ambos (2 de 2) • Aguardando Pagamento' : 'Contrato Assinado • Aguardando Pagamento Itaú'}
              </span>
            ) : isPartiallySigned ? (
              <span className="font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                1 de 2 Assinados • Aguardando {isSigner1Ok ? student.responsible2Name : student.responsibleName}
              </span>
            ) : student.status === 'enviado_autentique' ? (
              <span className="font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Aguardando Assinatura via Autentique {hasSecondResp ? '(Ambos os Responsáveis)' : ''}
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
            {(() => {
              const { company: billedComp, matchSource } = resolveCompanyForStudent(student, settings);
              return (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    Empresa Cobradora (CNPJ):
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">{billedComp.nomeFantasia}</div>
                  <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                    {formatCnpj(billedComp.cnpj)} · {getMatchSourceLabel(matchSource)}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                1º Contratante (Responsável 1)
              </h4>
              {isSigner1Ok ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300">
                  <Check className="w-2.5 h-2.5" /> Assinado
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                  Pendente
                </span>
              )}
            </div>
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
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  2º Contratante (Responsável 2 - Solidário)
                </h4>
                {isSigner2Ok ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300">
                    <Check className="w-2.5 h-2.5" /> Assinado
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                    Pendente
                  </span>
                )}
              </div>
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

        {/* Portal Data Access Control & Checkboxes */}
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Shield className="w-4 h-4 text-indigo-600" />
              Controle de Acesso: O que o Pai Pode Editar no Portal
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {student.customPortalPermissions ? 'Personalizado para este Aluno' : 'Padrão da Escola'}
            </span>
          </div>

          <p className="text-[11px] text-slate-600">
            Selecione via checkbox quais campos o responsável tem permissão para alterar ao clicar em <em>"Corrigir / Atualizar Meus Dados"</em> no portal:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <label className={`p-2.5 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition ${
              currentPermissions.allowAddress ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-500 opacity-70'
            }`}>
              <div className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                <span className="text-xs">Endereço</span>
              </div>
              <input
                type="checkbox"
                checked={currentPermissions.allowAddress}
                onChange={() => handleTogglePermission('allowAddress')}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className={`p-2.5 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition ${
              currentPermissions.allowEmail ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-500 opacity-70'
            }`}>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-xs">E-mails</span>
              </div>
              <input
                type="checkbox"
                checked={currentPermissions.allowEmail}
                onChange={() => handleTogglePermission('allowEmail')}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className={`p-2.5 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition ${
              currentPermissions.allowPhone ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-500 opacity-70'
            }`}>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs">Telefones</span>
              </div>
              <input
                type="checkbox"
                checked={currentPermissions.allowPhone}
                onChange={() => handleTogglePermission('allowPhone')}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className={`p-2.5 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition ${
              currentPermissions.allowSecondResponsible ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-500 opacity-70'
            }`}>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="text-xs">2º Responsável</span>
              </div>
              <input
                type="checkbox"
                checked={currentPermissions.allowSecondResponsible}
                onChange={() => handleTogglePermission('allowSecondResponsible')}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>
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
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
