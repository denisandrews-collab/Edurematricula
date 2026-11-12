import { Student, StudentStatus } from '../types';

/**
 * Normaliza CPF para apenas dígitos.
 * Remove pontuações, espaços e caracteres especiais.
 */
export function normalizeCpf(cpf?: string | null): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '').trim();
}

/**
 * Normaliza Matrícula / RA para comparação segura.
 * Remove prefixos comuns ("RA-", "MAT-"), espaços e caracteres especiais, mantendo alfanuméricos em caixa alta.
 */
export function normalizeMatricula(ra?: string | null): string {
  if (!ra) return '';
  const cleaned = ra
    .trim()
    .toUpperCase()
    .replace(/^(RA|MAT|MATRICULA|REGISTRO)[\s\-_:]*/i, '')
    .replace(/[\s\-_.]/g, '');
  return cleaned || ra.trim().toUpperCase();
}

/**
 * Verifica se o status corresponde a 'concluído'.
 * Inclui: 'pago', 'matricula_confirmada', 'concluido', 'concluído'.
 */
export function isConcludedStatus(status?: StudentStatus | string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'pago' ||
    s === 'matricula_confirmada' ||
    s === 'concluido' ||
    s === 'concluído' ||
    s === 'concluida' ||
    s === 'concluída' ||
    s === 'confirmado' ||
    s === 'confirmada'
  );
}

/**
 * Verifica se o status corresponde a 'em processamento'.
 * Inclui: 'contrato_gerado', 'enviado_autentique', 'assinado', 'pagamento_pendente', 'em_processamento', 'processando'.
 */
export function isInProgressStatus(status?: StudentStatus | string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'contrato_gerado' ||
    s === 'enviado_autentique' ||
    s === 'assinado' ||
    s === 'pagamento_pendente' ||
    s === 'em_processamento' ||
    s === 'em processamento' ||
    s === 'processando' ||
    s === 'pendente'
  );
}

/**
 * Retorna se o status impede a criação de nova rematrícula (concluído OU em processamento).
 */
export function isRestrictedEnrollmentStatus(status?: StudentStatus | string | null): boolean {
  return isConcludedStatus(status) || isInProgressStatus(status);
}

/**
 * Retorna a categoria amigável do status restritivo ('concluído' | 'em processamento' | 'outro').
 */
export function getStatusCategory(status?: StudentStatus | string | null): 'concluído' | 'em processamento' | 'outro' {
  if (isConcludedStatus(status)) return 'concluído';
  if (isInProgressStatus(status)) return 'em processamento';
  return 'outro';
}

/**
 * Retorna rótulo legível do status em português.
 */
export function getStatusHumanDescription(status?: StudentStatus | string | null): string {
  if (!status) return 'Status não informado';
  const s = status.toLowerCase().trim();
  if (s === 'matricula_confirmada' || s === 'pago' || s === 'concluido' || s === 'concluído') {
    return 'Matrícula Confirmada / Pago (Concluído)';
  }
  if (s === 'assinado' || s === 'pagamento_pendente') {
    return 'Contrato Assinado • Aguardando Pagamento (Em Processamento)';
  }
  if (s === 'enviado_autentique') {
    return 'Aguardando Assinatura Autentique (Em Processamento)';
  }
  if (s === 'contrato_gerado') {
    return 'Contrato Gerado (Em Processamento)';
  }
  if (s === 'em_processamento' || s === 'em processamento' || s === 'processando') {
    return 'Em Processamento';
  }
  if (s === 'importado') {
    return 'Importado (Planilha Inicial)';
  }
  return status;
}

export interface DuplicateCheckResult {
  hasConflict: boolean;
  conflictingStudent?: Student;
  conflictField?: 'CPF' | 'MATRICULA' | 'AMBOS';
  statusCategory?: 'concluído' | 'em processamento';
  reason?: string;
}

/**
 * Verifica se já existe no estado global de alunos algum registro com o mesmo CPF ou Matrícula
 * cujo status esteja como 'concluído' ou 'em processamento'.
 */
