import React, { useState } from 'react';
import { Student, PortalEditablePermissions } from '../types';
import { formatCpf, formatPhone } from '../utils/contractFormatter';
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  User,
  Home,
  Phone,
  Mail,
  GraduationCap,
  Save,
  X,
  Info,
} from 'lucide-react';

interface Props {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Student) => void;
  permissions: PortalEditablePermissions;
}

export function ParentDataCorrectionModal({
  student,
  isOpen,
  onClose,
  onSave,
  permissions,
}: Props) {
  const [formData, setFormData] = useState<Student>({ ...student });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Preserve non-permitted fields from original student state to guarantee security
    const sanitized: Student = {
      ...student,
      // Address
      responsibleAddress: permissions.allowAddress
        ? formData.responsibleAddress
        : student.responsibleAddress,
      responsible2Address: permissions.allowAddress
        ? formData.responsible2Address
        : student.responsible2Address,
      // Phone
      responsiblePhone: permissions.allowPhone
        ? formData.responsiblePhone
        : student.responsiblePhone,
      responsible2Phone: permissions.allowPhone
        ? formData.responsible2Phone
        : student.responsible2Phone,
      // Email
      responsibleEmail: permissions.allowEmail
        ? formData.responsibleEmail
        : student.responsibleEmail,
      responsible2Email: permissions.allowEmail
        ? formData.responsible2Email
        : student.responsible2Email,
      // Second Responsible
      responsible2Name: permissions.allowSecondResponsible
        ? formData.responsible2Name
        : student.responsible2Name,
      responsible2Cpf: permissions.allowSecondResponsible
        ? formData.responsible2Cpf
        : student.responsible2Cpf,
      responsible2Kinship: permissions.allowKinship || permissions.allowSecondResponsible
        ? formData.responsible2Kinship
        : student.responsible2Kinship,
      // Kinship 1
      responsibleKinship: permissions.allowKinship
        ? formData.responsibleKinship
        : student.responsibleKinship,
      // Student Academic
      name: permissions.allowStudentAcademic ? formData.name : student.name,
      ra: student.ra, // never allow parent to change academic RA
      serie: permissions.allowStudentAcademic ? formData.serie : student.serie,
      turma: permissions.allowStudentAcademic ? formData.turma : student.turma,
      shift: permissions.allowStudentAcademic ? formData.shift : student.shift,
      // History log
      historyLogs: [
        ...student.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: 'Atualização Cadastral pelo Responsável no Portal',
          details: `Dados atualizados conforme permissões concedidas pela escola: ${[
            permissions.allowAddress ? 'Endereço' : null,
            permissions.allowPhone ? 'Telefones' : null,
            permissions.allowEmail ? 'E-mails' : null,
            permissions.allowSecondResponsible ? '2º Responsável' : null,
          ]
            .filter(Boolean)
            .join(', ')}.`,
        },
      ],
    };

    onSave(sanitized);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Atualização de Dados do Responsável</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800">
                  Portal Seguro
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Aluno: <strong className="text-slate-800">{student.name}</strong> • Matrícula (RA):{' '}
                <span className="font-mono">{student.ra}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Policy Information Banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Política de Segurança Cadastral da Escola:</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-600">
            Para garantir a segurança jurídica do contrato de rematrícula, a instituição de ensino define
            quais campos podem ser alterados pelo responsável. Campos com o símbolo de cadeado (🔒) são
            protegidos e não podem ser alterados pelo portal.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                permissions.allowAddress
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {permissions.allowAddress ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Endereço: {permissions.allowAddress ? 'Liberado' : 'Bloqueado'}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                permissions.allowPhone
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {permissions.allowPhone ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Telefones: {permissions.allowPhone ? 'Liberado' : 'Bloqueado'}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                permissions.allowEmail
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {permissions.allowEmail ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              E-mails: {permissions.allowEmail ? 'Liberado' : 'Bloqueado'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-slate-200 text-slate-600">
              <Lock className="w-3 h-3" />
              Dados Acadêmicos: Bloqueado
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-slate-200 text-slate-600">
              <Lock className="w-3 h-3" />
              Valores / Descontos: Bloqueado
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dados cadastrais atualizados com sucesso no sistema da escola!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* SECTION 1: ENDEREÇO RESIDENCIAL */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Endereço Residencial (Contratante 1)
                </h3>
              </div>
              {permissions.allowAddress ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Editável pelo responsável
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado pela escola
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço Completo (Rua, Número, Bairro, CEP, Cidade - UF)
              </label>
              <input
                type="text"
                disabled={!permissions.allowAddress}
                value={formData.responsibleAddress}
                onChange={(e) => setFormData({ ...formData, responsibleAddress: e.target.value })}
                placeholder="Ex: Av. Paulista, 1200, Apto 42 - Bela Vista, São Paulo - SP"
                className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                  permissions.allowAddress
                    ? 'border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                    : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              />
              {!permissions.allowAddress && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Para alterar o endereço residencial cadastrado, solicite à secretaria do colégio.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: TELEFONES & WHATSAPP */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Telefones de Contato & WhatsApp
                </h3>
              </div>
              {permissions.allowPhone ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Editável pelo responsável
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado pela escola
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Celular (1º Responsável)
                </label>
                <input
                  type="text"
                  disabled={!permissions.allowPhone}
                  value={formData.responsiblePhone}
                  onChange={(e) => setFormData({ ...formData, responsiblePhone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                    permissions.allowPhone
                      ? 'border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                      : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              {formData.responsible2Name && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Celular (2º Responsável)
                  </label>
                  <input
                    type="text"
                    disabled={!permissions.allowPhone}
                    value={formData.responsible2Phone || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                      permissions.allowPhone
                        ? 'border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                        : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: E-MAILS DE CONTATO & ASSINATURA */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. E-mails (Notificações & Envio Autentique)
                </h3>
              </div>
              {permissions.allowEmail ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Editável pelo responsável
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado pela escola
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do 1º Responsável (Titular)
                </label>
                <input
                  type="email"
                  disabled={!permissions.allowEmail}
                  value={formData.responsibleEmail}
                  onChange={(e) => setFormData({ ...formData, responsibleEmail: e.target.value })}
                  placeholder="responsavel@email.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                    permissions.allowEmail
                      ? 'border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                      : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>

              {formData.responsible2Name && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail do 2º Responsável (Solidário)
                  </label>
                  <input
                    type="email"
                    disabled={!permissions.allowEmail}
                    value={formData.responsible2Email || ''}
                    onChange={(e) => setFormData({ ...formData, responsible2Email: e.target.value })}
                    placeholder="segundo.responsavel@email.com"
                    className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                      permissions.allowEmail
                        ? 'border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                        : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: DADOS CONTRATUAIS BLOQUEADOS (ALUNO, CPF, VALORES) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span>4. Dados Acadêmicos, Fiscais & Financeiros (Protegidos)</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3" /> Bloqueio Institucional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Nome do Aluno</label>
                <input
                  type="text"
                  disabled
                  value={student.name}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Matrícula (RA)</label>
                <input
                  type="text"
                  disabled
                  value={student.ra}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-500 mb-1">CPF do Responsável 1</label>
                <input
                  type="text"
                  disabled
                  value={formatCpf(student.responsibleCpf)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Para alterar o nome do estudante, série, turma, CPF ou plano financeiro, entre em
                contato com a Secretaria Acadêmica pelo telefone <strong>(11) 3456-7890</strong> ou
                e-mail <strong>secretaria@colegiomodeloalpha.com.br</strong>.
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações Permitidas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
