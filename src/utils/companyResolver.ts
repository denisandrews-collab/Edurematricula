import {
  BillingCompanyRule,
  CompanyEntity,
  ContractTemplate,
  IntegrationSettings,
  Student,
} from '../types';

export type CompanyMatchSource = 'override' | 'student' | 'turma' | 'serie' | 'default';

export const DEFAULT_COMPANIES: CompanyEntity[] = [
  {
    id: 'comp_matriz_alpha',
    razaoSocial: 'COLÉGIO MODELO ALPHA DE EDUCAÇÃO BÁSICA LTDA',
    nomeFantasia: 'Colégio Modelo Alpha (Matriz)',
    cnpj: '12.345.678/0001-90',
    isDefault: true,
    active: true,
    address: 'Avenida Paulista, 1500 - Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    representative: 'Prof. Carlos Eduardo Silveira',
    representativeCpf: '111.222.333-44',
    representativeRole: 'Diretor Geral e Representante Legal',
    phone: '(11) 3456-7890',
    email: 'secretaria@colegiomodeloalpha.com.br',
    itau: {
      pixKey: 'financeiro@colegiomodeloalpha.com.br',
      agency: '0910',
      account: '12345-6',
      wallet: '109',
      environment: 'sandbox',
      clientId: '',
      clientSecret: '',
    },
    rede: {
      pv: '12345678',
      token: '',
      softDescriptor: 'COL ALPHA MATRIZ',
      sandbox: true,
      enabled: true,
    },
  },
  {
    id: 'comp_bercario_alpha',
    razaoSocial: 'ALPHA BERÇÁRIO E EDUCAÇÃO INFANTIL LTDA',
    nomeFantasia: 'Alpha Berçário & Infantil (Unidade II)',
    cnpj: '23.456.789/0001-12',
    isDefault: false,
    active: true,
    address: 'Rua Pamplona, 820 - Jardim Paulista',
    city: 'São Paulo',
    state: 'SP',
    representative: 'Profa. Beatriz Helena Vasconcelos',
    representativeCpf: '222.333.444-55',
    representativeRole: 'Diretora Pedagógica e Sócia Administradora',
    phone: '(11) 3456-7895',
    email: 'financeiro.infantil@colegiomodeloalpha.com.br',
    itau: {
      pixKey: '23456789000112',
      agency: '4420',
      account: '88910-2',
      wallet: '109',
      environment: 'sandbox',
      clientId: '',
      clientSecret: '',
    },
    rede: {
      pv: '87654321',
      token: '',
      softDescriptor: 'ALPHA INFANTIL',
      sandbox: true,
      enabled: true,
    },
  },
];

export const DEFAULT_BILLING_RULES: BillingCompanyRule[] = [
  {
    id: 'rule_infantil_pre2',
    scope: 'serie',
    targetValue: 'Educação Infantil - Pré II',
    companyId: 'comp_bercario_alpha',
    updatedAt: '2026-08-14T10:00:00Z',
  },
];

