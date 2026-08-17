import { Student, ContractTemplate } from '../types';
import { getEffectiveInstallmentTiers, formatTiersSummary } from './installmentHelper';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateBr(dateString?: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('pt-BR');
  } catch {
    return dateString || '';
  }
}

export function formatCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export const CONTRACT_PLACEHOLDERS = [
  // Aluno
  { tag: '{{NOME_ALUNO}}', label: 'Nome do Aluno', example: 'Gabriel Albuquerque Lima' },
  { tag: '{{RA}}', label: 'Registro Acadêmico (RA)', example: 'RA-2026-8910' },
  { tag: '{{SERIE}}', label: 'Série / Ano Letivo', example: '9º Ano Ensino Fundamental' },
  { tag: '{{TURMA}}', label: 'Turma', example: '9º Ano A' },
  { tag: '{{TURNO}}', label: 'Turno', example: 'Matutino' },
  { tag: '{{DATA_NASCIMENTO}}', label: 'Nascimento do Aluno', example: '15/04/2011' },
  { tag: '{{ANO_LETIVO}}', label: 'Ano Letivo', example: '2026' },

  // 1º Contratante (Responsável 1 - Dinâmico)
  { tag: '{{NOME_RESPONSAVEL}}', label: 'Nome do 1º Responsável (Contratante 1)', example: 'Helena Albuquerque Lima' },
  { tag: '{{CPF_RESPONSAVEL}}', label: 'CPF do 1º Responsável', example: '123.456.789-00' },
  { tag: '{{RG_RESPONSAVEL}}', label: 'RG do 1º Responsável', example: '28.941.512-3 SSP/SP' },
  { tag: '{{PARENTESCO_RESPONSAVEL_1}}', label: 'Parentesco/Vínculo 1º Resp.', example: 'Mãe / Responsável Pedagógica' },
  { tag: '{{EMAIL_RESPONSAVEL}}', label: 'E-mail do 1º Responsável', example: 'helena.lima@gmail.com' },
  { tag: '{{TELEFONE_RESPONSAVEL}}', label: 'Telefone/WhatsApp 1º Resp.', example: '(11) 98123-4567' },
  { tag: '{{ENDERECO_RESPONSAVEL}}', label: 'Endereço do 1º Responsável', example: 'Rua Augusta, 1200, SP' },

  // 2º Contratante (Responsável 2 - Dinâmico)
  { tag: '{{NOME_RESPONSAVEL_2}}', label: 'Nome do 2º Responsável (Contratante 2)', example: 'Maurício Albuquerque Lima' },
  { tag: '{{CPF_RESPONSAVEL_2}}', label: 'CPF do 2º Responsável', example: '321.654.987-11' },
  { tag: '{{RG_RESPONSAVEL_2}}', label: 'RG do 2º Responsável', example: '24.112.334-5 SSP/SP' },
  { tag: '{{PARENTESCO_RESPONSAVEL_2}}', label: 'Parentesco/Vínculo 2º Resp.', example: 'Pai / Responsável Financeiro' },
  { tag: '{{EMAIL_RESPONSAVEL_2}}', label: 'E-mail do 2º Responsável', example: 'mauricio.lima@empresa.com.br' },
  { tag: '{{TELEFONE_RESPONSAVEL_2}}', label: 'Telefone/WhatsApp 2º Resp.', example: '(11) 98765-4321' },
  { tag: '{{ENDERECO_RESPONSAVEL_2}}', label: 'Endereço do 2º Responsável', example: 'Rua Augusta, 1200, SP' },

  // Valores & Vencimento
  { tag: '{{VALOR_REMATRICULA}}', label: 'Valor da Rematrícula', example: 'R$ 1.850,00' },
  { tag: '{{VALOR_DESCONTO}}', label: 'Valor do Desconto', example: 'R$ 150,00' },
  { tag: '{{VALOR_FINAL}}', label: 'Valor Líquido a Pagar', example: 'R$ 1.700,00' },
  { tag: '{{DATA_VENCIMENTO}}', label: 'Vencimento da Rematrícula', example: '10/09/2026' },
  { tag: '{{TABELA_PARCELAMENTO}}', label: 'Tabela de Faixas de Parcelamento', example: '1 a 2x de R$ 1.000,00 | 3 a 4x de R$ 1.200,00 | 5 a 6x de R$ 1.400,00' },
  { tag: '{{PLANO_SELECIONADO}}', label: 'Parcelamento Escolhido pelo Responsável', example: '4x de R$ 300,00 (Total: R$ 1.200,00)' },

  // CONTRATADO (Fixo / Instituição)
  { tag: '{{NOME_ESCOLA}}', label: 'Nome da Escola (Contratada)', example: 'Colégio Modelo Alpha' },
  { tag: '{{CNPJ_ESCOLA}}', label: 'CNPJ da Escola', example: '12.345.678/0001-90' },
  { tag: '{{ENDERECO_ESCOLA}}', label: 'Endereço da Escola', example: 'Av. Paulista, 1500' },
  { tag: '{{CIDADE_ESCOLA}}', label: 'Cidade da Escola', example: 'São Paulo' },
  { tag: '{{UF_ESCOLA}}', label: 'UF da Escola', example: 'SP' },
  { tag: '{{REPRESENTANTE_ESCOLA}}', label: 'Representante Legal da Escola', example: 'Prof. Carlos Eduardo Silveira' },
  { tag: '{{CPF_REPRESENTANTE_ESCOLA}}', label: 'CPF do Representante Legal', example: '111.222.333-44' },
  { tag: '{{CARGO_REPRESENTANTE_ESCOLA}}', label: 'Cargo do Representante Legal', example: 'Diretor Geral e Representante Legal' },

  // TESTEMUNHAS (Fixas)
  { tag: '{{NOME_TESTEMUNHA_1}}', label: 'Nome da 1ª Testemunha (Fixa)', example: 'Mariana Souza Prado' },
  { tag: '{{CPF_TESTEMUNHA_1}}', label: 'CPF da 1ª Testemunha', example: '444.555.666-77' },
  { tag: '{{CARGO_TESTEMUNHA_1}}', label: 'Cargo/Função 1ª Testemunha', example: 'Secretária Acadêmica' },
  { tag: '{{NOME_TESTEMUNHA_2}}', label: 'Nome da 2ª Testemunha (Fixa)', example: 'Rodrigo Fernandes Alencar' },
  { tag: '{{CPF_TESTEMUNHA_2}}', label: 'CPF da 2ª Testemunha', example: '777.888.999-00' },
  { tag: '{{CARGO_TESTEMUNHA_2}}', label: 'Cargo/Função 2ª Testemunha', example: 'Coordenador Financeiro' },

  { tag: '{{DATA_HOJE}}', label: 'Data Atual Formatada', example: '14 de agosto de 2026' },
];

