import {
  InstallmentTier,
  InstallmentOption,
  Student,
  ProposalCampaignSettings,
} from '../types';
import { formatCurrency } from './contractFormatter';

export const DEFAULT_PROPOSAL_CAMPAIGN: ProposalCampaignSettings = {
  enabled: true,
  startDate: '2026-08-01',
  endDate: '2026-12-31',
  monthlyInstallmentReduction: 1, // Reduz 1 parcela a cada mês que demorar (ex: 12x -> 11x -> 10x -> 9x...)
  monthlyDiscountReduction: 5,    // Reduz 5% no desconto de cada faixa a cada mês que demorar (ex: 20% -> 15% -> 10%...)
  maxInstallmentsAtStart: 12,
  minInstallmentsFloor: 1,
};

export const DEFAULT_INSTALLMENT_TIERS: InstallmentTier[] = [
  {
    id: 'tier_1_2',
    fromInstallments: 1,
    toInstallments: 2,
    discountPercent: 20,
    description: '1 a 2x • 20% de Desconto (Super Econômico)',
    highlight: true,
  },
  {
    id: 'tier_3_4',
    fromInstallments: 3,
    toInstallments: 4,
    discountPercent: 15,
    description: '3 a 4x • 15% de Desconto',
    highlight: false,
  },
  {
    id: 'tier_5_6',
    fromInstallments: 5,
    toInstallments: 6,
    discountPercent: 10,
    description: '5 a 6x • 10% de Desconto',
    highlight: false,
  },
  {
    id: 'tier_7_8',
    fromInstallments: 7,
    toInstallments: 8,
    discountPercent: 5,
    description: '7 a 8x • 5% de Desconto',
    highlight: false,
  },
  {
    id: 'tier_9_12',
    fromInstallments: 9,
    toInstallments: 12,
    discountPercent: 0,
    description: '9 a 12x • Valor Integral (Sem desconto)',
    highlight: false,
  },
];

/**
 * Calcula a quantidade de meses decorridos entre a data de início da proposta e a data de referência.
 */
export function calculateElapsedMonths(
  startDateStr: string,
  refDate: string | Date = new Date()
): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const ref = typeof refDate === 'string' ? new Date(refDate) : refDate;

  if (isNaN(start.getTime()) || isNaN(ref.getTime())) return 0;

  const yearDiff = ref.getFullYear() - start.getFullYear();
  const monthDiff = ref.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;

  return Math.max(0, totalMonths);
}

/**
 * Calcula a quantidade total de meses da campanha entre a data inicial e a data final.
 */
export function calculateTotalCampaignMonths(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 5;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 5;

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(1, yearDiff * 12 + monthDiff + 1);
}

export interface AdjustedCampaignResult {
  adjustedTiers: InstallmentTier[];
  elapsedMonths: number;
  remainingMonths: number;
  totalMonths: number;
  isExpired: boolean;
  maxAllowedInstallments: number;
  discountPenalty: number;
  currentMonthName: string;
  nextDropDate: string | null;
  daysToNextDrop: number | null;
  campaign: ProposalCampaignSettings;
  isCampaignActive: boolean;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Ajusta dinamicamente as faixas de parcelamento e seus descontos com base na data da proposta
 * e nos meses decorridos (quanto mais o responsável demora, menos parcelas e menor o desconto).
 */
export function getAdjustedTiersForCampaign(
  baseTiers: InstallmentTier[],
  campaign?: ProposalCampaignSettings,
  refDate: string | Date = new Date()
): AdjustedCampaignResult {
  const safeTiers = baseTiers && baseTiers.length > 0 ? baseTiers : DEFAULT_INSTALLMENT_TIERS;
  const safeCampaign = campaign || DEFAULT_PROPOSAL_CAMPAIGN;

  const ref = typeof refDate === 'string' ? new Date(refDate) : refDate;
  const currentMonthName = `${MONTH_NAMES[ref.getMonth()]}/${ref.getFullYear()}`;

  if (!safeCampaign.enabled) {
    return {
      adjustedTiers: safeTiers,
      elapsedMonths: 0,
      remainingMonths: 12,
      totalMonths: 12,
      isExpired: false,
      maxAllowedInstallments: safeCampaign.maxInstallmentsAtStart || 12,
      discountPenalty: 0,
      currentMonthName,
      nextDropDate: null,
      daysToNextDrop: null,
      campaign: safeCampaign,
      isCampaignActive: false,
    };
  }

  const elapsedMonths = calculateElapsedMonths(safeCampaign.startDate, ref);
  const totalMonths = calculateTotalCampaignMonths(safeCampaign.startDate, safeCampaign.endDate);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);