export function normalizeCnpj(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

export function formatCnpj(value?: string): string {
  const digits = normalizeCnpj(value);
  if (digits.length !== 14) return value || '';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function normalizeLabel(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function getRegisteredCompanies(settings?: IntegrationSettings): CompanyEntity[] {
  if (settings?.companies && settings.companies.length > 0) {
    return settings.companies;
  }

  // Fallback synthesized from single settings if older localStorage data lacks companies[]
  const base = { ...DEFAULT_COMPANIES[0] };
  if (settings?.itau) {
    base.itau = {
      ...base.itau,
      pixKey: settings.itau.pixKey || base.itau.pixKey,
      agency: settings.itau.agency || base.itau.agency,
      account: settings.itau.account || base.itau.account,
      wallet: settings.itau.wallet || base.itau.wallet,
      clientId: settings.itau.clientId || '',
      clientSecret: settings.itau.clientSecret || '',
      environment: settings.itau.environment || 'sandbox',
    };
  }
  if (settings?.rede) {
    base.rede = {
      ...base.rede,
      pv: settings.rede.pv || base.rede.pv,
      token: settings.rede.token || '',
      softDescriptor: settings.rede.softDescriptor || base.rede.softDescriptor,
      sandbox: settings.rede.sandbox ?? true,
      enabled: settings.rede.enabled ?? true,
    };
  }
  return [base, ...DEFAULT_COMPANIES.slice(1)];
}

export function getBillingRules(settings?: IntegrationSettings): BillingCompanyRule[] {
  if (settings?.billingRules) {
    return settings.billingRules;
  }
  return DEFAULT_BILLING_RULES;
}

export function getDefaultCompany(settings?: IntegrationSettings): CompanyEntity {
  const companies = getRegisteredCompanies(settings);
  return (
    companies.find((c) => c.isDefault && c.active) ||
    companies.find((c) => c.active) ||
    companies[0] ||
    DEFAULT_COMPANIES[0]
  );
}

/**
 * Precedência de Roteamento Multiempresa na Cobrança:
 * 1. Override explícito passado no momento da cobrança / simulação
 * 2. Vínculo direto no cadastro do aluno (student.companyId)
 * 3. Regra exata por Turma (scope === 'turma')
 * 4. Regra exata por Série (scope === 'serie')
 * 5. Empresa Matriz Padrão (isDefault)
 */
export function resolveCompanyForStudent(
  student: Pick<Student, 'serie' | 'turma' | 'companyId'>,
  settings?: IntegrationSettings,
  explicitCompanyIdOverride?: string
): {
  company: CompanyEntity;
  matchSource: CompanyMatchSource;
  matchedRule?: BillingCompanyRule;
} {
  const companies = getRegisteredCompanies(settings);
  const rules = getBillingRules(settings);

  const findActiveCompany = (id?: string) => {
    if (!id) return undefined;
    return companies.find((c) => c.id === id && c.active) || companies.find((c) => c.id === id);
  };

  if (explicitCompanyIdOverride) {
    const comp = findActiveCompany(explicitCompanyIdOverride);
    if (comp) {
      return { company: comp, matchSource: 'override' };
    }
  }

  if (student.companyId) {
    const comp = findActiveCompany(student.companyId);
    if (comp) {
      return { company: comp, matchSource: 'student' };
    }
  }

  const studentTurmaNorm = normalizeLabel(student.turma);
  if (studentTurmaNorm) {
    const turmaRule = rules.find(
      (r) => r.scope === 'turma' && normalizeLabel(r.targetValue) === studentTurmaNorm
    );
    if (turmaRule) {
      const comp = findActiveCompany(turmaRule.companyId);
      if (comp) {
        return { company: comp, matchSource: 'turma', matchedRule: turmaRule };
      }
    }
  }

  const studentSerieNorm = normalizeLabel(student.serie);
  if (studentSerieNorm) {
    const serieRule = rules.find(
      (r) => r.scope === 'serie' && normalizeLabel(r.targetValue) === studentSerieNorm
    );
    if (serieRule) {
      const comp = findActiveCompany(serieRule.companyId);
      if (comp) {
        return { company: comp, matchSource: 'serie', matchedRule: serieRule };
      }
    }
  }

  return { company: getDefaultCompany(settings), matchSource: 'default' };
}

export function resolveContractTemplateForStudent(
  template: ContractTemplate,
  student?: Pick<Student, 'serie' | 'turma' | 'companyId'>,
  settings?: IntegrationSettings,
  explicitCompanyIdOverride?: string
): ContractTemplate {
  if (!student) return template;
  const { company } = resolveCompanyForStudent(student, settings, explicitCompanyIdOverride);
  return {
    ...template,
    schoolName: company.razaoSocial || template.schoolName,
    schoolCnpj: company.cnpj || template.schoolCnpj,
    schoolAddress: company.address || template.schoolAddress,
    schoolCity: company.city || template.schoolCity,
    schoolState: company.state || template.schoolState,
    schoolRepresentative: company.representative || template.schoolRepresentative,
    schoolRepresentativeCpf: company.representativeCpf || template.schoolRepresentativeCpf,
    schoolRepresentativeRole: company.representativeRole || template.schoolRepresentativeRole,
    schoolPhone: company.phone || template.schoolPhone,
    schoolEmail: company.email || template.schoolEmail,
  };
}

export interface CompanyMixEntry {
  company: CompanyEntity;
  studentCount: number;
  paidCount: number;
  pendingCount: number;
  paidTotal: number;
  pendingTotal: number;
  totalExpected: number;
  sharePercent: number;
  seriesList: string[];
  turmasList: string[];
}

export function getCompanyBillingMix(
  students: Student[],
  settings?: IntegrationSettings,
  overridesByStudentId?: Record<string, string>
): CompanyMixEntry[] {
  const companies = getRegisteredCompanies(settings);
  const buckets = new Map<
    string,
    {
      company: CompanyEntity;
      studentCount: number;
      paidCount: number;
      pendingCount: number;
      paidTotal: number;
      pendingTotal: number;
      seriesSet: Set<string>;
      turmasSet: Set<string>;
    }
  >();

  for (const company of companies) {
    buckets.set(company.id, {
      company,
      studentCount: 0,
      paidCount: 0,
      pendingCount: 0,
      paidTotal: 0,
      pendingTotal: 0,
      seriesSet: new Set<string>(),
      turmasSet: new Set<string>(),
    });
  }

  let grandTotal = 0;

  for (const student of students) {
    const overrideId = overridesByStudentId?.[student.id];
    const { company } = resolveCompanyForStudent(student, settings, overrideId);
    if (!buckets.has(company.id)) {
      buckets.set(company.id, {
        company,
        studentCount: 0,
        paidCount: 0,
        pendingCount: 0,
        paidTotal: 0,
        pendingTotal: 0,
        seriesSet: new Set<string>(),
        turmasSet: new Set<string>(),
      });
    }

    const bucket = buckets.get(company.id)!;
    const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';
    const amount = Number(student.selectedTotalAmount || student.finalValue || 0);

    bucket.studentCount += 1;
    if (isPaid) {
      bucket.paidCount += 1;
      bucket.paidTotal += amount;
    } else {
      bucket.pendingCount += 1;
      bucket.pendingTotal += amount;
    }
    if (student.serie) bucket.seriesSet.add(student.serie);
    if (student.turma) bucket.turmasSet.add(student.turma);
    grandTotal += amount;
  }

  return Array.from(buckets.values()).map((b) => {
    const totalExpected = b.paidTotal + b.pendingTotal;
    return {
      company: b.company,
      studentCount: b.studentCount,
      paidCount: b.paidCount,
      pendingCount: b.pendingCount,
      paidTotal: b.paidTotal,
      pendingTotal: b.pendingTotal,
      totalExpected,
      sharePercent: grandTotal > 0 ? Math.round((totalExpected / grandTotal) * 100) : 0,
      seriesList: Array.from(b.seriesSet),
      turmasList: Array.from(b.turmasSet),
    };
  });
}

export function buildCompanyApiPayload(company: CompanyEntity) {
  return {
    id: company.id,
    razaoSocial: company.razaoSocial,
    nomeFantasia: company.nomeFantasia,
    cnpj: company.cnpj,
    pixKey: company.itau.pixKey,
    agency: company.itau.agency,
    account: company.itau.account,
    wallet: company.itau.wallet,
    itauClientId: company.itau.clientId,
    itauClientSecret: company.itau.clientSecret,
    redePv: company.rede.pv,
    redeToken: company.rede.token,
    redeSoftDescriptor: company.rede.softDescriptor,
  };
}

export function getMatchSourceLabel(source: CompanyMatchSource): string {
  switch (source) {
    case 'override':
      return 'Mix Manual';
    case 'student':
      return 'Vínculo Aluno';
    case 'turma':
      return 'CNPJ por Turma';
    case 'serie':
      return 'CNPJ por Série';
    default:
      return 'Matriz Padrão';
  }
}
