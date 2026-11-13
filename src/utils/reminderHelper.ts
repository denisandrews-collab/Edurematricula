import { ContractTemplate, ReminderEmailTemplate, Student } from '../types';
import { formatCurrency, formatDateBr } from './contractFormatter';

export const DEFAULT_REMINDER_TEMPLATE: ReminderEmailTemplate = {
  subject: 'Lembrete de Rematrícula {{ANO_LETIVO}} • {{NOME_ALUNO}} ({{NOME_ESCOLA}})',
  body: `Olá, {{NOME_RESPONSAVEL}}!

Identificamos que o processo de rematrícula do(a) estudante {{NOME_ALUNO}} ({{SERIE}} • RA: {{RA}}) para o Ano Letivo de {{ANO_LETIVO}} ainda não foi iniciado no portal do {{NOME_ESCOLA}}.

Para garantir a vaga e aproveitar as condições vigentes (valor previsto de {{VALOR_FINAL}} com vencimento em {{DATA_VENCIMENTO}}), acesse agora o Portal do Responsável através do link direto abaixo:

👉 {{LINK_PORTAL}}

Pelo portal você poderá:
1. Conferir os dados cadastrais do aluno e responsáveis;
2. Ler e assinar o contrato digitalmente com validade jurídica via Autentique;
3. Escolher a forma de pagamento ideal (PIX, Cartão ou Boleto Itaú).

Se precisar de apoio, nossa secretaria está disponível pelo telefone {{TELEFONE_ESCOLA}} ou e-mail {{EMAIL_ESCOLA}}.

Atenciosamente,
Secretaria Acadêmica • {{NOME_ESCOLA}}`,
  sendToSecondResponsible: true,
  autoIncludePortalLink: true,
};

export const REMINDER_PLACEHOLDERS = [
  { tag: '{{NOME_RESPONSAVEL}}', label: 'Nome do Responsável' },
  { tag: '{{NOME_ALUNO}}', label: 'Nome do Aluno' },
  { tag: '{{RA}}', label: 'RA / Matrícula' },
  { tag: '{{SERIE}}', label: 'Série / Ano' },
  { tag: '{{ANO_LETIVO}}', label: 'Ano Letivo' },
  { tag: '{{VALOR_FINAL}}', label: 'Valor da Rematrícula' },
  { tag: '{{DATA_VENCIMENTO}}', label: 'Data de Vencimento' },
  { tag: '{{LINK_PORTAL}}', label: 'Link Direto do Portal' },
  { tag: '{{NOME_ESCOLA}}', label: 'Nome da Escola' },
  { tag: '{{TELEFONE_ESCOLA}}', label: 'Telefone da Escola' },
  { tag: '{{EMAIL_ESCOLA}}', label: 'E-mail da Escola' },
];

export function buildParentPortalUrl(studentId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}?view=portal&studentId=${encodeURIComponent(studentId)}`;
  }
  return `?view=portal&studentId=${encodeURIComponent(studentId)}`;
}

/**
 * Checks whether a student has not yet started the re-enrollment process.
 */
export function isStudentNotStarted(student: Student): boolean {
  return student.status === 'importado';
}

export interface RenderedReminderEmail {
  subject: string;
  body: string;
  portalUrl: string;
  recipients: { name: string; email: string; role: '1º Responsável' | '2º Responsável' }[];
}

export function renderReminderEmail(
  reminderTemplate: ReminderEmailTemplate | undefined,
  student: Student,
  contractTemplate: ContractTemplate
): RenderedReminderEmail {
  const effectiveTemplate = reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
  const portalUrl = buildParentPortalUrl(student.id);

  const replacements: Record<string, string> = {
    '{{NOME_RESPONSAVEL}}': student.responsibleName || 'Responsável',
    '{{NOME_ALUNO}}': student.name || 'Aluno(a)',
    '{{RA}}': student.ra || '---',
    '{{SERIE}}': student.serie || '---',
    '{{TURMA}}': student.turma || '---',
    '{{ANO_LETIVO}}': student.academicYear || contractTemplate.academicYear || '2026',
    '{{VALOR_FINAL}}': formatCurrency(student.finalValue),
    '{{VALOR_MENSALIDADE}}': formatCurrency(student.tuitionValue),
    '{{VALOR_DESCONTO}}': formatCurrency(student.discountValue),
    '{{DATA_VENCIMENTO}}': formatDateBr(student.dueDate),
    '{{LINK_PORTAL}}': portalUrl,
    '{{NOME_ESCOLA}}': contractTemplate.schoolName || 'Colégio Modelo Alpha',
    '{{TELEFONE_ESCOLA}}': contractTemplate.schoolPhone || '(11) 3456-7890',
    '{{EMAIL_ESCOLA}}': contractTemplate.schoolEmail || 'secretaria@colegio.com.br',
  };

  let subject = effectiveTemplate.subject || DEFAULT_REMINDER_TEMPLATE.subject;
  let body = effectiveTemplate.body || DEFAULT_REMINDER_TEMPLATE.body;

  for (const [tag, value] of Object.entries(replacements)) {
    subject = subject.split(tag).join(value);
    body = body.split(tag).join(value);
  }

  if (effectiveTemplate.autoIncludePortalLink && !body.includes(portalUrl)) {
    body = `${body.trim()}\n\nAcesse diretamente o Portal do Responsável:\n${portalUrl}`;
  }

  const recipients: { name: string; email: string; role: '1º Responsável' | '2º Responsável' }[] = [];

  if (student.responsibleEmail && student.responsibleEmail.trim()) {
    recipients.push({
      name: student.responsibleName,
      email: student.responsibleEmail.trim(),
      role: '1º Responsável',
    });
  }

  if (
    effectiveTemplate.sendToSecondResponsible &&
    student.responsible2Email &&
    student.responsible2Email.trim() &&
    student.responsible2Email.trim().toLowerCase() !== student.responsibleEmail?.trim().toLowerCase()
  ) {
    recipients.push({
      name: student.responsible2Name || '2º Responsável',
      email: student.responsible2Email.trim(),
      role: '2º Responsável',
    });
  }

  return {
    subject,
    body,
    portalUrl,
    recipients,
  };
}