export function checkDuplicateEnrollment(
  candidate: {
    id?: string;
    ra?: string;
    responsibleCpf?: string;
    responsible2Cpf?: string;
    name?: string;
  },
  existingStudents: Student[]
): DuplicateCheckResult {
  const candRaNorm = normalizeMatricula(candidate.ra);
  const candRaRaw = (candidate.ra || '').trim().toUpperCase();

  const candCpf1 = normalizeCpf(candidate.responsibleCpf);
  const candCpf2 = normalizeCpf(candidate.responsible2Cpf);

  // Lista de CPFs válidos do candidato (evita CPFs em branco ou placeholders como 00000000000)
  const isCpfSignificant = (cpf: string) => cpf.length >= 11 && !/^0+$/.test(cpf);
  const candidateCpfs = [candCpf1, candCpf2].filter(isCpfSignificant);

  for (const existing of existingStudents) {
    // Ignora se for o próprio registro (ex: ao editar dados)
    if (candidate.id && existing.id === candidate.id) {
      continue;
    }

    // Regra central: apenas registros com status 'concluído' ou 'em processamento' bloqueiam!
    if (!isRestrictedEnrollmentStatus(existing.status)) {
      continue;
    }

    const existRaNorm = normalizeMatricula(existing.ra);
    const existRaRaw = (existing.ra || '').trim().toUpperCase();

    // Verificação de Matrícula / RA
    const matchesRa =
      (candRaNorm && existRaNorm && candRaNorm === existRaNorm) ||
      (candRaRaw && existRaRaw && candRaRaw === existRaRaw);

    // Verificação de CPF (1º e 2º responsáveis)
    const existCpf1 = normalizeCpf(existing.responsibleCpf);
    const existCpf2 = normalizeCpf(existing.responsible2Cpf);
    const existingCpfs = [existCpf1, existCpf2].filter(isCpfSignificant);

    const matchesCpf = candidateCpfs.some((candCpf) => existingCpfs.includes(candCpf));

    if (matchesRa || matchesCpf) {
      const conflictField: 'CPF' | 'MATRICULA' | 'AMBOS' =
        matchesRa && matchesCpf ? 'AMBOS' : matchesRa ? 'MATRICULA' : 'CPF';

      const statusCat: 'concluído' | 'em processamento' = isConcludedStatus(existing.status)
        ? 'concluído'
        : 'em processamento';
      const statusDesc = getStatusHumanDescription(existing.status);

      let fieldMsg = '';
      if (conflictField === 'AMBOS') {
        fieldMsg = `mesma Matrícula (${existing.ra}) e mesmo CPF (${existing.responsibleCpf})`;
      } else if (conflictField === 'MATRICULA') {
        fieldMsg = `mesma Matrícula (${existing.ra})`;
      } else {
        fieldMsg = `mesmo CPF (${existing.responsibleCpf})`;
      }

      const reason = `Não é permitida a criação de nova rematrícula: Já existe registro com status '${statusCat}' (${statusDesc}) para o(a) aluno(a) "${existing.name}" com ${fieldMsg}.`;

      return {
        hasConflict: true,
        conflictingStudent: existing,
        conflictField,
        statusCategory: statusCat,
        reason,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Validação para criação individual de rematrícula.
 */
export function validateNewEnrollment(
  candidate: Partial<Student>,
  existingStudents: Student[]
): {
  isValid: boolean;
  error?: string;
  conflictingStudent?: Student;
  conflictField?: 'CPF' | 'MATRICULA' | 'AMBOS';
  statusCategory?: 'concluído' | 'em processamento';
} {
  const result = checkDuplicateEnrollment(candidate, existingStudents);
  if (result.hasConflict) {
    return {
      isValid: false,
      error: result.reason,
      conflictingStudent: result.conflictingStudent,
      conflictField: result.conflictField,
      statusCategory: result.statusCategory,
    };
  }
  return { isValid: true };
}

/**
 * Filtra e valida um lote de candidatos a rematrícula (usado em importações Excel e CSV).
 * Garante que nenhum aluno com Matrícula ou CPF duplicado de registros 'concluídos' ou 'em processamento' seja adicionado.
 */
export function filterNewEnrollmentsBatch(
  candidates: Student[],
  existingStudents: Student[]
): {
  valid: Student[];
  blocked: {
    candidate: Student;
    reason: string;
    conflictingStudent: Student;
    conflictField: 'CPF' | 'MATRICULA' | 'AMBOS';
    statusCategory: 'concluído' | 'em processamento';
  }[];
} {
  const valid: Student[] = [];
  const blocked: {
    candidate: Student;
    reason: string;
    conflictingStudent: Student;
    conflictField: 'CPF' | 'MATRICULA' | 'AMBOS';
    statusCategory: 'concluído' | 'em processamento';
  }[] = [];

  // Mantemos uma lista acumulada para evitar duplicatas também dentro do próprio lote
  const currentPool: Student[] = [...existingStudents];

  for (const candidate of candidates) {
    const check = checkDuplicateEnrollment(candidate, currentPool);
    if (check.hasConflict && check.conflictingStudent) {
      blocked.push({
        candidate,
        reason: check.reason || 'Rematrícula em duplicidade com status restritivo.',
        conflictingStudent: check.conflictingStudent,
        conflictField: check.conflictField || 'MATRICULA',
        statusCategory: check.statusCategory || 'em processamento',
      });
    } else {
      valid.push(candidate);
      currentPool.push(candidate);
    }
  }

  return { valid, blocked };
}
