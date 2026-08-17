import React, { useState } from 'react';
import { ContractTemplate, Student } from '../types';
import { CONTRACT_PLACEHOLDERS, replaceContractPlaceholders } from '../utils/contractFormatter';
import { DEFAULT_CONTRACT_TEMPLATE } from '../data/initialData';
import {
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Edit,
  Building,
  CheckCircle,
  Copy,
  Printer,
  ChevronRight,
  User,
} from 'lucide-react';

interface Props {
  template: ContractTemplate;
  onUpdateTemplate: (template: ContractTemplate) => void;
  students: Student[];
  selectedStudent: Student;
  onSelectStudent: (student: Student) => void;
  initialSubTab?: 'editor' | 'preview' | 'school';
}

export function ContractTemplateEditor({
  template,
  onUpdateTemplate,
  students,
  selectedStudent,
  onSelectStudent,
  initialSubTab = 'preview',
}: Props) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'school'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  const [formTemplate, setFormTemplate] = useState<ContractTemplate>(template);

  const [resetToast, setResetToast] = useState(false);

  const handleSave = () => {
    onUpdateTemplate({
      ...formTemplate,
      lastUpdated: new Date().toISOString(),
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetDefault = () => {
    setFormTemplate(DEFAULT_CONTRACT_TEMPLATE);
    onUpdateTemplate(DEFAULT_CONTRACT_TEMPLATE);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2500);
  };

  const handleInsertTag = (tag: string) => {
    setFormTemplate((prev) => ({
      ...prev,
      content: prev.content + ' ' + tag,
    }));
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const renderedContractForSelected = replaceContractPlaceholders(
    formTemplate.content,
    selectedStudent,
    formTemplate
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Contrato Padrão e Preenchimento Dinâmico por Aluno
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            As cláusulas padrão são personalizadas automaticamente para cada cliente usando as informações da planilha antes do envio para a API Autentique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'preview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Prévia Dinâmica</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'editor' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Cláusulas</span>
            </button>
            <button
              onClick={() => setActiveTab('school')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'school' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Contratada & Testemunhas (Fixos)</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Modelo</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Modelo de contrato e dados fixos salvos com sucesso! Todas as rematrículas utilizarão este padrão.</span>
        </div>
      )}

      {resetToast && (
        <div className="bg-indigo-50 text-indigo-900 border border-indigo-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Modelo de contrato restaurado para as cláusulas jurídicas padrão com 2 Responsáveis, Contratada e 2 Testemunhas!</span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Student Selector & Dynamic Data Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Selecionar Aluno da Planilha
              </label>
              <select
                value={selectedStudent.id}
                onChange={(e) => {
                  const found = students.find((s) => s.id === e.target.value);
                  if (found) onSelectStudent(found);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.serie})
                  </option>
                ))}
              </select>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Dados Injetados no Contrato:
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">Aluno:</span> {selectedStudent.name}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">RA:</span> {selectedStudent.ra}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Série:</span> {selectedStudent.serie}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Responsável:</span>{' '}
                    {selectedStudent.responsibleName}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">CPF:</span>{' '}
                    {selectedStudent.responsibleCpf}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Valor Final:</span>{' '}
                    <strong className="text-emerald-700 font-bold">
                      R$ {selectedStudent.finalValue.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Vencimento:</span>{' '}
                    {selectedStudent.dueDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags Toolbox Reference */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Variáveis Disponíveis ({CONTRACT_PLACEHOLDERS.length})</span>
              <p className="text-[11px] text-slate-500">
                Qualquer coluna da planilha inserida como tag é substituída automaticamente.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-56 overflow-y-auto">
                {CONTRACT_PLACEHOLDERS.slice(0, 12).map((p) => (
                  <button
                    key={p.tag}
                    onClick={() => handleInsertTag(p.tag)}
                    title={`Exemplo: ${p.example}`}
                    className="text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition cursor-pointer"
                  >
                    {p.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Rendered Contract Sheet */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  <span className="font-medium">
                    Documento Gerado para: <strong className="text-white">{selectedStudent.name}</strong>
                  </span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>

              {/* Document Sheet Body */}
              <div className="p-8 sm:p-12 font-serif text-slate-800 text-sm leading-relaxed max-h-[750px] overflow-y-auto bg-slate-50/40">
                <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-xl border border-slate-200 space-y-6">
                  {/* School Header */}
                  <div className="text-center pb-6 border-b border-slate-200 space-y-1 font-sans">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {formTemplate.schoolName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      CNPJ: {formTemplate.schoolCnpj} • {formTemplate.schoolAddress} - {formTemplate.schoolCity}/{formTemplate.schoolState}
                    </p>
                    <p className="text-xs text-slate-400">
                      Tel: {formTemplate.schoolPhone} • {formTemplate.schoolEmail}
                    </p>
                  </div>

                  {/* Rendered text */}
                  <div className="whitespace-pre-line space-y-4 font-sans text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {renderedContractForSelected}
                  </div>

                  {/* Simulated Autentique Legal Stamp */}
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 text-xs font-sans text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Autenticação Eletrônica Autentique API
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Certificado Digital com validade jurídica nos termos da MP nº 2.200-2/2001.
                      </p>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-400">
                      Doc ID: {selectedStudent.autentiqueDocId || 'autq_pre_2026'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Texto do Contrato Padrão (Suporta Tags Dinâmicas)
              </label>
              <button
                onClick={handleResetDefault}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Cláusulas Padrão
              </button>
            </div>

            <textarea
              rows={22}
              value={formTemplate.content}
              onChange={(e) => setFormTemplate({ ...formTemplate, content: e.target.value })}
              className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Placeholders helper column */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Inserir Tags Dinâmicas
            </h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer variável para copiá-la ou adicioná-la ao final do contrato.
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {CONTRACT_PLACEHOLDERS.map((p) => (
                <div
                  key={p.tag}
                  onClick={() => handleInsertTag(p.tag)}
                  className="p-2 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200/80 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-700">
                    <span>{p.tag}</span>
                    <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{p.label}</div>
                  <div className="text-[10px] text-slate-400 italic">Ex: {p.example}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* School & Witnesses Info Tab */}
      {activeTab === 'school' && (
        <div className="space-y-6 max-w-4xl">
          {/* Contratada */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                1. CONTRATADA (Instituição de Ensino - Sempre a Mesma)
              </h3>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                Fixo nos Contratos
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Estas informações qualificam a escola e seu representante legal em todos os contratos gerados automaticamente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Razão Social da Escola</label>
                <input
                  type="text"
                  value={formTemplate.schoolName}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={formTemplate.schoolCnpj}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolCnpj: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Representante Legal</label>
                <input
                  type="text"
                  value={formTemplate.schoolRepresentative}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolRepresentative: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF do Representante Legal</label>
                <input
                  type="text"
                  value={formTemplate.schoolRepresentativeCpf || ''}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolRepresentativeCpf: e.target.value })}
                  placeholder="111.222.333-44"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo do Representante</label>
                <input
                  type="text"
                  value={formTemplate.schoolRepresentativeRole || ''}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolRepresentativeRole: e.target.value })}
                  placeholder="Diretor Geral e Representante Legal"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={formTemplate.schoolAddress}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={formTemplate.schoolCity}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolCity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  value={formTemplate.schoolState}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolState: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone da Secretaria</label>
                <input
                  type="text"
                  value={formTemplate.schoolPhone}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Oficial</label>
                <input
                  type="email"
                  value={formTemplate.schoolEmail}
                  onChange={(e) => setFormTemplate({ ...formTemplate, schoolEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Testemunhas Fixas */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                2. AS 2 TESTEMUNHAS INSTRUMENTÁRIAS (Sempre as Mesmas)
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                Fixas nos Contratos
              </span>
            </div>
            <p className="text-xs text-slate-500">
              As duas testemunhas instrumentárias assinam o contrato juntamente com os contratantes e a contratada, conferindo força executiva extrajudicial (Art. 784, III do CPC).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Testemunha 1 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</div>
                  1ª Testemunha Fixa
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formTemplate.witness1Name}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness1Name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="Nome da 1ª Testemunha"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">CPF</label>
                  <input
                    type="text"
                    value={formTemplate.witness1Cpf}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness1Cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={formTemplate.witness1Role || ''}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness1Role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="Secretária Acadêmica"
                  />
                </div>
              </div>

              {/* Testemunha 2 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</div>
                  2ª Testemunha Fixa
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formTemplate.witness2Name}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness2Name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="Nome da 2ª Testemunha"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">CPF</label>
                  <input
                    type="text"
                    value={formTemplate.witness2Cpf}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness2Cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={formTemplate.witness2Role || ''}
                    onChange={(e) => setFormTemplate({ ...formTemplate, witness2Role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="Coordenador Financeiro"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
