import React, { useState, useEffect } from 'react';
import { Student, ContractTemplate, IntegrationSettings } from '../types';
import { DEFAULT_PORTAL_PERMISSIONS } from '../data/initialData';
import { replaceContractPlaceholders, formatCurrency, formatDateBr, formatCpf, formatPhone } from '../utils/contractFormatter';
import {
  getEffectiveInstallmentTiers,
  getAdjustedTiersForCampaign,
  generateInstallmentOptions,
  findInstallmentOptionForCount,
  calculateTierTotal,
} from '../utils/installmentHelper';
import { apiService } from '../services/apiService';
import { ParentDataCorrectionModal } from './ParentDataCorrectionModal';
import { AutentiqueCertificateModal } from './AutentiqueCertificateModal';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { generateContractPdf } from '../utils/pdfGenerator';
import { RedePaymentForm } from './RedePaymentForm';
import {
  formatCnpj,
  getMatchSourceLabel,
  getRegisteredCompanies,
  resolveCompanyForStudent,
  resolveContractTemplateForStudent,
} from '../utils/companyResolver';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock,
  Unlock,
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
  ExternalLink,
  RefreshCw,
  KeyRound,
  Eye,
  Shield,
  Award,
  FileCheck,
  CheckCheck,
  Phone,
  Mail,
  MapPin,
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
  // Security permissions configured by secretariat (Student-specific or global school settings)
  const portalPermissions = student.customPortalPermissions || settings?.portalPermissions || DEFAULT_PORTAL_PERMISSIONS;

  // Whether this student has a 2nd responsible registered
  const hasSecondResponsible = Boolean(student.responsible2Name && student.responsible2Name.trim());

  // Signer 1 (Responsável Principal) status:
  const isSigner1Signed =
    student.autentiqueSigner1Status === 'ASSINADO' ||
    (student.status === 'assinado' && !student.autentiqueSigner1Status && !student.autentiqueSigner2Status) ||
    student.status === 'pago' ||
    student.status === 'matricula_confirmada';

  // Signer 2 (Co-Responsável Solidário) status:
  const isSigner2Signed =
    !hasSecondResponsible ||
    student.autentiqueSigner2Status === 'ASSINADO' ||
    student.status === 'pago' ||
    student.status === 'matricula_confirmada';

  // Strict check: BOTH responsibles must have signed to unlock Step 3 (Payment)!
  const isFullySigned = isSigner1Signed && isSigner2Signed;
  const isPartiallySigned = hasSecondResponsible && (isSigner1Signed || isSigner2Signed) && !isFullySigned;
  const isPaid = student.status === 'pago' || student.status === 'matricula_confirmada';

  // Backward compatibility alias for isSigned (true only when all required signers have signed)
  const isSigned = isFullySigned;

  // Step 1 confirmed state
  const [hasConfirmedStep1, setHasConfirmedStep1] = useState<boolean>(() => isFullySigned || isPaid);

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (isPaid) return 4;
    if (isFullySigned) return 3;
    return 1;
  });

  const [isEditingData, setIsEditingData] = useState(false);

  useEffect(() => {
    if (isPaid) {
      setCurrentStep(4);
      setHasConfirmedStep1(true);
    } else if (isFullySigned) {
      setHasConfirmedStep1(true);
      if (currentStep === 1 || currentStep === 2) setCurrentStep(3);
    }
  }, [student.status, isFullySigned, isPaid]);

  // Step access validation to enforce sequential completion
  const canAccessStep = (stepNum: number): boolean => {
    if (stepNum === 1) return true;
    if (stepNum === 2) return hasConfirmedStep1 || isFullySigned || isPaid;
    if (stepNum === 3) return isFullySigned || isPaid;
    if (stepNum === 4) return isPaid;
    return false;
  };

  const handleStepNavigation = (stepNum: number) => {
    setPortalErrorMessage(null);
    if (stepNum === currentStep) return;

    if (!canAccessStep(stepNum)) {
      if (stepNum === 2 && !hasConfirmedStep1) {
        setPortalErrorMessage('Por favor, confira os dados cadastrais no Passo 1 e clique em "Confirmar Dados e Ir para o Contrato".');
      } else if (stepNum === 3 && !isFullySigned) {
        if (hasSecondResponsible && isSigner1Signed && !isSigner2Signed) {
          setPortalErrorMessage(`Acesso bloqueado ao Pagamento: O 1º Responsável (${student.responsibleName}) já assinou, mas é OBRIGATÓRIO que o 2º Responsável (${student.responsible2Name}) também assine para liberar o pagamento da rematrícula.`);
        } else if (hasSecondResponsible && !isSigner1Signed && isSigner2Signed) {
          setPortalErrorMessage(`Acesso bloqueado ao Pagamento: O 2º Responsável (${student.responsible2Name}) já assinou, mas é OBRIGATÓRIO que o 1º Responsável (${student.responsibleName}) também assine para liberar o pagamento da rematrícula.`);
        } else if (hasSecondResponsible) {
          setPortalErrorMessage(`Acesso bloqueado ao Pagamento: É OBRIGATÓRIO que ambos os responsáveis (${student.responsibleName} e ${student.responsible2Name}) assinem o contrato digitalmente.`);
        } else {
          setPortalErrorMessage('Você precisa ler e assinar o contrato digitalmente no Passo 2 (via Autentique) antes de liberar a fase de pagamento.');
        }
      } else if (stepNum === 4 && !isPaid) {
        setPortalErrorMessage('O comprovante oficial e a vaga só são liberados após a confirmação do pagamento no Passo 3.');
      }
      return;
    }

    setCurrentStep(stepNum);
  };

  // Step 2: Signature state & Dual Signer Management
  const [activeSignerTab, setActiveSignerTab] = useState<'signer1' | 'signer2'>(() => {
    if (isSigner1Signed && hasSecondResponsible && !isSigner2Signed) return 'signer2';
    return 'signer1';
  });

  // Sync active signer tab if student or signature states change
  useEffect(() => {
    if (isSigner1Signed && hasSecondResponsible && !isSigner2Signed) {
      setActiveSignerTab('signer2');
    } else if (!isSigner1Signed) {
      setActiveSignerTab('signer1');
    }
  }, [student.id, isSigner1Signed, isSigner2Signed, hasSecondResponsible]);

  const activeSignerName = activeSignerTab === 'signer1' ? student.responsibleName : (student.responsible2Name || '');
  const activeSignerCpf = activeSignerTab === 'signer1' ? student.responsibleCpf : (student.responsible2Cpf || '');
  const activeSignerEmail = activeSignerTab === 'signer1' ? student.responsibleEmail : (student.responsible2Email || student.responsibleEmail);
  const activeSignerPhone = activeSignerTab === 'signer1' ? student.responsiblePhone : (student.responsible2Phone || student.responsiblePhone);
  const activeSignerRole = activeSignerTab === 'signer1' ? (student.responsibleKinship || '1º Responsável (Principal)') : (student.responsible2Kinship || '2º Responsável (Solidário)');

  const [signerTypedName, setSignerTypedName] = useState(activeSignerName);

  // Sync signer typed name when active signer tab changes
  useEffect(() => {
    setSignerTypedName(activeSignerName);
    setAcceptedTerms(false);
  }, [activeSignerTab, activeSignerName]);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'integrated' | 'external'>('integrated');
  const [otpCode, setOtpCode] = useState('839102');
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  const [otpSentFeedback, setOtpSentFeedback] = useState(false);
  const [isSyncingAutentique, setIsSyncingAutentique] = useState(false);
  const [syncStatusFeedback, setSyncStatusFeedback] = useState<string | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [portalErrorMessage, setPortalErrorMessage] = useState<string | null>(null);

  // Step 3: Payment method & Installments
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO_PARCELADO'>('PIX');
  const [pixData, setPixData] = useState<{ copyPaste: string; qrCode: string; amount: number; tid?: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ linhaDigitavel: string; barcode: string; dueDate: string } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPix, setIsVerifyingPix] = useState(false);
  const [redeCheckoutModalOpen, setRedeCheckoutModalOpen] = useState(false);
  const [installments, setInstallments] = useState<number>(student.selectedInstallments || 1);
  const [useRedeInteractiveForm, setUseRedeInteractiveForm] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4532 8910 2341 5590');
  const [cardHolder, setCardHolder] = useState(student.responsibleName.toUpperCase());
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('890');

  // Multiempresa: Empresa Cobradora resolvida para este aluno (Override > Aluno > Turma > Série > Matriz)
  const companiesList = getRegisteredCompanies(settings);
  const { company: billedCompany, matchSource: billedMatchSource } = resolveCompanyForStudent(
    student,
    settings
  );
  const resolvedTemplate = resolveContractTemplateForStudent(template, student, settings);
  const billedBankSummary = `Itaú Ag. ${billedCompany.itau.agency || '0910'} · Cc ${billedCompany.itau.account || '12345-6'}`;

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
  const pixDiscountPercent =
    billedCompany?.itau?.pixDiscountPercent ??
    billedCompany?.rede?.pixDiscountPercent ??
    settings?.itau?.pixDiscountPercent ??
    5;
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

  // Reset cached PIX/Boleto and step errors whenever active student or billed company changes
  useEffect(() => {
    setPixData(null);
    setBoletoData(null);
    setPortalErrorMessage(null);
  }, [student.id, billedCompany.id]);

  // Load Rede PIX or Itaú Boleto data when on step 3
  useEffect(() => {
    if (currentStep === 3) {
      if (paymentMethod === 'PIX' && !pixData) {
        const discountAmount = student.finalValue * (1 - pixDiscountPercent / 100);
        apiService
          .processRedePayment({
            paymentMethod: 'PIX',
            amount: discountAmount,
            studentId: student.id,
            company: billedCompany,
            customer: {
              name: student.responsibleName,
              cpf: student.responsibleCpf,
              email: student.responsibleEmail,
            },
          })
          .then((res) => {
            const pixKey = billedCompany.itau.pixKey || 'financeiro@colegiomodeloalpha.com.br';
            const copyPaste =
              res.pix?.qrCode ||
              `00020126580014br.gov.bcb.pix01${String(pixKey.length).padStart(2, '0')}${pixKey}520400005303986540${discountAmount.toFixed(2)}5802BR5925COLEGIO6009SAO PAULO62070503***6304ABCD`;
            setPixData({
              copyPaste,
              qrCode: copyPaste,
              amount: discountAmount,
              tid: res.tid,
            });
          })
          .catch(() => {
            const pixKey = billedCompany.itau.pixKey || 'financeiro@colegiomodeloalpha.com.br';
            const copyPaste = `00020126580014br.gov.bcb.pix01${String(pixKey.length).padStart(2, '0')}${pixKey}520400005303986540${discountAmount.toFixed(2)}5802BR5925COLEGIO6009SAO PAULO62070503***6304ABCD`;
            setPixData({
              copyPaste,
              qrCode: copyPaste,
              amount: discountAmount,
              tid: 'tid_rede_pix_' + Math.floor(100000 + Math.random() * 900000),
            });
          });
      } else if (paymentMethod === 'BOLETO' && !boletoData) {
        apiService.createItauBoleto(student, student.finalValue, billedCompany).then((res) => {
          setBoletoData({
            linhaDigitavel: res.linhaDigitavel,
            barcode: res.codigoBarras,
            dueDate: res.dueDate,
          });
        });
      }
    }
  }, [currentStep, paymentMethod, student.id, student.finalValue, pixDiscountPercent, pixData, boletoData, billedCompany]);

  // Generate or Resend OTP validation code
  const handleGenerateOtp = () => {
    setIsGeneratingOtp(true);
    setSyncStatusFeedback(null);
    setTimeout(() => {
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(generated);
      setIsGeneratingOtp(false);
      setOtpSentFeedback(true);
      setTimeout(() => setOtpSentFeedback(false), 5000);
    }, 600);
  };

  // Synchronize status with Autentique API (e.g. if parent signed on Autentique's website)
  const handleSyncAutentiqueStatus = async () => {
    setIsSyncingAutentique(true);
    setSyncStatusFeedback(null);
    setPortalErrorMessage(null);

    const docId = student.autentiqueDocId || 'autq_' + student.id;

    try {
      const res = await apiService.getAutentiqueDocStatus(docId);
      if (res && res.document && res.document.status === 'SIGNED') {
        const nowIso = res.document.signedAt || new Date().toISOString();
        const updated: Student = {
          ...student,
          status: 'assinado',
          autentiqueStatus: 'ASSINADO',
          autentiqueSignedAt: nowIso,
          autentiqueSigner1Status: 'ASSINADO',
          autentiqueSigner1SignedAt: nowIso,
          autentiqueSigner2Status: hasSecondResponsible ? 'ASSINADO' : undefined,
          autentiqueSigner2SignedAt: hasSecondResponsible ? nowIso : undefined,
          autentiqueSignerIp: res.document.ipAddress || '177.18.241.109',
          autentiqueCertHash: 'sha256_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
          historyLogs: [
            ...student.historyLogs,
            {
              timestamp: nowIso,
              action: 'Sincronização com Autentique Concluída',
              details: `Status verificado via API GraphQL: Assinatura de ambos os responsáveis confirmada com sucesso.`,
            },
          ],
        };
        onUpdateStudent(updated);
        setSyncStatusFeedback('Contrato homologado por ambos os responsáveis na Autentique! Fase de pagamento liberada.');
      } else {
        setSyncStatusFeedback('Consulta concluída. Aguardando assinatura de todos os responsáveis no portal Autentique.');
      }
    } catch (err: any) {
      setSyncStatusFeedback('Consulta concluída. Aguardando assinatura no portal Autentique.');
    } finally {
      setIsSyncingAutentique(false);
    }
  };

  // Simulate signing directly on Autentique portal link (supports both or individual)
  const handleSimulateExternalSignature = async (mode: 'both' | 'signer1' | 'signer2' = 'both') => {
    setIsSigning(true);
    setPortalErrorMessage(null);
    try {
      const docId = student.autentiqueDocId || 'autq_' + student.id;
      const nowIso = new Date().toISOString();
      const ip = '177.18.241.109';
      const hash = 'sha256_' + Math.random().toString(36).substring(2);

      let newSigner1Status = student.autentiqueSigner1Status || (isSigner1Signed ? 'ASSINADO' : 'PENDENTE');
      let newSigner2Status = student.autentiqueSigner2Status || (isSigner2Signed ? 'ASSINADO' : 'PENDENTE');

      if (mode === 'signer1' || mode === 'both') {
        newSigner1Status = 'ASSINADO';
      }
      if (mode === 'signer2' || mode === 'both') {
        newSigner2Status = 'ASSINADO';
      }

      const willBeFullySigned = newSigner1Status === 'ASSINADO' && (!hasSecondResponsible || newSigner2Status === 'ASSINADO');

      const updated: Student = {
        ...student,
        status: willBeFullySigned ? 'assinado' : student.status,
        autentiqueStatus: willBeFullySigned ? 'ASSINADO' : 'PENDENTE',
        autentiqueSignedAt: willBeFullySigned ? nowIso : student.autentiqueSignedAt,
        autentiqueSignerIp: ip,
        autentiqueCertHash: hash,
        autentiqueSigner1Status: newSigner1Status,
        autentiqueSigner1SignedAt: newSigner1Status === 'ASSINADO' ? (student.autentiqueSigner1SignedAt || nowIso) : undefined,
        autentiqueSigner1Ip: ip,
        autentiqueSigner2Status: hasSecondResponsible ? newSigner2Status : undefined,
        autentiqueSigner2SignedAt: newSigner2Status === 'ASSINADO' ? (student.autentiqueSigner2SignedAt || nowIso) : undefined,
        autentiqueSigner2Ip: hasSecondResponsible ? ip : undefined,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: nowIso,
            action: `Contrato Assinado via Autentique (${mode === 'both' ? 'Ambos os Responsáveis' : mode === 'signer1' ? '1º Responsável' : '2º Responsável'})`,
            details: willBeFullySigned
              ? 'Todos os 2 responsáveis assinaram o contrato! Fase de pagamento liberada.'
              : 'Assinatura registrada. Aguardando assinatura do outro responsável.',
          },
        ],
      };

      onUpdateStudent(updated);
      setIsSigning(false);

      if (willBeFullySigned) {
        setSyncStatusFeedback('Assinaturas homologadas com sucesso! Fase de pagamento desbloqueada.');
      } else {
        setSyncStatusFeedback(`Assinatura registrada! Aguardando o ${mode === 'signer1' ? '2º Responsável' : '1º Responsável'} assinar.`);
      }
    } catch (e: any) {
      setPortalErrorMessage('Erro ao sincronizar com Autentique: ' + e.message);
      setIsSigning(false);
    }
  };

  // Handle Autentique Signature (Embedded / Integrated with legal validation for the ACTIVE signer)
  const handleConfirmSignature = async () => {
    setPortalErrorMessage(null);
    if (!acceptedTerms) {
      setPortalErrorMessage('Por favor, marque a caixa confirmando que concorda com todas as cláusulas do contrato educacional.');
      return;
    }
    if (!signerTypedName.trim()) {
      setPortalErrorMessage('Por favor, confirme o nome completo do responsável signatário.');
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setPortalErrorMessage('Por favor, informe o código de validação OTP de 6 dígitos.');
      return;
    }

    setIsSigning(true);
    try {
      const docId = student.autentiqueDocId || 'autq_' + student.id;
      const res = await apiService.signAutentiqueDoc(
        docId,
        signerTypedName,
        `Signatário: ${activeSignerName} (${activeSignerRole}) • E-mail (${activeSignerEmail}) • CPF (${activeSignerCpf}) • Token OTP (${otpCode}) • IP`
      );

      const nowIso = res.signedAt || new Date().toISOString();
      const signerIp = res.certificate?.ip || '177.18.241.109';
      const certHash = res.certificate?.authHash || 'sha256_' + Math.random().toString(36).substring(2);

      const willBeSigner1Signed = activeSignerTab === 'signer1' ? true : isSigner1Signed;
      const willBeSigner2Signed = activeSignerTab === 'signer2' ? true : (!hasSecondResponsible || isSigner2Signed);
      const willBeFullySigned = willBeSigner1Signed && willBeSigner2Signed;

      const updated: Student = {
        ...student,
        status: willBeFullySigned ? 'assinado' : student.status,
        autentiqueStatus: willBeFullySigned ? 'ASSINADO' : 'PENDENTE',
        autentiqueSignedAt: willBeFullySigned ? nowIso : student.autentiqueSignedAt,
        autentiqueSignerIp: signerIp,
        autentiqueCertHash: certHash,
        autentiqueSigner1Status: willBeSigner1Signed ? 'ASSINADO' : 'PENDENTE',
        autentiqueSigner1SignedAt: activeSignerTab === 'signer1' ? nowIso : student.autentiqueSigner1SignedAt,
        autentiqueSigner1Ip: activeSignerTab === 'signer1' ? signerIp : student.autentiqueSigner1Ip,
        autentiqueSigner2Status: hasSecondResponsible ? (willBeSigner2Signed ? 'ASSINADO' : 'PENDENTE') : undefined,
        autentiqueSigner2SignedAt: activeSignerTab === 'signer2' ? nowIso : student.autentiqueSigner2SignedAt,
        autentiqueSigner2Ip: activeSignerTab === 'signer2' ? signerIp : student.autentiqueSigner2Ip,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: nowIso,
            action: `Contrato Assinado Digitalmente por ${activeSignerName} (${activeSignerRole})`,
            details: `Assinatura confirmada por ${signerTypedName} (CPF: ${activeSignerCpf}, OTP: ${otpCode}). ${
              willBeFullySigned
                ? 'Todos os 2 responsáveis assinaram o contrato! Fase de pagamento liberada.'
                : `1 de 2 assinaturas concluídas. Aguardando assinatura do 2º Responsável (${student.responsible2Name}) para liberar o pagamento.`
            }`,
          },
        ],
      };

      onUpdateStudent(updated);
      setIsSigning(false);

      if (willBeFullySigned) {
        // Both signed! Proceed to Step 3
        setCurrentStep(3);
      } else {
        // Switch to the pending 2nd signer tab so they can sign immediately
        setActiveSignerTab('signer2');
        setAcceptedTerms(false);
        setSyncStatusFeedback(
          `1ª Assinatura concluída com sucesso! Agora o 2º Responsável (${student.responsible2Name}) deve assinar abaixo para liberar o pagamento da rematrícula.`
        );
      }
    } catch (e: any) {
      setPortalErrorMessage('Erro na assinatura: ' + e.message);
      setIsSigning(false);
    }
  };

  // Direct Payment via Rede Gateway (Card Credit / Debit or Pix Verification)
  const handleProcessDirectRedePayment = async (methodToProcess: 'CREDIT' | 'DEBIT' | 'PIX') => {
    setIsProcessingPayment(true);
    setPortalErrorMessage(null);
    try {
      const amountToCharge = methodToProcess === 'PIX' ? currentPaymentAmount : methodToProcess === 'CREDIT' ? currentInstallmentOption.totalValue : student.finalValue;
      const installmentsToUse = methodToProcess === 'CREDIT' ? installments : 1;

      const res = await apiService.processRedePayment({
        paymentMethod: methodToProcess,
        amount: amountToCharge,
        installments: installmentsToUse,
        studentId: student.id,
        company: billedCompany,
        customer: {
          name: student.responsibleName,
          cpf: student.responsibleCpf,
          email: student.responsibleEmail,
        },
      });

      const isInstallmentMethod = methodToProcess === 'CREDIT';
      const paymentType = methodToProcess === 'PIX' ? 'PIX' : methodToProcess === 'DEBIT' ? 'DEBIT_CARD' : 'CREDIT_CARD';

      const updated: Student = {
        ...student,
        status: 'matricula_confirmada',
        itauPaymentStatus: 'PAID',
        itauPaymentType: paymentType,
        itauPaidAt: new Date().toISOString(),
        itauPaymentId: res.tid || 'tid_rede_' + Date.now(),
        itauCardLast4: '5590',
        itauCardInstallments: isInstallmentMethod ? installmentsToUse : 1,
        selectedInstallments: isInstallmentMethod ? installmentsToUse : 1,
        selectedInstallmentValue: isInstallmentMethod ? currentInstallmentOption.installmentValue : amountToCharge,
        selectedTotalAmount: amountToCharge,
        billedCompanyId: billedCompany.id,
        billedCompanyName: billedCompany.razaoSocial,
        billedCompanyCnpj: billedCompany.cnpj,
        billedBankSummary,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: `Pagamento Liquidado via Rede (${billedCompany.nomeFantasia} · ${paymentType})`,
            details: isInstallmentMethod
              ? `Autorizado (TID: ${res.tid || 'AUT_REDE'}) em ${installmentsToUse}x de ${formatCurrency(currentInstallmentOption.installmentValue)} (Total: ${formatCurrency(amountToCharge)}) · CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`
              : `Autorizado (TID: ${res.tid || 'AUT_REDE'}). Valor ${formatCurrency(amountToCharge)} liquidado para CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`,
          },
        ],
      };

      onUpdateStudent(updated);
      setIsProcessingPayment(false);
      setRedeCheckoutModalOpen(false);
      setCurrentStep(4);
    } catch (e: any) {
      setPortalErrorMessage('Erro ao processar pagamento na Rede: ' + e.message);
      setIsProcessingPayment(false);
    }
  };

  // Verify Pix Status from Rede
  const handleVerifyRedePixStatus = async () => {
    if (!pixData?.tid) return;
    setIsVerifyingPix(true);
    setPortalErrorMessage(null);
    try {
      // Simulate/trigger immediate payment confirmation on Rede
      await apiService.simulateRedePixPaid(pixData.tid);
      handleProcessDirectRedePayment('PIX');
    } catch (e: any) {
      setPortalErrorMessage('PIX ainda não identificado como pago na Rede. Aguarde alguns instantes e tente novamente.');
    } finally {
      setIsVerifyingPix(false);
    }
  };

  // Handle Carnê / Boleto Parcelado
  const handleConfirmCarne = async () => {
    setIsProcessingPayment(true);
    setPortalErrorMessage(null);
    try {
      const amountToCharge = currentInstallmentOption.totalValue;
      const updated: Student = {
        ...student,
        status: 'matricula_confirmada',
        itauPaymentStatus: 'PAID',
        itauPaymentType: 'BOLETO_PARCELADO',
        itauPaidAt: new Date().toISOString(),
        itauPaymentId: 'carne_itau_' + Date.now(),
        selectedInstallments: installments,
        selectedInstallmentValue: currentInstallmentOption.installmentValue,
        selectedTotalAmount: amountToCharge,
        billedCompanyId: billedCompany.id,
        billedCompanyName: billedCompany.razaoSocial,
        billedCompanyCnpj: billedCompany.cnpj,
        billedBankSummary,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: `Carnê Escolar Emitido (${billedCompany.nomeFantasia} · ${installments}x)`,
            details: `Carnê de ${installments}x de ${formatCurrency(currentInstallmentOption.installmentValue)} emitido em favor de ${billedCompany.razaoSocial} (CNPJ ${formatCnpj(billedCompany.cnpj)} · ${billedBankSummary}).`,
          },
        ],
      };

      onUpdateStudent(updated);
      setIsProcessingPayment(false);
      setCurrentStep(4);
    } catch (e: any) {
      setPortalErrorMessage('Erro ao gerar carnê: ' + e.message);
      setIsProcessingPayment(false);
    }
  };

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
          company: billedCompany,
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
        billedCompanyId: billedCompany.id,
        billedCompanyName: billedCompany.razaoSocial,
        billedCompanyCnpj: billedCompany.cnpj,
        billedBankSummary,
        historyLogs: [
          ...student.historyLogs,
          {
            timestamp: new Date().toISOString(),
            action: `Pagamento Confirmado (${billedCompany.nomeFantasia} · ${paymentType})`,
            details: isInstallmentMethod
              ? `Liquidado em ${installments}x de ${formatCurrency(currentInstallmentOption.installmentValue)} (Total: ${formatCurrency(finalChargedAmount)}) para CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`
              : `Valor de ${formatCurrency(finalChargedAmount)} creditado para CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`,
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
      billedCompanyId: billedCompany.id,
      billedCompanyName: billedCompany.razaoSocial,
      billedCompanyCnpj: billedCompany.cnpj,
      billedBankSummary,
      historyLogs: [
        ...student.historyLogs,
        {
          timestamp: new Date().toISOString(),
          action: `Pagamento Liquidado via Rede Itaú (${billedCompany.nomeFantasia} · ${paymentType})`,
          details: isInstallmentMethod
            ? `Autorizado (TID: ${tid}) em ${installments}x de ${formatCurrency(currentInstallmentOption.installmentValue)} (Total: ${formatCurrency(finalChargedAmount)}) para CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`
            : `Autorizado (TID: ${tid}). Valor ${formatCurrency(finalChargedAmount)} liquidado para CNPJ ${formatCnpj(billedCompany.cnpj)} (${billedBankSummary}).`,
        },
      ],
    };

    onUpdateStudent(updated);
    setUseRedeInteractiveForm(false);
    setCurrentStep(4);
  };

  const dynamicContractText = replaceContractPlaceholders(resolvedTemplate.content, student, resolvedTemplate);

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
            onClick={() => handleStepNavigation(1)}
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
            onClick={() => handleStepNavigation(2)}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : isFullySigned
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isPartiallySigned
                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Contrato</span>
              {isFullySigned ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : isPartiallySigned ? (
                <Clock className="w-3 h-3 text-amber-600" />
              ) : null}
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">
              {isFullySigned
                ? (hasSecondResponsible ? '2/2 Assinados' : 'Assinado')
                : isPartiallySigned
                ? '1/2 Assinado'
                : 'Autentique'}
            </span>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => handleStepNavigation(3)}
            className={`p-3 rounded-xl cursor-pointer transition flex flex-col items-center gap-1 ${
              currentStep === 3
                ? 'bg-indigo-600 text-white shadow-xs'
                : isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isFullySigned
                ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                : 'bg-slate-50/60 text-slate-400 hover:bg-slate-100/80 border border-slate-200/50 cursor-not-allowed opacity-80'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {!isFullySigned && !isPaid ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              <span>3. Pagamento</span>
              {isPaid && <Check className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[10px] opacity-80 hidden sm:inline">
              {isFullySigned || isPaid ? 'API Itaú' : hasSecondResponsible ? 'Bloqueado (Requer 2 assinaturas)' : 'Bloqueado (Requer assinatura)'}
            </span>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => handleStepNavigation(4)}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
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
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Dados do Aluno (Beneficiário)</span>
                </h3>
                <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  <span>Restrito à Secretaria</span>
                </span>
              </div>
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
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>1º Contratante (Responsável 1)</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">Principal</span>
                  {portalPermissions.allowAddress || portalPermissions.allowPhone || portalPermissions.allowEmail ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-0.5">
                      <Unlock className="w-2.5 h-2.5" />
                      <span>Edição Liberada</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Bloqueado</span>
                    </span>
                  )}
                </div>
              </div>
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
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Telefone:</span>
                    {portalPermissions.allowPhone ? (
                      <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5"><Unlock className="w-2 h-2" />editável</span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5"><Lock className="w-2 h-2" />restrito</span>
                    )}
                  </div>
                  <div className="text-slate-800">{formatPhone(student.responsiblePhone)}</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">E-mail para Assinatura (Autentique):</span>
                  {portalPermissions.allowEmail ? (
                    <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5"><Unlock className="w-2 h-2" />editável</span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5"><Lock className="w-2 h-2" />restrito</span>
                  )}
                </div>
                <div className="text-slate-800 font-medium">{student.responsibleEmail}</div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Endereço Residencial:</span>
                  {portalPermissions.allowAddress ? (
                    <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5"><Unlock className="w-2 h-2" />editável</span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5"><Lock className="w-2 h-2" />restrito</span>
                  )}
                </div>
                <div className="text-slate-700">{student.responsibleAddress}</div>
              </div>
            </div>

            {/* 2º Responsável (Contratante 2 - Se cadastrado) */}
            {student.responsible2Name && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>2º Contratante (Responsável 2)</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">Solidário</span>
                    {portalPermissions.allowSecondResponsible ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-0.5">
                        <Unlock className="w-2.5 h-2.5" />
                        <span>Edição Liberada</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Bloqueado</span>
                      </span>
                    )}
                  </div>
                </div>
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
          {/* Header with Legal Compliance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Passo 2 de 4</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">Validação Jurídica Digital</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <span>Assinatura Eletrônica do Contrato • Plataforma Autentique</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>MP 2.200-2/2001 & Lei 14.063/2020</span>
              </div>
              <button
                type="button"
                onClick={() => generateContractPdf(student, resolvedTemplate, dynamicContractText)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Baixar Contrato Oficial em formato PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Contrato em PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
                title="Imprimir ou Salvar Minuta"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Institutional Executive Contract Document Viewer with Paper Simulation & Controls */}
          <ContractDocumentViewer
            student={student}
            template={resolvedTemplate}
            rawContractText={dynamicContractText}
            isSigned={isFullySigned}
            isSigner1Signed={isSigner1Signed}
            isSigner2Signed={isSigner2Signed}
          />

          {/* DUAL SIGNERS PROGRESS BANNER (when student has 2 responsibles) */}
          {hasSecondResponsible && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>Assinaturas Obrigatórias da Rematrícula (2 de 2 necessárias)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Para liberação da próxima fase (Pagamento e Vaga), é <strong>obrigatório</strong> que ambos os responsáveis assinem digitalmente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      isFullySigned
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : isPartiallySigned
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {isFullySigned ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>2 de 2 Assinados</span>
                      </>
                    ) : isPartiallySigned ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>1 de 2 Assinado (Falta 1)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>0 de 2 Assinados</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Grid of the 2 signers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1º Responsável */}
                <div
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isSigner1Signed
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : activeSignerTab === 'signer1'
                      ? 'bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        1º Responsável (Principal)
                      </span>
                      {isSigner1Signed ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Assinado</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold border border-amber-200">
                          Pendente
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{student.responsibleName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">CPF: {formatCpf(student.responsibleCpf)}</div>
                    <div className="text-[10px] text-slate-400 truncate">{student.responsibleEmail}</div>
                  </div>

                  {!isSigner1Signed && activeSignerTab !== 'signer1' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSignerTab('signer1');
                        setAcceptedTerms(false);
                      }}
                      className="mt-3 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition border border-indigo-200 cursor-pointer"
                    >
                      Assinar como 1º Responsável
                    </button>
                  )}
                </div>

                {/* 2º Responsável */}
                <div
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isSigner2Signed
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : activeSignerTab === 'signer2'
                      ? 'bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        2º Responsável (Solidário)
                      </span>
                      {isSigner2Signed ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Assinado</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold border border-amber-200">
                          Pendente
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{student.responsible2Name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      CPF: {formatCpf(student.responsible2Cpf || '')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {student.responsible2Email || student.responsibleEmail}
                    </div>
                  </div>

                  {!isSigner2Signed && activeSignerTab !== 'signer2' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSignerTab('signer2');
                        setAcceptedTerms(false);
                      }}
                      className="mt-3 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition border border-indigo-200 cursor-pointer"
                    >
                      Assinar como 2º Responsável
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature Action Section */}
          {isFullySigned ? (
            /* ================= STATE: ALL REQUIRED RESPONSABLES HAVE SIGNED ================= */
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl p-6 text-xs text-emerald-950 space-y-4 shadow-sm animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-emerald-900">
                      Contrato Digital 100% Homologado por Ambos os Responsáveis!
                    </h3>
                    <p className="text-emerald-700 text-xs">
                      {hasSecondResponsible
                        ? `Assinaturas de ${student.responsibleName} e ${student.responsible2Name} confirmadas via Autentique.`
                        : `Assinatura de ${student.responsibleName} confirmada via Autentique.`}
                      {' '}Plena eficácia executiva nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold text-xs border border-emerald-300 self-start sm:self-auto flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{hasSecondResponsible ? '2/2 Assinados' : 'Certificado Ativo'}</span>
                </span>
              </div>

              {/* Dossier Summary Cards for both signers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/80 p-4 rounded-xl border border-emerald-200/80 text-[11px]">
                <div>
                  <span className="text-slate-500 block">1º Signatário (Principal):</span>
                  <strong className="text-slate-900 font-semibold">{student.responsibleName}</strong>
                  <div className="text-slate-600 font-mono text-[10px]">CPF: {formatCpf(student.responsibleCpf)}</div>
                </div>

                {hasSecondResponsible && (
                  <div>
                    <span className="text-slate-500 block">2º Signatário (Solidário):</span>
                    <strong className="text-slate-900 font-semibold">{student.responsible2Name}</strong>
                    <div className="text-slate-600 font-mono text-[10px]">CPF: {formatCpf(student.responsible2Cpf || '')}</div>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 block">Data do Carimbo Oficial:</span>
                  <strong className="text-slate-900 font-semibold">
                    {student.autentiqueSignedAt
                      ? new Date(student.autentiqueSignedAt).toLocaleString('pt-BR')
                      : '14/08/2026 14:32:10'}
                  </strong>
                  <div className="text-emerald-700 text-[10px]">Horário de Brasília (BRT)</div>
                </div>

                <div>
                  <span className="text-slate-500 block">Hash Criptográfico (SHA-256):</span>
                  <span className="font-mono text-[10px] text-slate-800 break-all bg-emerald-100/60 px-1 py-0.5 rounded">
                    {(student.autentiqueCertHash || 'sha256_mock_hash').slice(0, 18)}...
                  </span>
                </div>
              </div>

              {/* Actions for Signed Document */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-2xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Visualizar Certificado e Dossiê Jurídico Completo</span>
                </button>

                <button
                  id="btn-step2-continue-to-payment"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <span>Avançar para o Pagamento da Rematrícula (Passo 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= STATE: PENDING SIGNATURE OF ONE OR BOTH ================= */
            <div className="space-y-4">
              {/* Notice when only 1 of 2 signed */}
              {isPartiallySigned && (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs animate-fade-in">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    !
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">
                      Atenção: Falta a assinatura do {activeSignerTab === 'signer2' ? '2º Responsável' : '1º Responsável'}!
                    </h4>
                    <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                      O {isSigner1Signed ? `1º Responsável (${student.responsibleName})` : `2º Responsável (${student.responsible2Name})`} já assinou com sucesso.
                      Porém, para garantir a validade jurídica integral e <strong>liberar a fase de pagamento</strong>, o{' '}
                      <strong>{activeSignerName}</strong> precisa assinar abaixo.
                    </p>
                  </div>
                </div>
              )}

              {/* Signer Switcher Tabs (if 2 responsibles) */}
              {hasSecondResponsible && (
                <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSignerTab('signer1');
                      setAcceptedTerms(false);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeSignerTab === 'signer1'
                        ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Assinar como 1º Responsável ({student.responsibleName})</span>
                    {isSigner1Signed && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        Assinado
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSignerTab('signer2');
                      setAcceptedTerms(false);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeSignerTab === 'signer2'
                        ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Assinar como 2º Responsável ({student.responsible2Name})</span>
                    {isSigner2Signed && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        Assinado
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Method Selection Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSignatureMode('integrated')}
                  className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    signatureMode === 'integrated'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Opção 1: Assinatura Integrada no Portal (API Autentique)</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-black hidden sm:inline">
                    Recomendado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('external')}
                  className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    signatureMode === 'external'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Opção 2: Assinar Diretamente no Site da Autentique</span>
                </button>
              </div>

              {/* MODE 1: INTEGRATED SIGNATURE */}
              {signatureMode === 'integrated' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span>
                          Assinando como: <strong className="text-indigo-900">{activeSignerName}</strong> ({activeSignerRole})
                        </span>
                      </h3>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Confirme os dados do signatário e o código de autenticação para registrar a assinatura eletrônica oficial.
                      </p>
                    </div>

                    {((activeSignerTab === 'signer1' && isSigner1Signed) || (activeSignerTab === 'signer2' && isSigner2Signed)) && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1 border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Já Assinado por este Responsável</span>
                      </span>
                    )}
                  </div>

                  {/* Signer Data & OTP Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nome Completo do Signatário *
                      </label>
                      <input
                        type="text"
                        value={signerTypedName}
                        onChange={(e) => setSignerTypedName(e.target.value)}
                        placeholder="Nome como consta no documento"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>CPF do Signatário</span>
                        <span className="text-[10px] text-slate-400 font-normal">Identificação ICP</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formatCpf(activeSignerCpf)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Código OTP (2º Fator) *</span>
                        <button
                          type="button"
                          onClick={handleGenerateOtp}
                          disabled={isGeneratingOtp}
                          className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isGeneratingOtp ? 'animate-spin' : ''}`} />
                          <span>{isGeneratingOtp ? 'Enviando...' : 'Reenviar Código'}</span>
                        </button>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono tracking-widest text-slate-900 font-bold text-center"
                          placeholder="839102"
                        />
                      </div>
                      {otpSentFeedback && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Novo código enviado com sucesso ao e-mail {activeSignerEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legal Terms Checkbox */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="leading-relaxed">
                        Eu, <strong>{activeSignerName}</strong> ({activeSignerRole}), declaro expressamente que li e concordo na íntegra com todas as cláusulas do <strong>Contrato de Prestação de Serviços Educacionais {template.academicYear}</strong> em favor do aluno <strong>{student.name}</strong>, assumindo as responsabilidades financeiras e pedagógicas de forma solidária. Concordo com a emissão do <strong>Certificado Digital de Assinatura via Plataforma Autentique</strong>, nos termos da <strong>MP nº 2.200-2/2001</strong> e da <strong>Lei nº 14.063/2020</strong>.
                      </span>
                    </label>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      ← Voltar à conferência dos dados
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        id="btn-sign-contract-autentique"
                        onClick={handleConfirmSignature}
                        disabled={isSigning || !acceptedTerms}
                        className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-4.5 h-4.5" />
                        <span>
                          {isSigning
                            ? 'Processando assinatura...'
                            : `Assinar Contrato como ${activeSignerTab === 'signer1' ? '1º Responsável' : '2º Responsável'}`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: SIGN ON EXTERNAL AUTENTIQUE WEBSITE */}
              {signatureMode === 'external' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Assinatura Direta pelo Portal Web da Autentique
                      </h3>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Caso os responsáveis prefiram assinar pelo portal web externo da Autentique (painel.autentique.com.br), use os botões abaixo:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Step A */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">1</span>
                          <span>Abrir Contrato na Autentique</span>
                        </span>
                        <p className="text-slate-600 text-[11px] mt-1">
                          Acesse o link do documento gerado para esta rematrícula na plataforma Autentique.
                        </p>
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
                          https://painel.autentique.com.br/documentos/{student.autentiqueDocId || 'doc_2026'}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        {hasSecondResponsible ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSimulateExternalSignature('signer1')}
                              disabled={isSigning}
                              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <span>Assinar como 1º Resp. ({student.responsibleName})</span>
                              {isSigner1Signed && <Check className="w-3 h-3 text-emerald-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSimulateExternalSignature('signer2')}
                              disabled={isSigning}
                              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <span>Assinar como 2º Resp. ({student.responsible2Name})</span>
                              {isSigner2Signed && <Check className="w-3 h-3 text-emerald-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSimulateExternalSignature('both')}
                              disabled={isSigning}
                              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Simular Assinatura de Ambos os Responsáveis</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSimulateExternalSignature('both')}
                            disabled={isSigning}
                            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir e Assinar no Site da Autentique ↗</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step B */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">2</span>
                          <span>Sincronizar Status com a Secretaria</span>
                        </span>
                        <p className="text-slate-600 text-[11px] mt-1">
                          Após ambos assinarem na página da Autentique, clique no botão abaixo para verificar a assinatura em tempo real via API.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSyncAutentiqueStatus}
                        disabled={isSyncingAutentique}
                        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAutentique ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAutentique ? 'Consultando API Autentique...' : 'Sincronizar Status da Assinatura'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {syncStatusFeedback && (
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{syncStatusFeedback}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      ← Voltar à conferência dos dados
                    </button>
                    <span className="text-[11px]">
                      Ambos os responsáveis devem assinar para que o contrato seja liberado para pagamento.
                    </span>
                  </div>
                </div>
              )}
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
                company={billedCompany}
                installmentsCount={installments}
                installmentAmount={currentInstallmentOption.installmentValue}
                onSuccess={handleRedePaymentSuccess}
                onCancel={() => setUseRedeInteractiveForm(false)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {/* Multiempresa Receiving Account Banner + Mix Switcher */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Empresa Recebedora: {billedCompany.nomeFantasia}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold">
                      {getMatchSourceLabel(billedMatchSource)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono tabular-nums truncate">
                    CNPJ: {formatCnpj(billedCompany.cnpj)} · {billedBankSummary} · PIX: {billedCompany.itau.pixKey || 'padrão'}
                  </div>
                </div>

                {companiesList.length > 1 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor="checkout-company-mix-select" className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      Cobrar no CNPJ:
                    </label>
                    <select
                      id="checkout-company-mix-select"
                      value={student.companyId || ''}
                      onChange={(e) => {
                        const nextId = e.target.value || undefined;
                        const nextComp = companiesList.find((c) => c.id === nextId);
                        onUpdateStudent({
                          ...student,
                          companyId: nextId,
                          historyLogs: [
                            ...student.historyLogs,
                            {
                              timestamp: new Date().toISOString(),
                              action: 'Mix de Empresa Alterado no Checkout',
                              details: nextComp
                                ? `Cobrança direcionada para ${nextComp.nomeFantasia} (CNPJ ${formatCnpj(nextComp.cnpj)}).`
                                : 'Restaurado roteamento automático por Série/Turma.',
                            },
                          ],
                        });
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Automático ({billedCompany.nomeFantasia})</option>
                      {companiesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nomeFantasia} ({formatCnpj(c.cnpj)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

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
                      {billedCompany.razaoSocial} · CNPJ {formatCnpj(billedCompany.cnpj)} · Pix Instantâneo e Cartão.
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
                {pixData?.copyPaste ? (
                  <QRCodeSVG value={pixData.copyPaste} size={184} level="H" includeMargin />
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
                  <div><strong>Beneficiário:</strong> {billedCompany.razaoSocial} (CNPJ {formatCnpj(billedCompany.cnpj)})</div>
                  <div><strong>Conta Destino:</strong> {billedBankSummary}</div>
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
                <strong>Empresa Recebedora:</strong> {student.billedCompanyName || billedCompany.razaoSocial} (CNPJ: {formatCnpj(student.billedCompanyCnpj || billedCompany.cnpj)})
              </div>
              <div>
                <strong>Conta de Crédito:</strong> {student.billedBankSummary || billedBankSummary}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => generateContractPdf(student, resolvedTemplate, dynamicContractText)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Contrato Assinado em PDF</span>
            </button>

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
        </motion.div>
      </AnimatePresence>

      {/* Parent Data Correction Modal (Respecting Secretariat Security Permissions) */}
      {isEditingData && (
        <ParentDataCorrectionModal
          student={student}
          isOpen={isEditingData}
          onClose={() => setIsEditingData(false)}
          onSave={(updated) => {
            onUpdateStudent(updated);
            setIsEditingData(false);
          }}
          permissions={portalPermissions}
        />
      )}

      {/* Autentique Legal Certificate & Audit Trail Modal */}
      {isCertModalOpen && (
        <AutentiqueCertificateModal
          student={student}
          template={resolvedTemplate}
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
        />
      )}
    </div>
  );
}
