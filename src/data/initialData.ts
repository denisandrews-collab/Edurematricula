import { Student, ContractTemplate, IntegrationSettings, PortalEditablePermissions } from '../types';
import { DEFAULT_INSTALLMENT_TIERS, DEFAULT_PROPOSAL_CAMPAIGN } from '../utils/installmentHelper';
import { DEFAULT_REMINDER_TEMPLATE } from '../utils/reminderHelper';

export const DEFAULT_PORTAL_PERMISSIONS: PortalEditablePermissions = {
  allowAddress: true,
  allowPhone: true,
  allowEmail: true,
  allowSecondResponsible: false,
  allowKinship: false,
  allowStudentAcademic: false,
};

export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplate = {
  id: 'template_padrao_2026',
  title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS - ANO LETIVO {{ANO_LETIVO}}',
  academicYear: '2026',
  // CONTRATADO (Fixo)
  schoolName: 'COLÉGIO MODELO ALPHA DE EDUCAÇÃO BÁSICA LTDA',
  schoolCnpj: '12.345.678/0001-90',
  schoolAddress: 'Avenida Paulista, 1500 - Bela Vista',
  schoolCity: 'São Paulo',
  schoolState: 'SP',
  schoolRepresentative: 'Prof. Carlos Eduardo Silveira',
  schoolRepresentativeCpf: '111.222.333-44',
  schoolRepresentativeRole: 'Diretor Geral e Representante Legal',
  schoolPhone: '(11) 3456-7890',
  schoolEmail: 'secretaria@colegiomodeloalpha.com.br',

  // TESTEMUNHAS (Fixas)
  witness1Name: 'Mariana Souza Prado',
  witness1Cpf: '444.555.666-77',
  witness1Role: 'Secretária Acadêmica',
  witness2Name: 'Rodrigo Fernandes Alencar',
  witness2Cpf: '777.888.999-00',
  witness2Role: 'Coordenador Financeiro',

  lastUpdated: '2026-08-14T10:00:00Z',
  content: `## CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS
### ANO LETIVO DE {{ANO_LETIVO}}

Pelo presente instrumento particular de Contrato de Prestação de Serviços Educacionais, têm entre si, de um lado como **CONTRATADA** e de outro lado como **CONTRATANTES (1º e 2º Responsáveis)**:

---

### 1. QUALIFICAÇÃO DAS PARTES

#### **CONTRATADA (Instituição de Ensino):**
- **Razão Social:** **{{NOME_ESCOLA}}**
- **CNPJ:** **{{CNPJ_ESCOLA}}**
- **Endereço:** {{ENDERECO_ESCOLA}}, {{CIDADE_ESCOLA}} - {{UF_ESCOLA}}
- **Representante Legal:** **{{REPRESENTANTE_ESCOLA}}** (CPF: {{CPF_REPRESENTANTE_ESCOLA}}) - Cargo: {{CARGO_REPRESENTANTE_ESCOLA}}

#### **CONTRATANTES (Responsáveis Legais e Financeiros - Solidários):**

**1º CONTRATANTE / RESPONSÁVEL PRINCIPAL:**
- **Nome:** **{{NOME_RESPONSAVEL}}**
- **CPF:** **{{CPF_RESPONSAVEL}}** | **RG:** {{RG_RESPONSAVEL}}
- **Grau de Parentesco / Vínculo:** {{PARENTESCO_RESPONSAVEL_1}}
- **E-mail (para assinatura digital):** {{EMAIL_RESPONSAVEL}}
- **Telefone / WhatsApp:** {{TELEFONE_RESPONSAVEL}}
- **Endereço Residencial:** {{ENDERECO_RESPONSAVEL}}

**2º CONTRATANTE / CO-RESPONSÁVEL SOLIDÁRIO:**
- **Nome:** **{{NOME_RESPONSAVEL_2}}**
- **CPF:** **{{CPF_RESPONSAVEL_2}}** | **RG:** {{RG_RESPONSAVEL_2}}
- **Grau de Parentesco / Vínculo:** {{PARENTESCO_RESPONSAVEL_2}}
- **E-mail (para assinatura digital):** {{EMAIL_RESPONSAVEL_2}}
- **Telefone / WhatsApp:** {{TELEFONE_RESPONSAVEL_2}}
- **Endereço Residencial:** {{ENDERECO_RESPONSAVEL_2}}

#### **ALUNO(A) BENEFICIÁRIO(A):**
- **Nome do Estudante:** **{{NOME_ALUNO}}**
- **Registro Acadêmico (RA):** **{{RA}}**
- **Data de Nascimento:** {{DATA_NASCIMENTO}}
- **Série / Ano Letivo:** **{{SERIE}}**
- **Turma e Turno:** {{TURMA}} ({{TURNO}})

---

### CLÁUSULA 1ª – DO OBJETO
O presente contrato tem por objeto a prestação de serviços educacionais pela CONTRATADA em favor do(a) ALUNO(A) acima qualificado(a), para o ano letivo de **{{ANO_LETIVO}}**, em conformidade com o Plano Pedagógico da Escola, a Lei de Diretrizes e Bases da Educação Nacional (Lei nº 9.394/1996) e o Regimento Escolar vigente.

---

### CLÁUSULA 2ª – DA SOLIDARIEDADE ENTRE OS CONTRATANTES
Os **CONTRATANTES (1º e 2º Responsáveis)** declaram expressamente que assumem, de forma conjunta, solidária e indivisível, nos termos dos artigos 264 e seguintes do Código Civil Brasileiro, a responsabilidade integral por todas as obrigações financeiras, pedagógicas e contratuais decorrentes desta matrícula.

---

### CLÁUSULA 3ª – DO VALOR DA REMATRÍCULA E CONDIÇÕES DE PAGAMENTO
Pelos serviços educacionais prestados no ano letivo de {{ANO_LETIVO}}, os CONTRATANTES pagarão à CONTRATADA uma anuidade escolar fixada nos seguintes termos da parcela de rematrícula:

- **Valor Integral da Rematrícula:** {{VALOR_REMATRICULA}}
- **Desconto / Bolsa Concedida:** {{VALOR_DESCONTO}}
- **Valor Líquido da Rematrícula a Pagar:** **{{VALOR_FINAL}}**
- **Data de Vencimento:** **{{DATA_VENCIMENTO}}**
- **Meios de Cobrança Integrados (API Itaú Empresas):** PIX com liquidação instantânea, Boleto Registrado Itaú ou Cartão de Crédito em até 12x.

---

### CLÁUSULA 4ª – DA ASSINATURA ELETRÔNICA E VALIDADE JURÍDICA
As partes (Contratada, 1º Contratante, 2º Contratante e Testemunhas) reconhecem a plena validade jurídica, autenticidade e eficácia das assinaturas eletrônicas firmadas através da plataforma **Autentique**, em total conformidade com a **Medida Provisória nº 2.200-2/2001** e a **Lei nº 14.063/2020**, com registro de logs, carimbo do tempo, IP e hash criptográfico SHA-256.

---

### CLÁUSULA 5ª – DO FORO
Para dirimir quaisquer controvérsias oriundas do presente instrumento, as partes elegem o Foro da Comarca de **{{CIDADE_ESCOLA}} - {{UF_ESCOLA}}**, renunciando a qualquer outro por mais privilegiado que seja.

E, por estarem assim justos e acordados, firmam o presente contrato eletronicamente em conjunto com as 2 (duas) testemunhas instrumentárias abaixo qualificadas.

**{{CIDADE_ESCOLA}} - {{UF_ESCOLA}}, {{DATA_HOJE}}.**

---

### ASSINATURAS DAS PARTES:

**CONTRATADA (Instituição de Ensino):**
____________________________________________________
**{{NOME_ESCOLA}}**
Representante Legal: {{REPRESENTANTE_ESCOLA}}
CPF: {{CPF_REPRESENTANTE_ESCOLA}}

**1º CONTRATANTE (Responsável Principal):**
____________________________________________________
**{{NOME_RESPONSAVEL}}**
CPF: {{CPF_RESPONSAVEL}}

**2º CONTRATANTE (Co-Responsável Solidário):**
____________________________________________________
**{{NOME_RESPONSAVEL_2}}**
CPF: {{CPF_RESPONSAVEL_2}}

---

### TESTEMUNHAS INSTRUMENTÁRIAS (Fixas):

**1ª TESTEMUNHA:**
____________________________________________________
**{{NOME_TESTEMUNHA_1}}**
CPF: {{CPF_TESTEMUNHA_1}} ({{CARGO_TESTEMUNHA_1}})

**2ª TESTEMUNHA:**
____________________________________________________
**{{NOME_TESTEMUNHA_2}}**
CPF: {{CPF_TESTEMUNHA_2}} ({{CARGO_TESTEMUNHA_2}})`,
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std_01',
    name: 'Gabriel Albuquerque Lima',
    ra: 'RA-2026-8910',
    birthDate: '2011-04-15',
    serie: '9º Ano do Ensino Fundamental II',
    turma: '9º Ano A',
    shift: 'Matutino',
    academicYear: '2026',
    responsibleName: 'Helena Albuquerque Lima',
    responsibleCpf: '123.456.789-00',
    responsibleEmail: 'helena.lima@gmail.com',
    responsiblePhone: '(11) 98123-4567',
    responsibleAddress: 'Rua Augusta, 1200, Apto 42 - Consolação, São Paulo - SP',
    responsibleRg: '28.941.512-3 SSP/SP',
    responsibleKinship: 'Mãe / Responsável Pedagógica',
    responsible2Name: 'Maurício Albuquerque Lima',
    responsible2Cpf: '321.654.987-11',
    responsible2Email: 'mauricio.lima@empresa.com.br',
    responsible2Phone: '(11) 98765-4321',
    responsible2Address: 'Rua Augusta, 1200, Apto 42 - Consolação, São Paulo - SP',
    responsible2Rg: '24.112.334-5 SSP/SP',
    responsible2Kinship: 'Pai / Responsável Financeiro',
    tuitionValue: 1850.0,
    discountValue: 150.0,
    finalValue: 1700.0,
    dueDate: '2026-09-10',
    status: 'enviado_autentique',
    autentiqueDocId: 'autq_gabriel8910',
    autentiqueSignUrl: '?view=portal&studentId=std_01&autentiqueId=autq_gabriel8910',
    autentiqueStatus: 'PENDENTE',
    autentiqueSigner1Status: 'PENDENTE',
    autentiqueSigner2Status: 'PENDENTE',
    protocolNumber: 'REM-2026-001',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Dados do aluno carregados da planilha da turma 9A.',
      },
      {
        timestamp: '2026-08-14T09:15:00Z',
        action: 'Contrato Gerado e Enviado via API Autentique',
        details: 'E-mail de assinatura disparado para os 2 Responsáveis (helena.lima@gmail.com e mauricio.lima@empresa.com.br).',
      },
    ],
  },
  {
    id: 'std_02',
    name: 'Mariana Costa Ferreira',
    ra: 'RA-2026-9042',
    birthDate: '2009-08-22',
    serie: '3ª Série do Ensino Médio',
    turma: '3º EM B',
    shift: 'Matutino',
    academicYear: '2026',
    responsibleName: 'Roberto Ferreira Santos',
    responsibleCpf: '234.567.890-11',
    responsibleEmail: 'roberto.ferreira@hotmail.com',
    responsiblePhone: '(11) 97234-5678',
    responsibleAddress: 'Av. Brigadeiro Faria Lima, 2500 - Itaim Bibi, São Paulo - SP',
    responsibleRg: '19.832.410-9 SSP/SP',
    responsibleKinship: 'Pai / Responsável Legal',
    responsible2Name: 'Cláudia Costa Ferreira',
    responsible2Cpf: '876.543.210-99',
    responsible2Email: 'claudia.costa@adv.com.br',
    responsible2Phone: '(11) 97111-2222',
    responsible2Address: 'Av. Brigadeiro Faria Lima, 2500 - Itaim Bibi, São Paulo - SP',
    responsible2Rg: '22.334.455-6 SSP/SP',
    responsible2Kinship: 'Mãe / Co-Responsável',
    tuitionValue: 2400.0,
    discountValue: 200.0,
    finalValue: 2200.0,
    dueDate: '2026-09-15',
    status: 'assinado',
    autentiqueDocId: 'autq_mariana9042',
    autentiqueSignUrl: '?view=portal&studentId=std_02&autentiqueId=autq_mariana9042',
    autentiqueStatus: 'ASSINADO',
    autentiqueSigner1Status: 'ASSINADO',
    autentiqueSigner2Status: 'ASSINADO',
    autentiqueSignedAt: '2026-08-14T11:20:00Z',
    autentiqueSignerIp: '187.54.12.89',
    autentiqueCertHash: 'sha256_e89a4cf3189db280918cf3112a',
    protocolNumber: 'REM-2026-002',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Dados do aluno carregados da planilha.',
      },
      {
        timestamp: '2026-08-14T09:20:00Z',
        action: 'Contrato Enviado via Autentique',
        details: 'Documento criado e enviado aos 2 responsáveis.',
      },
      {
        timestamp: '2026-08-14T11:20:00Z',
        action: 'Contrato Assinado no Autentique',
        details: 'Responsáveis Roberto e Cláudia assinaram com certificado eletrônico IP 187.54.12.89.',
      },
    ],
  },
  {
    id: 'std_03',
    name: 'Lucas Mendes Vasconcelos',
    ra: 'RA-2026-7731',
    birthDate: '2015-11-03',
    serie: '5º Ano do Ensino Fundamental I',
    turma: '5º Fundamental Tarde',
    shift: 'Vespertino',
    academicYear: '2026',
    responsibleName: 'Patricia Mendes Vasconcelos',
    responsibleCpf: '345.678.901-22',
    responsibleEmail: 'patricia.mendes@outlook.com',
    responsiblePhone: '(11) 96345-6789',
    responsibleAddress: 'Rua Domingos de Morais, 890 - Vila Mariana, São Paulo - SP',
    responsibleRg: '33.109.876-1 SSP/SP',
    responsibleKinship: 'Mãe / Responsável Principal',
    responsible2Name: 'André Vasconcelos',
    responsible2Cpf: '456.123.789-33',
    responsible2Email: 'andre.vasconcelos@outlook.com',
    responsible2Phone: '(11) 96444-5555',
    responsible2Address: 'Rua Domingos de Morais, 890 - Vila Mariana, São Paulo - SP',
    responsible2Rg: '31.222.333-4 SSP/SP',
    responsible2Kinship: 'Pai / Co-Responsável',
    tuitionValue: 1650.0,
    discountValue: 100.0,
    finalValue: 1550.0,
    dueDate: '2026-09-05',
    status: 'matricula_confirmada',
    autentiqueDocId: 'autq_lucas7731',
    autentiqueSignUrl: '?view=portal&studentId=std_03&autentiqueId=autq_lucas7731',
    autentiqueStatus: 'ASSINADO',
    autentiqueSigner1Status: 'ASSINADO',
    autentiqueSigner2Status: 'ASSINADO',
    autentiqueSignedAt: '2026-08-13T14:10:00Z',
    autentiqueSignerIp: '201.86.104.22',
    autentiqueCertHash: 'sha256_ab4929cd8103ffba39120',
    itauPaymentType: 'PIX',
    itauPaymentId: 'pay_pix_lucas7731',
    itauPaymentStatus: 'PAID',
    itauPaidAt: '2026-08-13T14:25:00Z',
    protocolNumber: 'REM-2026-003',
    historyLogs: [
      {
        timestamp: '2026-08-13T09:00:00Z',
        action: 'Importação de Planilha',
        details: 'Dados do aluno cadastrados via planilha de rematrículas.',
      },
      {
        timestamp: '2026-08-13T10:00:00Z',
        action: 'Contrato Enviado via Autentique',
        details: 'Enviado para patricia.mendes@outlook.com e andre.vasconcelos@outlook.com',
      },
      {
        timestamp: '2026-08-13T14:10:00Z',
        action: 'Contrato Assinado com Sucesso',
        details: 'Assinatura digital concluída por ambos os responsáveis.',
      },
      {
        timestamp: '2026-08-13T14:25:00Z',
        action: 'Pagamento PIX Confirmado via Itaú API',
        details: 'Valor de R$ 1.550,00 liquidado instantaneamente.',
      },
      {
        timestamp: '2026-08-13T14:25:05Z',
        action: 'Rematrícula 2026 Confirmada!',
        details: 'Comprovante emitido e vaga garantida para o 5º Ano.',
      },
    ],
  },
  {
    id: 'std_04',
    name: 'Beatriz Nogueira Duarte',
    ra: 'RA-2026-6520',
    birthDate: '2018-02-19',
    serie: '2º Ano do Ensino Fundamental I',
    turma: '2º Ano Manhã',
    shift: 'Matutino',
    academicYear: '2026',
    responsibleName: 'Juliana Nogueira Duarte',
    responsibleCpf: '456.789.012-33',
    responsibleEmail: 'juliana.duarte@empresa.com.br',
    responsiblePhone: '(11) 95456-7890',
    responsibleAddress: 'Alameda Santos, 1800 - Jardins, São Paulo - SP',
    responsibleRg: '25.678.901-4 SSP/SP',
    tuitionValue: 1600.0,
    discountValue: 0.0,
    finalValue: 1600.0,
    dueDate: '2026-09-10',
    status: 'importado',
    protocolNumber: 'REM-2026-004',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Dados alimentados via importação de arquivo .csv',
      },
    ],
  },
  {
    id: 'std_05',
    name: 'Enzo Martins Pinheiro',
    ra: 'RA-2026-5412',
    birthDate: '2013-06-30',
    serie: '7º Ano do Ensino Fundamental II',
    turma: '7º Ano B',
    shift: 'Vespertino',
    academicYear: '2026',
    responsibleName: 'Marcelo Pinheiro',
    responsibleCpf: '567.890.123-44',
    responsibleEmail: 'marcelo.pinheiro@terra.com.br',
    responsiblePhone: '(11) 94567-8901',
    responsibleAddress: 'Rua Vergueiro, 3100 - Chácara Klabin, São Paulo - SP',
    responsibleRg: '18.234.567-8 SSP/SP',
    tuitionValue: 1750.0,
    discountValue: 175.0,
    finalValue: 1575.0,
    dueDate: '2026-09-12',
    status: 'enviado_autentique',
    autentiqueDocId: 'autq_enzo5412',
    autentiqueSignUrl: '?view=portal&studentId=std_05&autentiqueId=autq_enzo5412',
    autentiqueStatus: 'PENDENTE',
    protocolNumber: 'REM-2026-005',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Aluno inserido na base de dados.',
      },
      {
        timestamp: '2026-08-14T09:40:00Z',
        action: 'Contrato Enviado via Autentique',
        details: 'Notificação enviada para marcelo.pinheiro@terra.com.br',
      },
    ],
  },
  {
    id: 'std_06',
    name: 'Sophia Ramos Castanho',
    ra: 'RA-2026-4309',
    birthDate: '2020-09-14',
    serie: 'Educação Infantil - Pré II',
    turma: 'Infantil II - Integral',
    shift: 'Integral',
    academicYear: '2026',
    responsibleName: 'Camila Ramos Castanho',
    responsibleCpf: '678.901.234-55',
    responsibleEmail: 'camila.castanho@gmail.com',
    responsiblePhone: '(11) 93678-9012',
    responsibleAddress: 'Rua Pamplona, 950 - Jardim Paulista, São Paulo - SP',
    responsibleRg: '31.456.789-0 SSP/SP',
    tuitionValue: 2800.0,
    discountValue: 300.0,
    finalValue: 2500.0,
    dueDate: '2026-09-10',
    status: 'assinado',
    autentiqueDocId: 'autq_sophia4309',
    autentiqueSignUrl: '?view=portal&studentId=std_06&autentiqueId=autq_sophia4309',
    autentiqueStatus: 'ASSINADO',
    autentiqueSignedAt: '2026-08-14T11:45:00Z',
    autentiqueSignerIp: '179.124.90.11',
    autentiqueCertHash: 'sha256_9c490184bbaa',
    itauPaymentType: 'BOLETO',
    itauPaymentId: 'pay_bol_sophia4309',
    itauPaymentStatus: 'PENDING',
    itauBoletoLinhaDigitavel: '34191.79001 01234.567890 12345.678901 7 98540000250000',
    itauBoletoBarcode: '34197985400002500007900101234567890123456789',
    protocolNumber: 'REM-2026-006',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Importação de dados.',
      },
      {
        timestamp: '2026-08-14T10:10:00Z',
        action: 'Contrato Enviado Autentique',
        details: 'Enviado para camila.castanho@gmail.com',
      },
      {
        timestamp: '2026-08-14T11:45:00Z',
        action: 'Contrato Assinado Digitalmente',
        details: 'Assinatura realizada.',
      },
      {
        timestamp: '2026-08-14T11:46:00Z',
        action: 'Boleto Bancário Itaú Gerado',
        details: 'Linha digitável emitida com vencimento para 10/09/2026.',
      },
    ],
  },
  {
    id: 'std_07',
    name: 'Rafael Oliveira Mendes',
    ra: 'RA-2026-3815',
    birthDate: '2014-03-22',
    serie: '6º Ano do Ensino Fundamental II',
    turma: '6º Ano B',
    shift: 'Matutino',
    academicYear: '2026',
    responsibleName: 'Fernanda Oliveira Mendes',
    responsibleCpf: '789.012.345-66',
    responsibleEmail: 'fernanda.mendes@uol.com.br',
    responsiblePhone: '(11) 92345-6789',
    responsibleAddress: 'Rua Haddock Lobo, 1120 - Cerqueira César, São Paulo - SP',
    responsibleRg: '36.789.012-1 SSP/SP',
    responsibleKinship: 'Mãe / Responsável Pedagógica',
    responsible2Name: 'Eduardo Mendes Silva',
    responsible2Cpf: '890.123.456-77',
    responsible2Email: 'eduardo.mendes@consultoria.com.br',
    responsible2Phone: '(11) 91234-9988',
    responsible2Address: 'Rua Haddock Lobo, 1120 - Cerqueira César, São Paulo - SP',
    responsible2Rg: '29.456.123-8 SSP/SP',
    responsible2Kinship: 'Pai / Responsável Financeiro',
    tuitionValue: 1800.0,
    discountValue: 150.0,
    finalValue: 1650.0,
    dueDate: '2026-09-15',
    status: 'importado',
    protocolNumber: 'REM-2026-007',
    historyLogs: [
      {
        timestamp: '2026-08-14T08:30:00Z',
        action: 'Importação de Planilha',
        details: 'Dados carregados via planilha; aguardando início do processo pelo responsável.',
      },
    ],
  },
];

export const INITIAL_INTEGRATION_SETTINGS: IntegrationSettings = {
  autentique: {
    apiKey: '',
    sandboxMode: true,
    autoSendOnImport: false,
    webhookUrl: '/api/webhook/autentique',
  },
  itau: {
    clientId: '',
    clientSecret: '',
    pixKey: 'financeiro@colegiomodeloalpha.com.br',
    environment: 'sandbox',
    agency: '0910',
    account: '12345-6',
    wallet: '109',
    pixDiscountPercent: 5,
    maxCreditInstallments: 12,
    installmentTiers: DEFAULT_INSTALLMENT_TIERS,
    proposalCampaign: DEFAULT_PROPOSAL_CAMPAIGN,
  },
  rede: {
    pv: '',
    token: '',
    sandbox: true,
    enabled: true,
  },
  portalPermissions: DEFAULT_PORTAL_PERMISSIONS,
  reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
};