  const endDate = new Date(safeCampaign.endDate);
  const isExpired = !isNaN(endDate.getTime()) && ref.getTime() > endDate.getTime();

  // Calcular redução de parcelas e de desconto
  const monthlyInstReduction = safeCampaign.monthlyInstallmentReduction || 1;
  const monthlyDiscReduction = safeCampaign.monthlyDiscountReduction || 5;
  const floor = safeCampaign.minInstallmentsFloor || 1;

  const maxAllowedInstallments = Math.max(
    floor,
    (safeCampaign.maxInstallmentsAtStart || 12) - elapsedMonths * monthlyInstReduction
  );
  const discountPenalty = elapsedMonths * monthlyDiscReduction;

  // Próxima data de queda (1º dia do mês seguinte)
  const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  const nextDropDate = nextMonth.toISOString().split('T')[0];
  const diffTime = nextMonth.getTime() - ref.getTime();
  const daysToNextDrop = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Ajustar faixas
  const adjustedTiers: InstallmentTier[] = [];

  for (const tier of safeTiers) {
    const from = Math.min(tier.fromInstallments, tier.toInstallments);
    const to = Math.max(tier.fromInstallments, tier.toInstallments);

    // Se o início da faixa já excede o teto permitido para este mês, essa faixa não é mais oferecida
    if (from > maxAllowedInstallments) {
      continue;
    }

    // Limitar o teto da faixa ao máximo permitido
    const clampedTo = Math.min(to, maxAllowedInstallments);
    const baseDiscount = typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;
    const adjustedDiscount = Math.max(0, baseDiscount - discountPenalty);

    const desc =
      adjustedDiscount > 0
        ? `${from === clampedTo ? `${from}x` : `${from} a ${clampedTo}x`} • ${adjustedDiscount}% de Desconto`
        : `${from === clampedTo ? `${from}x` : `${from} a ${clampedTo}x`} • Valor Integral`;

    adjustedTiers.push({
      ...tier,
      fromInstallments: from,
      toInstallments: clampedTo,
      discountPercent: adjustedDiscount,
      description: desc,
    });
  }

  // Garantir que haja pelo menos 1 faixa se todas forem filtradas
  if (adjustedTiers.length === 0) {
    adjustedTiers.push({
      id: 'tier_fallback_1',
      fromInstallments: 1,
      toInstallments: Math.max(1, maxAllowedInstallments),
      discountPercent: 0,
      description: `1 a ${Math.max(1, maxAllowedInstallments)}x • Sem Desconto (Prazo Limite)`,
      highlight: false,
    });
  }

  return {
    adjustedTiers,
    elapsedMonths,
    remainingMonths,
    totalMonths,
    isExpired,
    maxAllowedInstallments,
    discountPenalty,
    currentMonthName,
    nextDropDate,
    daysToNextDrop,
    campaign: safeCampaign,
    isCampaignActive: safeCampaign.enabled,
  };
}

export interface MonthlyTimelineStep {
  monthIndex: number;
  monthNumber: number;
  monthName: string;
  startDate: string;
  endDate: string;
  dateRange: string;
  delayMonths: number;
  delayLabel: string;
  maxInstallments: number;
  discountPenalty: number;
  tiers: InstallmentTier[];
  options: InstallmentOption[];
  isCurrentMonth: boolean;
}

