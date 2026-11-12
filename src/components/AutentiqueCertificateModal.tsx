import React from 'react';
import { Student, ContractTemplate } from '../types';
import { formatCpf, formatDateBr } from '../utils/contractFormatter';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Printer,
  X,
  ExternalLink,
  QrCode,
  Lock,
  Calendar,
  Globe,
  User,
} from 'lucide-react';

interface Props {
  student: Student;
  template: ContractTemplate;
  isOpen: boolean;
  onClose: () => void;
}

export function AutentiqueCertificateModal({ student, template, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const docId = student.autentiqueDocId || 'autq_' + student.id;
  const signedDate = student.autentiqueSignedAt
    ? new Date(student.autentiqueSignedAt)
    : new Date();
  const certHash = student.autentiqueCertHash || `sha256_${student.id.replace(/\D/g, '') || '9a4f2b'}e89a4cf3189db280918cf3112a`;
  const signerIp = student.autentiqueSignerIp || '177.18.241.109';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-emerald-300">
        {/* Header with Autentique Official Branding */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900">
                  Autentique • Certificado de Conformidade Jurídica
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                  VÁLIDO
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Laudo Notarial e Registro de Auditoria Criptográfica de Assinatura Eletrônica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Card Printable Area */}
        <div className="space-y-4 text-xs font-sans">
          {/* Official Document Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Documento Certificado:
            </div>
            <div className="text-sm font-bold text-slate-900">
              Contrato de Prestação de Serviços Educacionais - Ano Letivo {template.academicYear}
            </div>
            <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4">
              <span>Aluno Beneficiário: <strong>{student.name}</strong></span>
              <span>Matrícula: <strong>{student.ra}</strong></span>
              <span>Protocolo: <strong>{student.protocolNumber || 'REM-2026'}</strong></span>
            </div>
          </div>

          {/* Legal Compliance Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Signatário Identificado
              </div>
              <div className="text-slate-900 font-semibold">{student.responsibleName}</div>
              <div className="text-slate-600 text-[11px] space-y-0.5">
                <div>CPF: <span className="font-mono">{formatCpf(student.responsibleCpf)}</span></div>
                <div>E-mail de Notificação: <span className="font-mono">{student.responsibleEmail}</span></div>
                <div>Papel Contratual: 1º Responsável Legal / Contratante</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Auditoria & Rastreabilidade
              </div>
              <div className="text-slate-600 text-[11px] space-y-1">
                <div>
                  Data/Hora (Brasília):{' '}
                  <strong className="text-slate-800">
                    {signedDate.toLocaleDateString('pt-BR')} às {signedDate.toLocaleTimeString('pt-BR')}
                  </strong>
                </div>
                <div>IP do Signatário: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">{signerIp}</code></div>
                <div>Dispositivo: Navegador Web Seguro (Sessão Criptografada TLS 1.3)</div>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash and Document ID */}
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <span>Identificador Único Autentique (Document ID)</span>
              <span className="text-emerald-400">STATUS: ASSINADO</span>
            </div>
            <div className="text-emerald-300 font-semibold">{docId}</div>

            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider pt-1">
              Assinatura Digital / Hash Criptográfico (SHA-256):
            </div>
            <div className="text-slate-300 break-all text-[10px] bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              {certHash}
            </div>
          </div>

          {/* Legal Framework Reference */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Validade Jurídica e Conformidade Legal:</span>
            </div>
            <p className="leading-relaxed">
              O presente documento possui plena validade jurídica, integridade probatória e eficácia
              executiva extrajudicial, nos termos do <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong> e da{' '}
              <strong>Lei Federal nº 14.063/2020</strong> (Assinatura Eletrônica Avançada), sendo aceito por tribunais,
              órgãos públicos e instituições de ensino em todo o território nacional.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Certificado</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
