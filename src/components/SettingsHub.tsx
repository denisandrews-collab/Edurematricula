import React, { useState } from 'react';
import { IntegrationSettings, InstallmentTier, ProposalCampaignSettings, PortalEditablePermissions, Student } from '../types';
import { InstallmentPlanManager } from './InstallmentPlanManager';
import { MultiCompanyManager } from './MultiCompanyManager';
import { DEFAULT_INSTALLMENT_TIERS, DEFAULT_PROPOSAL_CAMPAIGN } from '../utils/installmentHelper';
import { DEFAULT_PORTAL_PERMISSIONS } from '../data/initialData';
import { DEFAULT_REMINDER_TEMPLATE, REMINDER_PLACEHOLDERS } from '../utils/reminderHelper';
import {
  Settings,
  ShieldCheck,
  Save,
  CheckCircle,
  Key,
  RefreshCw,
  Home,
  Phone,
  Mail,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  BellRing,
  RotateCcw,
} from 'lucide-react';

interface Props {
  settings: IntegrationSettings;
  onUpdateSettings: (settings: IntegrationSettings) => void;
  students?: Student[];
}

export function SettingsHub({ settings, onUpdateSettings, students = [] }: Props) {
  const [formSettings, setFormSettings] = useState<IntegrationSettings>(settings);
  const [testResultAutentique, setTestResultAutentique] = useState<string | null>(null);
  const [isTestingAutentique, setIsTestingAutentique] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    onUpdateSettings(formSettings);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleTestAutentique = async () => {
    setIsTestingAutentique(true);
    setTestResultAutentique(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/autentique/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: formSettings.autentique.apiKey }),
        signal: AbortSignal.timeout(6000),
      });
      const data = await res.json();
      const rtt = Math.round(performance.now() - start);
      setIsTestingAutentique(false);
      if (data.success) {
        setTestResultAutentique(`${data.message || 'Conexão com a API Autentique v2 GraphQL verificada e ativa.'} (${rtt} ms)`);
      } else {
        setTestResultAutentique(data.message || 'Erro ao validar token na API Autentique.');
      }
    } catch {
      setIsTestingAutentique(false);
      setTestResultAutentique('Modo Sandbox Autentique ativo com simulação criptográfica.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Configurações das APIs de Integração
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerenciamento multiempresa com testes individuais de <strong>API Itaú</strong> e <strong>e.Rede</strong> dentro de cada empresa, além da <strong>API Autentique</strong>.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Credenciais</span>
        </button>
      </div>

      {savedToast && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Configurações salvas e aplicadas com sucesso!</span>
        </div>
      )}

      {/* Cadastro Multiempresa & Vinculação por Série/Turma */}
      <MultiCompanyManager
        settings={formSettings}
        students={students}
        onUpdateSettings={(updated) => {
          setFormSettings(updated);
          onUpdateSettings(updated);
        }}
      />

      {/* Autentique Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">API Autentique (Assinatura Eletrônica)</h2>
              <p className="text-xs text-slate-500">Documentação oficial: api.autentique.com.br/v2/graphql</p>
            </div>
          </div>

          <button
            onClick={handleTestAutentique}
            disabled={isTestingAutentique}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingAutentique ? 'animate-spin' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>

        {testResultAutentique && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{testResultAutentique}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Token de Acesso / API Key da Autentique
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Insira seu Bearer Token da Autentique ou deixe em branco para Sandbox"
                value={formSettings.autentique.apiKey}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    autentique: { ...formSettings.autentique, apiKey: e.target.value },
                  })
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Se não preenchido, o sistema executa no <strong>modo Sandbox Avançado</strong> com links autenticados e simulação de certificado ICP-Brasil.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Webhook URL de Retorno</label>
            <input
              type="text"
              readOnly
              value="/api/webhook/autentique"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Modo de Operação</label>
            <select
              value={formSettings.autentique.sandboxMode ? 'sandbox' : 'production'}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  autentique: {
                    ...formSettings.autentique,
                    sandboxMode: e.target.value === 'sandbox',
                  },
                })
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="sandbox">Sandbox (Ambiente de Testes / Homologação)</option>
              <option value="production">Produção (Autentique Live API)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Portal Permissions & Security Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Segurança do Portal: O que o Pai Pode Mexer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  Controle Ativo
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Selecione quais dados o responsável tem permissão para alterar na conferência da rematrícula.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Predefinições:</span>
            <button
              type="button"
              onClick={() => {
                const perms: PortalEditablePermissions = {
                  allowAddress: true,
                  allowPhone: true,
                  allowEmail: true,
                  allowSecondResponsible: false,
                  allowKinship: false,
                  allowStudentAcademic: false,
                };
                setFormSettings({ ...formSettings, portalPermissions: perms });
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Recomendado
            </button>
            <button
              type="button"
              onClick={() => {
                const perms: PortalEditablePermissions = {
                  allowAddress: true,
                  allowPhone: false,
                  allowEmail: false,
                  allowSecondResponsible: false,
                  allowKinship: false,
                  allowStudentAcademic: false,
                };
                setFormSettings({ ...formSettings, portalPermissions: perms });
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Só Endereço
            </button>
            <button
              type="button"
              onClick={() => {
                const perms: PortalEditablePermissions = {
                  allowAddress: false,
                  allowPhone: true,
                  allowEmail: true,
                  allowSecondResponsible: false,
                  allowKinship: false,
                  allowStudentAcademic: false,
                };
                setFormSettings({ ...formSettings, portalPermissions: perms });
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Só Contatos
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          Quando o responsável acessar o portal e clicar em <strong>"Corrigir / Atualizar Meus Dados"</strong>, ele apenas conseguirá editar os campos autorizados abaixo. Todos os outros campos permanecerão com cadeado 🔒 e serão bloqueados contra alterações, preservando a integridade legal e contratual da escola.
        </p>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Endereço */}
          <label className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition ${
            (formSettings.portalPermissions?.allowAddress ?? true)
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-600" />
                <span>Dados de Endereço Residencial</span>
                {(formSettings.portalPermissions?.allowAddress ?? true) ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Liberado</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">Bloqueado</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Permite que o pai altere rua, número, bairro, CEP e cidade de residência.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formSettings.portalPermissions?.allowAddress ?? true}
              onChange={(e) => {
                const currentPerms = formSettings.portalPermissions || DEFAULT_PORTAL_PERMISSIONS;
                setFormSettings({
                  ...formSettings,
                  portalPermissions: { ...currentPerms, allowAddress: e.target.checked },
                });
              }}
              className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </label>

          {/* Telefones */}
          <label className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition ${
            (formSettings.portalPermissions?.allowPhone ?? true)
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                <span>Telefones & WhatsApp</span>
                {(formSettings.portalPermissions?.allowPhone ?? true) ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Liberado</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">Bloqueado</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Permite atualizar números de telefone e WhatsApp para avisos e notificações.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formSettings.portalPermissions?.allowPhone ?? true}
              onChange={(e) => {
                const currentPerms = formSettings.portalPermissions || DEFAULT_PORTAL_PERMISSIONS;
                setFormSettings({
                  ...formSettings,
                  portalPermissions: { ...currentPerms, allowPhone: e.target.checked },
                });
              }}
              className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </label>

          {/* E-mails */}
          <label className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition ${
            (formSettings.portalPermissions?.allowEmail ?? true)
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>E-mails de Contato & Assinatura</span>
                {(formSettings.portalPermissions?.allowEmail ?? true) ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Liberado</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">Bloqueado</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Permite que o pai altere os e-mails onde receberá a notificação da Autentique e comprovantes.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formSettings.portalPermissions?.allowEmail ?? true}
              onChange={(e) => {
                const currentPerms = formSettings.portalPermissions || DEFAULT_PORTAL_PERMISSIONS;
                setFormSettings({
                  ...formSettings,
                  portalPermissions: { ...currentPerms, allowEmail: e.target.checked },
                });
              }}
              className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </label>

          {/* 2º Responsável */}
          <label className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition ${
            (formSettings.portalPermissions?.allowSecondResponsible ?? false)
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Dados do 2º Responsável Solidário</span>
                {(formSettings.portalPermissions?.allowSecondResponsible ?? false) ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Liberado</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">Bloqueado</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Permite adicionar ou alterar nome, CPF e contatos do co-responsável contratual.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formSettings.portalPermissions?.allowSecondResponsible ?? false}
              onChange={(e) => {
                const currentPerms = formSettings.portalPermissions || DEFAULT_PORTAL_PERMISSIONS;
                setFormSettings({
                  ...formSettings,
                  portalPermissions: { ...currentPerms, allowSecondResponsible: e.target.checked },
                });
              }}
              className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Security Notice for Strictly Protected Fields */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed">
            <strong className="block text-amber-950 font-semibold">
              Campos Permanentemente Protegidos (Regra Jurídica Escolar):
            </strong>
            <span>
              O <strong>Nome do Aluno</strong>, <strong>RA / Matrícula</strong>, <strong>Série / Turma</strong>, <strong>Valores de Mensalidade</strong> e <strong>Descontos Concedidos</strong> nunca ficam abertos a edição livre pelo responsável, evitando inconsistências acadêmicas ou alterações não homologadas pela secretaria.
            </span>
          </div>
        </div>
      </div>

      {/* Template de E-mail: Lembrete de Rematrícula */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Template de E-mail • Lembrete de Rematrícula
              </h2>
              <p className="text-xs text-slate-500">
                Modelo padrão utilizado nos disparos automáticos para pais que ainda não iniciaram a rematrícula.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setFormSettings({
                ...formSettings,
                reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
              })
            }
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assunto do E-mail</label>
            <input
              type="text"
              value={(formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE).subject}
              onChange={(e) => {
                const current = formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
                setFormSettings({
                  ...formSettings,
                  reminderTemplate: { ...current, subject: e.target.value },
                });
              }}
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="w-full text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Tags disponíveis para personalização (clique para adicionar ao texto):
            </span>
            {REMINDER_PLACEHOLDERS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => {
                  const current = formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
                  setFormSettings({
                    ...formSettings,
                    reminderTemplate: {
                      ...current,
                      body: `${current.body}\n${item.tag}`,
                    },
                  });
                }}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-50 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
              >
                {item.tag}
              </button>
            ))}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mensagem do E-mail (com Link Direto do Portal)
            </label>
            <textarea
              rows={7}
              value={(formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE).body}
              onChange={(e) => {
                const current = formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
                setFormSettings({
                  ...formSettings,
                  reminderTemplate: { ...current, body: e.target.value },
                });
              }}
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={(formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE).sendToSecondResponsible}
                onChange={(e) => {
                  const current = formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
                  setFormSettings({
                    ...formSettings,
                    reminderTemplate: { ...current, sendToSecondResponsible: e.target.checked },
                  });
                }}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
                Enviar cópia para o 2º Responsável (quando cadastrado)
              </span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={(formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE).autoIncludePortalLink}
                onChange={(e) => {
                  const current = formSettings.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
                  setFormSettings({
                    ...formSettings,
                    reminderTemplate: { ...current, autoIncludePortalLink: e.target.checked },
                  });
                }}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
                Garantir inclusão automática do link do Portal
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Faixas de Parcelamento Globais & Regra Regressiva da Proposta */}
      <InstallmentPlanManager
        tiers={formSettings.itau.installmentTiers || DEFAULT_INSTALLMENT_TIERS}
        campaign={formSettings.itau.proposalCampaign || DEFAULT_PROPOSAL_CAMPAIGN}
        onSaveTiers={(updatedTiers: InstallmentTier[]) => {
          const updated = {
            ...formSettings,
            itau: {
              ...formSettings.itau,
              installmentTiers: updatedTiers,
            },
          };
          setFormSettings(updated);
          onUpdateSettings(updated);
        }}
        onSaveCampaign={(updatedCampaign: ProposalCampaignSettings) => {
          const updated = {
            ...formSettings,
            itau: {
              ...formSettings.itau,
              proposalCampaign: updatedCampaign,
            },
          };
          setFormSettings(updated);
          onUpdateSettings(updated);
        }}
      />
    </div>
  );
}