/**
 * Gera uma linha do tempo mês a mês da campanha (ex: Agosto a Dezembro)
 * detalhando a perda de parcelas e de desconto a cada mês que se passa.
 */
export function generateProposalMonthlyTimeline(
  baseTiers: InstallmentTier[],
  campaign: ProposalCampaignSettings = DEFAULT_PROPOSAL_CAMPAIGN,
  baseValue: number = 2000
): MonthlyTimelineStep[] {
  const safeTiers = baseTiers && baseTiers.length > 0 ? baseTiers : DEFAULT_INSTALLMENT_TIERS;
  const startDate = new Date(campaign.startDate);
  const totalMonths = calculateTotalCampaignMonths(campaign.startDate, campaign.endDate);
  const now = new Date();
  const currentElapsed = calculateElapsedMonths(campaign.startDate, now);

  const steps: MonthlyTimelineStep[] = [];

  for (let i = 0; i < totalMonths; i++) {
    const simDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 15);
    const mName = `${MONTH_NAMES[simDate.getMonth()]}/${simDate.getFullYear()}`;
    const firstDay = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);

    const firstStr = `${String(firstDay.getDate()).padStart(2, '0')}/${String(firstDay.getMonth() + 1).padStart(2, '0')}`;
    const lastStr = `${String(lastDay.getDate()).padStart(2, '0')}/${String(lastDay.getMonth() + 1).padStart(2, '0')}`;

    const adjusted = getAdjustedTiersForCampaign(safeTiers, campaign, simDate);
    const options = generateInstallmentOptions(adjusted.adjustedTiers, baseValue);

    let delayLabel = 'Lançamento • Condição Máxima';
    if (i === 1) delayLabel = '1 mês de atraso (-1 parcela, -5% desc)';
    else if (i > 1) delayLabel = `${i} meses de atraso (-${i} parcelas, -${i * (campaign.monthlyDiscountReduction || 5)}% desc)`;

    steps.push({
      monthIndex: i,
      monthNumber: i + 1,
      monthName: mName,
      startDate: firstStr,
      endDate: lastStr,
      dateRange: `${firstStr} a ${lastStr}`,
      delayMonths: i,
      delayLabel,
      maxInstallments: adjusted.maxAllowedInstallments,
      discountPenalty: adjusted.discountPenalty,
      tiers: adjusted.adjustedTiers,
      options,
      isCurrentMonth: i === currentElapsed,
    });
  }

  return steps;
}

/**
 * Retorna as faixas de parcelamento ativas para um aluno, considerando sobreposição individual ou padrão da escola.
 */
export function getEffectiveInstallmentTiers(
  student?: Student,
  settingsTiers?: InstallmentTier[],
  campaign?: ProposalCampaignSettings,
  refDate: string | Date = new Date()
): InstallmentTier[] {
  let rawTiers = DEFAULT_INSTALLMENT_TIERS;
  if (student?.customInstallmentTiers && student.customInstallmentTiers.length > 0) {
    rawTiers = student.customInstallmentTiers;
  } else if (settingsTiers && settingsTiers.length > 0) {
    rawTiers = settingsTiers;
  }

  const effectiveCampaign =
    student?.customProposalCampaign || campaign || DEFAULT_PROPOSAL_CAMPAIGN;

  if (effectiveCampaign && effectiveCampaign.enabled) {
    const adjusted = getAdjustedTiersForCampaign(rawTiers, effectiveCampaign, refDate);
    return adjusted.adjustedTiers;
  }

  return rawTiers;
}

/**
 * Calcula o valor total de uma faixa aplicando o percentual de desconto sobre o valor base.
 */
export function calculateTierTotal(tier: InstallmentTier, baseValue: number): number {
  if (typeof tier.discountPercent === 'number') {
    const discount = (baseValue * tier.discountPercent) / 100;
    return Math.max(0, baseValue - discount);
  }
  if (typeof tier.totalValue === 'number' && tier.totalValue > 0) {
    return tier.totalValue;
  }
  return baseValue;
}

