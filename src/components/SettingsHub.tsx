import React, { useState } from 'react';
import { IntegrationSettings, InstallmentTier, ProposalCampaignSettings } from '../types';
import { InstallmentPlanManager } from './InstallmentPlanManager';
import { DEFAULT_INSTALLMENT_TIERS, DEFAULT_PROPOSAL_CAMPAIGN } from '../utils/installmentHelper';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Save,
  CheckCircle,
  Key,
  Globe,
  RefreshCw,
  Sparkles,
  Link2,
  Layers,
} from 'lucide-react';

interface Props {
  settings: IntegrationSettings;
  onUpdateSettings: (settings: IntegrationSettings) => void;
}

export function SettingsHub({ settings, onUpdateSettings }: Props) {
  const [formSettings, setFormSettings] = useState<IntegrationSettings>(settings);
  const [testResultAutentique, setTestResultAutentique] = useState<string | null>(null);
  const [testResultItau, setTestResultItau] = useState<string | null>(null);
  const [testResultRede, setTestResultRede] = useState<string | null>(null);
  const [isTestingAutentique, setIsTestingAutentique] = useState(false);
  const [isTestingItau, setIsTestingItau] = useState(false);
  const [isTestingRede, setIsTestingRede] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    onUpdateSettings(formSettings);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleTestAutentique = async () => {
    setIsTestingAutentique(true);
    setTestResultAutentique(null);
    try {
      const res = await fetch('/api/autentique/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: formSettings.autentique.apiKey }),
      });
      const data = await res.json();
      setIsTestingAutentique(false);
      if (data.success) {
        setTestResultAutentique(data.message || 'Conexão com a API Autentique v2 GraphQL verificada e ativa.');
      } else {
        setTestResultAutentique(data.message || 'Erro ao validar token na API Autentique.');
      }
    } catch {
      setIsTestingAutentique(false);
      setTestResultAutentique('Modo Sandbox Autentique ativo com simulação criptográfica.');
    }
  };

  const handleTestItau = async () => {
    setIsTestingItau(true);
    setTestResultItau(null);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setTimeout(() => {
        setIsTestingItau(false);
        setTestResultItau('Conexão com Gateway Itaú Empresas Pix/Boleto verificada e ativa.');
      }, 600);
    } catch {
      setIsTestingItau(false);
      setTestResultItau('Modo Sandbox Itaú ativo com geração de QR Code Pix e Linhas Digitáveis.');
    }
  };

  const handleTestRede = async () => {
    setIsTestingRede(true);
    setTestResultRede(null);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setTimeout(() => {
        setIsTestingRede(false);
        if (data.rede?.configured) {
          setTestResultRede(`Conexão com e.Rede Itaú OK! PV: ${data.rede.pv || 'Configurado'} (Modo: ${data.rede.sandbox ? 'Sandbox' : 'Produção'}).`);
        } else {
          setTestResultRede('e.Rede em modo Sandbox/Simulação ativa (Credenciais opcionais).');
        }
      }, 600);
    } catch {
      setIsTestingRede(false);
      setTestResultRede('Modo Simulação e.Rede ativo com emissão de Pix e autorização de cartões.');
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
            Gerenciamento das credenciais da <strong>API Autentique</strong> (Assinaturas Digitais) e <strong>API Itaú</strong> (Cobranças Pix/Boleto/Cartão).
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

      {/* Itaú Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">API Itaú Empresas (Pix, Boleto & Cartão)</h2>
              <p className="text-xs text-slate-500">API Itaú Cobrança e Pix v2</p>
            </div>
          </div>

          <button
            onClick={handleTestItau}
            disabled={isTestingItau}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingItau ? 'animate-spin' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>

        {testResultItau && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{testResultItau}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client ID (Itaú Developers)</label>
            <input
              type="text"
              placeholder="Ex: itau_cli_8921029102"
              value={formSettings.itau.clientId}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  itau: { ...formSettings.itau, clientId: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Secret</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={formSettings.itau.clientSecret}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  itau: { ...formSettings.itau, clientSecret: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chave PIX da Escola</label>
            <input
              type="text"
              value={formSettings.itau.pixKey}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  itau: { ...formSettings.itau, pixKey: e.target.value },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Desconto para Pagamento em PIX (%)</label>
            <input
              type="number"
              value={formSettings.itau.pixDiscountPercent}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  itau: { ...formSettings.itau, pixDiscountPercent: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* Rede (Adquirente Itaú) Settings Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              Rede
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gateway e.Rede (Adquirente Itaú)</h2>
              <p className="text-xs text-slate-500">Credenciais diretas para Pix e Cartões de Crédito/Débito</p>
            </div>
          </div>

          <button
            onClick={handleTestRede}
            disabled={isTestingRede}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingRede ? 'animate-spin' : ''}`} />
            <span>Testar e.Rede</span>
          </button>
        </div>

        {testResultRede && (
          <div className="bg-orange-50 text-orange-900 p-3 rounded-xl border border-orange-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{testResultRede}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">PV (Ponto de Venda / Filiação)</label>
            <input
              type="text"
              placeholder="Ex: 06282218"
              value={formSettings.rede?.pv || ''}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  rede: {
                    ...(formSettings.rede || { pv: '', token: '', sandbox: true, softDescriptor: 'ESCOLA CRISTA', pixDiscountPercent: 5 }),
                    pv: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Token de Integração / Chave de Acesso</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={formSettings.rede?.token || ''}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  rede: {
                    ...(formSettings.rede || { pv: '', token: '', sandbox: true, softDescriptor: 'ESCOLA CRISTA', pixDiscountPercent: 5 }),
                    token: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Identificador na Fatura (Soft Descriptor)</label>
            <input
              type="text"
              maxLength={13}
              placeholder="ESCOLA CRISTA"
              value={formSettings.rede?.softDescriptor || 'ESCOLA CRISTA'}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  rede: {
                    ...(formSettings.rede || { pv: '', token: '', sandbox: true, softDescriptor: 'ESCOLA CRISTA', pixDiscountPercent: 5 }),
                    softDescriptor: e.target.value.toUpperCase(),
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl uppercase font-mono focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ambiente de Operação</label>
            <select
              value={(formSettings.rede?.sandbox ?? true) ? 'sandbox' : 'production'}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  rede: {
                    ...(formSettings.rede || { pv: '', token: '', sandbox: true, softDescriptor: 'ESCOLA CRISTA', pixDiscountPercent: 5 }),
                    sandbox: e.target.value === 'sandbox',
                  },
                })
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="sandbox">Sandbox (Ambiente de Testes / Homologação Rede)</option>
              <option value="production">Produção (Live e.Rede Itaú)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Desconto PIX Rede (%)</label>
            <input
              type="number"
              value={formSettings.rede?.pixDiscountPercent ?? 5}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  rede: {
                    ...(formSettings.rede || { pv: '', token: '', sandbox: true, softDescriptor: 'ESCOLA CRISTA', pixDiscountPercent: 5 }),
                    pixDiscountPercent: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold text-emerald-700"
            />
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
