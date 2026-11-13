import React, { useState } from 'react';
import { InstallmentTier, ProposalCampaignSettings } from '../types';
import {
  DEFAULT_INSTALLMENT_TIERS,
  DEFAULT_PROPOSAL_CAMPAIGN,
  generateInstallmentOptions,
  calculateTierTotal,
  generateProposalMonthlyTimeline,
  getAdjustedTiersForCampaign,
} from '../utils/installmentHelper';
import { formatCurrency } from '../utils/contractFormatter';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Percent,
  ChevronDown,
  Tag,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  Flame,
  Zap,
} from 'lucide-react';

interface Props {
  tiers: InstallmentTier[];
  onSaveTiers: (tiers: InstallmentTier[]) => void;
  campaign?: ProposalCampaignSettings;
  onSaveCampaign?: (campaign: ProposalCampaignSettings) => void;
  title?: string;
  description?: string;
  isStudentOverride?: boolean;
  studentBaseValue?: number;
}

export function InstallmentPlanManager({
  tiers,
  onSaveTiers,
  campaign,
  onSaveCampaign,
  title = 'Tabela de Descontos e Regra Regressiva da Proposta',
  description = 'Configure a porcentagem de desconto por faixa e a regra regressiva da campanha: a cada mês de atraso dos responsáveis, a quantidade máxima de parcelas e a porcentagem de desconto diminuem automaticamente.',
  isStudentOverride = false,
  studentBaseValue = 2000,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tiers' | 'campaign' | 'timeline'>('campaign');

  const [currentTiers, setCurrentTiers] = useState<InstallmentTier[]>(
    tiers && tiers.length > 0 ? tiers : DEFAULT_INSTALLMENT_TIERS
  );

  const [currentCampaign, setCurrentCampaign] = useState<ProposalCampaignSettings>(
    campaign || DEFAULT_PROPOSAL_CAMPAIGN
  );

  // Editing state for tiers
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrom, setEditFrom] = useState<number>(1);
  const [editTo, setEditTo] = useState<number>(2);
  const [editDiscountPercent, setEditDiscountPercent] = useState<number>(20);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editHighlight, setEditHighlight] = useState<boolean>(false);

  // New Tier Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFrom, setNewFrom] = useState<number>(7);
  const [newTo, setNewTo] = useState<number>(8);
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(5);
  const [newDesc, setNewDesc] = useState<string>('');
  const [newHighlight, setNewHighlight] = useState<boolean>(false);

  // Reference Simulator State
  const [simulatedBaseValue, setSimulatedBaseValue] = useState<number>(studentBaseValue || 2000);
  const [simulatedSelectedMonthIndex, setSimulatedSelectedMonthIndex] = useState<number>(0);
  const [simulatedSelectedCount, setSimulatedSelectedCount] = useState<number>(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Generate monthly timeline steps
  const timelineSteps = generateProposalMonthlyTimeline(
    currentTiers,
    currentCampaign,
    simulatedBaseValue
  );

  const selectedTimelineStep =
    timelineSteps[simulatedSelectedMonthIndex] || timelineSteps[0] || {
      monthIndex: 0,
      monthNumber: 1,
      monthName: 'Mês Atual',
      startDate: '01/08',
      endDate: '31/08',
      delayMonths: 0,
      delayLabel: 'No Prazo',
      maxInstallments: 12,
      discountPenalty: 0,
      tiers: currentTiers,
      options: generateInstallmentOptions(currentTiers, simulatedBaseValue),
      isCurrentMonth: true,
    };

  const previewOptions = selectedTimelineStep.options;
  const currentSimulatedOption =
    previewOptions.find((o) => o.count === simulatedSelectedCount) || previewOptions[0] || {
      count: 1,
      tierId: 't1',
      tierFrom: 1,
      tierTo: 1,
      discountPercent: 0,
      discountAmount: 0,
      baseAmount: simulatedBaseValue,
      installmentValue: simulatedBaseValue,
      totalValue: simulatedBaseValue,
      tierDescription: '1x Integral',
      label: '1x Integral',
    };

  const handleStartEdit = (tier: InstallmentTier) => {
    setEditingId(tier.id);
    setEditFrom(tier.fromInstallments);
    setEditTo(tier.toInstallments);
    setEditDiscountPercent(typeof tier.discountPercent === 'number' ? tier.discountPercent : 0);
    setEditDesc(tier.description || '');
    setEditHighlight(!!tier.highlight);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = currentTiers.map((t) => {
      if (t.id === editingId) {
        const discount = Number(editDiscountPercent) || 0;
        const from = Number(editFrom);
        const to = Number(editTo);
        const autoDesc =
          editDesc.trim() ||
          (discount > 0
            ? `${from} a ${to}x • ${discount}% de Desconto`
            : `${from} a ${to}x • Valor Integral (Sem desconto)`);

        return {
          ...t,
          fromInstallments: from,
          toInstallments: to,
          discountPercent: discount,
          description: autoDesc,
          highlight: editHighlight,
        };
      }
      return t;
    });

    setCurrentTiers(updated);
    onSaveTiers(updated);
    setEditingId(null);
    showToast('Faixa de desconto por parcelamento atualizada!');
  };

  const handleDelete = (id: string) => {
    if (currentTiers.length <= 1) {
      alert('Você deve manter pelo menos uma faixa de parcelamento.');
      return;
    }
    const updated = currentTiers.filter((t) => t.id !== id);
    setCurrentTiers(updated);
    onSaveTiers(updated);
    showToast('Faixa removida.');
  };

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFrom <= 0 || newTo < newFrom) {
      alert('Por favor, informe uma faixa válida de parcelas.');
      return;
    }

    const discount = Number(newDiscountPercent) || 0;
    const autoDesc =
      newDesc.trim() ||
      (discount > 0
        ? `${newFrom} a ${newTo}x • ${discount}% de Desconto`
        : `${newFrom} a ${newTo}x • Valor Integral`);

    const newTier: InstallmentTier = {
      id: 'tier_' + Date.now(),
      fromInstallments: Number(newFrom),
      toInstallments: Number(newTo),
      discountPercent: discount,
      description: autoDesc,
      highlight: newHighlight,
    };

    const updated = [...currentTiers, newTier].sort(
      (a, b) => a.fromInstallments - b.fromInstallments
    );
    setCurrentTiers(updated);
    onSaveTiers(updated);
    setShowAddForm(false);
    showToast('Nova faixa de desconto adicionada!');

    // Reset for next
    setNewFrom(newTo + 1);
    setNewTo(newTo + 2);
    setNewDiscountPercent(Math.max(0, discount - 5));
    setNewDesc('');
  };

  const handleSaveCampaignSettings = (updatedCampaign: ProposalCampaignSettings) => {
    setCurrentCampaign(updatedCampaign);
    if (onSaveCampaign) {
      onSaveCampaign(updatedCampaign);
    }
    showToast('Regras de início, término e regressão mensal salvas!');
  };

  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleRestoreDefaults = () => {
    if (!confirmRestore) {
      setConfirmRestore(true);
      setTimeout(() => setConfirmRestore(false), 5000);
      return;
    }
    setConfirmRestore(false);
    setCurrentTiers(DEFAULT_INSTALLMENT_TIERS);
    onSaveTiers(DEFAULT_INSTALLMENT_TIERS);
    setCurrentCampaign(DEFAULT_PROPOSAL_CAMPAIGN);
    if (onSaveCampaign) {
      onSaveCampaign(DEFAULT_PROPOSAL_CAMPAIGN);
    }
    showToast('Configurações padrão restauradas!');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Flame className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              confirmRestore
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmRestore ? 'Confirmar Restauração?' : 'Restaurar Padrão'}</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl p-3 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2 pb-px overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('campaign')}
          className={`pb-2.5 px-3.5 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'campaign'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>1. Datas e Regra Regressiva da Proposta</span>
          {currentCampaign.enabled && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
              Ativa
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tiers')}
          className={`pb-2.5 px-3.5 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'tiers'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4 text-amber-500" />
          <span>2. Faixas de Desconto (%) Base</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
            {currentTiers.length} faixas
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-2.5 px-3.5 font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Eye className="w-4 h-4 text-emerald-600" />
          <span>3. Linha do Tempo & Simulador Mês a Mês</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-full">
            {timelineSteps.length} meses
          </span>
        </button>
      </div>

      {/* ================= TAB 1: DATAS DA PROPOSTA E REGRA REGRESSIVA ================= */}
      {activeTab === 'campaign' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-indigo-600" />
                  Período de Validade da Proposta & Redução por Atraso
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina a <strong>Data de Início</strong> (quando a campanha de rematrícula abre com as melhores condições) e a <strong>Data Final</strong>. A cada mês que o responsável demorar para assinar/pagar, o sistema reduz o limite de parcelas e o percentual de desconto.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={currentCampaign.enabled}
                  onChange={(e) => {
                    const updated = { ...currentCampaign, enabled: e.target.checked };
                    handleSaveCampaignSettings(updated);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  {currentCampaign.enabled ? 'Regra Regressiva Ativada' : 'Regra Regressiva Desativada'}
                </span>
              </label>
            </div>

            {/* Campaign Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Data de Início da Proposta</span>
                </label>
                <input
                  type="date"
                  value={currentCampaign.startDate}
                  onChange={(e) => {
                    const updated = { ...currentCampaign, startDate: e.target.value };
                    handleSaveCampaignSettings(updated);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Mês 1 (Condição máxima: 12x e 20% OFF)
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Data Final / Limite da Proposta</span>
                </label>
                <input
                  type="date"
                  value={currentCampaign.endDate}
                  onChange={(e) => {
                    const updated = { ...currentCampaign, endDate: e.target.value };
                    handleSaveCampaignSettings(updated);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Prazo limite final para confirmação
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Redução de Parcelas por Mês</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={currentCampaign.monthlyInstallmentReduction}
                    onChange={(e) => {
                      const updated = {
                        ...currentCampaign,
                        monthlyInstallmentReduction: Math.max(1, Number(e.target.value)),
                      };
                      handleSaveCampaignSettings(updated);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-semibold">
                    parcela/mês
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ex: 12x no Mês 1 &rarr; 11x no Mês 2 &rarr; 10x no Mês 3...
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Redução de Desconto % por Mês</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={currentCampaign.monthlyDiscountReduction}
                    onChange={(e) => {
                      const updated = {
                        ...currentCampaign,
                        monthlyDiscountReduction: Math.max(0, Number(e.target.value)),
                      };
                      handleSaveCampaignSettings(updated);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-semibold">
                    %
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ex: -5% em cada faixa a cada mês que passar
                </span>
              </div>
            </div>

            {/* Visual Example Card */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <Flame className="w-5 h-5 text-amber-600" />
                <span>Como funciona a Regra Regressiva de Rematrícula na prática:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                {timelineSteps.map((step) => (
                  <div
                    key={step.monthIndex}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between ${
                      step.isCurrentMonth
                        ? 'bg-amber-500/20 border-amber-500 text-amber-950 font-bold shadow-xs'
                        : 'bg-white/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{step.monthName}</span>
                        {step.isCurrentMonth && (
                          <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                            Mês Atual
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-800 mt-0.5">{step.dateRange}</div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-amber-200/60 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-600">Máx. Parcelas:</span>
                        <span className="font-black text-indigo-900">{step.maxInstallments}x</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-600">Top Desconto:</span>
                        <span className="font-black text-emerald-800">
                          {Math.max(0, 20 - step.discountPenalty)}% OFF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-900 flex-wrap gap-2">
                <span>
                  💡 <strong>Gatilho de Urgência Ético:</strong> Incentiva os pais a quitarem antecipadamente a rematrícula no início do semestre para garantir as 12 parcelas e os 20% de economia.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Simulador Mês a Mês</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FAIXAS DE DESCONTO BASE (%) ================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  Faixas de Desconto Base Concedidas no Mês de Lançamento
                </h3>
                <p className="text-xs text-slate-500">
                  Valores e porcentagens base aplicados no 1º mês da proposta (antes das reduções regressivas).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Nova Faixa</span>
              </button>
            </div>

            {/* Add New Tier Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddTier}
                className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3 animate-fadeIn"
              >
                <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Cadastrar Nova Faixa de Parcelamento com Desconto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">De (Parcelas)</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={newFrom}
                      onChange={(e) => setNewFrom(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Até (Parcelas)</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={newTo}
                      onChange={(e) => setNewTo(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Desconto da Faixa (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={newDiscountPercent}
                      onChange={(e) => setNewDiscountPercent(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-black text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Destaque Visual
                    </label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHighlight}
                        onChange={(e) => setNewHighlight(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-700 font-medium">Recomendado</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Salvar Faixa
                  </button>
                </div>
              </form>
            )}

            {/* List of Tiers */}
            <div className="space-y-2.5">
              {currentTiers
                .sort((a, b) => a.fromInstallments - b.fromInstallments)
                .map((tier) => {
                  const isEditing = editingId === tier.id;
                  const from = Math.min(tier.fromInstallments, tier.toInstallments);
                  const to = Math.max(tier.fromInstallments, tier.toInstallments);
                  const discountPct =
                    typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;
                  const tierTotal = calculateTierTotal(tier, simulatedBaseValue);
                  const savings = simulatedBaseValue - tierTotal;

                  if (isEditing) {
                    return (
                      <div
                        key={tier.id}
                        className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4 space-y-3 animate-fadeIn text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span>Editando Faixa de Parcelas</span>
                          <span className="text-slate-500 font-mono text-[11px]">{tier.id}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              De (Parcelas)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={editFrom}
                              onChange={(e) => setEditFrom(Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              Até (Parcelas)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={editTo}
                              onChange={(e) => setEditTo(Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              Desconto (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={editDiscountPercent}
                              onChange={(e) => setEditDiscountPercent(Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-emerald-700"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              Destaque
                            </label>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editHighlight}
                                onChange={(e) => setEditHighlight(e.target.checked)}
                                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-slate-700 font-medium">Recomendado</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tier.id}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex flex-col items-center justify-center font-black text-xs shrink-0">
                          <span>{from === to ? `${from}x` : `${from}-${to}x`}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                discountPct > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {discountPct > 0 ? `${discountPct}% de Desconto` : 'Valor Integral'}
                            </span>

                            {tier.highlight && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                ★ Mais Recomendado
                              </span>
                            )}

                            <span className="text-slate-500 text-[11px]">
                              {tier.description || `${from} a ${to}x`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-700 text-xs mt-1">
                            <span className="font-bold text-slate-900">
                              {from === to
                                ? `1x de ${formatCurrency(tierTotal / from)}`
                                : `${from}x de ${formatCurrency(tierTotal / from)} até ${to}x de ${formatCurrency(tierTotal / to)}`}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-extrabold text-indigo-700">
                              Total: {formatCurrency(tierTotal)}
                            </span>
                            {savings > 0 && (
                              <span className="text-emerald-700 font-semibold text-[11px]">
                                (Economia de {formatCurrency(savings)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tier)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Editar percentual desta faixa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tier.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remover esta faixa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: LINHA DO TEMPO & SIMULADOR MÊS A MÊS ================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Base Value Controller for Simulation */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4.5 h-4.5 text-indigo-600" />
              <span className="font-bold text-slate-900">
                Simulação de Anuidade / Rematrícula:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Valor Base de Teste:</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step={50}
                  value={simulatedBaseValue}
                  onChange={(e) => setSimulatedBaseValue(Number(e.target.value))}
                  className="w-32 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Monthly Steps Tabs / Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Selecione o Mês da Simulação para ver a perda de parcelas e descontos:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {timelineSteps.map((step) => {
                const isSelected = simulatedSelectedMonthIndex === step.monthIndex;

                return (
                  <button
                    key={step.monthIndex}
                    type="button"
                    onClick={() => {
                      setSimulatedSelectedMonthIndex(step.monthIndex);
                      setSimulatedSelectedCount(1);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}
                        >
                          {step.monthName}
                        </span>
                        {step.delayMonths === 0 ? (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Mês 1
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            +{step.delayMonths}m atraso
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}
                      >
                        {step.dateRange}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100/30 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-500'}>
                          Limite:
                        </span>
                        <span
                          className={`font-black ${isSelected ? 'text-white' : 'text-indigo-700'}`}
                        >
                          Até {step.maxInstallments}x
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-500'}>
                          Top Desconto:
                        </span>
                        <span
                          className={`font-black ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}
                        >
                          {Math.max(0, 20 - step.discountPenalty)}% OFF
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Simulator: How the Parent/Customer will see it */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Visão no Portal dos Pais • {selectedTimelineStep.monthName} ({selectedTimelineStep.delayLabel})
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Neste mês o responsável tem acesso a parcelamento em até{' '}
                    <strong>{selectedTimelineStep.maxInstallments}x</strong> com desconto máximo de{' '}
                    <strong>{Math.max(0, 20 - selectedTimelineStep.discountPenalty)}%</strong>.
                  </p>
                </div>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                Simulando: {selectedTimelineStep.monthName}
              </span>
            </div>

            {/* Visual Pill Cards of Tiers */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                1. Cards de Faixas no Checkout dos Pais (Clique para escolher a parcela):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {selectedTimelineStep.tiers
                  .sort((a, b) => a.fromInstallments - b.fromInstallments)
                  .map((tier) => {
                    const from = Math.min(tier.fromInstallments, tier.toInstallments);
                    const to = Math.max(tier.fromInstallments, tier.toInstallments);
                    const discountPct =
                      typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;
                    const tierTotal = calculateTierTotal(tier, simulatedBaseValue);
                    const isSelectedTier =
                      simulatedSelectedCount >= from && simulatedSelectedCount <= to;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSimulatedSelectedCount(from)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                          isSelectedTier
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-xs ring-1 ring-amber-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black">
                              {from === to ? `${from}x` : `${from} a ${to}x`}
                            </span>
                            <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                              {discountPct > 0 ? `-${discountPct}%` : 'Integral'}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white mt-1">
                            {formatCurrency(tierTotal)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {from === to
                            ? `1x de ${formatCurrency(tierTotal / from)}`
                            : `${from}x de ${formatCurrency(tierTotal / from)}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Dropdown Selector Simulation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>2. Opção Selecionada no Dropdown:</span>
                  <span className="text-amber-400 text-[10px]">
                    Máximo liberado: {selectedTimelineStep.maxInstallments}x
                  </span>
                </label>
                <div className="relative">
                  <select
                    aria-label="Selecione a quantidade de parcelas"
                    value={simulatedSelectedCount}
                    onChange={(e) => setSimulatedSelectedCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer appearance-none pr-8"
                  >
                    {previewOptions.map((opt) => (
                      <option
                        key={opt.count}
                        value={opt.count}
                        className="bg-slate-900 text-white py-1"
                      >
                        {opt.count}x de {formatCurrency(opt.installmentValue)} • Total:{' '}
                        {formatCurrency(opt.totalValue)} (
                        {opt.discountPercent > 0
                          ? `${opt.discountPercent}% de desconto`
                          : 'Sem desconto'}
                        )
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Breakdown Preview */}
              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 flex flex-col justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">
                  Resultado para o Responsável:
                </span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="text-base font-extrabold text-amber-300 block">
                      {currentSimulatedOption.count}x de{' '}
                      {formatCurrency(currentSimulatedOption.installmentValue)}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {currentSimulatedOption.discountPercent > 0
                        ? `Economia de ${formatCurrency(currentSimulatedOption.discountAmount)} (${currentSimulatedOption.discountPercent}% OFF)`
                        : 'Valor Integral'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total a Pagar</span>
                    <span className="text-lg font-black text-emerald-400">
                      {formatCurrency(currentSimulatedOption.totalValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