/**
 * Desdobra as faixas configuradas em opções de parcelas individuais (1x, 2x, 3x, 4x, etc.)
 * calculando o valor de cada parcela com base no percentual de desconto da faixa sobre o valor base.
 */
export function generateInstallmentOptions(
  tiers: InstallmentTier[],
  baseValue: number = 2000
): InstallmentOption[] {
  const safeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_INSTALLMENT_TIERS;
  const options: InstallmentOption[] = [];

  // Ordenar faixas pelo número inicial de parcelas
  const sortedTiers = [...safeTiers].sort((a, b) => a.fromInstallments - b.fromInstallments);

  for (const tier of sortedTiers) {
    const from = Math.max(1, Math.min(tier.fromInstallments, tier.toInstallments));
    const to = Math.max(1, Math.max(tier.fromInstallments, tier.toInstallments));
    const discountPct = typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;
    const tierTotal = calculateTierTotal(tier, baseValue);
    const discountAmount = Math.max(0, baseValue - tierTotal);

    for (let count = from; count <= to; count++) {
      // Evitar duplicidades se faixas se sobrepuserem
      if (!options.some((o) => o.count === count)) {
        const installmentVal = tierTotal / count;
        const discountText = discountPct > 0 ? `${discountPct}% OFF` : 'Integral';
        const tierDesc =
          tier.description ||
          (discountPct > 0
            ? `${from} a ${to}x • ${discountPct}% de Desconto`
            : `${from} a ${to}x • Valor Integral`);

        options.push({
          count,
          tierId: tier.id,
          tierFrom: from,
          tierTo: to,
          discountPercent: discountPct,
          discountAmount,
          baseAmount: baseValue,
          installmentValue: installmentVal,
          totalValue: tierTotal,
          tierDescription: tierDesc,
          label: `${count}x de ${formatCurrency(installmentVal)} • Total: ${formatCurrency(tierTotal)} (${discountText})`,
          highlight: tier.highlight,
        });
      }
    }
  }

  return options.sort((a, b) => a.count - b.count);
}

/**
 * Encontra a opção de parcelamento para um determinado número de parcelas
 */
export function findInstallmentOptionForCount(
  count: number,
  tiers: InstallmentTier[],
  baseValue: number = 2000
): InstallmentOption {
  const options = generateInstallmentOptions(tiers, baseValue);
  const found = options.find((o) => o.count === count);
  if (found) return found;

  // Fallback se não encontrar
  const first = options[0];
  if (first) return first;

  const defaultTotal = baseValue * 0.8;
  return {
    count: 1,
    tierId: 'default',
    tierFrom: 1,
    tierTo: 1,
    discountPercent: 20,
    discountAmount: baseValue * 0.2,
    baseAmount: baseValue,
    installmentValue: defaultTotal,
    totalValue: defaultTotal,
    tierDescription: '1 a 2x • 20% de Desconto',
    label: `1x de ${formatCurrency(defaultTotal)} (20% OFF)`,
  };
}

/**
 * Formata um resumo textual de todas as faixas configuradas para exibir em contratos ou relatórios
 */
export function formatTiersSummary(tiers: InstallmentTier[], baseValue: number = 2000): string {
  const safeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_INSTALLMENT_TIERS;
  return safeTiers
    .sort((a, b) => a.fromInstallments - b.fromInstallments)
    .map((t) => {
      const from = Math.min(t.fromInstallments, t.toInstallments);
      const to = Math.max(t.fromInstallments, t.toInstallments);
      const discountPct = typeof t.discountPercent === 'number' ? t.discountPercent : 0;
      const total = calculateTierTotal(t, baseValue);
      const rangeText = from === to ? `${from}x` : `${from} a ${to}x`;
      const descPct = discountPct > 0 ? `${discountPct}% de desconto` : 'Sem desconto';
      return `${rangeText} (${descPct}): ${formatCurrency(total)}`;
    })
    .join(' | ');
}

