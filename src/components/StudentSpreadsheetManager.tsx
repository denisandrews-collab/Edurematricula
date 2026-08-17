import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Student, StudentStatus, ContractTemplate } from '../types';
import { formatCurrency, formatDateBr, formatCpf, formatPhone, exportStudentsToCSV, exportStudentsToExcel } from '../utils/contractFormatter';
import { EditStudentModal } from './EditStudentModal';
import {
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  CreditCard,
  ShieldCheck,
  FileText,
  AlertCircle,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onSelectStudent: (student: Student) => void;
  onOpenPortal: (student: Student) => void;
  onSendAutentique: (student: Student) => Promise<void>;
  onBatchSendAutentique: (students: Student[]) => Promise<void>;
  template: ContractTemplate;
  initialAction?: 'import' | 'new_student' | 'batch_send' | null;
  onClearInitialAction?: () => void;
}

export function StudentSpreadsheetManager({
  students,
  onUpdateStudents,
  onSelectStudent,
  onOpenPortal,
  onSendAutentique,
  onBatchSendAutentique,
  template,
  initialAction,
  onClearInitialAction,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [serieFilter, setSerieFilter] = useState<string>('todas');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawCsvText, setRawCsvText] = useState('');
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  React.useEffect(() => {
    if (initialAction === 'import') {
      setIsImportModalOpen(true);
      onClearInitialAction?.();
    } else if (initialAction === 'new_student') {
      setIsAddingStudent(true);
      onClearInitialAction?.();
    } else if (initialAction === 'batch_send') {
      handleBatchSend();
      onClearInitialAction?.();
    }
  }, [initialAction]);

  // New Student Form State
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    ra: `RA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    birthDate: '2012-05-10',
    serie: '8º Ano do Ensino Fundamental',
    turma: '8º Ano A',
    shift: 'Matutino',
    academicYear: '2026',
    responsibleName: '',
    responsibleCpf: '',
    responsibleEmail: '',
    responsiblePhone: '',
    responsibleAddress: '',
    responsible2Name: '',
    responsible2Cpf: '',
    responsible2Email: '',
    responsible2Phone: '',
    responsible2Address: '',
    tuitionValue: 1800,
    discountValue: 0,
    finalValue: 1800,
    dueDate: '2026-09-10',
    status: 'importado',
  });

  const seriesList = Array.from(new Set(students.map((s) => s.serie))).filter(Boolean);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.responsible2Name && s.responsible2Name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.responsibleCpf.includes(searchTerm) ||
      (s.responsible2Cpf && s.responsible2Cpf.includes(searchTerm)) ||
      s.ra.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ? true : s.status === statusFilter;

    const matchesSerie =
      serieFilter === 'todas' ? true : s.serie === serieFilter;

    return matchesSearch && matchesStatus && matchesSerie;
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showLocalFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleExportExcel = () => {
    try {
      exportStudentsToExcel(students, `rematriculas_colegio_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
      showLocalFeedback('Planilha Excel (.xlsx) exportada com sucesso em colunas com 1º e 2º Responsáveis!', 'success');
    } catch (e: any) {
      showLocalFeedback('Erro ao exportar arquivo Excel: ' + e.message, 'error');
    }
  };

  const handleExportCsv = () => {
    try {
      const csvContent = exportStudentsToCSV(students);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rematriculas_escola_2026_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showLocalFeedback('Planilha exportada em formato CSV com sucesso!', 'success');
    } catch (e: any) {
      showLocalFeedback('Erro ao exportar arquivo CSV: ' + e.message, 'error');
    }
  };

  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'ID_ALUNO': 'COL-001',
        'NOME_ALUNO': 'Lucas Gabriel Silva',
        'RA': 'RA-2026-101',
        'DATA_NASCIMENTO': '2012-04-15',
        'SERIE': '8º Ano do Ensino Fundamental',
        'TURMA': 'Turma A',
        'TURNO': 'Matutino',
        'NOME_RESPONSAVEL_1': 'Patricia Silva (Mãe)',
        'CPF_RESPONSAVEL_1': '123.456.789-00',
        'EMAIL_RESPONSAVEL_1': 'patricia.silva@email.com',
        'TELEFONE_RESPONSAVEL_1': '(11) 98765-4321',
        'ENDERECO_RESPONSAVEL_1': 'Rua das Flores, 100 - São Paulo, SP',
        'NOME_RESPONSAVEL_2': 'Carlos Eduardo Silva (Pai)',
        'CPF_RESPONSAVEL_2': '234.567.890-11',
        'EMAIL_RESPONSAVEL_2': 'carlos.eduardo@email.com',
        'TELEFONE_RESPONSAVEL_2': '(11) 97654-3210',
        'ENDERECO_RESPONSAVEL_2': 'Rua das Flores, 100 - São Paulo, SP',
        'VALOR_MENSALIDADE': 1800,
        'DESCONTO': 100,
        'VALOR_FINAL': 1700,
        'VENCIMENTO': '2026-09-10',
      },
      {
        'ID_ALUNO': 'COL-002',
        'NOME_ALUNO': 'Mariana Costa Ribeiro',
        'RA': 'RA-2026-102',
        'DATA_NASCIMENTO': '2011-09-20',
        'SERIE': '9º Ano do Ensino Fundamental',
        'TURMA': 'Turma B',
        'TURNO': 'Matutino',
        'NOME_RESPONSAVEL_1': 'Roberto Costa (Pai)',
        'CPF_RESPONSAVEL_1': '987.654.321-99',
        'EMAIL_RESPONSAVEL_1': 'roberto.costa@email.com',
        'TELEFONE_RESPONSAVEL_1': '(11) 91234-5678',
        'ENDERECO_RESPONSAVEL_1': 'Av. Paulista, 1500 - São Paulo, SP',
        'NOME_RESPONSAVEL_2': 'Luciana Ribeiro (Mãe)',
        'CPF_RESPONSAVEL_2': '345.678.901-22',
        'EMAIL_RESPONSAVEL_2': 'luciana.ribeiro@email.com',
        'TELEFONE_RESPONSAVEL_2': '(11) 96543-2109',
        'ENDERECO_RESPONSAVEL_2': 'Av. Paulista, 1500 - São Paulo, SP',
        'VALOR_MENSALIDADE': 1950,
        'DESCONTO': 0,
        'VALOR_FINAL': 1950,
        'VENCIMENTO': '2026-09-10',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 26 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 34 },
      { wch: 26 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 34 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Alunos 2026');
    XLSX.writeFile(workbook, 'modelo_planilha_alunos_2026.xlsx');
    showLocalFeedback('Modelo Excel (.xlsx) com colunas para 2 Responsáveis baixado com sucesso!', 'success');
  };

  const handleProcessExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          showLocalFeedback('Arquivo Excel vazio ou sem registros válidos.', 'error');
          return;
        }

        const parsed: Student[] = jsonData.map((row: any, idx: number) => {
          // Normalize keys
          const normalized: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            normalized[key.trim().toUpperCase()] = row[key];
          }

          const studentName =
            normalized['NOME_ALUNO'] ||
            normalized['NOME DO ALUNO'] ||
            normalized['ALUNO'] ||
            normalized['NOME'] ||
            `Aluno ${idx + 1}`;

          const tuition = parseFloat(String(normalized['VALOR_MENSALIDADE'] || normalized['MENSALIDADE'] || normalized['VALOR'] || 1800).replace('R$', '').replace('.', '').replace(',', '.').trim()) || 1800;
          const discount = parseFloat(String(normalized['DESCONTO'] || normalized['BOLSA'] || 0).replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
          const finalVal = tuition - discount;

          return {
            id: String(normalized['ID_ALUNO'] || normalized['ID'] || `COL-2026-${(students.length + idx + 1).toString().padStart(3, '0')}`),
            name: String(studentName),
            ra: String(normalized['RA'] || normalized['MATRICULA'] || `RA-2026-${Math.floor(1000 + Math.random() * 9000)}`),
            serie: String(normalized['SERIE'] || normalized['SÉRIE'] || normalized['ANO'] || '8º Ano do Ensino Fundamental'),
            turma: String(normalized['TURMA'] || normalized['SALA'] || 'Turma A'),
            shift: String(normalized['TURNO'] || normalized['PERIODO'] || 'Matutino'),
            birthDate: String(normalized['DATA_NASCIMENTO'] || normalized['NASCIMENTO'] || '2012-05-10'),
            academicYear: '2026',
            responsibleName: String(normalized['NOME_RESPONSAVEL_1'] || normalized['NOME_RESPONSAVEL'] || normalized['RESPONSAVEL_1'] || normalized['RESPONSAVEL'] || normalized['RESPONSÁVEL'] || '1º Responsável Legal'),
            responsibleCpf: String(normalized['CPF_RESPONSAVEL_1'] || normalized['CPF_RESPONSAVEL'] || normalized['CPF_1'] || normalized['CPF'] || '000.000.000-00'),
            responsibleEmail: String(normalized['EMAIL_RESPONSAVEL_1'] || normalized['EMAIL_RESPONSAVEL'] || normalized['EMAIL_1'] || normalized['EMAIL'] || normalized['E-MAIL'] || 'responsavel1@escola.com.br'),
            responsiblePhone: String(normalized['TELEFONE_RESPONSAVEL_1'] || normalized['TELEFONE_RESPONSAVEL'] || normalized['TELEFONE_1'] || normalized['TELEFONE'] || normalized['WHATSAPP'] || '(11) 98765-4321'),
            responsibleAddress: String(normalized['ENDERECO_RESPONSAVEL_1'] || normalized['ENDERECO_RESPONSAVEL'] || normalized['ENDERECO_1'] || normalized['ENDERECO'] || normalized['ENDEREÇO'] || 'Endereço Cadastrado na Secretaria'),
            responsible2Name: normalized['NOME_RESPONSAVEL_2'] || normalized['RESPONSAVEL_2'] ? String(normalized['NOME_RESPONSAVEL_2'] || normalized['RESPONSAVEL_2']) : undefined,
            responsible2Cpf: normalized['CPF_RESPONSAVEL_2'] || normalized['CPF_2'] ? String(normalized['CPF_RESPONSAVEL_2'] || normalized['CPF_2']) : undefined,
            responsible2Email: normalized['EMAIL_RESPONSAVEL_2'] || normalized['EMAIL_2'] ? String(normalized['EMAIL_RESPONSAVEL_2'] || normalized['EMAIL_2']) : undefined,
            responsible2Phone: normalized['TELEFONE_RESPONSAVEL_2'] || normalized['TELEFONE_2'] ? String(normalized['TELEFONE_RESPONSAVEL_2'] || normalized['TELEFONE_2']) : undefined,
            responsible2Address: normalized['ENDERECO_RESPONSAVEL_2'] || normalized['ENDERECO_2'] ? String(normalized['ENDERECO_RESPONSAVEL_2'] || normalized['ENDERECO_2']) : undefined,
            tuitionValue: tuition,
            discountValue: discount,
            finalValue: finalVal > 0 ? finalVal : 0,
            dueDate: String(normalized['VENCIMENTO'] || normalized['DATA_VENCIMENTO'] || '2026-09-10'),
            status: 'importado',
            protocolNumber: `REM-2026-${(students.length + idx + 1).toString().padStart(3, '0')}`,
            historyLogs: [
              {
                timestamp: new Date().toISOString(),
                action: 'Importação Excel (.xlsx/.xls)',
                details: `Importado via planilha Excel com ${Object.keys(row).length} colunas (1º e 2º Responsáveis).`,
              },
            ],
          };
        });

        const valid = parsed.filter((s) => s.name && !s.name.toUpperCase().includes('NOME_ALUNO'));
        if (valid.length > 0) {
          onUpdateStudents([...valid, ...students]);
          setIsImportModalOpen(false);
          setRawCsvText('');
          showLocalFeedback(`${valid.length} alunos importados com sucesso da planilha Excel (.xlsx)!`, 'success');
        } else {
          showLocalFeedback('Não foi possível identificar linhas com dados válidos no Excel.', 'error');
        }
      } catch (err: any) {
        showLocalFeedback('Erro ao ler arquivo Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.responsibleName || !newStudent.responsibleEmail) {
      showLocalFeedback('Por favor, preencha ao menos o nome do aluno, 1º responsável e e-mail.', 'error');
      return;
    }

    const finalVal = Number(newStudent.tuitionValue || 0) - Number(newStudent.discountValue || 0);

    const created: Student = {
      id: 'std_' + Date.now().toString(36),
      name: newStudent.name!,
      ra: newStudent.ra || `RA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      birthDate: newStudent.birthDate || '2012-01-01',
      serie: newStudent.serie || 'Ensino Fundamental',
      turma: newStudent.turma || 'Turma A',
      shift: newStudent.shift || 'Matutino',
      academicYear: '2026',
      responsibleName: newStudent.responsibleName!,
      responsibleCpf: newStudent.responsibleCpf || '000.000.000-00',
      responsibleEmail: newStudent.responsibleEmail!,
      responsiblePhone: newStudent.responsiblePhone || '(11) 90000-0000',
      responsibleAddress: newStudent.responsibleAddress || 'Endereço não informado',
      responsible2Name: newStudent.responsible2Name || undefined,
      responsible2Cpf: newStudent.responsible2Cpf || undefined,
      responsible2Email: newStudent.responsible2Email || undefined,
      responsible2Phone: newStudent.responsible2Phone || undefined,
      responsible2Address: newStudent.responsible2Address || undefined,
      tuitionValue: Number(newStudent.tuitionValue || 1800),
      discountValue: Number(newStudent.discountValue || 0),
      finalValue: finalVal > 0 ? finalVal : 0,
      dueDate: newStudent.dueDate || '2026-09-10',
      status: 'importado',
      protocolNumber: `REM-2026-${(students.length + 1).toString().padStart(3, '0')}`,
      historyLogs: [
        {
          timestamp: new Date().toISOString(),
          action: 'Cadastro Manual',
          details: 'Aluno inserido diretamente no sistema com 2 responsáveis.',
        },
      ],
    };

    onUpdateStudents([created, ...students]);
    setIsAddingStudent(false);
    showLocalFeedback(`Aluno ${created.name} cadastrado na planilha com sucesso!`, 'success');
    setNewStudent({
      name: '',
      ra: `RA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      birthDate: '2012-05-10',
      serie: '8º Ano do Ensino Fundamental',
      turma: '8º Ano A',
      shift: 'Matutino',
      academicYear: '2026',
      responsibleName: '',
      responsibleCpf: '',
      responsibleEmail: '',
      responsiblePhone: '',
      responsibleAddress: '',
      responsible2Name: '',
      responsible2Cpf: '',
      responsible2Email: '',
      responsible2Phone: '',
      responsible2Address: '',
      tuitionValue: 1800,
      discountValue: 0,
      finalValue: 1800,
      dueDate: '2026-09-10',
      status: 'importado',
    });
  };

  const handleSaveEditedStudent = async (updatedStudent: Student, shouldResendAutentique?: boolean) => {
    const updatedList = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    onUpdateStudents(updatedList);
    setEditingStudent(null);

    if (shouldResendAutentique) {
      showLocalFeedback(`Dados de ${updatedStudent.name} salvos! Disparando novo contrato para Autentique...`, 'info');
      await onSendAutentique(updatedStudent);
      showLocalFeedback(`Contrato atualizado de ${updatedStudent.name} reenviado para ${updatedStudent.responsibleEmail}!`, 'success');
    } else {
      showLocalFeedback(`Dados de ${updatedStudent.name} atualizados com sucesso!`, 'success');
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o aluno ${studentName} da lista de rematrículas?`)) {
      const remaining = students.filter((s) => s.id !== studentId);
      onUpdateStudents(remaining);
      showLocalFeedback(`Aluno ${studentName} removido da planilha.`, 'info');
    }
  };

  const handleImportCsv = () => {
    if (!rawCsvText.trim()) {
      showLocalFeedback('Cole os dados da planilha na caixa de texto antes de importar.', 'error');
      return;
    }

    try {
      const lines = rawCsvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        showLocalFeedback('Planilha vazia ou com formato de linhas inválido. Certifique-se de incluir a linha de cabeçalho e ao menos 1 aluno.', 'error');
        return;
      }

      // Detecção inteligente de separador (ponto e vírgula, vírgula ou tabulação)
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      
      const headerCols = firstLine
        .split(separator)
        .map((c) => c.replace(/^["']|["']$/g, '').trim().toUpperCase());

      // Helper to find column index by name or fallback to index
      const getColIdx = (names: string[], defaultIdx: number) => {
        const foundIdx = headerCols.findIndex(h => names.some(n => h.includes(n)));
        return foundIdx !== -1 ? foundIdx : defaultIdx;
      };

      const nameIdx = getColIdx(['NOME_ALUNO', 'NOME DO ALUNO', 'ALUNO', 'NOME'], 0);
      const raIdx = getColIdx(['RA', 'MATRICULA', 'REGISTRO', 'ID_ALUNO'], 1);
      const serieIdx = getColIdx(['SERIE', 'SÉRIE', 'ANO'], 2);
      const turmaIdx = getColIdx(['TURMA', 'SALA'], 3);
      const turnoIdx = getColIdx(['TURNO', 'PERIODO'], 4);
      const respNameIdx = getColIdx(['NOME_RESPONSAVEL', 'RESPONSAVEL', 'RESPONSÁVEL'], 5);
      const respCpfIdx = getColIdx(['CPF_RESPONSAVEL', 'CPF'], 6);
      const tuitionIdx = getColIdx(['VALOR_MENSALIDADE', 'MENSALIDADE', 'VALOR_REMATRICULA', 'VALOR'], 7);
      const discountIdx = getColIdx(['DESCONTO', 'BOLSA'], 8);
      const emailIdx = getColIdx(['EMAIL_RESPONSAVEL', 'EMAIL', 'E-MAIL'], 9);
      const phoneIdx = getColIdx(['TELEFONE_RESPONSAVEL', 'TELEFONE', 'WHATSAPP', 'CELULAR'], 10);
      const addressIdx = getColIdx(['ENDERECO_RESPONSAVEL', 'ENDERECO', 'ENDEREÇO'], 11);
      const dueIdx = getColIdx(['VENCIMENTO', 'DATA_VENCIMENTO'], 12);
      const birthIdx = getColIdx(['DATA_NASCIMENTO', 'NASCIMENTO'], 13);

      const rows = lines.slice(1);

      const parsed: Student[] = rows
        .map((line, idx) => {
          // Robust split considering quotes
          const regex = new RegExp(`(?:^|${separator})(\"(?:[^\"]+|\"\")*\"|[^${separator}]*)`, 'g');
          const cols: string[] = [];
          let match;
          while ((match = regex.exec(line)) !== null) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1).replace(/""/g, '"');
            }
            cols.push(val.trim());
          }

          // Fallback if regex split got empty
          const finalCols = cols.length > 0 ? cols : line.split(separator).map(c => c.replace(/^["']|["']$/g, '').trim());

          const studentName = finalCols[nameIdx] || finalCols[0];
          if (!studentName || studentName.toUpperCase().includes('NOME')) return null;

          const tuition = parseFloat((finalCols[tuitionIdx] || '1800').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 1800;
          const discount = parseFloat((finalCols[discountIdx] || '0').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
          const finalVal = tuition - discount;

          const student: Student = {
            id: 'COL-2026-' + (students.length + idx + 1).toString().padStart(3, '0'),
            name: studentName,
            ra: finalCols[raIdx] || `RA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            serie: finalCols[serieIdx] || 'Ensino Fundamental',
            turma: finalCols[turmaIdx] || 'Turma A',
            shift: finalCols[turnoIdx] || 'Matutino',
            birthDate: finalCols[birthIdx] || '2012-05-10',
            academicYear: '2026',
            responsibleName: finalCols[respNameIdx] || 'Responsável Financeiro',
            responsibleCpf: finalCols[respCpfIdx] || '000.000.000-00',
            responsibleEmail: finalCols[emailIdx] || 'responsavel@escola.com.br',
            responsiblePhone: finalCols[phoneIdx] || '(11) 98765-4321',
            responsibleAddress: finalCols[addressIdx] || 'Endereço Cadastrado na Secretaria',
            tuitionValue: tuition,
            discountValue: discount,
            finalValue: finalVal > 0 ? finalVal : 0,
            dueDate: finalCols[dueIdx] || '2026-09-10',
            status: 'importado',
            protocolNumber: `REM-2026-${(students.length + idx + 1).toString().padStart(3, '0')}`,
            historyLogs: [
              {
                timestamp: new Date().toISOString(),
                action: 'Importação por Colunas de Planilha',
                details: `Importado com sucesso (${finalCols.length} colunas mapeadas).`,
              },
            ],
          };
          return student;
        })
        .filter((s): s is Student => s !== null);

      if (parsed.length > 0) {
        onUpdateStudents([...parsed, ...students]);
        setIsImportModalOpen(false);
        setRawCsvText('');
        showLocalFeedback(`${parsed.length} alunos importados em colunas com sucesso!`, 'success');
      } else {
        showLocalFeedback('Não foi possível identificar registros válidos na planilha informada. Verifique os títulos das colunas.', 'error');
      }
    } catch (e: any) {
      showLocalFeedback('Erro ao processar planilha: ' + e.message, 'error');
    }
  };

  const handleBatchSend = async () => {
    const unSent = students.filter((s) => s.status === 'importado');
    if (unSent.length === 0) {
      showLocalFeedback('Todos os alunos da planilha já possuem contratos gerados ou enviados para Autentique.', 'info');
      return;
    }
    setIsSendingBatch(true);
    await onBatchSendAutentique(unSent);
    setIsSendingBatch(false);
    showLocalFeedback(`Lote de ${unSent.length} contratos disparado para a API Autentique!`, 'success');
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-violet-100 text-violet-700 border-violet-200',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case 'importado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Planilha Importada
          </span>
        );
      case 'contrato_gerado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
            Contrato Gerado
          </span>
        );
      case 'enviado_autentique':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
            Aguardando Assinatura
          </span>
        );
      case 'assinado':
      case 'pagamento_pendente':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5"></span>
            Assinado • Aguardando Pgto
          </span>
        );
      case 'pago':
      case 'matricula_confirmada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/90 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Matrícula Confirmada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-xs transition-all animate-fade-in ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner / Metrics & Actions */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50/50 via-slate-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Painel Executivo de Rematrículas 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Gestão de Alunos & Contratos
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Importe sua planilha de alunos, gere contratos personalizados e acompanhe o fluxo integrado de assinatura digital via <strong>API Autentique</strong> e conciliação bancária via <strong>API Itaú</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-import-spreadsheet"
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm cursor-pointer select-none"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel / CSV</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-sm cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCsv}
              className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs select-none"
              title="Exportar em formato CSV com separador ponto e vírgula"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              id="btn-add-student-manual"
              onClick={() => setIsAddingStudent(!isAddingStudent)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Aluno</span>
            </button>

            <button
              id="btn-batch-send-autentique"
              onClick={handleBatchSend}
              disabled={isSendingBatch}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50 select-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingBatch ? 'Disparando...' : 'Disparo em Lote'}</span>
            </button>
          </div>
        </div>

        {/* Quick summary KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total na Planilha</span>
              <span className="w-6 h-6 rounded-lg bg-slate-200/60 text-slate-600 flex items-center justify-center text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-2 tracking-tight">
              {students.length}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">base importada ativa</span>
          </div>

          <div className="bg-amber-50/40 hover:bg-amber-50/70 rounded-xl p-4 border border-amber-200/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Aguardando Assinatura</span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-mono mt-2 tracking-tight">
              {students.filter((s) => s.status === 'enviado_autentique').length}
            </div>
            <span className="text-[11px] text-amber-700/80 font-medium">enviados via Autentique</span>
          </div>

          <div className="bg-indigo-50/40 hover:bg-indigo-50/70 rounded-xl p-4 border border-indigo-200/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Assinados Digitalmente</span>
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                <FileText className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 font-mono mt-2 tracking-tight">
              {students.filter((s) => s.status === 'assinado' || s.status === 'pagamento_pendente' || s.status === 'pago' || s.status === 'matricula_confirmada').length}
            </div>
            <span className="text-[11px] text-indigo-700/80 font-medium">contratos homologados</span>
          </div>

          <div className="bg-emerald-50/40 hover:bg-emerald-50/70 rounded-xl p-4 border border-emerald-200/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Matrículas Confirmadas</span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 font-mono mt-2 tracking-tight">
              {students.filter((s) => s.status === 'pago' || s.status === 'matricula_confirmada').length}
            </div>
            <span className="text-[11px] text-emerald-700/80 font-medium">pagos via Itaú (PIX/Cartão)</span>
          </div>
        </div>
      </div>

      {/* Manual Add Student Panel (Expandable) */}
      {isAddingStudent && (
        <form
          onSubmit={handleSaveNewStudent}
          className="bg-white rounded-2xl p-5 border-2 border-blue-500/30 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
              <Plus className="w-5 h-5 text-blue-600" />
              Adicionar Aluno Manualmente na Planilha
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingStudent(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-4">
            {/* Aluno */}
            <div>
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                1. Dados do Aluno
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo do Aluno *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="Ex: Pedro Henrique Souza"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RA / Matrícula</label>
                  <input
                    type="text"
                    value={newStudent.ra}
                    onChange={(e) => setNewStudent({ ...newStudent, ra: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Série / Ano *</label>
                  <input
                    type="text"
                    value={newStudent.serie}
                    onChange={(e) => setNewStudent({ ...newStudent, serie: e.target.value })}
                    placeholder="Ex: 1º Ano do Ensino Médio"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Turma & Turno</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStudent.turma}
                      onChange={(e) => setNewStudent({ ...newStudent, turma: e.target.value })}
                      placeholder="Turma A"
                      className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <select
                      value={newStudent.shift}
                      onChange={(e) => setNewStudent({ ...newStudent, shift: e.target.value })}
                      className="w-1/2 px-2 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Integral">Integral</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 1º Responsável (Contratante 1) */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100">
              <div className="font-bold text-xs text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                2. 1º Responsável Financeiro (1º Contratante)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.responsibleName}
                    onChange={(e) => setNewStudent({ ...newStudent, responsibleName: e.target.value })}
                    placeholder="Ex: Carla Maria Souza"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={newStudent.responsibleCpf}
                    onChange={(e) => setNewStudent({ ...newStudent, responsibleCpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail para Assinatura *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.responsibleEmail}
                    onChange={(e) => setNewStudent({ ...newStudent, responsibleEmail: e.target.value })}
                    placeholder="carla@email.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={newStudent.responsiblePhone}
                    onChange={(e) => setNewStudent({ ...newStudent, responsiblePhone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={newStudent.responsibleAddress}
                    onChange={(e) => setNewStudent({ ...newStudent, responsibleAddress: e.target.value })}
                    placeholder="Rua, Número, Cidade"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 2º Responsável (Contratante 2) */}
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
              <div className="font-bold text-xs text-indigo-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  3. 2º Responsável Financeiro (2º Contratante - Opcional / Solidário)
                </div>
                <span className="text-[11px] text-indigo-600 font-normal">Assina em conjunto</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo (2º Resp.)</label>
                  <input
                    type="text"
                    value={newStudent.responsible2Name || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, responsible2Name: e.target.value })}
                    placeholder="Ex: Roberto Carlos Souza"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF (2º Resp.)</label>
                  <input
                    type="text"
                    value={newStudent.responsible2Cpf || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, responsible2Cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail (2º Resp.)</label>
                  <input
                    type="email"
                    value={newStudent.responsible2Email || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, responsible2Email: e.target.value })}
                    placeholder="roberto@email.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp (2º Resp.)</label>
                  <input
                    type="text"
                    value={newStudent.responsible2Phone || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, responsible2Phone: e.target.value })}
                    placeholder="(11) 97654-3210"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Endereço (2º Resp.)</label>
                  <input
                    type="text"
                    value={newStudent.responsible2Address || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, responsible2Address: e.target.value })}
                    placeholder="Mesmo endereço ou outro"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Valores e Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Valor da Mensalidade (R$)</label>
                <input
                  type="number"
                  value={newStudent.tuitionValue}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value) || 0;
                    setNewStudent({
                      ...newStudent,
                      tuitionValue: t,
                      finalValue: t - (newStudent.discountValue || 0),
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Desconto / Bolsa (R$)</label>
                <input
                  type="number"
                  value={newStudent.discountValue}
                  onChange={(e) => {
                    const d = parseFloat(e.target.value) || 0;
                    setNewStudent({
                      ...newStudent,
                      discountValue: d,
                      finalValue: (newStudent.tuitionValue || 0) - d,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={newStudent.dueDate}
                  onChange={(e) => setNewStudent({ ...newStudent, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddingStudent(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Salvar Aluno na Planilha
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por aluno, responsável, CPF, RA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs font-medium placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtrar:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer transition"
          >
            <option value="todos">Todos os Status</option>
            <option value="importado">Planilha Importada</option>
            <option value="enviado_autentique">Aguardando Assinatura</option>
            <option value="assinado">Assinado (Aguardando Pgto)</option>
            <option value="pago">Matrícula Confirmada</option>
          </select>

          <select
            value={serieFilter}
            onChange={(e) => setSerieFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer transition"
          >
            <option value="todas">Todas as Séries</option>
            {seriesList.map((serie) => (
              <option key={serie} value={serie}>
                {serie}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Aluno & Matrícula (RA)</th>
                <th className="py-3.5 px-5">Série / Turma</th>
                <th className="py-3.5 px-5">Responsável & Contato</th>
                <th className="py-3.5 px-5">Proposta Financeira</th>
                <th className="py-3.5 px-5">Status do Processo</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Nenhum aluno encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros de busca ou importar um novo arquivo de planilha.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onSelectStudent(student)}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 ${getAvatarColor(student.name)}`}>
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {student.name}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                              {student.ra}
                            </span>
                            <span>•</span>
                            <span>{student.protocolNumber || 'REM-2026'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-800 text-xs">{student.serie}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5 font-medium">
                        {student.turma} • {student.shift}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded">1º Resp</span>
                          <span className="truncate max-w-[160px]">{student.responsibleName}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                          <span>{formatCpf(student.responsibleCpf)}</span>
                          <span>•</span>
                          <span className="text-slate-500 font-sans truncate max-w-[140px]">{student.responsibleEmail}</span>
                        </div>
                      </div>

                      {student.responsible2Name && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded">2º Resp</span>
                            <span className="truncate max-w-[160px]">{student.responsible2Name}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                            <span>{formatCpf(student.responsible2Cpf || '')}</span>
                            <span>•</span>
                            <span className="text-slate-500 font-sans truncate max-w-[140px]">{student.responsible2Email || ''}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 text-sm font-mono">
                        {formatCurrency(student.finalValue)}
                      </div>
                      {student.discountValue > 0 && (
                        <div className="text-emerald-700 text-[11px] font-bold mt-0.5 flex items-center gap-1">
                          <span>Bolsa: -{formatCurrency(student.discountValue)}</span>
                        </div>
                      )}
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Venc: {formatDateBr(student.dueDate)}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {getStatusBadge(student.status)}
                      {student.autentiqueSignedAt && (
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Assinado às {new Date(student.autentiqueSignedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {student.itauPaidAt && (
                        <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Itaú {student.itauPaymentType || 'PIX'} Liquidado
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`btn-edit-student-${student.id}`}
                          onClick={() => setEditingStudent(student)}
                          title="Editar dados cadastrais e opções de reenvio"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs select-none"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar</span>
                        </button>

                        {student.status === 'importado' && (
                          <button
                            id={`btn-send-autentique-${student.id}`}
                            onClick={() => onSendAutentique(student)}
                            title="Gerar e Enviar Contrato para Autentique"
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs select-none"
                          >
                            <Send className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Enviar</span>
                          </button>
                        )}

                        <button
                          id={`btn-open-portal-${student.id}`}
                          onClick={() => onOpenPortal(student)}
                          title="Abrir Portal do Responsável (Assinatura e Pagamento)"
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs select-none"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Portal</span>
                        </button>

                        <button
                          id={`btn-delete-student-${student.id}`}
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          title="Excluir aluno"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between font-medium">
          <span>Mostrando {filteredStudents.length} de {students.length} alunos cadastrados na planilha</span>
          <span className="text-slate-400">Clique em qualquer linha para abrir a trilha de auditoria</span>
        </div>
      </div>

      {/* Excel / CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Importação por Planilha Excel / XLS em Colunas</h3>
                  <p className="text-xs text-slate-500">Selecione um arquivo Excel (.xlsx, .xls) ou cole os dados em colunas</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Excel Drag & Drop / Direct File Picker */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70 transition flex flex-col items-center justify-center text-center group cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      handleProcessExcelFile(file);
                    } else {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setRawCsvText((event.target?.result as string) || '');
                      };
                      reader.readAsText(file);
                    }
                  }
                }}
              />
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-slate-800">Clique para selecionar seu arquivo Excel (.xlsx / .xls)</p>
              <p className="text-xs text-slate-500 mt-0.5">Ou arraste e solte o arquivo da planilha aqui</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold font-mono">.xlsx</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold font-mono">.xls</span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold font-mono">.csv</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2 font-sans">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Ordem padrão das colunas da planilha:</span>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1.5 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Baixar Modelo Excel (.xlsx)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200/80 overflow-x-auto whitespace-nowrap">
                ID_ALUNO | NOME_ALUNO | RA | DATA_NASCIMENTO | SERIE | TURMA | TURNO | NOME_RESPONSAVEL | CPF_RESPONSAVEL | EMAIL_RESPONSAVEL | TELEFONE_RESPONSAVEL | ENDERECO_RESPONSAVEL | VALOR_MENSALIDADE | DESCONTO | VENCIMENTO
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ou cole os dados da planilha em texto abaixo:
              </label>
              <textarea
                rows={5}
                value={rawCsvText}
                onChange={(e) => setRawCsvText(e.target.value)}
                placeholder={`NOME_ALUNO;RA;SERIE;TURMA;TURNO;NOME_RESPONSAVEL;CPF_RESPONSAVEL;VALOR_MENSALIDADE;DESCONTO;EMAIL_RESPONSAVEL;TELEFONE_RESPONSAVEL;ENDERECO_RESPONSAVEL;VENCIMENTO
Ana Clara Silva;RA-2026-1122;1º Ano Ensino Médio;Turma A;Matutino;Marcos Silva;333.444.555-66;2100;200;marcos.silva@email.com;(11) 98888-7777;Rua das Flores 123;2026-09-10
Felipe Santos;RA-2026-3344;6º Ano Fundamental;Turma B;Vespertino;Sandra Santos;777.888.999-00;1700;100;sandra.santos@email.com;(11) 97777-6666;Av Brasil 456;2026-09-10`}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setRawCsvText(`Nome Aluno,RA,Série,Turma,Turno,Responsável,CPF,Valor,Desconto,Email,Telefone,Endereço,Vencimento
Isabela Cristina Rocha,RA-2026-9901,8º Ano Fundamental,8º A,Matutino,Fernando Rocha,888.999.000-11,1850,150,fernando.rocha@email.com,(11) 99123-9999,Rua Oscar Freire 500 SP,2026-09-10
Thiago Oliveira Dias,RA-2026-9902,3º Ano Ensino Médio,3º B,Matutino,Lucia Oliveira Dias,999.000.111-22,2400,250,lucia.dias@email.com,(11) 98234-8888,Rua Haddock Lobo 800 SP,2026-09-10`);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Carregar Exemplo de Teste
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  disabled={!rawCsvText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Importar Texto Colado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student & Resend Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveEditedStudent}
          onOpenPortal={onOpenPortal}
          template={template}
        />
      )}
    </div>
  );
}
