export type StudentStatus =
  | 'importado'
  | 'contrato_gerado'
  | 'enviado_autentique'
  | 'assinado'
  | 'pagamento_pendente'
  | 'pago'
  | 'matricula_confirmada'
  | 'concluido'
  | 'em_processamento';

export interface StudentHistoryLog {
  timestamp: string;
  action: string;
  details?: string;
}

export interface ProposalCampaignSettings {
  enabled: boolean;
  startDate: string; // YYYY-MM-DD (ex: 2026-08-01)
  endDate: string;   // YYYY-MM-DD (ex: 2026-12-31)
  monthlyInstallmentReduction: number; // ex: 1 parcela a menos por mês decorrido
  monthlyDiscountReduction: number;    // ex: 5% a menos de desconto por mês decorrido
  maxInstallmentsAtStart: number;      // ex: 12
  minInstallmentsFloor: number;        // ex: 1
}

export interface Student {
  id: string;
  name: string;
  ra: string;
  birthDate?: string;
  serie: string;
  turma: string;
  shift: string;
  academicYear: string;

  // 1º Responsável / Contratante 1 (Dinâmico)
  responsibleName: string;
  responsibleCpf: string;
  responsibleEmail: string;
  responsiblePhone: string;
  responsibleAddress: string;
  responsibleRg?: string;
  responsibleKinship?: string;

  // 2º Responsável / Contratante 2 (Dinâmico)
  responsible2Name?: string;
  responsible2Cpf?: string;
  responsible2Email?: string;
  responsible2Phone?: string;
  responsible2Address?: string;
  responsible2Rg?: string;
  responsible2Kinship?: string;

  tuitionValue: number;
  discountValue: number;
  finalValue: number;
  baseValue?: number;
  dueDate: string;
  status: StudentStatus;
  customFields?: Record<string, string>;

  // Datas e Regras de Proposta do Aluno
  proposalStartDate?: string;
  proposalEndDate?: string;
  customProposalCampaign?: ProposalCampaignSettings;

  // Autentique Integration fields
  autentiqueDocId?: string;
  autentiqueSignUrl?: string;
  autentiqueStatus?: 'PENDENTE' | 'ASSINADO' | 'RECUSADO';
  autentiqueSignedAt?: string;
  autentiqueSignerIp?: string;
  autentiqueCertHash?: string;
  autentiqueSigner1Status?: 'PENDENTE' | 'ASSINADO' | 'RECUSADO';
  autentiqueSigner1SignedAt?: string;
  autentiqueSigner1Ip?: string;
  autentiqueSigner2Status?: 'PENDENTE' | 'ASSINADO' | 'RECUSADO';
  autentiqueSigner2SignedAt?: string;
  autentiqueSigner2Ip?: string;

  // Itaú Integration fields
  itauPaymentType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO_PARCELADO';
  itauPaymentId?: string;
  itauPaymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  itauPixQrCode?: string;
  itauPixCopyPaste?: string;
  itauBoletoLinhaDigitavel?: string;
  itauBoletoBarcode?: string;
  itauPaidAt?: string;
  itauCardLast4?: string;
  itauCardInstallments?: number;
  selectedInstallments?: number;
  selectedInstallmentValue?: number;
  selectedTotalAmount?: number;
  customInstallmentTiers?: InstallmentTier[];

  protocolNumber?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  customPortalPermissions?: PortalEditablePermissions;

  // Multiempresa: Empresa vinculada / cobrada
  companyId?: string;
  billedCompanyId?: string;
  billedCompanyName?: string;
  billedCompanyCnpj?: string;
  billedBankSummary?: string;

  historyLogs: StudentHistoryLog[];
}

export interface InstallmentTier {
  id: string;
  fromInstallments: number; // ex: 1
  toInstallments: number;   // ex: 2
  discountPercent: number;  // ex: 20 para 20% de desconto
  totalValue?: number;      // opcional: valor fixo ou calculado
  description?: string;     // ex: "1 a 2x • 20% de Desconto"
  highlight?: boolean;      // ex: true para "Mais Recomendado"
}

