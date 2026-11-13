import React, { useState } from 'react';
import { Student, ContractTemplate, StudentStatus, PortalEditablePermissions } from '../types';
import { formatCurrency } from '../utils/contractFormatter';
import { DEFAULT_PORTAL_PERMISSIONS } from '../data/initialData';
import {
  Edit3,
  User,
  GraduationCap,
  CreditCard,
  Send,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  Home,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';

interface Props {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: Student, shouldResendAutentique?: boolean) => void;
  onOpenPortal?: (student: Student) => void;
  template: ContractTemplate;
}

export function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSave,
  onOpenPortal,
  template,
}: Props) {
  const [formData, setFormData] = useState<Student>({ ...student });
  const [hasSecondResponsible, setHasSecondResponsible] = useState<boolean>(
    Boolean(student.responsible2Name && student.responsible2Name.trim().length > 0)
  );
  const [actionReason, setActionReason] = useState<string>('Correção de dados cadastrais / contato');
  const [isResending, setIsResending] = useState<boolean>(false);

  // Portal editable permissions state
  const [useCustomPermissions, setUseCustomPermissions] = useState<boolean>(
    Boolean(student.customPortalPermissions)
  );
  const [portalPermissions, setPortalPermissions] = useState<PortalEditablePermissions>(() => {
    return student.customPortalPermissions
      ? { ...student.customPortalPermissions }
      : { ...DEFAULT_PORTAL_PERMISSIONS };
  });

  if (!isOpen) return null;

  const handleTuitionChange = (val: number) => {
    const tuition = Math.max(0, val);
    const finalVal = Math.max(0, tuition - (formData.discountValue || 0));
    setFormData({
      ...formData,
      tuitionValue: tuition,
      finalValue: finalVal,
    });
  };

  const handleDiscountChange = (val: number) => {
    const discount = Math.max(0, val);
    const finalVal = Math.max(0, (formData.tuitionValue || 0) - discount);
    setFormData({
      ...formData,
      discountValue: discount,
      finalValue: finalVal,
    });
  };

  const handleSaveOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Student = {
      ...formData,
      responsible2Name: hasSecondResponsible ? formData.responsible2Name : undefined,
      responsible2Cpf: hasSecondResponsible ? formData.responsible2Cpf : undefined,
      responsible2Email: hasSecondResponsible ? formData.responsible2Email : undefined,
      responsible2Phone: hasSecondResponsible ? formData.responsible2Phone : undefined,
      responsible2Address: hasSecondResponsible ? formData.responsible2Address : undefined,
      customPortalPermissions: useCustomPermissions ? portalPermissions : undefined,
      historyLogs: [
        ...formData.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Dados Editados & Permissões Atualizadas',
          details: `Cadastro atualizado. Motivo: ${actionReason}.${
            useCustomPermissions
              ? ` Permissões do portal configuradas: ${[
                  portalPermissions.allowAddress ? 'Endereço' : null,
                  portalPermissions.allowEmail ? 'E-mails' : null,
                  portalPermissions.allowPhone ? 'Telefones' : null,
                  portalPermissions.allowSecondResponsible ? '2º Resp' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}.`
              : ' Usando permissões globais padrão da escola.'
          }`,
        },
      ],
    };
    onSave(updated, false);
    onClose();
  };

  const handleSaveAndResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);

    const updated: Student = {
      ...formData,
      responsible2Name: hasSecondResponsible ? formData.responsible2Name : undefined,
      responsible2Cpf: hasSecondResponsible ? formData.responsible2Cpf : undefined,
      responsible2Email: hasSecondResponsible ? formData.responsible2Email : undefined,
      responsible2Phone: hasSecondResponsible ? formData.responsible2Phone : undefined,
      responsible2Address: hasSecondResponsible ? formData.responsible2Address : undefined,
      customPortalPermissions: useCustomPermissions ? portalPermissions : undefined,
      status: 'enviado_autentique',
      autentiqueStatus: 'PENDENTE',
      historyLogs: [
        ...formData.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Dados Editados & Reenvio de Contrato',
          details: `Dados atualizados e novo contrato reenviado para assinatura no Autentique (${formData.responsibleEmail}${
            hasSecondResponsible && formData.responsible2Email ? ` e ${formData.responsible2Email}` : ''
          }). Motivo: ${actionReason}.`,
        },
      ],
    };

    onSave(updated, true);
    setIsResending(false);
    onClose();
  };

  const handleResetToPending = () => {
    const updated: Student = {
      ...formData,
      status: 'importado',
      autentiqueDocId: undefined,
      autentiqueSignUrl: undefined,
      autentiqueStatus: undefined,
      autentiqueSignedAt: undefined,
      itauPaymentStatus: undefined,
      itauPaidAt: undefined,
      historyLogs: [
        ...formData.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Processo Reiniciado',
          details: 'Status retornado para Planilha Importada (Pendente) para novo ciclo.',
        },
      ],
    };
    setFormData(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Editar Dados e Reenviar Rematrícula
              </h2>
              <p className="text-xs text-slate-500">
                Aluno: <span className="font-semibold text-slate-700">{student.name}</span> • RA: {student.ra} • Protocolo: {student.protocolNumber || 'REM-2026'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form className="space-y-5">
          {/* Section 1: Dados do Aluno */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              1. Dados do Aluno (Beneficiário)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo do Aluno *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RA / Matrícula</label>
                <input
                  type="text"
                  value={formData.ra}
                  onChange={(e) => setFormData({ ...formData, ra: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Série / Ano Letivo *</label>
                <input
                  type="text"
                  value={formData.serie}
                  onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Turma</label>
                <input
                  type="text"
                  value={formData.turma}
                  onChange={(e) => setFormData({ ...formData, turma: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Turno</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Integral">Integral</option>
                  <option value="Noturno">Noturno</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: 1º Responsável (Contratante 1) */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
            <div className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-blue-200">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>2. 1º Contratante (Responsável Legal & Financeiro Principal)</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Principal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo do 1º Responsável *</label>
                <input
                  type="text"
                  required
                  value={formData.responsibleName}
                  onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF do 1º Responsável *</label>
                <input
                  type="text"
                  required
                  value={formData.responsibleCpf}
                  onChange={(e) => setFormData({ ...formData, responsibleCpf: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail para Assinatura (Autentique) *
                </label>
                <input
                  type="email"
                  required
                  value={formData.responsibleEmail}
                  onChange={(e) => setFormData({ ...formData, responsibleEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-blue-900"
                  placeholder="email@dominio.com"
                />
                <span className="text-[10px] text-slate-400">Receberá a notificação de assinatura</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.responsiblePhone}
                  onChange={(e) => setFormData({ ...formData, responsiblePhone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grau de Parentesco / Relação</label>
                <input
                  type="text"
                  value={formData.responsibleKinship || ''}
                  onChange={(e) => setFormData({ ...formData, responsibleKinship: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="Ex: Mãe / Pai / Guardião"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Endereço Residencial Completo</label>
                <input
                  type="text"
                  value={formData.responsibleAddress}
                  onChange={(e) => setFormData({ ...formData, responsibleAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 2º Responsável (Contratante 2) */}
          <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-indigo-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSecondResponsible}
                  onChange={(e) => {
                    setHasSecondResponsible(e.target.checked);
                    if (e.target.checked && !formData.responsible2Name) {
                      setFormData({
                        ...formData,
                        responsible2Name: '',
                        responsible2Cpf: '',
                        responsible2Email: '',
                        responsible2Phone: '',
                        responsible2Address: formData.responsibleAddress,
                      });
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="font-bold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  3. 2º Contratante (Responsável Solidário / Conjunto)
                </span>
              </label>
              <span className="text-[10px] text-indigo-600 font-semibold">
                {hasSecondResponsible ? 'Ativo no Contrato' : 'Opcional / Desmarcado'}
              </span>
            </div>

            {hasSecondResponsible ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo do 2º Responsável</label>
                  <input
                    type="text"
                    value={formData.responsible2Name || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ex: Carlos Alberto Souza"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF do 2º Responsável</label>
                  <input
                    type="text"
                    value={formData.responsible2Cpf || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail do 2º Responsável</label>
                  <input
                    type="email"
                    value={formData.responsible2Email || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    placeholder="email2@dominio.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.responsible2Phone || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    placeholder="(11) 97654-3210"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grau de Parentesco</label>
                  <input
                    type="text"
                    value={formData.responsible2Kinship || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Kinship: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    placeholder="Ex: Pai / Padrasto"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Endereço Residencial do 2º Responsável</label>
                  <input
                    type="text"
                    value={formData.responsible2Address || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    placeholder="Mesmo endereço ou outro"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-1">
                Marque a caixa acima se houver um segundo responsável financeiro / pai / mãe para assinar o contrato solidariamente.
              </p>
            )}
          </div>

          {/* Section 4: Financeiro & Vencimento */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              4. Condições Financeiras & Vencimento da Rematrícula
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Valor Bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tuitionValue}
                  onChange={(e) => handleTuitionChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Desconto / Bolsa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Valor Final Líquido (R$)</label>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(formData.finalValue)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Início da Proposta (Opcional)</label>
                <input
                  type="date"
                  value={formData.proposalStartDate || ''}
                  onChange={(e) => setFormData({ ...formData, proposalStartDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="Início da Campanha"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Término da Proposta (Opcional)</label>
                <input
                  type="date"
                  value={formData.proposalEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, proposalEndDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="Fim da Campanha"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Status & Motivo da Alteração */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                5. Controle de Status & Registro de Auditoria
              </div>

              <button
                type="button"
                onClick={handleResetToPending}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetar Status para Pendente</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status do Processo</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="importado">Planilha Importada (Pendente)</option>
                  <option value="contrato_gerado">Contrato Gerado</option>
                  <option value="enviado_autentique">Enviado para Autentique</option>
                  <option value="assinado">Assinado Digitalmente</option>
                  <option value="pagamento_pendente">Aguardando Pagamento Itaú</option>
                  <option value="pago">Pago • Rematrícula Confirmada</option>
                  <option value="matricula_confirmada">Matrícula Confirmada</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo da Edição / Reenvio (Salvo no Histórico)
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Ex: Responsável corrigiu o e-mail / trocou de número / ajuste de bolsa"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Controle de Acesso do Responsável no Portal */}
          <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-indigo-100 gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  6. Controle de Acesso aos Dados no Portal do Responsável
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPermissions(false);
                    setPortalPermissions(DEFAULT_PORTAL_PERMISSIONS);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    !useCustomPermissions
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Regra Geral da Escola
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomPermissions(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    useCustomPermissions
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Personalizar para este Aluno
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Marque abaixo via checkbox quais dados este responsável poderá editar ao clicar em <strong>"Corrigir / Atualizar Meus Dados"</strong> no portal. Os campos desmarcados serão bloqueados com cadeado 🔒 para evitar alterações indevidas.
            </p>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Predefinições Rápidas:</span>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPermissions(true);
                  setPortalPermissions({
                    allowAddress: true,
                    allowPhone: false,
                    allowEmail: false,
                    allowSecondResponsible: false,
                    allowKinship: false,
                    allowStudentAcademic: false,
                  });
                }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition cursor-pointer"
              >
                Só Endereço
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPermissions(true);
                  setPortalPermissions({
                    allowAddress: false,
                    allowPhone: false,
                    allowEmail: true,
                    allowSecondResponsible: false,
                    allowKinship: false,
                    allowStudentAcademic: false,
                  });
                }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition cursor-pointer"
              >
                Só E-mails
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPermissions(true);
                  setPortalPermissions({
                    allowAddress: false,
                    allowPhone: true,
                    allowEmail: false,
                    allowSecondResponsible: false,
                    allowKinship: false,
                    allowStudentAcademic: false,
                  });
                }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition cursor-pointer"
              >
                Só Telefones
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPermissions(true);
                  setPortalPermissions({
                    allowAddress: true,
                    allowPhone: true,
                    allowEmail: true,
                    allowSecondResponsible: true,
                    allowKinship: true,
                    allowStudentAcademic: false,
                  });
                }}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition cursor-pointer"
              >
                Liberar Todos os Dados
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPermissions(true);
                  setPortalPermissions({
                    allowAddress: false,
                    allowPhone: false,
                    allowEmail: false,
                    allowSecondResponsible: false,
                    allowKinship: false,
                    allowStudentAcademic: false,
                  });
                }}
                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-[11px] text-rose-700 font-medium transition cursor-pointer"
              >
                Bloquear Tudo (Leitura)
              </button>
            </div>

            {/* Checkboxes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                portalPermissions.allowAddress ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-75'
              }`}>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-600" />
                  <div>
                    <span className="font-bold text-slate-800">Endereço Residencial</span>
                    <p className="text-[10px] text-slate-500">Rua, número, bairro, CEP e cidade</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={portalPermissions.allowAddress}
                  onChange={(e) => {
                    setUseCustomPermissions(true);
                    setPortalPermissions({ ...portalPermissions, allowAddress: e.target.checked });
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                portalPermissions.allowEmail ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-75'
              }`}>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-600" />
                  <div>
                    <span className="font-bold text-slate-800">E-mails de Contato & Notificação</span>
                    <p className="text-[10px] text-slate-500">Envio de contrato Autentique e avisos</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={portalPermissions.allowEmail}
                  onChange={(e) => {
                    setUseCustomPermissions(true);
                    setPortalPermissions({ ...portalPermissions, allowEmail: e.target.checked });
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                portalPermissions.allowPhone ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-75'
              }`}>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-600" />
                  <div>
                    <span className="font-bold text-slate-800">Telefones & WhatsApp</span>
                    <p className="text-[10px] text-slate-500">Contato direto e envio de avisos</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={portalPermissions.allowPhone}
                  onChange={(e) => {
                    setUseCustomPermissions(true);
                    setPortalPermissions({ ...portalPermissions, allowPhone: e.target.checked });
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                portalPermissions.allowSecondResponsible ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-75'
              }`}>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-600" />
                  <div>
                    <span className="font-bold text-slate-800">Dados do 2º Responsável Solidário</span>
                    <p className="text-[10px] text-slate-500">Nome, CPF e contatos do segundo signatário</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={portalPermissions.allowSecondResponsible}
                  onChange={(e) => {
                    setUseCustomPermissions(true);
                    setPortalPermissions({ ...portalPermissions, allowSecondResponsible: e.target.checked });
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div>
              {onOpenPortal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPortal(formData);
                    onClose();
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Portal do Responsável</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveOnly}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Apenas</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndResend}
                disabled={isResending}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Salvar & Reenviar para Autentique</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
