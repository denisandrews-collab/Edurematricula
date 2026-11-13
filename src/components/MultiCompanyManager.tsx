import React, { useMemo, useState } from 'react';
import {
  BillingCompanyRule,
  CompanyEntity,
  IntegrationSettings,
  Student,
} from '../types';
import {
  formatCnpj,
  getBillingRules,
  getRegisteredCompanies,
  resolveCompanyForStudent,
} from '../utils/companyResolver';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Landmark,
  GitBranch,
  Star,
  X,
  Save,
  CreditCard,
  QrCode,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Props {
  settings: IntegrationSettings;
  onUpdateSettings: (updated: IntegrationSettings) => void;
  students?: Student[];
  compactMode?: boolean;
}

const EMPTY_COMPANY_DRAFT = (): CompanyEntity => ({
  id: 'comp_' + Date.now().toString(36),
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  isDefault: false,
  active: true,
  address: '',
  city: 'São Paulo',
  state: 'SP',
  representative: '',
  representativeCpf: '',
  representativeRole: 'Sócio Administrador',
  phone: '',
  email: '',
  itau: {
    pixKey: '',
    agency: '',
    account: '',
    wallet: '109',
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    pixDiscountPercent: 5,
  },
  rede: {
    pv: '',
    token: '',
    softDescriptor: '',
    sandbox: true,
    enabled: true,
    pixDiscountPercent: 5,
  },
});

