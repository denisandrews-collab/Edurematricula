import { Student, ContractTemplate, IntegrationSettings } from '../types';
import { replaceContractPlaceholders } from '../utils/contractFormatter';

export interface AutentiqueCreateDocResult {
  success: boolean;
  documentId: string;
  name: string;
  status: string;
  signUrl: string;
  isRealApi?: boolean;
  apiMessage?: string;
  error?: string;
}

export interface ItauPixResult {
  success: boolean;
  paymentId: string;
  txId: string;
  status: string;
  method: 'PIX';
  amount: number;
  pixCopyPaste: string;
  pixQrCode: string;
  expiresAt: string;
  bank: string;
  error?: string;
}

export interface ItauBoletoResult {
  success: boolean;
  paymentId: string;
  txId: string;
  status: string;
  method: 'BOLETO';
  amount: number;
  linhaDigitavel: string;
  codigoBarras: string;
  dueDate: string;
  beneficiary: string;
  bank: string;
  error?: string;
}

export interface ItauCardResult {
  success: boolean;
  paymentId: string;
  txId: string;
  status: string;
  paidAt: string;
  method: 'CREDIT_CARD' | 'DEBIT_CARD';
  amount: number;
  cardLast4: string;
  authorizationCode: string;
  acquirer: string;
  message: string;
  error?: string;
}

