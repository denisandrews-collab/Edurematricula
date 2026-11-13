import React, { useMemo, useState } from 'react';
import { Student, IntegrationSettings, BillingCompanyRule } from '../types';
import { apiService } from '../services/apiService';
import { formatCurrency, formatDateBr } from '../utils/contractFormatter';
import {
  formatCnpj,
  getBillingRules,
  getCompanyBillingMix,
  getMatchSourceLabel,
  getRegisteredCompanies,
  resolveCompanyForStudent,
} from '../utils/companyResolver';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Search,
  Receipt,
  DollarSign,
  Building2,
  GitBranch,
  Landmark,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onOpenPortal: (student: Student) => void;
  settings: IntegrationSettings;
  onUpdateSettings?: (settings: IntegrationSettings) => void;
  onOpenCompaniesConfig?: () => void;
}

export function ItauPaymentHub({
  students,
  onUpdateStudents,
  onOpenPortal,
  settings,
  onUpdateSettings,
  onOpenCompaniesConfig,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('todas');
  const [serieFilter, setSerieFilter] = useState<string>('todas');
  const [turmaFilter, setTurmaFilter] = useState<string>('todas');
  const [selectedReceiptStudent, setSelectedReceiptStudent] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [onlySignedQueue, setOnlySignedQueue] = useState<boolean>(false);

  // Quick Bind multiple Séries / Turmas -> CNPJ Total right inside Billing Hub
  const [bindScope, setBindScope] = useState<'serie' | 'turma'>('serie');
  const [bindTargets, setBindTargets] = useState<string[]>([]);
  const [bindCompanyId, setBindCompanyId] = useState<string>(
    () => getRegisteredCompanies(settings)[0]?.id || ''
  );

  const companies = getRegisteredCompanies(settings);
  const billingRules = getBillingRules(settings);

  // Unique series & turmas for filtering & quick binding
  const uniqueSeries = useMemo(() => {
    const s = new Set(students.map((st) => st.serie).filter(Boolean));
    s.add('Berçário');
    s.add('Educação Infantil - Maternal');
    s.add('Educação Infantil - Pré I');
    s.add('Educação Infantil - Pré II');
    billingRules
      .filter((r) => r.scope === 'serie')
      .forEach((r) => s.add(r.targetValue));
    return Array.from(s);
  }, [students, billingRules]);

  const uniqueTurmas = useMemo(() => {
    const t = new Set(students.map((st) => st.turma).filter(Boolean));
    t.add('Berçário Integral');
    billingRules
      .filter((r) => r.scope === 'turma')
      .forEach((r) => t.add(r.targetValue));
    return Array.from(t);
  }, [students, billingRules]);

  // Queue filter: either all students (to build the billing mix by Série/Turma) or signed/paid only
  const baseQueueStudents = useMemo(() => {
    if (!onlySignedQueue) return students;
    return students.filter(
      (s) =>
        s.status === 'assinado' ||
        s.status === 'pagamento_pendente' ||
        s.status === 'pago' ||
        s.status === 'matricula_confirmada' ||
        s.autentiqueStatus === 'ASSINADO'
    );
  }, [students, onlySignedQueue]);

  const filteredStudents = useMemo(() => {
    return baseQueueStudents.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ra.toLowerCase().includes(searchTerm.toLowerCase());

      const { company } = resolveCompanyForStudent(s, settings);
      const matchesCompany = companyFilter === 'todas' || company.id === companyFilter;
      const matchesSerie = serieFilter === 'todas' || s.serie === serieFilter;
      const matchesTurma = turmaFilter === 'todas' || s.turma === turmaFilter;

      return matchesSearch && matchesCompany && matchesSerie && matchesTurma;
    });
  }, [baseQueueStudents, searchTerm, companyFilter, serieFilter, turmaFilter, settings]);

  const paidStudents = students.filter(
    (s) => s.status === 'pago' || s.status === 'matricula_confirmada'
  );

  const totalCollected = paidStudents.reduce(
    (acc, curr) => acc + (curr.selectedTotalAmount || curr.finalValue),
    0
  );
  const totalPending = students
    .filter((s) => s.status !== 'pago' && s.status !== 'matricula_confirmada')
    .reduce((acc, curr) => acc + (curr.selectedTotalAmount || curr.finalValue), 0);

  const companyMix = useMemo(
    () => getCompanyBillingMix(filteredStudents, settings),
    [filteredStudents, settings]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleBindTarget = (target: string) => {
    setBindTargets((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  };

  // Bind multiple Séries or Turmas to a CNPJ at the same time right from billing
  const handleBindGroupCnpj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSettings || bindTargets.length === 0 || !bindCompanyId) return;

    const nowIso = new Date().toISOString();
    const nextRules = [...billingRules];

    bindTargets.forEach((target, idx) => {
      const existingIdx = nextRules.findIndex(
        (r) => r.scope === bindScope && r.targetValue.toLowerCase() === target.toLowerCase()
      );
      const nextRule: BillingCompanyRule = {
        id:
          existingIdx >= 0
            ? nextRules[existingIdx].id
            : `rule_${Date.now().toString(36)}_${idx}`,
        scope: bindScope,
        targetValue: target,
        companyId: bindCompanyId,
        updatedAt: nowIso,
      };
      if (existingIdx >= 0) {
        nextRules[existingIdx] = nextRule;
      } else {
        nextRules.push(nextRule);
      }
    });

    onUpdateSettings({
      ...settings,
      billingRules: nextRules,
    });

    const chosenComp = companies.find((c) => c.id === bindCompanyId);
    const labelPlural = bindScope === 'serie' ? 'Série(s)' : 'Turma(s)';
    showToast(
      `CNPJ total vinculado: ${bindTargets.length} ${labelPlural} (${bindTargets.join(', ')}) agora cobram via ${chosenComp?.nomeFantasia} (${formatCnpj(chosenComp?.cnpj)}).`
    );
    setBindTargets([]);
  };

  // Per-student billing mix override directly in table row
  const handleChangeStudentCompany = (student: Student, nextCompanyId: string) => {
    const chosenCompany = companies.find((c) => c.id === nextCompanyId);
    const updated = students.map((s) => {
      if (s.id !== student.id) return s;
      return {
        ...s,
        companyId: nextCompanyId || undefined,
        historyLogs: [
          ...s.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: 'Empresa Recebedora (Mix CNPJ) Definida na Cobrança',
            details: nextCompanyId
              ? `Cobrança direcionada para ${chosenCompany?.nomeFantasia} (CNPJ ${formatCnpj(chosenCompany?.cnpj)}).`
              : 'Vínculo individual removido; seguindo regra automática da Série/Turma.',
          },
        ],
      };
    });
    onUpdateStudents(updated);
    if (chosenCompany) {
      showToast(
        `${student.name} direcionado para cobrança via ${chosenCompany.nomeFantasia} (${formatCnpj(chosenCompany.cnpj)}).`
      );
    }
  };

  const handleSimulatePaymentConfirmation = async (student: Student) => {
    const { company } = resolveCompanyForStudent(student, settings);
    const paymentId = student.itauPaymentId || 'pay_sim_' + student.id;
    const bankSummary = `Itaú Ag. ${company.itau.agency || '0910'} · Cc ${company.itau.account || '12345-6'}`;

    await apiService.simulateItauPaymentConfirm(paymentId);

    const updated = students.map((s) => {
      if (s.id === student.id) {
        return {
          ...s,
          status: 'matricula_confirmada' as const,
          itauPaymentStatus: 'PAID' as const,
          itauPaidAt: new Date().toISOString(),
          itauPaymentType: s.itauPaymentType || 'PIX',
          billedCompanyId: company.id,
          billedCompanyName: company.razaoSocial,
          billedCompanyCnpj: company.cnpj,
          billedBankSummary: bankSummary,
          historyLogs: [
            ...s.historyLogs,
            {
              timestamp: new Date().toISOString(),
              action: `Pagamento Liquidado (${company.nomeFantasia})`,
              details: `Valor de ${formatCurrency(student.selectedTotalAmount || student.finalValue)} creditado na conta ${bankSummary} (CNPJ ${formatCnpj(company.cnpj)}).`,
            },
          ],
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    showToast(
      `Pagamento de ${student.name} liquidado na conta da empresa ${company.nomeFantasia} (${formatCnpj(company.cnpj)})!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-500" />
            Central de Cobranças Multiempresa • Mix por Série, Turma e CNPJ
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Vincule cada <strong>Série ou Turma</strong> a um CNPJ específico (ex.: Berçário em outra empresa) e acompanhe o mix de recebimentos para cair na conta bancária certa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCompaniesConfig && (
            <button
              type="button"
              onClick={onOpenCompaniesConfig}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cadastro de Empresas ({companies.length})</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs flex items-center justify-between shadow-lg border border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
              Total Liquidado
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
              {formatCurrency(totalCollected)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
              {paidStudents.length} matrículas quitadas
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider">
              A Receber (Em Aberto)
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {formatCurrency(totalPending)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
              {students.length - paidStudents.length} alunos pendentes
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
              Empresas / CNPJs Ativos
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {companies.filter((c) => c.active).length} CNPJs
            </div>
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
              {billingRules.length} regras por Série/Turma
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mix por Empresa / CNPJ Breakdown */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>Mix de Cobrança por Empresa (CNPJ & Conta Recebedora)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Clique em uma empresa abaixo para filtrar os alunos cuja cobrança cairá naquela conta.
            </p>
          </div>
          {companyFilter !== 'todas' && (
            <button
              type="button"
              onClick={() => setCompanyFilter('todas')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer self-start sm:self-auto"
            >
              Mostrar Todas as Empresas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {companyMix.map((entry) => {
            const isSelected = companyFilter === entry.company.id;
            return (
              <button
                key={entry.company.id}
                type="button"
                onClick={() =>
                  setCompanyFilter(isSelected ? 'todas' : entry.company.id)
                }
                className={`text-left p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {entry.company.nomeFantasia}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 tabular-nums">
                      CNPJ: {formatCnpj(entry.company.cnpj)}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md tabular-nums shrink-0">
                    {entry.sharePercent}% do mix
                  </span>
                </div>

                {/* Share bar */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, entry.sharePercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400">Previsto: </span>
                    <strong className="text-slate-900 tabular-nums">
                      {formatCurrency(entry.totalExpected)}
                    </strong>
                    <span className="text-slate-400"> · </span>
                    <span className="text-emerald-700 font-semibold tabular-nums">
                      {formatCurrency(entry.paidTotal)} pago
                    </span>
                  </div>
                  <span className="font-semibold text-slate-600 tabular-nums">
                    {entry.studentCount} alunos
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-500 truncate pt-1 border-t border-slate-200/70">
                  Itaú Ag. {entry.company.itau.agency || '—'} · Cc {entry.company.itau.account || '—'} · PIX {entry.company.itau.pixKey || '—'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bind CNPJ Total per multiple Séries or Turmas right from Billing */}
        {onUpdateSettings && (
          <form
            onSubmit={handleBindGroupCnpj}
            className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vincular CNPJ Total por Série ou Turma na Cobrança (Seleção Múltipla)</span>
              </div>
              {bindTargets.length > 0 && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tabular-nums">
                  {bindTargets.length} {bindTargets.length === 1 ? 'selecionada' : 'selecionadas'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-600 mb-1">Agrupar por</label>
                <select
                  value={bindScope}
                  onChange={(e) => {
                    setBindScope(e.target.value as 'serie' | 'turma');
                    setBindTargets([]);
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="serie">Séries (Várias ao mesmo tempo)</option>
                  <option value="turma">Turmas (Várias ao mesmo tempo)</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-600 mb-1">
                  Cobrar pelo CNPJ da Empresa
                </label>
                <select
                  value={bindCompanyId}
                  onChange={(e) => setBindCompanyId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
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
                  id="btn-bind-group-cnpj"
                  type="submit"
                  disabled={bindTargets.length === 0}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition cursor-pointer whitespace-nowrap"
                >
                  Vincular CNPJ{bindTargets.length > 0 ? ` (${bindTargets.length})` : ''}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">
                  Marque as {bindScope === 'serie' ? 'séries' : 'turmas'} que deseja vincular a este CNPJ:
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setBindTargets(bindScope === 'serie' ? uniqueSeries : uniqueTurmas)
                    }
                    className="font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                  >
                    Selecionar todas ({(bindScope === 'serie' ? uniqueSeries : uniqueTurmas).length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setBindTargets([])}
                    className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                {(bindScope === 'serie' ? uniqueSeries : uniqueTurmas).map((item) => {
                  const isChecked = bindTargets.includes(item);
                  const existingRule = billingRules.find(
                    (r) =>
                      r.scope === bindScope && r.targetValue.toLowerCase() === item.toLowerCase()
                  );
                  const currentComp = existingRule
                    ? companies.find((c) => c.id === existingRule.companyId)
                    : undefined;

                  return (
                    <label
                      key={item}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBindTarget(item)}
                        className="mt-0.5 w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate leading-tight">{item}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {currentComp
                            ? `Atual: ${currentComp.nomeFantasia}`
                            : 'Matriz Padrão'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Transactions & Billing Routing Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800 tabular-nums">
              Fila de Cobrança Multiempresa ({filteredStudents.length})
            </h2>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlySignedQueue}
                onChange={(e) => setOnlySignedQueue(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Somente contratos já assinados</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por Série"
              value={serieFilter}
              onChange={(e) => setSerieFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
            >
              <option value="todas">Todas as Séries</option>
              {uniqueSeries.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por Turma"
              value={turmaFilter}
              onChange={(e) => setTurmaFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
            >
              <option value="todas">Todas as Turmas</option>
              {uniqueTurmas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar aluno, RA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Aluno & Série / Turma</th>
                <th className="py-3.5 px-4 font-semibold">Empresa Cobradora (Mix CNPJ)</th>
                <th className="py-3.5 px-4 font-semibold">Valor</th>
                <th className="py-3.5 px-4 font-semibold">Status Pagamento</th>
                <th className="py-3.5 px-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isPaid =
                    student.status === 'pago' || student.status === 'matricula_confirmada';
                  const { company: resolvedCompany, matchSource } = resolveCompanyForStudent(
                    student,
                    settings
                  );
                  const displayAmount = student.selectedTotalAmount || student.finalValue;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {student.serie} · {student.turma} · <span className="font-mono">{student.ra}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-[260px]">
                          <select
                            aria-label={`Empresa cobradora de ${student.name}`}
                            value={student.companyId || ''}
                            disabled={isPaid}
                            onChange={(e) => handleChangeStudentCompany(student, e.target.value)}
                            className={`w-full px-2 py-1 text-[11px] font-semibold rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isPaid
                                ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-800 cursor-pointer'
                            }`}
                          >
                            <option value="">
                              Automático ({resolvedCompany.nomeFantasia})
                            </option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nomeFantasia} ({formatCnpj(c.cnpj)})
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap tabular-nums">
                            <span className="font-sans font-semibold text-indigo-700">
                              {getMatchSourceLabel(matchSource)}
                            </span>
                            <span>·</span>
                            <span>{formatCnpj(student.billedCompanyCnpj || resolvedCompany.cnpj)}</span>
                            <span>·</span>
                            <span>Ag. {resolvedCompany.itau.agency || '0910'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(displayAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 tabular-nums">
                          Venc: {formatDateBr(student.dueDate)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Pago ({student.itauPaymentType || 'PIX'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                            Aguardando
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptStudent(student)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Comprovante</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSimulatePaymentConfirmation(student)}
                              title={`Confirmar liquidação na conta ${resolvedCompany.nomeFantasia}`}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer whitespace-nowrap"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Confirmar Pgto</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenPortal(student)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Checkout</span>
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

      {/* Official Receipt Modal with Routed Company & Bank Account */}
      {selectedReceiptStudent && (() => {
        const { company: receiptComp } = resolveCompanyForStudent(selectedReceiptStudent, settings);
        const compName = selectedReceiptStudent.billedCompanyName || receiptComp.razaoSocial;
        const compCnpj = selectedReceiptStudent.billedCompanyCnpj || receiptComp.cnpj;
        const bankSummary =
          selectedReceiptStudent.billedBankSummary ||
          `Itaú Ag. ${receiptComp.itau.agency || '0910'} · Cc ${receiptComp.itau.account || '12345-6'}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Comprovante de Rematrícula 2026
                    </h3>
                    <p className="text-xs text-slate-500">{bankSummary} · Liquidação Confirmada</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptStudent(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Protocolo de Rematrícula:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedReceiptStudent.protocolNumber || 'REM-2026-001'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 shrink-0">Empresa Recebedora:</span>
                  <span className="font-bold text-slate-900 text-right">{compName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CNPJ Recebedor:</span>
                  <span className="font-mono font-bold text-indigo-700 tabular-nums">
                    {formatCnpj(compCnpj)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conta Destino:</span>
                  <span className="font-mono text-slate-800">{bankSummary}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500">Aluno:</span>
                  <span className="font-bold text-slate-900">{selectedReceiptStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Série / Turma:</span>
                  <span className="text-slate-800">
                    {selectedReceiptStudent.serie} · {selectedReceiptStudent.turma}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsável Financeiro:</span>
                  <span className="text-slate-800">{selectedReceiptStudent.responsibleName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Pago:</span>
                  <span className="font-bold text-emerald-700 text-sm tabular-nums">
                    {formatCurrency(
                      selectedReceiptStudent.selectedTotalAmount ||
                        selectedReceiptStudent.finalValue
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Forma de Pagamento:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReceiptStudent.itauPaymentType || 'PIX'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data da Liquidação:</span>
                  <span className="text-slate-700 tabular-nums">
                    {selectedReceiptStudent.itauPaidAt
                      ? new Date(selectedReceiptStudent.itauPaidAt).toLocaleString('pt-BR')
                      : '14/08/2026 11:30'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Imprimir Comprovante
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptStudent(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