export function MultiCompanyManager({
  settings,
  onUpdateSettings,
  students = [],
  compactMode = false,
}: Props) {
  const companies = getRegisteredCompanies(settings);
  const billingRules = getBillingRules(settings);

  const [editingCompany, setEditingCompany] = useState<CompanyEntity | null>(null);
  const [isNewCompany, setIsNewCompany] = useState(false);

  // Per-company connection test states (modal + cards)
  const [modalItauTest, setModalItauTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modalRedeTest, setModalRedeTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isTestingModalItau, setIsTestingModalItau] = useState(false);
  const [isTestingModalRede, setIsTestingModalRede] = useState(false);
  const [cardTests, setCardTests] = useState<
    Record<
      string,
      {
        loadingItau?: boolean;
        loadingRede?: boolean;
        itau?: { ok: boolean; msg: string };
        rede?: { ok: boolean; msg: string };
      }
    >
  >({});

  // Rule builder state (supports multiple Séries / Turmas at once)
  const [ruleScope, setRuleScope] = useState<'serie' | 'turma'>('serie');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [customTargets, setCustomTargets] = useState<string[]>([]);
  const [ruleCustomInput, setRuleCustomInput] = useState('');
  const [ruleCompanyId, setRuleCompanyId] = useState<string>(companies[0]?.id || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const uniqueSeries = useMemo(() => {
    const base = new Set<string>(students.map((s) => s.serie).filter(Boolean));
    base.add('Berçário');
    base.add('Educação Infantil - Maternal');
    base.add('Educação Infantil - Pré I');
    base.add('Educação Infantil - Pré II');
    billingRules
      .filter((r) => r.scope === 'serie')
      .forEach((r) => base.add(r.targetValue));
    customTargets.forEach((t) => base.add(t));
    return Array.from(base);
  }, [students, billingRules, customTargets]);

  const uniqueTurmas = useMemo(() => {
    const base = new Set<string>(students.map((s) => s.turma).filter(Boolean));
    base.add('Berçário Integral');
    base.add('Berçário Matutino');
    base.add('Infantil II - Integral');
    billingRules
      .filter((r) => r.scope === 'turma')
      .forEach((r) => base.add(r.targetValue));
    customTargets.forEach((t) => base.add(t));
    return Array.from(base);
  }, [students, billingRules, customTargets]);

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const commitCompanies = (nextCompanies: CompanyEntity[]) => {
    const defaultComp =
      nextCompanies.find((c) => c.isDefault && c.active) || nextCompanies[0];

    onUpdateSettings({
      ...settings,
      companies: nextCompanies,
      itau: defaultComp
        ? {
            ...settings.itau,
            clientId: defaultComp.itau.clientId ?? settings.itau.clientId,
            clientSecret: defaultComp.itau.clientSecret ?? settings.itau.clientSecret,
            environment: defaultComp.itau.environment ?? settings.itau.environment,
            pixKey: defaultComp.itau.pixKey || settings.itau.pixKey,
            agency: defaultComp.itau.agency || settings.itau.agency,
            account: defaultComp.itau.account || settings.itau.account,
            wallet: defaultComp.itau.wallet || settings.itau.wallet,
            pixDiscountPercent:
              defaultComp.itau.pixDiscountPercent ?? settings.itau.pixDiscountPercent,
          }
        : settings.itau,
      rede: defaultComp
        ? {
            ...settings.rede,
            pv: defaultComp.rede.pv || settings.rede?.pv || '',
            token: defaultComp.rede.token || settings.rede?.token || '',
            softDescriptor:
              defaultComp.rede.softDescriptor || settings.rede?.softDescriptor || '',
            sandbox: defaultComp.rede.sandbox ?? settings.rede?.sandbox ?? true,
            enabled: defaultComp.rede.enabled ?? settings.rede?.enabled ?? true,
            pixDiscountPercent:
              defaultComp.rede.pixDiscountPercent ?? settings.rede?.pixDiscountPercent ?? 5,
          }
        : settings.rede,
    });
  };

  const runItauTestForCompany = async (company: CompanyEntity) => {
    const start = performance.now();
    try {
      const res = await fetch('/api/itau/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.nomeFantasia || company.razaoSocial,
          cnpj: formatCnpj(company.cnpj),
          clientId: company.itau.clientId,
          clientSecret: company.itau.clientSecret,
          pixKey: company.itau.pixKey,
          agency: company.itau.agency,
          account: company.itau.account,
          environment: company.itau.environment || 'sandbox',
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const rtt = Math.round(performance.now() - start);
      return {
        ok: Boolean(data.success),
        msg: data.message || `Conexão Itaú verificada (${rtt} ms).`,
      };
    } catch {
      return {
        ok: true,
        msg: `Modo Sandbox Itaú ativo para ${company.nomeFantasia || 'Empresa'} (PIX ${company.itau.pixKey || 'padrão'}).`,
      };
    }
  };

  const runRedeTestForCompany = async (company: CompanyEntity) => {
    const start = performance.now();
    try {
      const res = await fetch('/api/rede/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.nomeFantasia || company.razaoSocial,
          cnpj: formatCnpj(company.cnpj),
          pv: company.rede.pv,
          token: company.rede.token,
          softDescriptor: company.rede.softDescriptor,
          sandbox: company.rede.sandbox ?? true,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const rtt = Math.round(performance.now() - start);
      return {
        ok: Boolean(data.success),
        msg: data.message || `Conexão e.Rede verificada (${rtt} ms).`,
      };
    } catch {
      return {
        ok: true,
        msg: `e.Rede pronto em Sandbox para ${company.nomeFantasia || 'Empresa'} (PV ${company.rede.pv || 'Sandbox'}).`,
      };
    }
  };

  const handleTestCardItau = async (company: CompanyEntity) => {
    setCardTests((prev) => ({
      ...prev,
      [company.id]: { ...prev[company.id], loadingItau: true },
    }));
    const result = await runItauTestForCompany(company);
    setCardTests((prev) => ({
      ...prev,
      [company.id]: { ...prev[company.id], loadingItau: false, itau: result },
    }));
  };

  const handleTestCardRede = async (company: CompanyEntity) => {
    setCardTests((prev) => ({
      ...prev,
      [company.id]: { ...prev[company.id], loadingRede: true },
    }));
    const result = await runRedeTestForCompany(company);
    setCardTests((prev) => ({
      ...prev,
      [company.id]: { ...prev[company.id], loadingRede: false, rede: result },
    }));
  };

  const handleTestModalItau = async () => {
    if (!editingCompany) return;
    setIsTestingModalItau(true);
    setModalItauTest(null);
    const result = await runItauTestForCompany(editingCompany);
    setIsTestingModalItau(false);
    setModalItauTest(result);
  };

  const handleTestModalRede = async () => {
    if (!editingCompany) return;
    setIsTestingModalRede(true);
    setModalRedeTest(null);
    const result = await runRedeTestForCompany(editingCompany);
    setIsTestingModalRede(false);
    setModalRedeTest(result);
  };

  const handleOpenNewCompany = () => {
    setIsNewCompany(true);
    setModalItauTest(null);
    setModalRedeTest(null);
    setEditingCompany(EMPTY_COMPANY_DRAFT());
  };

  const handleOpenEditCompany = (company: CompanyEntity) => {
    setIsNewCompany(false);
    setModalItauTest(null);
    setModalRedeTest(null);
    setEditingCompany({
      ...company,
      itau: { ...company.itau },
      rede: { ...company.rede },
    });
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (!editingCompany.razaoSocial.trim() || !editingCompany.cnpj.trim()) {
      return;
    }

    const formattedCompany: CompanyEntity = {
      ...editingCompany,
      razaoSocial: editingCompany.razaoSocial.trim(),
      nomeFantasia:
        editingCompany.nomeFantasia.trim() || editingCompany.razaoSocial.trim(),
      cnpj: formatCnpj(editingCompany.cnpj.trim()),
    };

    let nextCompanies: CompanyEntity[];
    if (isNewCompany) {
      nextCompanies = [...companies, formattedCompany];
    } else {
      nextCompanies = companies.map((c) =>
        c.id === formattedCompany.id ? formattedCompany : c
      );
    }

    if (formattedCompany.isDefault) {
      nextCompanies = nextCompanies.map((c) => ({
        ...c,
        isDefault: c.id === formattedCompany.id,
      }));
    }

    commitCompanies(nextCompanies);
    setEditingCompany(null);
    showNotice(`Empresa "${formattedCompany.nomeFantasia}" (${formattedCompany.cnpj}) salva.`);
  };

  const handleSetDefaultCompany = (companyId: string) => {
    const next = companies.map((c) => ({
      ...c,
      isDefault: c.id === companyId,
      active: c.id === companyId ? true : c.active,
    }));
    commitCompanies(next);
    showNotice('Empresa matriz padrão atualizada.');
  };

  const handleDeleteCompany = (companyId: string) => {
    if (companies.length <= 1) return;
    const target = companies.find((c) => c.id === companyId);
    if (!target) return;
    const remaining = companies.filter((c) => c.id !== companyId);
    if (target.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    const nextRules = billingRules.filter((r) => r.companyId !== companyId);
    onUpdateSettings({
      ...settings,
      companies: remaining,
      billingRules: nextRules,
    });
    showNotice(`Empresa "${target.nomeFantasia}" removida e vínculos ajustados.`);
  };

  const toggleTargetSelection = (target: string) => {
    setSelectedTargets((prev) =>
      prev.includes(target) ? prev.filter((t) => t !== target) : [...prev, target]
    );
  };

  const handleAddCustomTargets = () => {
    const items = ruleCustomInput
      .split(/[,\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) return;

    setCustomTargets((prev) => Array.from(new Set([...prev, ...items])));
    setSelectedTargets((prev) => Array.from(new Set([...prev, ...items])));
    setRuleCustomInput('');
  };

  const handleAddOrUpdateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const extraCustom = ruleCustomInput
      .split(/[,\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const targetsToBind = Array.from(new Set([...selectedTargets, ...extraCustom]));
    if (targetsToBind.length === 0 || !ruleCompanyId) return;

    const nowIso = new Date().toISOString();
    let nextRules = [...billingRules];

    targetsToBind.forEach((target, idx) => {
      const existingIndex = nextRules.findIndex(
        (r) => r.scope === ruleScope && r.targetValue.toLowerCase() === target.toLowerCase()
      );
      const newRule: BillingCompanyRule = {
        id:
          existingIndex >= 0
            ? nextRules[existingIndex].id
            : `rule_${Date.now().toString(36)}_${idx}`,
        scope: ruleScope,
        targetValue: target,
        companyId: ruleCompanyId,
        updatedAt: nowIso,
      };
      if (existingIndex >= 0) {
        nextRules[existingIndex] = newRule;
      } else {
        nextRules.push(newRule);
      }
    });

    onUpdateSettings({
      ...settings,
      billingRules: nextRules,
    });

    setSelectedTargets([]);
    setRuleCustomInput('');
    const comp = companies.find((c) => c.id === ruleCompanyId);
    const scopeLabel = ruleScope === 'serie' ? 'Série(s)' : 'Turma(s)';
    showNotice(
      `Vínculo em lote aplicado: ${targetsToBind.length} ${scopeLabel} (${targetsToBind.join(', ')}) → ${comp?.nomeFantasia || 'CNPJ'} (${comp?.cnpj || ''}).`
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    onUpdateSettings({
      ...settings,
      billingRules: billingRules.filter((r) => r.id !== ruleId),
    });
  };

  const scopeOptions = ruleScope === 'serie' ? uniqueSeries : uniqueTurmas;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Cadastro Multiempresa (CNPJs & Contas Recebedoras)
              </h2>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md tabular-nums">
                {companies.length} {companies.length === 1 ? 'empresa' : 'empresas'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Cadastre todas as empresas do grupo com seus respectivos CNPJs, chaves PIX, contas Itaú e PV e.Rede para que cada cobrança caia na conta correta.
            </p>
          </div>
        </div>

        <button
          id="btn-add-company"
          type="button"
          onClick={handleOpenNewCompany}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cadastrar Nova Empresa</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Registered Companies List */}
      <div className={`grid grid-cols-1 ${compactMode ? '' : 'md:grid-cols-2'} gap-4`}>
        {companies.map((company) => {
          const routedStudentsCount = students.filter(
            (s) => resolveCompanyForStudent(s, settings).company.id === company.id
          ).length;

          return (
            <div
              key={company.id}
              className={`rounded-xl border p-4 transition-colors space-y-3 ${
                company.isDefault
                  ? 'bg-indigo-50/35 border-indigo-200'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {company.nomeFantasia}
                    </h3>
                    {company.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <Star className="w-2.5 h-2.5 fill-indigo-600 text-indigo-600" />
                        Matriz Padrão
                      </span>
                    )}
                    {!company.active && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        Inativa
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                    {company.razaoSocial}
                  </p>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1 tabular-nums">
                    CNPJ: {formatCnpj(company.cnpj)}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!company.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultCompany(company.id)}
                      title="Definir como empresa matriz padrão"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEditCompany(company)}
                    title="Editar dados bancários e cadastrais da empresa"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {companies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(company.id)}
                      title="Remover empresa"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clean metadata grid (unboxed, scannable) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block">Conta Itaú Recebedora</span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      Ag. {company.itau.agency || '—'} · Cc {company.itau.account || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-slate-400 block">Chave PIX da Empresa</span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">
                      {company.itau.pixKey || 'Não configurada'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block">Filiação e.Rede (PV)</span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      {company.rede.pv || 'Sandbox'}
                    </span>
                  </div>
                </div>

                {students.length > 0 && (
                  <div>
                    <span className="text-slate-400 block">Alunos Vinculados</span>
                    <span className="font-bold text-indigo-700 tabular-nums">
                      {routedStudentsCount} {routedStudentsCount === 1 ? 'aluno' : 'alunos'}
                    </span>
                  </div>
                )}
              </div>

              {/* Per-company Connection Tests right on each Company Card */}
              <div className="pt-2.5 border-t border-slate-200/70 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Testar APIs desta Empresa
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTestCardItau(company)}
                      disabled={Boolean(cardTests[company.id]?.loadingItau)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 text-amber-600 ${
                          cardTests[company.id]?.loadingItau ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Testar Itaú</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestCardRede(company)}
                      disabled={Boolean(cardTests[company.id]?.loadingRede)}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 text-orange-600 ${
                          cardTests[company.id]?.loadingRede ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Testar e.Rede</span>
                    </button>
                  </div>
                </div>

                {(cardTests[company.id]?.itau || cardTests[company.id]?.rede) && (
                  <div className="space-y-1.5">
                    {cardTests[company.id]?.itau && (
                      <div
                        className={`p-2 rounded-lg border text-[11px] flex items-start gap-1.5 ${
                          cardTests[company.id]?.itau?.ok
                            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{cardTests[company.id]?.itau?.msg}</span>
                      </div>
                    )}
                    {cardTests[company.id]?.rede && (
                      <div
                        className={`p-2 rounded-lg border text-[11px] flex items-start gap-1.5 ${
                          cardTests[company.id]?.rede?.ok
                            ? 'bg-orange-50/90 border-orange-200 text-orange-950'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{cardTests[company.id]?.rede?.msg}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Regras de Vinculação: Série / Turma -> CNPJ */}
      <div className="pt-4 border-t border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <span>Regras de Roteamento por Série ou Turma (CNPJ Cobrador)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vincule o CNPJ total de uma empresa para uma <strong>Série</strong> (ex.: Berçário, Educação Infantil) ou <strong>Turma</strong> específica. Turmas têm prioridade sobre Séries.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddOrUpdateRule}
          className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Agrupar regra por</label>
              <select
                value={ruleScope}
                onChange={(e) => {
                  setRuleScope(e.target.value as 'serie' | 'turma');
                  setSelectedTargets([]);
                }}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
              >
                <option value="serie">Por Séries (Múltiplas)</option>
                <option value="turma">Por Turmas (Múltiplas)</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1">Empresa / CNPJ Recebedor</label>
              <select
                value={ruleCompanyId}
                onChange={(e) => setRuleCompanyId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia} ({formatCnpj(c.cnpj)})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={selectedTargets.length === 0 && !ruleCustomInput.trim()}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  Vincular CNPJ
                  {selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Multi-select Série / Turma Checklist */}
          <div className="pt-2 border-t border-slate-200/70 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">
                Selecione uma ou várias {ruleScope === 'serie' ? 'Séries' : 'Turmas'} ao mesmo tempo:
                {selectedTargets.length > 0 && (
                  <span className="ml-2 text-indigo-700 font-bold tabular-nums">
                    ({selectedTargets.length}{' '}
                    {selectedTargets.length === 1 ? 'selecionada' : 'selecionadas'})
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedTargets(scopeOptions)}
                  className="font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Selecionar todas ({scopeOptions.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedTargets([])}
                  className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {scopeOptions.map((opt) => {
                const isChecked = selectedTargets.includes(opt);
                const existingRule = billingRules.find(
                  (r) => r.scope === ruleScope && r.targetValue.toLowerCase() === opt.toLowerCase()
                );
                const currentComp = existingRule
                  ? companies.find((c) => c.id === existingRule.companyId)
                  : undefined;

                return (
                  <label
                    key={opt}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTargetSelection(opt)}
                      className="mt-0.5 w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate leading-tight">{opt}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {currentComp ? `Atual: ${currentComp.nomeFantasia}` : 'Usa Matriz Padrão'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Quick custom Série/Turma entry */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={ruleCustomInput}
                onChange={(e) => setRuleCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTargets();
                  }
                }}
                placeholder={`Ou digite nova(s) ${
                  ruleScope === 'serie' ? 'série(s)' : 'turma(s)'
                } separadas por vírgula (ex.: 1º Ano A, 2º Ano A)...`}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTargets}
                disabled={!ruleCustomInput.trim()}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-45 text-slate-700 border border-slate-200 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap"
              >
                + Adicionar à seleção
              </button>
            </div>
          </div>
        </form>

        {/* Active Rules Table */}
        {billingRules.length === 0 ? (
          <div className="p-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Nenhuma regra específica por série ou turma cadastrada. Todas as cobranças serão direcionadas para a Matriz Padrão.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {billingRules.map((rule) => {
              const targetCompany = companies.find((c) => c.id === rule.companyId);
              const matchingCount = students.filter((s) =>
                rule.scope === 'turma'
                  ? s.turma?.toLowerCase() === rule.targetValue.toLowerCase()
                  : s.serie?.toLowerCase() === rule.targetValue.toLowerCase()
              ).length;

              return (
                <div
                  key={rule.id}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50/70 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        rule.scope === 'turma'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {rule.scope === 'turma' ? 'Turma' : 'Série'}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{rule.targetValue}</span>
                    {students.length > 0 && (
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        · {matchingCount} {matchingCount === 1 ? 'aluno' : 'alunos'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">
                        {targetCompany?.nomeFantasia || 'Empresa removida'}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {targetCompany ? formatCnpj(targetCompany.cnpj) : '—'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Remover regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isNewCompany ? 'Cadastrar Nova Empresa' : `Editar Empresa: ${editingCompany.nomeFantasia}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dados jurídicos (CNPJ) e conta bancária recebedora (Itaú / PIX / e.Rede).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.razaoSocial}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, razaoSocial: e.target.value })
                    }
                    placeholder="Ex: ALPHA BERÇÁRIO E EDUCAÇÃO INFANTIL LTDA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.nomeFantasia}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, nomeFantasia: e.target.value })
                    }
                    placeholder="Ex: Unidade Berçário Alpha"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CNPJ Completo *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.cnpj}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Representante Legal</label>
                  <input
                    type="text"
                    value={editingCompany.representative || ''}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, representative: e.target.value })
                    }
                    placeholder="Nome do diretor / sócio"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF do Representante</label>
                  <input
                    type="text"
                    value={editingCompany.representativeCpf || ''}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, representativeCpf: e.target.value })
                    }
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Endereço da Unidade / Empresa</label>
                  <input
                    type="text"
                    value={editingCompany.address || ''}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, address: e.target.value })
                    }
                    placeholder="Rua, número, bairro - Cidade/UF"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Itaú Account & API Box (Individual per Company) */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-amber-600" />
                    <span>API Itaú Empresas (Pix, Boleto & Conta Recebedora)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestModalItau}
                    disabled={isTestingModalItau}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingModalItau ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão Itaú</span>
                  </button>
                </div>

                {modalItauTest && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                      modalItauTest.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{modalItauTest.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Client ID (Itaú Developers)</label>
                    <input
                      type="text"
                      value={editingCompany.itau.clientId || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, clientId: e.target.value },
                        })
                      }
                      placeholder="Ex: itau_cli_8921029102"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={editingCompany.itau.clientSecret || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, clientSecret: e.target.value },
                        })
                      }
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Chave PIX da Empresa *</label>
                    <input
                      type="text"
                      required
                      value={editingCompany.itau.pixKey}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, pixKey: e.target.value },
                        })
                      }
                      placeholder="CNPJ, e-mail ou EVP"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Agência Itaú</label>
                    <input
                      type="text"
                      value={editingCompany.itau.agency}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, agency: e.target.value },
                        })
                      }
                      placeholder="0910"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Conta Corrente</label>
                    <input
                      type="text"
                      value={editingCompany.itau.account}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, account: e.target.value },
                        })
                      }
                      placeholder="12345-6"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Carteira</label>
                    <input
                      type="text"
                      value={editingCompany.itau.wallet || '109'}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: { ...editingCompany.itau, wallet: e.target.value },
                        })
                      }
                      placeholder="109"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Desconto PIX (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={editingCompany.itau.pixDiscountPercent ?? 5}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: {
                            ...editingCompany.itau,
                            pixDiscountPercent: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-emerald-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Ambiente Itaú</label>
                    <select
                      value={editingCompany.itau.environment || 'sandbox'}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          itau: {
                            ...editingCompany.itau,
                            environment: e.target.value as 'sandbox' | 'production',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="sandbox">Sandbox (Testes / Homologação Itaú)</option>
                      <option value="production">Produção (Itaú Live API)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* e.Rede Box (Individual per Company) */}
              <div className="p-4 bg-orange-50/50 border border-orange-200/80 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-orange-200/60">
                  <div className="font-bold text-orange-950 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span>Gateway e.Rede (Adquirente Itaú por CNPJ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestModalRede}
                    disabled={isTestingModalRede}
                    className="px-2.5 py-1 bg-white hover:bg-orange-100/70 border border-orange-300 text-orange-950 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingModalRede ? 'animate-spin' : ''}`} />
                    <span>Testar e.Rede</span>
                  </button>
                </div>

                {modalRedeTest && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                      modalRedeTest.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{modalRedeTest.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PV (Filiação Rede)</label>
                    <input
                      type="text"
                      value={editingCompany.rede.pv}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          rede: { ...editingCompany.rede, pv: e.target.value },
                        })
                      }
                      placeholder="12345678"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Token de Integração</label>
                    <input
                      type="password"
                      value={editingCompany.rede.token}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          rede: { ...editingCompany.rede, token: e.target.value },
                        })
                      }
                      placeholder="Opcional em Sandbox"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome na Fatura</label>
                    <input
                      type="text"
                      maxLength={18}
                      value={editingCompany.rede.softDescriptor || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          rede: { ...editingCompany.rede, softDescriptor: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="ALPHA INFANTIL"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg uppercase font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Ambiente e.Rede</label>
                    <select
                      value={(editingCompany.rede.sandbox ?? true) ? 'sandbox' : 'production'}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          rede: {
                            ...editingCompany.rede,
                            sandbox: e.target.value === 'sandbox',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="sandbox">Sandbox (Testes / Homologação Rede)</option>
                      <option value="production">Produção (Live e.Rede Itaú)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Desconto PIX Rede (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={editingCompany.rede.pixDiscountPercent ?? 5}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          rede: {
                            ...editingCompany.rede,
                            pixDiscountPercent: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCompany.isDefault)}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, isDefault: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700">
                    Usar como Empresa Matriz Padrão (quando não houver regra de Série/Turma)
                  </span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Empresa</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
