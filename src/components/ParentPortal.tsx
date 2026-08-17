import React, { useState, useEffect } from 'react';
import { Student, ContractTemplate, IntegrationSettings } from '../types';
import { replaceContractPlaceholders, formatCurrency, formatDateBr, formatCpf, formatPhone } from '../utils/contractFormatter';
import {
  getEffectiveInstallmentTiers,
  getAdjustedTiersForCampaign,
  generateInstallmentOptions,
  findInstallmentOptionForCount,
  calculateTierTotal,
} from '../utils/installmentHelper';
import { apiService } from '../services/apiService';
import { EditStudentModal } from './EditStudentModal';
import { RedePaymentForm } from './RedePaymentForm';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  QrCode,
  Copy,
  Printer,
  Sparkles,
  FileText,
  User,
  AlertCircle,
  Download,
  Clock,
  Building,
  Check,
  Edit3,
  Layers,
  ChevronDown,
  Calendar,
  Flame,
  TrendingDown,
} from 'lucide-react';

interface Props {
  student: Student;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onUpdateStudent: (updatedStudent: Student) => void;
  template: ContractTemplate;
  settings: IntegrationSettings;
  onBackToAdmin: () => void;
}

export function ParentPortal({
  student,
  students,
  onSelectStudent,
  onUpdateStudent,
  template,
  settings,
  onBackToAdmin,
}: Props) {
  // Current active step in the re-enrollment wizard (1: Review, 2: Contract/Autentique, 3: Payment/Itaú, 4: Receipt)
  const isSigned = student.status === 'assinado' || student.status === 'pagamento_pendente' || student.status === 'pago' || student.status === 'matricula_confirmada';
  const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (isPaid) return 4;
    if (isSigned) return 3;
    return 1;
  });

  const [isEditingData, setIsEditingData] = useState(false);

  useEffect(() => {
    if (isPaid) {
      setCurrentStep(4);
    } else if (isSigned) {
      if (currentStep === 1 || currentStep === 2) setCurrentStep(3);
    }
  }, [student.status, isSigned, isPaid]);

  // Step 2: Signature state
  const [signerTypedName, setSignerTypedName] = useState(student.responsibleName);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [portalErrorMessage, setPortalErrorMessage] = useState<string | null>(null);

  // Step 3: Payment method & Installments
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO_PARCELADO'>('PIX');
  const [pixData, setPixData] = useState<{ copyPaste: string; qrCode: string; amount: number } | null>(null);
  const [boletoData, setBoletoData] = useState<{ linhaDigitavel: string; barcode: string; dueDate: string } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4532 8910 2341 5590');
  const [cardHolder, setCardHolder] = useState(student.responsibleName.toUpperCase());
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('890');
  const [installments, setInstallments] = useState<number>(student.selectedInstallments || 1);
  const [useRedeInteractiveForm, setUseRedeInteractiveForm] = useState(false);

  // Effective Installment Tiers & Options based on Student Base Value & Discount % and Proposal Campaign
  const studentBase = student.baseValue || student.finalValue || 2000;
  const effectiveCampaign = student.customProposalCampaign || settings?.itau?.proposalCampaign;
  const campaignAnalysis = getAdjustedTiersForCampaign(
    student.customInstallmentTiers || settings?.itau?.installmentTiers || [],
    effectiveCampaign
  );
  const activeTiers = getEffectiveInstallmentTiers(
    student,
    settings?.itau?.installmentTiers,
    effectiveCampaign
  );
  const installmentOptions = generateInstallmentOptions(activeTiers, studentBase);
  const currentInstallmentOption = findInstallmentOptionForCount(installments, activeTiers, studentBase);

  // Determine current total value based on selected method
  const pixDiscountPercent = settings?.itau?.pixDiscountPercent || 5;
  const currentPaymentAmount =
    paymentMethod === 'PIX'
      ? student.finalValue * (1 - pixDiscountPercent / 100)
      : paymentMethod === 'CREDIT_CARD' || paymentMethod === 'BOLETO_PARCELADO'
      ? currentInstallmentOption.totalValue
      : student.finalValue;

  // Trigger confetti on step 4
  useEffect(() => {
    if (currentStep === 4) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  }, [currentStep]);

  // Load PIX or Boleto data when on step 3
  useEffect(() => {
    if (currentStep === 3) {
      if (paymentMethod === 'PIX' && !pixData) {
        const discountAmount = student.finalValue * 0.95; // 5% discount on PIX
        apiService.createItauPix(student, discountAmount).then((res) => {
          setPixData({
            copyPaste: res.pixCopyPaste,
            qrCode: res.pixQrCode,
            amount: discountAmount,
          });
        });
      } else if (paymentMethod === 'BOLETO' && !boletoData) {
        apiService.createItauBoleto(student, student.finalValue).then((res) => {
          setBoletoData({
            linhaDigitavel: res.linhaDigitavel,
            barcode: res.codigoBarras,
            dueDate: res.dueDate,
          });
        });
      }
    }
  }, [currentStep, paymentMethod, student]);

  // Handle Autentique Signature
  const handleConfirmSignature = async () => {
    setPortalErrorMessage(null);
    if (!acceptedTerms) {
      setPortalErrorMessage('Por favor, marque a caixa confirmando que concorda com os termos do contrato.');
      return;
    }
    if (!signerTypedName.trim()) {
      setPortalErrorMessage('Por favor, confirme o nome completo do responsável signatário.');
      return;
    }

    setIsSigning(true);
    try {
      const docId = student.autentiqueDocId || 'autq_' + student.id;
      const res = await apiService.signAutentiqueDoc(docId, signerTypedName);

      const updated: Student = {
        ...student,
        status: 'assinado',
        autentiqueStatus: 'ASSINADO',
        autentiqueSignedAt: res.signedAt || new Date().toISOString(),
        autentiqueSignerIp: res.certificate?.ip || '177.18.241.109',
        autentiqueCertHash: res.certificate?.authHash || 'sha256_' + Math.random().toString(36).substring(2),
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: 'Contrato Assinado Digitalmente (API Autentique)',
            details: `Assinado por ${signerTypedName} (CPF: ${student.responsibleCpf}). Fase de pagamento Itaú liberada.`,
          },
        ],
      };

      onUpdateStudent(updated);
      setIsSigning(false);
      setCurrentStep(3);
    } catch (e: any) {
      setPortalErrorMessage('Erro na assinatura: ' + e.message);
      setIsSigning(false);
    }
  };

  // Handle Itaú Payment Confirmation
  const handleExecutePayment = async () => {
    setIsProcessingPayment(true);
    setPortalErrorMessage(null);
    try {
      let paymentType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO_PARCELADO' = paymentMethod;

      if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
        await apiService.processItauCard({
          studentId: student.id,
          amount: currentPaymentAmount,
          method: paymentMethod === 'DEBIT_CARD' ? 'DEBIT_CARD' : 'CREDIT_CARD',
          cardNumber: cardNumber || '4532 8910 2341 5590',
          cardHolder: cardHolder || student.responsibleName,
          cardExpiry: cardExpiry || '12/28',
          cardCvv: cardCvv || '123',
          installments: Number(installments),
        });
      } else {
        await apiService.simulateItauPaymentConfirm(student.itauPaymentId || 'pay_' + student.id);
      }

      const isInstallmentMethod = paymentMethod === 'CREDIT_CARD' || paymentMethod === 'BOLETO_PARCELADO';
      const finalChargedAmount = currentPaymentAmount;

      const updated: Student = {
        ...student,
        status: 'matricula_confirmada',
        itauPaymentStatus: 'PAID',
        itauPaymentType: paymentType,
        itauPaidAt: new Date().toISOString(),
        itauCardLast4: paymentMethod.includes('CARD') ? (cardNumber || '5590').slice(-4) : undefined,
        itauCardInstallments: isInstallmentMethod ? installments : 1,
        selectedInstallments: isInstallmentMethod ? installments : 1,
        selectedInstallmentValue: isInstallmentMethod ? currentInstallmentOption.installmentValue : finalChargedAmount,
        selectedTotalAmount: finalChargedAmount,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: `Pagamento da Rematrícula Confirmado via API Itaú (${paymentType})`,
            details: isInstallmentMethod
              ? `Liquidado em ${installments}x de ${formatCurrency(currentInstallmentOption.installmentValue)} (Total: ${formatCurrency(finalChargedAmount)}). Faixa: ${currentInstallmentOption.tierDescription}. Vaga garantida para o ano letivo ${template.academicYear}.`
              : `Valor de ${formatCurrency(finalChargedAmount)} liquidado com sucesso. Vaga garantida para o ano letivo ${template.academicYear}.`,
          },
        ],
      };

      onUpdateStudent(updated);
      setIsProcessingPayment(false);
      setCurrentStep(4);
    } catch (e: any) {
      setPortalErrorMessage('Erro no processamento do pagamento: ' + e.message);
      setIsProcessingPayment(false);
    }
  };

  const handleRedePaymentSuccess = (tid: string, paymentMethodUsed: string) => {
    const isInstallmentMethod = paymentMethodUsed === 'CREDIT' || paymentMethodUsed === 'CREDIT_CARD';
    const finalChargedAmount = currentPaymentAmount;
    const paymentType = paymentMethodUsed === 'PIX' ? 'PIX' : paymentMethodUsed === 'DEBIT' ? 'DEBIT_CARD' : 'CREDIT_CARD';

    const updated: Student = {
      ...student,
      status: 'matricula_confirmada',
      itauPaymentStatus: 'PAID',
      itauPaymentType: paymentType,
      itauPaidAt: new Date().toISOString(),
      itauPaymentId: tid,
      itauCardLast4: paymentType.includes('CARD') ? '5590' : undefined,
      itauCardInstallments: isInstallmentMethod ? installments : 1,
      selectedInstallments: isInstallmentMethod ? installments : 1,
      selectedInstallmentValue: isInstallmentMethod ? currentInstallmentOption.installmentValue : finalChargedAmount,
      selectedTotalAmount: finalChargedAmount,
      historyLogs: [
        ...student.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: `Pagamento da Rematrícula Liquidado via Gateway Rede Itaú (${paymentType})`,
          details: isInstallmentMethod
            ? `Autorizado com sucesso (TID: ${tid}) em ${installments}x de ${formatCurrency(currentInstallmentOption.installmentValue)} (Total: ${formatCurrency(finalChargedAmount)}). Vaga garantida.`
            : `Autorizado com sucesso (TID: ${tid}). Valor de ${formatCurrency(finalChargedAmount)} liquidado. Vaga garantida.`,
        },
      ],
    };

    onUpdateStudent(updated);
    setUseRedeInteractiveForm(false);
    setCurrentStep(4);
  };

  const dynamicContractText = replaceContractPlaceholders(template.content, student, template);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Student Switcher & Admin Return Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Visualizando como Aluno:</span>
          <select
            id="parent-portal-student-select"
            aria-label="Selecionar aluno para visualizar no portal"
            value={student.id}
            onChange={(e) => {
              const found = students.find((s) => s.id === e.target.value);
              if (found) {
                onSelectStudent(found);
                const st = found.status === 'pago' || found.status === 'matricula_confirmada' ? 4 : found.status === 'assinado' ? 3 : 1;
                setCurrentStep(st);
              }
            }}
            className="bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.serie}) - Status: {s.status}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onBackToAdmin}
          className="text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer font-medium"
        >
          ← Voltar ao Painel da Escola
        </button>
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-4 gap-2.5 text-center text-xs font-semibold">
          {/* Step 1 */}
          <div
            onClick={() => {
              setPortalErrorMessage(null);
              setCurrentStep(1);
            }}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>1. Dados</span>
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">Conferência</span>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => {
              setPortalErrorMessage(null);
              setCurrentStep(2);
            }}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : isSigned
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Contrato</span>
              {isSigned && <Check className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">API Autentique</span>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => {
              setPortalErrorMessage(null);
              setCurrentStep(3);
            }}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 3
                ? 'bg-indigo-600 text-white shadow-xs'
                : isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isSigned
                ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>3. Pagamento</span>
              {isPaid && <Check className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">API Itaú</span>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => {
              setPortalErrorMessage(null);
              setCurrentStep(4);
            }}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 4
                ? 'bg-emerald-600 text-white shadow-xs'
                : isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Conclusão</span>
              {isPaid && <Check className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">Comprovante</span>
          </div>
        </div>
      </div>

      {/* Error Message Banner */}
      {portalErrorMessage && (
        <div className="bg-rose-50 text-rose-900 border border-rose-200 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{portalErrorMessage}</span>
          </div>
          <button
            onClick={() => setPortalErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= STEP 1: CONFERÊNCIA DE DADOS ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Passo 1 de 4</span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Conferência de Dados da Rematrícula {template.academicYear}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              Protocolo: <strong className="text-slate-800 font-mono">{student.protocolNumber || 'REM-2026'}</strong>
            </div>
          </div>

          {/* Student & Contract Parties grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Aluno */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Dados do Aluno (Beneficiário)
              </h3>
              <div>
                <span className="text-slate-500 font-medium">Nome do Aluno:</span>
                <div className="text-slate-900 font-semibold">{student.name}</div>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-slate-500">RA / Matrícula:</span>
                  <div className="text-slate-800 font-mono font-medium">{student.ra}</div>
                </div>
                <div>
                  <span className="text-slate-500">Nascimento:</span>
                  <div className="text-slate-800">{student.birthDate ? formatDateBr(student.birthDate) : '15/04/2011'}</div>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Série Pretendida:</span>
                <div className="text-indigo-700 font-bold">{student.serie}</div>
              </div>
              <div>
                <span className="text-slate-500">Turma e Turno:</span>
                <div className="text-slate-800">{student.turma} • {student.shift}</div>
              </div>
            </div>

            {/* 1º Responsável (Contratante 1) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>1º Contratante (Responsável 1)</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">Principal</span>
              </h3>
              <div>
                <span className="text-slate-500 font-medium">Nome Completo:</span>
                <div className="text-slate-900 font-semibold">{student.responsibleName}</div>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-slate-500">CPF:</span>
                  <div className="text-slate-800 font-mono">{formatCpf(student.responsibleCpf)}</div>
                </div>
                <div>
                  <span className="text-slate-500">Telefone:</span>
                  <div className="text-slate-800">{formatPhone(student.responsiblePhone)}</div>
                </div>
              </div>
              <div>
                <span className="text-slate-500">E-mail para Assinatura:</span>
                <div className="text-slate-800">{student.responsibleEmail}</div>
              </div>
              <div>
                <span className="text-slate-500">Endereço:</span>
                <div className="text-slate-700">{student.responsibleAddress}</div>
              </div>
            </div>

            {/* 2º Responsável (Contratante 2 - Se cadastrado) */}
            {student.responsible2Name && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>2º Contratante (Responsável 2)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">Solidário</span>
                </h3>
                <div>
                  <span className="text-slate-500 font-medium">Nome Completo:</span>
                  <div className="text-slate-900 font-semibold">{student.responsible2Name}</div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-slate-500">CPF:</span>
                    <div className="text-slate-800 font-mono">{formatCpf(student.responsible2Cpf || '')}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Telefone:</span>
                    <div className="text-slate-800">{formatPhone(student.responsible2Phone || '')}</div>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">E-mail para Assinatura:</span>
                  <div className="text-slate-800">{student.responsible2Email || student.responsibleEmail}</div>
                </div>
                <div>
                  <span className="text-slate-500">Endereço:</span>
                  <div className="text-slate-700">{student.responsible2Address || student.responsibleAddress}</div>
                </div>
              </div>
            )}

            {/* Contratada e Testemunhas Fixas */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>Contratada & Testemunhas</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">Fixos</span>
              </h3>
              <div>
                <span className="text-slate-500 font-medium">Contratada:</span>
                <div className="text-slate-900 font-semibold">{template.schoolName} (CNPJ: {template.schoolCnpj})</div>
                <div className="text-slate-500 text-[11px]">Representante: {template.schoolRepresentative}</div>
              </div>
              <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                <div className="font-semibold text-slate-700 mb-0.5">2 Testemunhas Instrumentárias:</div>
                <div>1ª: {template.witness1Name} (CPF: {template.witness1Cpf})</div>
                <div>2ª: {template.witness2Name} (CPF: {template.witness2Cpf})</div>
              </div>
            </div>
          </div>

          {/* Financial summary card */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-indigo-950 text-sm">Resumo da Rematrícula {template.academicYear}</span>
              <p className="text-indigo-800 mt-0.5">
                Valor Base: {formatCurrency(student.tuitionValue)} • Desconto:{' '}
                {formatCurrency(student.discountValue)} • Vencimento: {formatDateBr(student.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-indigo-700 block text-[11px] font-medium">Valor Líquido da Rematrícula</span>
              <span className="text-xl font-bold text-indigo-950">{formatCurrency(student.finalValue)}</span>
            </div>
          </div>

          {/* Proposal Campaign Active Banner */}
          {campaignAnalysis && campaignAnalysis.campaign && campaignAnalysis.campaign.enabled && (
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">
                      Condições Especiais de Rematrícula por Tempo Limitado
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                      {campaignAnalysis.elapsedMonths === 0
                        ? '★ Mês de Abertura (Melhores Condições)'
                        : `Atraso: +${campaignAnalysis.elapsedMonths} mês(es)`}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">
                    Neste mês você conta com parcelamento em até{' '}
                    <strong className="text-indigo-950">{campaignAnalysis.maxAllowedInstallments}x</strong> e descontos de até{' '}
                    <strong className="text-emerald-700">{Math.max(0, 20 - campaignAnalysis.discountPenalty)}% OFF</strong>. A cada mês que passar, o limite de parcelas e a porcentagem de desconto diminuem!
                  </p>
                </div>
              </div>
              <div className="bg-white/90 border border-amber-200 px-3 py-1.5 rounded-lg text-right shrink-0">
                <span className="text-[10px] text-slate-500 block font-medium">Prazo Limite da Proposta</span>
                <span className="text-xs font-black text-rose-700">
                  {formatDateBr(campaignAnalysis.campaign.endDate)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingData(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer border border-slate-200"
            >
              <Edit3 className="w-4 h-4 text-slate-600" />
              <span>Corrigir / Atualizar Meus Dados</span>
            </button>

            <button
              id="btn-step1-continue"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer"
            >
              <span>Confirmar Dados e Ir para o Contrato</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: ASSINATURA VIA AUTENTIQUE ================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Passo 2 de 4</span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                Assinatura Eletrônica do Contrato • API Autentique
              </h2>
            </div>
            <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Certificação ICP-Brasil & MP 2.200-2</span>
            </div>
          </div>

          {/* Dynamic Personalized Contract Viewer */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
              <span>Contrato de Prestação de Serviços Educacionais {template.academicYear}</span>
              <span className="text-slate-500 font-mono text-[11px]">Aluno: {student.name}</span>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto font-serif text-xs text-slate-800 leading-relaxed bg-slate-50/40 whitespace-pre-line">
              {dynamicContractText}
            </div>
          </div>

          {/* Signature Action Box */}
          {isSigned ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Contrato Assinado com Sucesso pelo Responsável!</span>
              </div>
              <p className="text-emerald-700">
                Assinado por <strong>{student.responsibleName}</strong> em{' '}
                {student.autentiqueSignedAt
                  ? new Date(student.autentiqueSignedAt).toLocaleString('pt-BR')
                  : '14/08/2026'}
                . Hash de Autenticação:{' '}
                <code className="bg-white/80 px-1 py-0.5 rounded text-[10px] font-mono">
                  {student.autentiqueCertHash || 'sha256_mock_hash'}
                </code>
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <span>Avançar para o Pagamento da Rematrícula (Itaú)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Formalização da Assinatura Digital
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome Completo do Signatário (Responsável Legal) *
                  </label>
                  <input
                    type="text"
                    value={signerTypedName}
                    onChange={(e) => setSignerTypedName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CPF Confirmado
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatCpf(student.responsibleCpf)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Declaro que li e concordo integralmente com todas as cláusulas do contrato educacional para o ano letivo de{' '}
                    <strong>{template.academicYear}</strong> e autorizo a emissão do certificado de assinatura eletrônica via <strong>API Autentique</strong>.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  ← Voltar aos dados
                </button>

                <button
                  id="btn-sign-contract-autentique"
                  onClick={handleConfirmSignature}
                  disabled={isSigning || !acceptedTerms}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSigning ? 'Processando via API Autentique...' : 'Assinar Contrato Digitalmente'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 3: PAGAMENTO VIA ITAÚ E REDE ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Rede Form Modal/Inline View */}
          {useRedeInteractiveForm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300">
                  Modo de Checkout: <strong>Gateway Direto e.Rede (Itaú)</strong>
                </span>
                <button
                  onClick={() => setUseRedeInteractiveForm(false)}
                  className="text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                >
                  Alternar para Visualização Padrão de Boletos / Carnê
                </button>
              </div>

              <RedePaymentForm
                amount={currentPaymentAmount}
                uid={student.id}
                student={student}
                installmentsCount={installments}
                installmentAmount={currentInstallmentOption.installmentValue}
                onSuccess={handleRedePaymentSuccess}
                onCancel={() => setUseRedeInteractiveForm(false)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {/* Rede Fast Checkout Banner */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    Rede
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-tight flex items-center gap-1.5">
                      <span>Gateway e.Rede Itaú Ativo</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                        Online
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Escola Cristã Modelo Alpha Ltda • Pix Instantâneo e Cartão com verificação em tempo real.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-open-rede-checkout"
                  onClick={() => setUseRedeInteractiveForm(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition uppercase tracking-wider shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Abrir Checkout Rede</span>
                </button>
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Passo 3 de 4</span>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-amber-500" />
                    Forma de Pagamento e Parcelamento • API Itaú & Rede
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Total da Opção Selecionada</span>
                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(currentPaymentAmount)}
                  </span>
                </div>
              </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              id="tab-pay-pix"
              type="button"
              onClick={() => setPaymentMethod('PIX')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'PIX'
                  ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>PIX Dinâmico</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pixDiscountPercent}% de Desconto
              </span>
            </button>

            <button
              id="tab-pay-boleto"
              type="button"
              onClick={() => setPaymentMethod('BOLETO')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'BOLETO'
                  ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Boleto à Vista</span>
              </div>
              <span className="text-slate-500 text-[10px]">Vence em 5 dias</span>
            </button>

            <button
              id="tab-pay-card"
              type="button"
              onClick={() => setPaymentMethod('CREDIT_CARD')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'
                  ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Cartão de Crédito</span>
              </div>
              <span className="text-indigo-700 bg-indigo-50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Faixas de Parcelas
              </span>
            </button>

            <button
              id="tab-pay-boleto-parcelado"
              type="button"
              onClick={() => setPaymentMethod('BOLETO_PARCELADO')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'BOLETO_PARCELADO'
                  ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Carnê / Parcelado</span>
              </div>
              <span className="text-slate-500 text-[10px]">Boletos Mensais</span>
            </button>
          </div>

          {/* PIX VIEW */}
          {paymentMethod === 'PIX' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="inline-block bg-white p-3 rounded-2xl shadow-xs border border-slate-200">
                {pixData?.qrCode ? (
                  <img
                    src={pixData.qrCode}
                    alt="QR Code PIX Itaú"
                    className="w-48 h-48 mx-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    Gerando QR Code Itaú...
                  </div>
                )}
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="text-xs text-slate-600 font-medium">
                  Abra o aplicativo do seu banco e escaneie o QR Code ou utilize o código Copia e Cola:
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData?.copyPaste || 'Gerando Pix...'}
                    className="w-full text-[11px] font-mono p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600"
                  />
                  <button
                    onClick={() => {
                      if (pixData?.copyPaste) {
                        navigator.clipboard.writeText(pixData.copyPaste);
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2000);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  PIX com {pixDiscountPercent}% de desconto: <strong>{formatCurrency(currentPaymentAmount)}</strong>
                </span>
                <button
                  id="btn-confirm-pix-payment"
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessingPayment ? 'Validando no Itaú...' : 'Simular Pagamento PIX Concluído'}</span>
                </button>
              </div>
            </div>
          )}

          {/* BOLETO À VISTA VIEW */}
          {paymentMethod === 'BOLETO' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-sm">Boleto Bancário Registrado - Itaú (341)</span>
                  <span className="text-slate-500">Vencimento: {formatDateBr(boletoData?.dueDate || student.dueDate)}</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Linha Digitável:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={boletoData?.linhaDigitavel || '34191.79001 01234.567890 12345.678901 7 98540000170000'}
                      className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                    />
                    <button
                      onClick={() => {
                        if (boletoData?.linhaDigitavel) {
                          navigator.clipboard.writeText(boletoData.linhaDigitavel);
                          setCopiedBoleto(true);
                          setTimeout(() => setCopiedBoleto(false), 2000);
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedBoleto ? 'Copiado!' : 'Copiar Linha'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div><strong>Beneficiário:</strong> {template.schoolName} (CNPJ {template.schoolCnpj})</div>
                  <div><strong>Pagador:</strong> {student.responsibleName} (CPF: {formatCpf(student.responsibleCpf)})</div>
                  <div><strong>Valor Documento:</strong> {formatCurrency(student.finalValue)}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Boleto em PDF</span>
                </button>

                <button
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessingPayment ? 'Compensando Boleto...' : 'Simular Compensação de Boleto Itaú'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CREDIT CARD VIEW (WITH DYNAMIC INSTALLMENT TIERS) */}
          {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold cursor-pointer transition ${
                      paymentMethod === 'CREDIT_CARD' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Cartão de Crédito (Parcelado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DEBIT_CARD')}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold cursor-pointer transition ${
                      paymentMethod === 'DEBIT_CARD' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Cartão de Débito (À Vista)
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  Gateway Itaú Seguro 256-bit
                </span>
              </div>

              {/* DYNAMIC INSTALLMENT TIERS SELECTION */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Selecione a Faixa de Parcelamento Desejada:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {campaignAnalysis.isCampaignActive && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-600" />
                          <span>Limite Atual: até {campaignAnalysis.maxAllowedInstallments}x</span>
                        </span>
                      )}
                      <span className="text-[11px] text-indigo-700 font-semibold">
                        {activeTiers.length} faixas disponíveis
                      </span>
                    </div>
                  </div>

                  {/* Visual Tier Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {activeTiers
                      .sort((a, b) => a.fromInstallments - b.fromInstallments)
                      .map((tier) => {
                        const from = Math.min(tier.fromInstallments, tier.toInstallments);
                        const to = Math.max(tier.fromInstallments, tier.toInstallments);
                        const isCurrentSelected = installments >= from && installments <= to;
                        const tierTotal = calculateTierTotal(tier, studentBase);
                        const discountPct = typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;

                        return (
                          <button
                            type="button"
                            key={tier.id}
                            onClick={() => setInstallments(from)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                              isCurrentSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="font-black text-xs">
                                {from === to ? `${from}x` : `${from} a ${to}x`}
                              </span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                  discountPct > 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {discountPct > 0 ? `-${discountPct}%` : 'Integral'}
                              </span>
                            </div>
                            <div className="text-sm font-extrabold text-slate-900">
                              {formatCurrency(tierTotal)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {from === to
                                ? `1x de ${formatCurrency(tierTotal / from)}`
                                : `${from}x de ${formatCurrency(tierTotal / from)}`}
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {/* Dropdown with all generated options */}
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Quantidade Exata de Parcelas (Clique para escolher):
                    </label>
                    <div className="relative">
                      <select
                        aria-label="Selecione as parcelas do cartão de crédito"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer appearance-none pr-8"
                      >
                        {installmentOptions.map((opt) => (
                          <option key={opt.count} value={opt.count}>
                            {opt.count}x de {formatCurrency(opt.installmentValue)} • Total: {formatCurrency(opt.totalValue)} ({opt.discountPercent > 0 ? `${opt.discountPercent}% de desconto` : 'Sem desconto'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Highlight Selected Plan */}
                  <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-amber-800 font-semibold block">Plano Selecionado:</span>
                      <span className="text-sm font-black text-amber-950">
                        {currentInstallmentOption.count}x de {formatCurrency(currentInstallmentOption.installmentValue)}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold block">
                        {currentInstallmentOption.discountPercent > 0
                          ? `Desconto de ${currentInstallmentOption.discountPercent}% aplicado (Economia de ${formatCurrency(currentInstallmentOption.discountAmount)})`
                          : 'Valor Integral sem desconto'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Total a ser cobrado no Cartão</span>
                      <span className="text-base font-black text-emerald-700">
                        {formatCurrency(currentInstallmentOption.totalValue)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 •••• •••• 5590"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Impresso no Cartão</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Validade</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CVV</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  id="btn-process-card-payment"
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessingPayment
                      ? 'Processando no Gateway Itaú...'
                      : paymentMethod === 'CREDIT_CARD'
                      ? `Confirmar Pagamento em ${currentInstallmentOption.count}x de ${formatCurrency(currentInstallmentOption.installmentValue)}`
                      : `Pagar ${formatCurrency(student.finalValue)} no Débito`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* BOLETO PARCELADO / CARNÊ VIEW */}
          {paymentMethod === 'BOLETO_PARCELADO' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Escolha a Quantidade de Parcelas do Carnê Escolar:</span>
                  </label>
                  <span className="text-slate-500 text-[11px]">Boletos mensais registrados Itaú</span>
                </div>

                {/* Visual Tier Cards for Boleto Parcelado */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {activeTiers
                    .sort((a, b) => a.fromInstallments - b.fromInstallments)
                    .map((tier) => {
                      const from = Math.min(tier.fromInstallments, tier.toInstallments);
                      const to = Math.max(tier.fromInstallments, tier.toInstallments);
                      const isCurrentSelected = installments >= from && installments <= to;
                      const tierTotal = calculateTierTotal(tier, studentBase);
                      const discountPct = typeof tier.discountPercent === 'number' ? tier.discountPercent : 0;

                      return (
                        <button
                          type="button"
                          key={tier.id}
                          onClick={() => setInstallments(from)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                            isCurrentSelected
                              ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-black text-xs">
                              {from === to ? `${from}x` : `${from} a ${to}x`}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                discountPct > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {discountPct > 0 ? `-${discountPct}%` : 'Integral'}
                            </span>
                          </div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {formatCurrency(tierTotal)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {from === to
                              ? `1x de ${formatCurrency(tierTotal / from)}`
                              : `${from}x de ${formatCurrency(tierTotal / from)}`}
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Selecione a Quantidade de Mensalidades:
                  </label>
                  <div className="relative">
                    <select
                      aria-label="Selecione as mensalidades do carnê escolar"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer appearance-none pr-8"
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.count} value={opt.count}>
                          {opt.count}x boletos de {formatCurrency(opt.installmentValue)} • Total: {formatCurrency(opt.totalValue)} ({opt.tierDescription})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div><strong>Primeiro Vencimento:</strong> {formatDateBr(student.dueDate)}</div>
                  <div><strong>Total do Carnê:</strong> {formatCurrency(currentInstallmentOption.totalValue)} ({currentInstallmentOption.count} boletos de {formatCurrency(currentInstallmentOption.installmentValue)})</div>
                  <div><strong>Emissão:</strong> Banco Itaú S.A. com envio automático por e-mail e WhatsApp</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-confirm-carne-payment"
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isProcessingPayment
                      ? 'Gerando Carnê Itaú...'
                      : `Emitir Carnê de ${currentInstallmentOption.count}x de ${formatCurrency(currentInstallmentOption.installmentValue)}`}
                  </span>
                </button>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 4: COMPROVANTE OFICIAL ================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
              Rematrícula {template.academicYear} Confirmada com Sucesso!
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight pt-2">
              Parabéns! A vaga de {student.name.split(' ')[0]} está garantida!
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              O contrato foi devidamente autenticado via <strong>API Autentique</strong> e o pagamento foi registrado e compensado pela <strong>API Itaú</strong>.
            </p>
          </div>

          {/* Official Voucher Card */}
          <div className="max-w-lg mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left text-xs space-y-3 shadow-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Protocolo Oficial</span>
                <span className="font-mono font-bold text-sm text-slate-900">{student.protocolNumber || 'REM-2026-001'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Ano Letivo</span>
                <span className="font-bold text-indigo-700">{template.academicYear}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-slate-500">Aluno:</span>
                <div className="font-bold text-slate-900">{student.name}</div>
              </div>
              <div>
                <span className="text-slate-500">Série:</span>
                <div className="font-bold text-slate-900">{student.serie}</div>
              </div>
              <div>
                <span className="text-slate-500">Responsável:</span>
                <div className="text-slate-800">{student.responsibleName}</div>
              </div>
              <div>
                <span className="text-slate-500">Forma de Pagamento:</span>
                <div className="font-bold text-emerald-700">
                  {student.itauPaymentType === 'CREDIT_CARD'
                    ? `Cartão de Crédito (${student.selectedInstallments || student.itauCardInstallments || 1}x de ${formatCurrency(student.selectedInstallmentValue || (student.selectedTotalAmount || student.finalValue) / (student.selectedInstallments || 1))})`
                    : student.itauPaymentType === 'BOLETO_PARCELADO'
                    ? `Carnê Escolar (${student.selectedInstallments || 1}x de ${formatCurrency(student.selectedInstallmentValue || student.finalValue)})`
                    : `Itaú ${student.itauPaymentType || 'PIX'} (Quitado)`}
                </div>
              </div>
              <div className="col-span-2 bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Valor Total Liquidado:</span>
                <span className="text-sm font-black text-emerald-700">
                  {formatCurrency(student.selectedTotalAmount || student.finalValue)}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <div>
                <strong>Autenticação Autentique:</strong> {student.autentiqueDocId || 'autq_2026'} (Certificado Válido)
              </div>
              <div>
                <strong>Instituição:</strong> {template.schoolName} (CNPJ: {template.schoolCnpj})
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante e Contrato</span>
            </button>

            <button
              onClick={onBackToAdmin}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Voltar ao Painel da Secretaria
            </button>
          </div>
        </div>
      )}

      {/* Edit Student Modal in Portal */}
      {isEditingData && (
        <EditStudentModal
          student={student}
          isOpen={isEditingData}
          onClose={() => setIsEditingData(false)}
          onSave={(updated) => {
            onUpdateStudent(updated);
            setIsEditingData(false);
          }}
          template={template}
        />
      )}
    </div>
  );
}