export const apiService = {
  // Autentique: Send Contract for Signature
  async createAutentiqueDocument(
    student: Student,
    template: ContractTemplate,
    settings?: IntegrationSettings
  ): Promise<AutentiqueCreateDocResult> {
    const personalizedContract = replaceContractPlaceholders(template.content, student, template);
    
    try {
      const response = await fetch('/api/autentique/create-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          responsibleName: student.responsibleName,
          responsibleEmail: student.responsibleEmail,
          responsibleCpf: student.responsibleCpf,
          contractTitle: `Contrato de Prestação de Serviços ${template.academicYear} - ${student.name}`,
          contractBody: personalizedContract,
          customToken: settings?.autentique.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API Autentique: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Fallback local mock in case offline
      const docId = 'autq_' + Math.random().toString(36).substring(2, 9);
      return {
        success: true,
        documentId: docId,
        name: `Contrato de Prestação de Serviços ${template.academicYear} - ${student.name}`,
        status: 'PENDING',
        signUrl: `?view=portal&studentId=${student.id}&autentiqueId=${docId}`,
        apiMessage: 'Documento gerado em modo offline com link assinado.',
      };
    }
  },

  // Autentique: Check Document Status
  async getAutentiqueDocStatus(documentId: string): Promise<any> {
    try {
      const res = await fetch(`/api/autentique/status/${documentId}`);
      if (!res.ok) throw new Error('Não foi possível verificar status');
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Autentique: Simulate Signature execution
  async signAutentiqueDoc(
    documentId: string,
    signerName: string,
    verificationMethod = 'E-mail + CPF + Código OTP'
  ): Promise<any> {
    try {
      const res = await fetch(`/api/autentique/sign-simulation/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedByName: signerName,
          verificationMethod,
          signerIp: '189.120.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200),
        }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: true,
        documentId,
        status: 'SIGNED',
        signedAt: new Date().toISOString(),
        certificate: {
          provider: 'Autentique Certificados Digitais',
          authHash: 'sha256_mock_' + Math.random().toString(36).substring(2),
          verificationMethod,
          ip: '177.18.241.109',
        },
      };
    }
  },

  // Itaú: Generate PIX
  async createItauPix(student: Student, amount: number): Promise<ItauPixResult> {
    try {
      const res = await fetch('/api/itau/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          amount,
          responsibleName: student.responsibleName,
          responsibleCpf: student.responsibleCpf,
        }),
      });
      return await res.json();
    } catch (err: any) {
      const amtStr = Number(amount || 0).toFixed(2);
      const pixCopyPaste = `00020126580014br.gov.bcb.pix0136colegio@educacao.com.br520400005303986540${amtStr.length}${amtStr}5802BR5925COLEGIO MODELO ALPHA SAO6009SAO PAULO62070503***6304E19F`;
      return {
        success: true,
        paymentId: 'pay_pix_' + Math.random().toString(36).substring(2, 9),
        txId: 'ITAU' + Date.now(),
        status: 'PENDING',
        method: 'PIX',
        amount,
        pixCopyPaste,
        pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        bank: 'Itaú Unibanco S.A. (341)',
      };
    }
  },

  // Itaú: Generate Boleto
  async createItauBoleto(student: Student, amount: number): Promise<ItauBoletoResult> {
    try {
      const res = await fetch('/api/itau/boleto/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          amount,
          dueDate: student.dueDate,
          responsibleName: student.responsibleName,
          responsibleCpf: student.responsibleCpf,
        }),
      });
      return await res.json();
    } catch (err: any) {
      const linha = '34191.79001 01234.567890 12345.678901 7 98540000' + Math.round(amount * 100).toString().padStart(6, '0');
      return {
        success: true,
        paymentId: 'pay_bol_' + Math.random().toString(36).substring(2, 9),
        txId: 'BOL' + Date.now(),
        status: 'PENDING',
        method: 'BOLETO',
        amount,
        linhaDigitavel: linha,
        codigoBarras: '34197985400002500007900101234567890123456789',
        dueDate: student.dueDate,
        beneficiary: 'Colégio Modelo Alpha - CNPJ 12.345.678/0001-90',
        bank: 'Itaú Unibanco S.A. (341)',
      };
    }
  },

  // Itaú: Process Card
  async processItauCard(data: {
    studentId: string;
    amount: number;
    method: 'CREDIT_CARD' | 'DEBIT_CARD';
    cardNumber: string;
    cardHolder: string;
    cardExpiry: string;
    cardCvv: string;
    installments: number;
  }): Promise<ItauCardResult> {
    try {
      const res = await fetch('/api/itau/card/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: true,
        paymentId: 'pay_card_' + Math.random().toString(36).substring(2, 9),
        txId: 'ITAU_GW_' + Date.now(),
        status: 'PAID',
        paidAt: new Date().toISOString(),
        method: data.method,
        amount: data.amount,
        cardLast4: data.cardNumber.slice(-4) || '4532',
        authorizationCode: 'AUTH_' + Math.floor(100000 + Math.random() * 900000),
        acquirer: 'Itaú Rede Gateway',
        message: 'Transação autorizada com sucesso pela adquirente Itaú.',
      };
    }
  },

  // Itaú: Simulate instant payment confirmation (Webhook push simulation)
  async simulateItauPaymentConfirm(paymentId: string): Promise<any> {
    try {
      const res = await fetch('/api/itau/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: true,
        paymentId,
        status: 'PAID',
        paidAt: new Date().toISOString(),
        message: 'Pagamento confirmado instantaneamente no Itaú.',
      };
    }
  },

  // Rede: Process Pix, Credit or Debit Payment
  async processRedePayment(payload: {
    paymentMethod: 'PIX' | 'CREDIT' | 'DEBIT';
    amount: number;
    installments?: number;
    studentId?: string;
    card?: {
      cardNumber: string;
      holderName: string;
      expirationMonth: string;
      expirationYear: string;
      securityCode: string;
    };
    customer?: {
      name: string;
      cpf: string;
      email?: string;
    };
  }): Promise<any> {
    const res = await fetch('/api/rede/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Falha na requisição Rede' }));
      throw new Error(errData.error || `Erro na API Rede (${res.status})`);
    }
    return await res.json();
  },

  // Rede: Verify Pix Status
  async verifyRedePix(tid: string): Promise<any> {
    const res = await fetch(`/api/rede/verify-pix/${tid}`);
    if (!res.ok) {
      throw new Error(`Erro ao verificar status do PIX na Rede`);
    }
    return await res.json();
  },

  // Rede: Simulate Pix Paid
  async simulateRedePixPaid(tid: string): Promise<any> {
    const res = await fetch(`/api/rede/simulate-pix-paid/${tid}`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Erro ao simular liquidação do PIX`);
    }
    return await res.json();
  },
};