export interface InstallmentOption {
  count: number;             // ex: 2
  tierId: string;
  tierFrom: number;          // 1
  tierTo: number;            // 2
  discountPercent: number;   // 20
  discountAmount: number;    // ex: 400.00
  baseAmount: number;        // ex: 2000.00
  installmentValue: number;  // ex: 800.00
  totalValue: number;        // ex: 1600.00
  tierDescription: string;   // "1 a 2x • 20% de Desconto"
  label: string;             // "2x de R$ 800,00 • Total: R$ 1.600,00 (20% OFF)"
  highlight?: boolean;
}

export interface ContractTemplate {
  id: string;
  title: string;
  academicYear: string;
  
  // CONTRATADO (Instituição / Escola - Fixo)
  schoolName: string;
  schoolCnpj: string;
  schoolAddress: string;
  schoolCity: string;
  schoolState: string;
  schoolRepresentative: string;
  schoolRepresentativeCpf?: string;
  schoolRepresentativeRole?: string;
  schoolPhone: string;
  schoolEmail: string;

  // TESTEMUNHAS (Fixas)
  witness1Name: string;
  witness1Cpf: string;
  witness1Role?: string;
  witness2Name: string;
  witness2Cpf: string;
  witness2Role?: string;

  content: string;
  lastUpdated: string;
}

export interface PortalEditablePermissions {
  allowAddress: boolean;
  allowPhone: boolean;
  allowEmail: boolean;
  allowSecondResponsible: boolean;
  allowKinship: boolean;
  allowStudentAcademic: boolean;
}

export interface ReminderEmailTemplate {
  subject: string;
  body: string;
  sendToSecondResponsible: boolean;
  autoIncludePortalLink: boolean;
  lastUpdated?: string;
}

export interface CompanyBankConfig {
  clientId?: string;
  clientSecret?: string;
  pixKey: string;
  environment?: 'sandbox' | 'production';
  agency: string;
  account: string;
  wallet: string;
  pixDiscountPercent?: number;
}

export interface CompanyRedeConfig {
  pv: string;
  token: string;
  softDescriptor?: string;
  sandbox?: boolean;
  enabled?: boolean;
  pixDiscountPercent?: number;
}

export interface CompanyEntity {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  isDefault?: boolean;
  active: boolean;
  address?: string;
  city?: string;
  state?: string;
  representative?: string;
  representativeCpf?: string;
  representativeRole?: string;
  phone?: string;
  email?: string;
  itau: CompanyBankConfig;
  rede: CompanyRedeConfig;
}

export interface BillingCompanyRule {
  id: string;
  scope: 'serie' | 'turma';
  targetValue: string;
  companyId: string;
  updatedAt?: string;
}

export interface IntegrationSettings {
  autentique: {
    apiKey: string;
    sandboxMode: boolean;
    autoSendOnImport: boolean;
    webhookUrl: string;
  };
  itau: {
    clientId: string;
    clientSecret: string;
    pixKey: string;
    environment: 'sandbox' | 'production';
    agency: string;
    account: string;
    wallet: string;
    pixDiscountPercent: number;
    maxCreditInstallments: number;
    installmentTiers?: InstallmentTier[];
    proposalCampaign?: ProposalCampaignSettings;
  };
  rede?: {
    pv: string;
    token: string;
    sandbox: boolean;
    enabled: boolean;
    softDescriptor?: string;
    pixDiscountPercent?: number;
  };
  companies?: CompanyEntity[];
  billingRules?: BillingCompanyRule[];
  portalPermissions?: PortalEditablePermissions;
  reminderTemplate?: ReminderEmailTemplate;
}

export interface ColumnMapping {
  csvHeader: string;
  targetField: keyof Student | 'ignore';
}
