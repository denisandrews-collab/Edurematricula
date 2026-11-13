import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Lock,
  XCircle,
  Smartphone,
  SmartphoneNfc,
  Wallet,
  Copy,
  Check,
  QrCode,
  ChevronLeft,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { z } from 'zod';
import { Student } from '../types';

const cardSchema = z.object({
  number: z
    .string()
    .min(13, 'Número do cartão muito curto')
    .max(19, 'Número do cartão muito longo'),
  name: z
    .string()
    .min(3, 'Digite o nome como impresso no cartão')
    .regex(/^[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+$/, 'O nome deve conter apenas letras'),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Validade deve ser MM/YY'),
  cvv: z
    .string()
    .min(3, 'CVV deve ter pelo menos 3 dígitos')
    .max(4, 'CVV muito longo')
    .regex(/^\d+$/, 'CVV deve conter apenas números'),
});

interface RedePaymentFormProps {
  amount: number;
  uid: string;
  student?: Student;
  installmentsCount?: number;
  installmentAmount?: number;
  onSuccess: (tid: string, paymentMethodUsed: string) => void;
  onCancel: () => void;
}

type PaymentMethod = 'credit' | 'debit' | 'pix';

export function RedePaymentForm({
  amount,
  uid,
  student,
  installmentsCount = 1,
  installmentAmount,
  onSuccess,
  onCancel,
}: RedePaymentFormProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'awaiting_pix'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [showForceCancel, setShowForceCancel] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; tid: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingStatusInfo, setPendingStatusInfo] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [cardData, setCardData] = useState({
    number: '4532 8910 2341 5590',
    name: student?.responsibleName?.toUpperCase() || 'LUIS CARLOS TOSTO',
    expiry: '12/28',
    cvv: '890',
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Listen for Pix payment confirmation via polling verification
  useEffect(() => {
    if (status === 'awaiting_pix' && pixData?.tid) {
      const pollInterval = setInterval(async () => {
        try {
          const tid = pixData.tid;
          const response = await fetch(`/api/rede/verify-pix/${tid}?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setStatus('success');
              showToast('Pagamento Pix Confirmado na Rede!', 'success');
              clearInterval(pollInterval);
              setTimeout(() => {
                onSuccess(tid, 'PIX');
              }, 1800);
            } else if (data.redeStatus) {
              setPendingStatusInfo(data.redeStatus);
            }
          }
        } catch (e) {
          console.warn('[REDE-FORM] Polling check:', e);
        }
      }, 5000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [status, pixData?.tid, onSuccess]);

  const handleProcessPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormErrors({});

    if (paymentMethod !== 'pix') {
      const validation = cardSchema.safeParse({
        ...cardData,
        number: cardData.number.replace(/\s/g, ''),
      });

      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          if (issue.path[0]) errors[issue.path[0] as string] = issue.message;
        });
        setFormErrors(errors);
        showToast('Verifique os campos do cartão antes de continuar.', 'error');
        return;
      }
    }

    setLoading(true);
    setStatus('processing');
    setShowForceCancel(false);
    setPaymentError(null);

    // Safety timeout
    const processTimeout = setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'processing') {
          setPaymentError('O tempo de processamento excedeu 45 segundos. Verifique as credenciais da Rede.');
          return 'error';
        }
        return prev;
      });
      setLoading(false);
    }, 45000);

    const timer = setTimeout(() => setShowForceCancel(true), 5000);
    const tid = `txn_rede_${Date.now()}`;

    try {
      const response = await fetch('/api/rede/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardData:
            paymentMethod === 'pix'
              ? null
              : {
                  ...cardData,
                  number: cardData.number.replace(/\s/g, ''),
                },
          amount: amount.toString(),
          transactionId: tid,
          userId: uid,
          paymentMethod,
          installments: paymentMethod === 'credit' ? installmentsCount : 1,
          customer: {
            name: student?.responsibleName || 'Luis Carlos Tosto',
            cpf: (student?.responsibleCpf || '04082089888').replace(/\D/g, ''),
            email: student?.responsibleEmail || 'admin@modeloalpha.com.br',
            businessName: 'Escola Cristã Modelo Alpha Ltda',
            cnpj: '04214446000170',
          },
        }),
      });

      const resData = await response.json();

      if (response.ok && (resData.success || resData.pix)) {
        clearTimeout(processTimeout);
        if (paymentMethod === 'pix' && resData.pix) {
          const qrCode = resData.pix.qrCode;
          if (!qrCode) {
            setPaymentError('Erro ao gerar código Pix. A operadora não retornou os dados do QR Code.');
            setStatus('error');
            return;
          }
          setPixData({ qrcode: qrCode, tid: resData.tid || tid });
          setStatus('awaiting_pix');
        } else {
          setStatus('success');
          showToast('Pagamento Aprovado com Sucesso pela Rede!', 'success');
          setTimeout(() => onSuccess(resData.tid || tid, paymentMethod.toUpperCase()), 1800);
        }
      } else {
        throw new Error(resData.returnMessage || resData.error || 'Erro na resposta do gateway Rede');
      }
    } catch (error: any) {
      clearTimeout(processTimeout);
      let errorMsg = 'Não foi possível completar a transação na Rede.';
      let description = error.message || 'Tente novamente em alguns instantes.';

      if (description.includes('203')) {
        errorMsg = 'Serviço de Autenticação (3DS) não Ativo';
        description = 'Seu PV da Rede não possui o serviço de autenticação 3DS habilitado para Débito. Use Crédito ou Pix.';
      } else if (description.includes('sk_live')) {
        errorMsg = 'Token Inválido';
        description = 'Seu token começa com sk_live (Stripe). Por favor, use o Token gerado no portal e.Rede.';
      }

      setPaymentError(`${errorMsg}: ${description}`);
      setStatus('error');
      showToast(errorMsg, 'error');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.qrcode);
      setCopied(true);
      showToast('Código Pix Copia e Cola copiado com sucesso!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const checkStatus = async () => {
    if (!pixData?.tid) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/rede/verify-pix/${pixData.tid}?t=${Date.now()}`);
      const data = await response.json();
      if (data.success) {
        setStatus('success');
        showToast('Pagamento Confirmado na Rede!', 'success');
        setTimeout(() => onSuccess(pixData.tid, 'PIX'), 1500);
      } else {
        const redeStatus = data.redeStatus || 'Pendente';
        setPendingStatusInfo(redeStatus);
        showToast(`Status: ${redeStatus}. Aguardando compensação.`, 'info');
      }
    } catch (e: any) {
      showToast('Erro ao consultar status bancário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim();
  };

  if (status === 'processing') {
    return (
      <div id="rede-processing-view" className="flex flex-col items-center justify-center py-16 text-center bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-2xl">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="h-24 w-24 border-t-4 border-r-4 border-orange-500 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">e.Rede Itaú</span>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">Processando Transação</h3>
          <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">
            Comunicando com o gateway seguro de pagamentos da Rede Itaú...
          </p>

          <div className="pt-8 flex flex-col gap-3 min-w-[240px] items-center">
            {showForceCancel ? (
              <button
                id="rede-force-cancel-btn"
                onClick={() => {
                  setStatus('idle');
                  setLoading(false);
                }}
                className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg cursor-pointer transition"
              >
                Parar Processamento
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 h-10">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="h-2 w-2 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            )}

            <button
              id="rede-cancel-btn"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white uppercase font-bold tracking-wider py-2 cursor-pointer"
            >
              Cancelar Transação
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div id="rede-error-view" className="flex flex-col items-center justify-center py-12 text-center bg-slate-900 rounded-3xl p-8 border border-red-900/40 shadow-2xl">
        <motion.div
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="h-20 w-20 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30"
        >
          <XCircle className="h-10 w-10 text-red-500" />
        </motion.div>

        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Falha na Transação</h3>
        <p className="text-slate-300 font-medium text-sm max-w-sm leading-relaxed mx-auto my-3">
          {paymentError || 'Não foi possível processar o pagamento no momento pela Rede.'}
        </p>

        <div className="text-left space-y-2 p-4 bg-slate-950/80 rounded-2xl border border-white/10 w-full max-w-md my-4">
          <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Orientações de Integração Rede:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>
              Certifique-se de que o <strong>REDE_PV</strong> e <strong>REDE_TOKEN</strong> estão configurados.
            </li>
            <li>
              Para pagamentos de débito, certifique-se que o <strong>3DS</strong> está liberado no seu PV.
            </li>
            <li>
              Se desejar, você pode tentar com <strong>PIX Instantâneo</strong> com confirmação automática.
            </li>
          </ul>
        </div>

        <div className="w-full max-w-md flex flex-col gap-2 mt-4">
          <button
            id="rede-retry-btn"
            onClick={() => setStatus('idle')}
            className="w-full h-12 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black uppercase tracking-wider rounded-xl text-xs shadow-lg cursor-pointer transition"
          >
            Tentar Novamente
          </button>
          <button
            id="rede-back-btn"
            onClick={onCancel}
            className="w-full h-10 text-slate-400 hover:text-white font-bold uppercase tracking-wider text-xs cursor-pointer"
          >
            Voltar às Opções
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div id="rede-success-view" className="flex flex-col items-center justify-center py-12 text-center bg-slate-900 rounded-3xl p-8 border border-emerald-900/40 shadow-2xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-20 w-20 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30"
        >
          <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
        </motion.div>

        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">e.Rede Itaú Aprovado</span>
        <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1">Pagamento Aprovado!</h3>
        <p className="text-slate-300 font-medium text-sm max-w-sm leading-relaxed mt-2">
          A matrícula de <strong className="text-white">{student?.name || 'Aluno'}</strong> foi garantida com sucesso.
        </p>
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
          Valor liquidado: <strong>R$ {amount.toFixed(2)}</strong> via Rede Itaú
        </div>
      </div>
    );
  }

  return (
    <div id="rede-payment-card" className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl text-white space-y-6">
      {/* Toast message display */}
      {toastMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold text-center ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/30'
              : toastMessage.type === 'error'
              ? 'bg-red-900/80 text-red-200 border border-red-500/30'
              : 'bg-indigo-900/80 text-indigo-200 border border-indigo-500/30'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-9 w-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">Checkout Rede Itaú</span>
              <span className="text-[9px] bg-orange-500/20 text-orange-300 font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                Modelo Alpha
              </span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Forma de Pagamento</h2>
          </div>
        </div>
        <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
          <ShieldCheck className="text-orange-400 h-5 w-5" />
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'pix', label: 'Pix', icon: QrCode, color: 'text-emerald-400' },
          { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-orange-400' },
          { id: 'debit', label: 'Débito', icon: SmartphoneNfc, color: 'text-blue-400' },
        ].map((method) => (
          <button
            key={method.id}
            id={`rede-method-${method.id}-btn`}
            type="button"
            onClick={() => {
              setPaymentMethod(method.id as PaymentMethod);
              if (status === 'awaiting_pix') setStatus('idle');
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 relative cursor-pointer ${
              paymentMethod === method.id
                ? 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/20 text-slate-950 font-black'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-800 font-bold'
            }`}
          >
            <method.icon className={`h-5 w-5 ${paymentMethod === method.id ? 'text-slate-950' : method.color}`} />
            <span className="text-[11px] uppercase tracking-wider">{method.label}</span>
          </button>
        ))}
      </div>

      {/* Amount Display */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center relative overflow-hidden">
        <div className="flex items-center gap-2 relative z-10">
          <Wallet className="h-4 w-4 text-orange-400" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {paymentMethod === 'credit' && installmentsCount > 1
              ? `Plano em ${installmentsCount}x`
              : 'Valor Total a Pagar'}
          </span>
        </div>
        <div className="text-right relative z-10">
          <span className="text-2xl font-black text-white tracking-tight">R$ {amount.toFixed(2)}</span>
          {paymentMethod === 'credit' && installmentsCount > 1 && installmentAmount && (
            <div className="text-[10px] text-orange-400 font-bold">
              {installmentsCount}x de R$ {installmentAmount.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Method Dynamic Area */}
      <AnimatePresence mode="wait">
        {paymentMethod === 'pix' ? (
          <motion.div key="pix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {status === 'awaiting_pix' ? (
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-5">
                <div className="p-4 bg-white rounded-3xl shadow-2xl relative">
                  {pixData && <QRCodeSVG value={pixData.qrcode} size={180} level="H" includeMargin />}
                  <div className="absolute -top-3 -right-3 h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <QrCode className="h-5 w-5" />
                  </div>
                </div>

                <div className="w-full space-y-2.5">
                  <button
                    id="rede-copy-pix-btn"
                    onClick={copyPix}
                    className="w-full h-12 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Código Copiado!' : 'Copiar Código Pix (Copia e Cola)'}
                  </button>

                  <button
                    id="rede-verify-pix-btn"
                    onClick={checkStatus}
                    disabled={loading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition text-xs"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    {loading ? 'Consultando...' : 'Verificar Pagamento Agora'}
                  </button>

                  <div className="flex flex-col items-center justify-center gap-1 pt-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 text-slate-400 animate-spin" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {pendingStatusInfo ? `Status: ${pendingStatusInfo}` : 'Aguardando confirmação bancária...'}
                      </p>
                    </div>
                    {pixData?.tid && (
                      <p className="text-[9px] text-slate-500 font-mono uppercase">
                        TID: {pixData.tid.substring(0, 18)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/20">
                  <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                      Liquidação Instantânea
                    </h4>
                    <p className="text-xs text-slate-300 leading-snug mt-0.5">
                      Gere o QR Code dinâmico com chave da Escola Cristã Modelo Alpha Ltda e confirme na hora.
                    </p>
                  </div>
                </div>

                <button
                  id="rede-generate-pix-btn"
                  onClick={() => handleProcessPayment()}
                  disabled={loading}
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 cursor-pointer transition text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Gerar QR Code Pix'}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleProcessPayment}
            className="space-y-4"
          >
            {paymentMethod === 'debit' && (
              <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl">
                <p className="text-[11px] text-blue-300 leading-snug">
                  <strong className="font-black text-blue-400">Cartão de Débito:</strong> Requer autenticação 3D-Secure ativa no PV da Rede.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
                  Número do Cartão
                </label>
                <div className="relative">
                  <input
                    id="rede-card-number-input"
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    value={formatCardNumber(cardData.number)}
                    onChange={(e) => {
                      setCardData({ ...cardData, number: e.target.value });
                      if (formErrors.number) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.number;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 h-11 rounded-xl text-white font-mono tracking-wider pl-10 text-sm focus:outline-none focus:border-orange-500 ${
                      formErrors.number ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
                {formErrors.number && <p className="text-[10px] text-red-400 mt-1 ml-1">{formErrors.number}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
                  Nome Impresso no Cartão
                </label>
                <input
                  id="rede-card-name-input"
                  type="text"
                  placeholder="NOME DO TITULAR"
                  value={cardData.name}
                  onChange={(e) => {
                    setCardData({ ...cardData, name: e.target.value.toUpperCase() });
                    if (formErrors.name) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }
                  }}
                  className={`w-full bg-slate-950 border border-slate-800 h-11 rounded-xl text-white font-bold tracking-wider uppercase text-sm px-3 focus:outline-none focus:border-orange-500 ${
                    formErrors.name ? 'border-red-500' : ''
                  }`}
                  required
                />
                {formErrors.name && <p className="text-[10px] text-red-400 mt-1 ml-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
                    Validade (MM/AA)
                  </label>
                  <input
                    id="rede-card-expiry-input"
                    type="text"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={cardData.expiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                      setCardData({ ...cardData, expiry: val });
                      if (formErrors.expiry) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.expiry;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 h-11 rounded-xl text-white font-bold text-center text-sm focus:outline-none focus:border-orange-500 ${
                      formErrors.expiry ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {formErrors.expiry && <p className="text-[10px] text-red-400 mt-1 ml-1">{formErrors.expiry}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
                    Código CVV
                  </label>
                  <input
                    id="rede-card-cvv-input"
                    type="text"
                    placeholder="000"
                    maxLength={4}
                    value={cardData.cvv}
                    onChange={(e) => {
                      setCardData({ ...cardData, cvv: e.target.value });
                      if (formErrors.cvv) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.cvv;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 h-11 rounded-xl text-white font-bold text-center text-sm focus:outline-none focus:border-orange-500 ${
                      formErrors.cvv ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {formErrors.cvv && <p className="text-[10px] text-red-400 mt-1 ml-1">{formErrors.cvv}</p>}
                </div>
              </div>
            </div>

            <button
              id="rede-submit-card-btn"
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 cursor-pointer transition text-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `Pagar com ${paymentMethod === 'debit' ? 'Débito' : `Crédito (${installmentsCount}x)`}`
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Security Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-4 text-slate-500 text-[10px]">
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
          <span>Ambiente Seguro SSL</span>
        </div>
        <div className="h-1 w-1 bg-slate-700 rounded-full" />
        <div className="flex items-center gap-1">
          <Lock className="h-3.5 w-3.5 text-orange-400" />
          <span>Rede PCI Compliance</span>
        </div>
      </div>
    </div>
  );
}
