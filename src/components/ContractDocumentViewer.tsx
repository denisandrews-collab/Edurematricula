import React, { useState, useMemo } from 'react';
import { Student, ContractTemplate } from '../types';
import { formatCurrency, formatDateBr, formatCpf, formatPhone } from '../utils/contractFormatter';
import { generateContractPdf } from '../utils/pdfGenerator';
import {
  FileText,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Building,
  User,
  GraduationCap,
  Calendar,
  Lock,
  ExternalLink,
  Copy,
  Check,
  FileCheck,
  Award,
  Sparkles,
} from 'lucide-react';

interface Props {
  student: Student;
  template: ContractTemplate;
  rawContractText: string;
  isSigned?: boolean;
  isSigner1Signed?: boolean;
  isSigner2Signed?: boolean;
}

export function ContractDocumentViewer({
  student,
  template,
  rawContractText,
  isSigned = false,
  isSigner1Signed,
  isSigner2Signed,
}: Props) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreenReader, setIsFullscreenReader] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Trigger PDF download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateContractPdf(student, template, rawContractText);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy full contract text
  const handleCopyText = () => {
    navigator.clipboard.writeText(rawContractText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Print contract
  const handlePrint = () => {
    window.print();
  };

  // Parse raw markdown into structured sections
  const parsedSections = useMemo(() => {
    const lines = rawContractText.split('\n');
    const sections: Array<{
      type: 'title' | 'subtitle' | 'h3' | 'h4' | 'clause' | 'paragraph' | 'divider' | 'signature';
      text: string;
      raw: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line === '---' || line === '***') {
        sections.push({ type: 'divider', text: '', raw: line });
      } else if (line.startsWith('## ')) {
        sections.push({ type: 'title', text: line.replace('## ', ''), raw: line });
      } else if (line.startsWith('### ')) {
        const text = line.replace('### ', '');
        if (text.includes('CLÁUSULA') || text.includes('CLAUSULA')) {
          sections.push({ type: 'clause', text, raw: line });
        } else {
          sections.push({ type: 'h3', text, raw: line });
        }
      } else if (line.startsWith('#### ')) {
        sections.push({ type: 'h4', text: line.replace('#### ', ''), raw: line });
      } else if (line.startsWith('____') || line.includes('_____')) {
        sections.push({ type: 'signature', text: '', raw: line });
      } else {
        sections.push({ type: 'paragraph', text: line, raw: line });
      }
    }

    return sections;
  }, [rawContractText]);

  // Helper to render bold tokens safely without asterisks
  const renderFormattedInlineText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanBold = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-slate-900">
            {cleanBold}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Render the contract paper sheet
  const renderContractPaper = () => (
    <div
      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
      className="transition-transform duration-150 ease-out max-w-4xl mx-auto bg-white border border-slate-300 rounded-sm shadow-xl p-8 sm:p-14 text-slate-800 text-xs font-serif leading-relaxed relative print:border-none print:shadow-none print:p-0 print:max-w-none print:transform-none select-text"
    >
      {/* Watermark / Digital Seal Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.025] select-none overflow-hidden">
        <GraduationCap className="w-[500px] h-[500px] text-slate-950" />
      </div>

      {/* Official School Timbre Header */}
      <div className="border-b-2 border-slate-900 pb-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h1 className="font-sans font-black text-slate-950 text-base sm:text-lg tracking-tight uppercase">
              {template.schoolName}
            </h1>
            <div className="font-sans text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>CNPJ: <strong>{template.schoolCnpj}</strong></span>
              <span>•</span>
              <span>Reconhecimento Oficial MEC / CEE</span>
              <span>•</span>
              <span>{template.schoolCity} - {template.schoolState}</span>
            </div>
            <div className="font-sans text-[10px] text-slate-500 mt-0.5">
              Representante Legal: {template.schoolRepresentative} • Contato: {template.schoolPhone}
            </div>
          </div>
        </div>

        <div className="font-sans text-left sm:text-right bg-slate-50 border border-slate-200 p-2.5 rounded-xl shrink-0 text-[11px]">
          <div className="text-slate-500">Protocolo da Rematrícula:</div>
          <div className="font-mono font-bold text-slate-900 text-xs">
            {student.protocolNumber || 'REM-' + template.academicYear + '-001'}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center sm:justify-end gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Autentique: {student.autentiqueDocId || 'autq_' + student.id}</span>
          </div>
        </div>
      </div>

      {/* Contract Title Banner */}
      <div className="text-center my-6 space-y-1">
        <h2 className="font-sans text-lg sm:text-xl font-black text-slate-950 tracking-tight uppercase">
          Instrumento Particular de Prestação de Serviços Educacionais
        </h2>
        <p className="font-sans text-xs font-bold text-indigo-700 uppercase tracking-wider">
          Ano Letivo de {template.academicYear} • Educação Básica
        </p>
      </div>

      {/* Preamble Summary Box */}
      <div className="font-sans my-6 p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-xs space-y-2 shadow-2xs">
        <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
          <Building className="w-3.5 h-3.5 text-indigo-600" />
          <span>Partes Contratantes e Beneficiário (Identificação Cadastral Homologada)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          {/* Contratada */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium block">CONTRATADA (Escola):</span>
            <strong className="text-slate-900 block font-semibold">{template.schoolName}</strong>
            <span className="text-slate-600 font-mono text-[10px]">CNPJ: {template.schoolCnpj}</span>
          </div>

          {/* 1º Contratante */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium block">1º CONTRATANTE (Principal):</span>
            <strong className="text-slate-900 block font-semibold">{student.responsibleName}</strong>
            <span className="text-slate-600 font-mono text-[10px]">CPF: {formatCpf(student.responsibleCpf)}</span>
            <div className="text-slate-500 text-[10px] truncate">{student.responsibleEmail}</div>
          </div>

          {/* Aluno Beneficiário */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium block">ALUNO(A) BENEFICIÁRIO(A):</span>
            <strong className="text-indigo-950 block font-semibold">{student.name}</strong>
            <span className="text-slate-600 font-mono text-[10px]">RA: {student.ra}</span>
            <div className="text-indigo-700 font-bold text-[10px]">{student.serie}</div>
          </div>
        </div>
      </div>

      {/* Contract Body Rendered with Legal Typography */}
      <div className="space-y-4 text-justify leading-relaxed text-slate-800">
        {parsedSections.map((sec, idx) => {
          if (sec.type === 'title') {
            return (
              <h2
                key={idx}
                className="font-sans font-black text-sm text-slate-950 uppercase pt-4 border-t border-slate-200 tracking-tight"
              >
                {sec.text.replace(/\*\*/g, '')}
              </h2>
            );
          }

          if (sec.type === 'h3') {
            return (
              <h3
                key={idx}
                className="font-sans font-bold text-xs text-slate-900 uppercase tracking-wide pt-2"
              >
                {sec.text.replace(/\*\*/g, '')}
              </h3>
            );
          }

          if (sec.type === 'h4') {
            return (
              <h4
                key={idx}
                className="font-sans font-semibold text-xs text-indigo-900 pt-1"
              >
                {sec.text.replace(/\*\*/g, '')}
              </h4>
            );
          }

          if (sec.type === 'clause') {
            return (
              <div
                key={idx}
                className="font-sans font-bold text-xs text-slate-900 bg-slate-100/70 p-2.5 rounded-lg border-l-4 border-indigo-600 mt-5 mb-2"
              >
                {sec.text.replace(/\*\*/g, '')}
              </div>
            );
          }

          if (sec.type === 'divider') {
            return <hr key={idx} className="my-4 border-slate-200" />;
          }

          if (sec.type === 'signature') {
            return null; // Handled separately in dedicated signature block
          }

          // Regular paragraph: check for list items or clauses
          const isListItem = sec.text.startsWith('- ') || sec.text.startsWith('• ');
          const formattedText = isListItem ? sec.text.replace(/^[-•]\s*/, '') : sec.text;

          return (
            <p
              key={idx}
              className={`${
                isListItem
                  ? 'pl-5 relative before:content-["•"] before:absolute before:left-1.5 before:text-indigo-600 before:font-bold'
                  : 'text-indent-6'
              } text-xs leading-relaxed`}
            >
              {renderFormattedInlineText(formattedText)}
            </p>
          );
        })}
      </div>

      {/* Financial Overview Table */}
      <div className="font-sans my-8 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
        <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-700" />
          <span>Resumo dos Valores Fixados para a Parcela de Rematrícula {template.academicYear}</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
            <span className="text-[10px] text-slate-500 font-medium block">Valor Integral:</span>
            <strong className="text-xs text-slate-800 font-bold">{formatCurrency(student.tuitionValue)}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
            <span className="text-[10px] text-slate-500 font-medium block">Desconto / Bolsa:</span>
            <strong className="text-xs text-emerald-700 font-bold">{formatCurrency(student.discountValue)}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
            <span className="text-[10px] text-slate-500 font-medium block">Valor Líquido:</span>
            <strong className="text-xs text-indigo-950 font-black">{formatCurrency(student.finalValue)}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
            <span className="text-[10px] text-slate-500 font-medium block">Vencimento:</span>
            <strong className="text-xs text-rose-700 font-bold">{formatDateBr(student.dueDate)}</strong>
          </div>
        </div>
      </div>

      {/* Formal Signature Blocks */}
      <div className="font-sans mt-10 pt-6 border-t-2 border-slate-900 space-y-8">
        <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-900">
          Formalização e Assinatura das Partes e Testemunhas
        </div>

        {/* 2-column signature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          {/* Contratada */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[280px] border-b border-slate-400 pb-1 mb-2"></div>
            <strong className="text-slate-900 block font-bold text-xs">{template.schoolName}</strong>
            <span className="text-slate-600 text-[11px] block">Representante: {template.schoolRepresentative}</span>
            <span className="text-slate-500 font-mono text-[10px] block">CPF: {template.schoolRepresentativeCpf}</span>
            <span className="text-slate-400 text-[10px] block font-sans">Contratada (Instituição de Ensino)</span>
          </div>

          {/* 1º Contratante */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[280px] border-b border-slate-400 pb-1 mb-2"></div>
            <strong className="text-slate-900 block font-bold text-xs">{student.responsibleName}</strong>
            <span className="text-slate-600 text-[11px] block">1º Contratante / Responsável Principal</span>
            <span className="text-slate-500 font-mono text-[10px] block">CPF: {formatCpf(student.responsibleCpf)}</span>

            {/* If signed via Autentique, display official stamp */}
            {isSigner1Signed || isSigned ? (
              <div className="mt-2 bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-left w-full max-w-[280px] shadow-2xs">
                <div className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Assinado Digitalmente via Autentique</span>
                </div>
                <div className="text-[9px] text-emerald-700 font-mono mt-0.5">
                  Data: {student.autentiqueSigner1SignedAt || student.autentiqueSignedAt ? new Date(student.autentiqueSigner1SignedAt || student.autentiqueSignedAt!).toLocaleString('pt-BR') : '14/08/2026'}
                </div>
                <div className="text-[9px] text-emerald-700 font-mono truncate">
                  IP: {student.autentiqueSigner1Ip || student.autentiqueSignerIp || '177.18.241.109'} • Hash: {(student.autentiqueCertHash || 'sha256_mock').slice(0, 14)}...
                </div>
              </div>
            ) : (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] block font-semibold mt-1">
                Pendente: Aguardando assinatura do 1º Responsável
              </span>
            )}
          </div>
        </div>

        {/* 2nd Responsible if present */}
        {student.responsible2Name && (
          <div className="flex flex-col items-center pt-2">
            <div className="w-full max-w-[280px] border-b border-slate-400 pb-1 mb-2"></div>
            <strong className="text-slate-900 block font-bold text-xs">{student.responsible2Name}</strong>
            <span className="text-slate-600 text-[11px] block">2º Contratante / Co-Responsável Solidário</span>
            <span className="text-slate-500 font-mono text-[10px] block">CPF: {formatCpf(student.responsible2Cpf || '')}</span>

            {/* If 2nd signer signed via Autentique, display official stamp */}
            {isSigner2Signed ? (
              <div className="mt-2 bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-left w-full max-w-[280px] shadow-2xs">
                <div className="text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Assinado Digitalmente via Autentique</span>
                </div>
                <div className="text-[9px] text-emerald-700 font-mono mt-0.5">
                  Data: {student.autentiqueSigner2SignedAt || student.autentiqueSignedAt ? new Date(student.autentiqueSigner2SignedAt || student.autentiqueSignedAt!).toLocaleString('pt-BR') : '14/08/2026'}
                </div>
                <div className="text-[9px] text-emerald-700 font-mono truncate">
                  IP: {student.autentiqueSigner2Ip || student.autentiqueSignerIp || '177.18.241.109'} • Hash: {(student.autentiqueCertHash || 'sha256_mock').slice(0, 14)}...
                </div>
              </div>
            ) : (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] block font-semibold mt-1">
                Pendente: Aguardando assinatura do 2º Responsável
              </span>
            )}
          </div>
        )}

        {/* Witnesses */}
        <div className="pt-4 border-t border-slate-200">
          <div className="text-slate-600 text-[11px] font-bold text-center mb-4 uppercase">
            Testemunhas Instrumentárias Fixas:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center text-[11px]">
            <div>
              <div className="w-full max-w-[220px] mx-auto border-b border-slate-400 pb-1 mb-1"></div>
              <strong className="text-slate-800 block">{template.witness1Name}</strong>
              <span className="text-slate-500 text-[10px] block">CPF: {template.witness1Cpf} ({template.witness1Role})</span>
            </div>
            <div>
              <div className="w-full max-w-[220px] mx-auto border-b border-slate-400 pb-1 mb-1"></div>
              <strong className="text-slate-800 block">{template.witness2Name}</strong>
              <span className="text-slate-500 text-[10px] block">CPF: {template.witness2Cpf} ({template.witness2Role})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Footnote / Legal Statement */}
      <div className="font-sans mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Documento eletrônico auditável nos termos da MP 2.200-2/2001 e Lei 14.063/2020. Certificado provido por Autentique.
          </span>
        </div>
        <div className="font-mono text-slate-400 text-right">
          Página 1 de 1 • Hash: sha256_{student.id.slice(0, 8)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Document Toolbar */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Left: Document info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white flex items-center gap-2">
              <span>Visualizador Oficial de Minuta Contratual</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-semibold">
                Padrão A4 Homologado
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Aluno: <strong className="text-slate-200">{student.name}</strong> • Ano Letivo {template.academicYear}
            </div>
          </div>
        </div>

        {/* Right: Actions (Zoom, Read Fullscreen, Download PDF, Print, Copy) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
              disabled={zoomLevel <= 75}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[42px] text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              disabled={zoomLevel >= 130}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer border-l border-slate-700 ml-0.5"
                title="Redefinir Zoom 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Fullscreen Reading Mode Button */}
          <button
            type="button"
            onClick={() => setIsFullscreenReader(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            title="Abrir em Tela Cheia para Leitura Confortável"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Modo Leitura</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            title="Imprimir Contrato"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Copy Text Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            title="Copiar Texto do Contrato"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Copiar</span>
              </>
            )}
          </button>

          {/* Download PDF Primary Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
            title="Baixar Contrato Oficial em formato PDF"
          >
            <Download className={`w-4 h-4 ${isGeneratingPdf ? 'opacity-60' : ''}`} />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Contrato em PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Document Reader Container */}
      <div className="bg-slate-100/90 rounded-2xl p-4 sm:p-8 border border-slate-200 max-h-[550px] overflow-y-auto overflow-x-auto shadow-inner">
        {renderContractPaper()}
      </div>

      {/* Fullscreen Reading Modal */}
      {isFullscreenReader && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col animate-fade-in">
          {/* Modal Header Toolbar */}
          <div className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Modo Leitura Completa: Contrato de Prestação de Serviços Educacionais</span>
                </h3>
                <div className="text-xs text-slate-400">
                  {student.name} ({student.serie}) • Ano Letivo {template.academicYear}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom inside Modal */}
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
                  disabled={zoomLevel <= 75}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-xs text-slate-300 min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
                  disabled={zoomLevel >= 140}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Download PDF button inside modal */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
              </button>

              {/* Close Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreenReader(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Fechar Modo Leitura"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scroll Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-12">
            {renderContractPaper()}
          </div>
        </div>
      )}
    </div>
  );
}