export function replaceContractPlaceholders(
  content: string,
  student?: Student,
  template?: ContractTemplate
): string {
  const safeStudent = student || ({} as Student);
  const safeTemplate = template || ({} as ContractTemplate);
  const today = new Date();
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const formattedToday = `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

  const resp2Name = safeStudent.responsible2Name || safeStudent.responsibleName || '---';
  const resp2Cpf = safeStudent.responsible2Cpf || safeStudent.responsibleCpf || '---';
  const resp2Email = safeStudent.responsible2Email || safeStudent.responsibleEmail || '---';
  const resp2Phone = safeStudent.responsible2Phone || safeStudent.responsiblePhone || '---';
  const resp2Address = safeStudent.responsible2Address || safeStudent.responsibleAddress || '---';

  const replacements: Record<string, string> = {
    '{{NOME_ALUNO}}': safeStudent.name || '---',
    '{{RA}}': safeStudent.ra || '---',
    '{{SERIE}}': safeStudent.serie || '---',
    '{{TURMA}}': safeStudent.turma || 'Turma Regular',
    '{{TURNO}}': safeStudent.shift || 'Matutino',
    '{{DATA_NASCIMENTO}}': safeStudent.birthDate ? formatDateBr(safeStudent.birthDate) : 'Não informada',
    '{{ANO_LETIVO}}': safeStudent.academicYear || safeTemplate.academicYear || '2026',

    // 1º Responsável (Contratante 1)
    '{{NOME_RESPONSAVEL}}': safeStudent.responsibleName || '---',
    '{{CPF_RESPONSAVEL}}': safeStudent.responsibleCpf || '---',
    '{{RG_RESPONSAVEL}}': safeStudent.responsibleRg || 'Não informado',
    '{{PARENTESCO_RESPONSAVEL_1}}': safeStudent.responsibleKinship || 'Responsável Legal Principal',
    '{{EMAIL_RESPONSAVEL}}': safeStudent.responsibleEmail || '---',
    '{{TELEFONE_RESPONSAVEL}}': safeStudent.responsiblePhone || '---',
    '{{ENDERECO_RESPONSAVEL}}': safeStudent.responsibleAddress || '---',

    // 2º Responsável (Contratante 2)
    '{{NOME_RESPONSAVEL_2}}': resp2Name,
    '{{CPF_RESPONSAVEL_2}}': resp2Cpf,
    '{{RG_RESPONSAVEL_2}}': safeStudent.responsible2Rg || 'Não informado',
    '{{PARENTESCO_RESPONSAVEL_2}}': safeStudent.responsible2Kinship || 'Co-Responsável Solidário',
    '{{EMAIL_RESPONSAVEL_2}}': resp2Email,
    '{{TELEFONE_RESPONSAVEL_2}}': resp2Phone,
    '{{ENDERECO_RESPONSAVEL_2}}': resp2Address,

    // Valores
    '{{VALOR_REMATRICULA}}': formatCurrency(safeStudent.tuitionValue || 0),
    '{{VALOR_DESCONTO}}': formatCurrency(safeStudent.discountValue || 0),
    '{{VALOR_FINAL}}': formatCurrency(safeStudent.finalValue || 0),
    '{{DATA_VENCIMENTO}}': formatDateBr(safeStudent.dueDate),
    '{{TABELA_PARCELAMENTO}}': formatTiersSummary(
      getEffectiveInstallmentTiers(safeStudent),
      safeStudent.baseValue || safeStudent.finalValue || 2000
    ),
    '{{PLANO_SELECIONADO}}': safeStudent.selectedInstallments
      ? `${safeStudent.selectedInstallments}x de ${formatCurrency(safeStudent.selectedInstallmentValue || safeStudent.finalValue / safeStudent.selectedInstallments)} (Total: ${formatCurrency(safeStudent.selectedTotalAmount || safeStudent.finalValue)})`
      : `À vista (${formatCurrency(safeStudent.finalValue || 0)}) ou parcelado conforme opções do portal`,

    // Contratada (Fixa)
    '{{NOME_ESCOLA}}': safeTemplate.schoolName || 'COLÉGIO MODELO ALPHA DE EDUCAÇÃO BÁSICA LTDA',
    '{{CNPJ_ESCOLA}}': safeTemplate.schoolCnpj || '12.345.678/0001-90',
    '{{ENDERECO_ESCOLA}}': safeTemplate.schoolAddress || 'Avenida Paulista, 1500 - Bela Vista',
    '{{CIDADE_ESCOLA}}': safeTemplate.schoolCity || 'São Paulo',
    '{{UF_ESCOLA}}': safeTemplate.schoolState || 'SP',
    '{{REPRESENTANTE_ESCOLA}}': safeTemplate.schoolRepresentative || 'Prof. Carlos Eduardo Silveira',
    '{{CPF_REPRESENTANTE_ESCOLA}}': safeTemplate.schoolRepresentativeCpf || '111.222.333-44',
    '{{CARGO_REPRESENTANTE_ESCOLA}}': safeTemplate.schoolRepresentativeRole || 'Diretor Geral e Representante Legal',

    // Testemunhas (Fixas)
    '{{NOME_TESTEMUNHA_1}}': safeTemplate.witness1Name || 'Mariana Souza Prado',
    '{{CPF_TESTEMUNHA_1}}': safeTemplate.witness1Cpf || '444.555.666-77',
    '{{CARGO_TESTEMUNHA_1}}': safeTemplate.witness1Role || 'Secretária Acadêmica',
    '{{NOME_TESTEMUNHA_2}}': safeTemplate.witness2Name || 'Rodrigo Fernandes Alencar',
    '{{CPF_TESTEMUNHA_2}}': safeTemplate.witness2Cpf || '777.888.999-00',
    '{{CARGO_TESTEMUNHA_2}}': safeTemplate.witness2Role || 'Coordenador Financeiro',

    '{{DATA_HOJE}}': formattedToday,
  };

  // Add custom fields if any
  if (safeStudent.customFields) {
    for (const [key, val] of Object.entries(safeStudent.customFields)) {
      replacements[`{{${key.toUpperCase()}}}`] = String(val);
    }
  }

  let result = content || '';
  for (const [tag, val] of Object.entries(replacements)) {
    result = result.split(tag).join(val);
  }

  return result;
}

import * as XLSX from 'xlsx';

export function exportStudentsToExcel(students: Student[], fileName: string = 'rematriculas_colegio_2026.xlsx') {
  const data = students.map((s) => {
    const isSigned =
      s.status === 'assinado' ||
      s.status === 'pagamento_pendente' ||
      s.status === 'pago' ||
      s.status === 'matricula_confirmada';
    const isPaid = s.status === 'pago' || s.status === 'matricula_confirmada';

    return {
      'ID_ALUNO': s.id,
      'NOME_ALUNO': s.name || '',
      'RA': s.ra || '',
      'DATA_NASCIMENTO': s.birthDate || '',
      'SERIE': s.serie || '',
      'TURMA': s.turma || '',
      'TURNO': s.shift || 'Matutino',
      
      // 1º Contratante (Dinâmico)
      'NOME_RESPONSAVEL_1': s.responsibleName || '',
      'CPF_RESPONSAVEL_1': s.responsibleCpf || '',
      'PARENTESCO_RESP_1': s.responsibleKinship || 'Mãe / Resp. Legal',
      'EMAIL_RESPONSAVEL_1': s.responsibleEmail || '',
      'TELEFONE_RESPONSAVEL_1': s.responsiblePhone || '',
      'ENDERECO_RESPONSAVEL_1': s.responsibleAddress || '',

      // 2º Contratante (Dinâmico)
      'NOME_RESPONSAVEL_2': s.responsible2Name || '',
      'CPF_RESPONSAVEL_2': s.responsible2Cpf || '',
      'PARENTESCO_RESP_2': s.responsible2Kinship || 'Pai / Resp. Financeiro',
      'EMAIL_RESPONSAVEL_2': s.responsible2Email || '',
      'TELEFONE_RESPONSAVEL_2': s.responsible2Phone || '',
      'ENDERECO_RESPONSAVEL_2': s.responsible2Address || '',

      'VALOR_MENSALIDADE': s.tuitionValue || 0,
      'DESCONTO': s.discountValue || 0,
      'VALOR_FINAL': s.finalValue || 0,
      'VENCIMENTO': s.dueDate || '',
      'STATUS_REMATRICULA': s.status,
      'STATUS_AUTENTIQUE': isSigned ? 'ASSINADO' : 'PENDENTE',
      'STATUS_ITAU': isPaid ? 'PAGO' : (s.itauPaymentType ? 'PROCESSANDO' : 'AGUARDANDO'),
      'PROTOCOLO': s.protocolNumber || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-ajustar largura das colunas
  const colWidths = [
    { wch: 14 }, // ID_ALUNO
    { wch: 30 }, // NOME_ALUNO
    { wch: 16 }, // RA
    { wch: 16 }, // DATA_NASCIMENTO
    { wch: 28 }, // SERIE
    { wch: 14 }, // TURMA
    { wch: 14 }, // TURNO
    { wch: 28 }, // NOME_RESPONSAVEL_1
    { wch: 18 }, // CPF_RESPONSAVEL_1
    { wch: 24 }, // PARENTESCO_RESP_1
    { wch: 30 }, // EMAIL_RESPONSAVEL_1
    { wch: 20 }, // TELEFONE_RESPONSAVEL_1
    { wch: 36 }, // ENDERECO_RESPONSAVEL_1
    { wch: 28 }, // NOME_RESPONSAVEL_2
    { wch: 18 }, // CPF_RESPONSAVEL_2
    { wch: 24 }, // PARENTESCO_RESP_2
    { wch: 30 }, // EMAIL_RESPONSAVEL_2
    { wch: 20 }, // TELEFONE_RESPONSAVEL_2
    { wch: 36 }, // ENDERECO_RESPONSAVEL_2
    { wch: 18 }, // VALOR_MENSALIDADE
    { wch: 14 }, // DESCONTO
    { wch: 16 }, // VALOR_FINAL
    { wch: 16 }, // VENCIMENTO
    { wch: 22 }, // STATUS_REMATRICULA
    { wch: 20 }, // STATUS_AUTENTIQUE
    { wch: 16 }, // STATUS_ITAU
    { wch: 18 }, // PROTOCOLO
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos 2026');

  XLSX.writeFile(workbook, fileName);
}

export function exportStudentsToCSV(students: Student[]): string {
  const headers = [
    'ID_ALUNO',
    'NOME_ALUNO',
    'RA',
    'DATA_NASCIMENTO',
    'SERIE',
    'TURMA',
    'TURNO',
    'NOME_RESPONSAVEL_1',
    'CPF_RESPONSAVEL_1',
    'PARENTESCO_RESP_1',
    'EMAIL_RESPONSAVEL_1',
    'TELEFONE_RESPONSAVEL_1',
    'ENDERECO_RESPONSAVEL_1',
    'NOME_RESPONSAVEL_2',
    'CPF_RESPONSAVEL_2',
    'PARENTESCO_RESP_2',
    'EMAIL_RESPONSAVEL_2',
    'TELEFONE_RESPONSAVEL_2',
    'ENDERECO_RESPONSAVEL_2',
    'VALOR_MENSALIDADE',
    'DESCONTO',
    'VALOR_FINAL',
    'VENCIMENTO',
    'STATUS_REMATRICULA',
    'STATUS_AUTENTIQUE',
    'STATUS_ITAU',
    'PROTOCOLO'
  ];

  const rows = students.map((s) => {
    const isSigned = s.status === 'assinado' || s.status === 'pagamento_pendente' || s.status === 'pago' || s.status === 'matricula_confirmada';
    const isPaid = s.status === 'pago' || s.status === 'matricula_confirmada';

    return [
      `"${s.id}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.ra || ''}"`,
      `"${s.birthDate || ''}"`,
      `"${(s.serie || '').replace(/"/g, '""')}"`,
      `"${(s.turma || '').replace(/"/g, '""')}"`,
      `"${s.shift || 'Matutino'}"`,
      `"${(s.responsibleName || '').replace(/"/g, '""')}"`,
      `"${s.responsibleCpf || ''}"`,
      `"${s.responsibleKinship || 'Mãe / Resp. Legal'}"`,
      `"${s.responsibleEmail || ''}"`,
      `"${s.responsiblePhone || ''}"`,
      `"${(s.responsibleAddress || '').replace(/"/g, '""')}"`,
      `"${(s.responsible2Name || '').replace(/"/g, '""')}"`,
      `"${s.responsible2Cpf || ''}"`,
      `"${s.responsible2Kinship || 'Pai / Resp. Financeiro'}"`,
      `"${s.responsible2Email || ''}"`,
      `"${s.responsible2Phone || ''}"`,
      `"${(s.responsible2Address || '').replace(/"/g, '""')}"`,
      s.tuitionValue || 0,
      s.discountValue || 0,
      s.finalValue || 0,
      `"${s.dueDate || ''}"`,
      `"${s.status}"`,
      `"${isSigned ? 'ASSINADO' : 'PENDENTE'}"`,
      `"${isPaid ? 'PAGO' : (s.itauPaymentType ? 'PROCESSANDO' : 'AGUARDANDO')}"`,
      `"${s.protocolNumber || ''}"`
    ];
  });

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
