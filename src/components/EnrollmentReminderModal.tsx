import React, { useState, useMemo, useRef } from 'react';
import { ContractTemplate, ReminderEmailTemplate, Student } from '../types';
import {
  DEFAULT_REMINDER_TEMPLATE,
  REMINDER_PLACEHOLDERS,
  buildParentPortalUrl,
  isStudentNotStarted,
  renderReminderEmail,
} from '../utils/reminderHelper';
import { apiService } from '../services/apiService';
import {
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Link2,
  Mail,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  UserCheck,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';

interface DispatchResultItem {
  studentId: string;
  studentName: string;
  recipients: string[];
  portalUrl: string;
  messageId: string;
  sentAt: string;
  provider: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialSelectedIds?: string[];
  contractTemplate: ContractTemplate;
  savedTemplate?: ReminderEmailTemplate;
  onSaveTemplate: (template: ReminderEmailTemplate) => void;
  onUpdateStudents: (updatedStudents: Student[]) => void;
  onOpenPortal: (student: Student) => void;
}

export function EnrollmentReminderModal({
  isOpen,
  onClose,
  students,
  initialSelectedIds,
  contractTemplate,
  savedTemplate,
  onSaveTemplate,
  onUpdateStudents,
  onOpenPortal,
}: Props) {
  const [audienceScope, setAudienceScope] = useState<'not_started' | 'all_pending'>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      const hasNonImportado = initialSelectedIds.some((id) => {
        const s = students.find((st) => st.id === id);
        return s && !isStudentNotStarted(s);
      });
      return hasNonImportado ? 'all_pending' : 'not_started';
    }
    return 'not_started';
  });

  const eligibleStudents = useMemo(() => {
    if (audienceScope === 'not_started') {
      return students.filter((s) => isStudentNotStarted(s));
    }
    return students.filter(
      (s) =>
        s.status === 'importado' ||
        s.status === 'contrato_gerado' ||
        s.status === 'enviado_autentique'
    );
  }, [students, audienceScope]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return initialSelectedIds;
    }
    return students.filter((s) => isStudentNotStarted(s)).map((s) => s.id);
  });

  const [previewStudentId, setPreviewStudentId] = useState<string>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) return initialSelectedIds[0];
    const first = students.find((s) => isStudentNotStarted(s));
    return first?.id || students[0]?.id || '';
  });

  const [templateDraft, setTemplateDraft] = useState<ReminderEmailTemplate>(
    () => savedTemplate || DEFAULT_REMINDER_TEMPLATE
  );
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview'>('edit');
  const [templateSavedNotice, setTemplateSavedNotice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [dispatchResults, setDispatchResults] = useState<DispatchResultItem[] | null>(null);
  const [copiedLinkFor, setCopiedLinkFor] = useState<string | null>(null);

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const previewStudent =
    students.find((s) => s.id === previewStudentId) ||
    eligibleStudents[0] ||
    students[0];

  const renderedPreview = previewStudent
    ? renderReminderEmail(templateDraft, previewStudent, contractTemplate)
    : null;

  const selectedEligibleIds = selectedIds.filter((id) =>
    eligibleStudents.some((s) => s.id === id)
  );

  const handleToggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setPreviewStudentId(id);
  };

  const handleToggleAll = () => {
    if (selectedEligibleIds.length === eligibleStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleStudents.map((s) => s.id));
    }
  };

  const handleInsertTag = (tag: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setTemplateDraft((prev) => ({ ...prev, body: `${prev.body} ${tag}` }));
      return;
    }
    const start = textarea.selectionStart ?? templateDraft.body.length;
    const end = textarea.selectionEnd ?? templateDraft.body.length;
    const nextBody =
      templateDraft.body.slice(0, start) + tag + templateDraft.body.slice(end);
    setTemplateDraft((prev) => ({ ...prev, body: nextBody }));
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + tag.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleSaveAsDefault = () => {
    const updatedTemplate: ReminderEmailTemplate = {
      ...templateDraft,
      lastUpdated: new Date().toISOString(),
    };
    onSaveTemplate(updatedTemplate);
    setTemplateSavedNotice(true);
    setTimeout(() => setTemplateSavedNotice(false), 3000);
  };

  const handleResetDefault = () => {
    setTemplateDraft(DEFAULT_REMINDER_TEMPLATE);
  };

  const handleCopyPortalLink = (studentId: string) => {
    const url = buildParentPortalUrl(studentId);
    navigator.clipboard.writeText(url);
    setCopiedLinkFor(studentId);
    setTimeout(() => setCopiedLinkFor(null), 2000);
  };

  const handleDispatchReminders = async () => {
    setSendError(null);
    const targets = eligibleStudents.filter((s) => selectedIds.includes(s.id));
    if (targets.length === 0) {
      setSendError('Selecione pelo menos 1 aluno na lista à esquerda para disparar o lembrete.');
      return;
    }

    setIsSending(true);
    const results: DispatchResultItem[] = [];
    const updatedMap = new Map<string, Student>();

    try {
      // Persist latest template automatically upon dispatch so edits are never lost
      onSaveTemplate({
        ...templateDraft,
        lastUpdated: new Date().toISOString(),
      });

      for (const student of targets) {
        const rendered = renderReminderEmail(templateDraft, student, contractTemplate);
        const recipientEmails = rendered.recipients.map((r) => r.email);

        if (recipientEmails.length === 0) continue;

        const res = await apiService.sendEnrollmentReminder({
          studentId: student.id,
          studentName: student.name,
          recipients: recipientEmails,
          subject: rendered.subject,
          body: rendered.body,
          portalUrl: rendered.portalUrl,
        });

        results.push({
          studentId: student.id,
          studentName: student.name,
          recipients: recipientEmails,
          portalUrl: rendered.portalUrl,
          messageId: res.messageId,
          sentAt: res.sentAt,
          provider: res.provider,
        });

        updatedMap.set(student.id, {
          ...student,
          lastReminderSentAt: res.sentAt,
          reminderCount: (student.reminderCount || 0) + 1,
          historyLogs: [
            ...student.historyLogs,
            {
              timestamp: res.sentAt,
              action: 'Lembrete de Rematrícula Enviado por E-mail',
              details: `Enviado para ${recipientEmails.join(', ')} (ID: ${res.messageId}) com link direto para o Portal do Responsável.`,
            },
          ],
        });
      }

      if (updatedMap.size > 0) {
        const mergedStudents = students.map((s) => updatedMap.get(s.id) || s);
        onUpdateStudents(mergedStudents);
      }

      setDispatchResults(results);
    } catch (err: any) {
      setSendError(err.message || 'Erro ao disparar e-mails de lembrete.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="enrollment-reminder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Lembrete de Rematrícula • Disparo Automático por E-mail
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
                  Link Direto ao Portal
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Notifique pais que ainda não iniciaram a rematrícula usando um template configurável com acesso direto em 1 clique.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Fechar modal de lembrete"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Report State after Sending */}
        {dispatchResults ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-950">
                    {dispatchResults.length} Lembrete(s) de Rematrícula Disparado(s) com Sucesso!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Os e-mails foram enviados com o template personalizado e o link exclusivo de acesso direto ao Portal do Responsável. O histórico de cada aluno foi atualizado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDispatchResults(null)}
                className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
              >
                Novo Disparo
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {dispatchResults.map((item) => (
                <div
                  key={item.messageId}
                  className="p-4 bg-white hover:bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{item.studentName}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                        E-mail Enviado
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        ID: {item.messageId}
                      </span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Destinatários:</span>
                      <strong className="text-slate-800">{item.recipients.join(' • ')}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-2xl">
                      Link incluído: {item.portalUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyPortalLink(item.studentId)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLinkFor === item.studentId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Link Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = students.find((s) => s.id === item.studentId);
                        if (target) {
                          onClose();
                          onOpenPortal(target);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Testar Link no Portal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Concluir e Voltar à Lista
              </button>
            </div>
          </div>
        ) : (
          /* Main Configuration & Selection Workspace */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* LEFT COLUMN: Audience Selection */}
            <div className="lg:col-span-5 p-5 flex flex-col gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>1. Pais Elegíveis ao Lembrete</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                    {selectedEligibleIds.length} selecionado(s)
                  </span>
                </div>

                {/* Audience Filter Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAudienceScope('not_started');
                      const notStartedIds = students
                        .filter((s) => isStudentNotStarted(s))
                        .map((s) => s.id);
                      setSelectedIds(notStartedIds);
                      if (notStartedIds[0]) setPreviewStudentId(notStartedIds[0]);
                    }}
                    className={`py-1.5 px-2.5 rounded-lg transition cursor-pointer ${
                      audienceScope === 'not_started'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Não Iniciados ({students.filter((s) => isStudentNotStarted(s)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceScope('all_pending')}
                    className={`py-1.5 px-2.5 rounded-lg transition cursor-pointer ${
                      audienceScope === 'all_pending'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos Pendentes (
                    {
                      students.filter(
                        (s) =>
                          s.status === 'importado' ||
                          s.status === 'contrato_gerado' ||
                          s.status === 'enviado_autentique'
                      ).length
                    }
                    )
                  </button>
                </div>
              </div>

              {/* Select All Row */}
              {eligibleStudents.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        eligibleStudents.length > 0 &&
                        selectedEligibleIds.length === eligibleStudents.length
                      }
                      onChange={handleToggleAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Selecionar todos da lista ({eligibleStudents.length})</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Clique p/ pré-visualizar</span>
                </div>
              )}

              {/* Student Checklist */}
              <div className="space-y-2 max-h-[380px] lg:max-h-[430px] overflow-y-auto pr-1">
                {eligibleStudents.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      Nenhum aluno sem processo iniciado!
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Todos os alunos já iniciaram a rematrícula. Você pode alternar para &ldquo;Todos Pendentes&rdquo; acima se desejar enviar um reforço para quem ainda não assinou.
                    </p>
                  </div>
                ) : (
                  eligibleStudents.map((student) => {
                    const isChecked = selectedIds.includes(student.id);
                    const isPreviewed = previewStudent?.id === student.id;
                    return (
                      <div
                        key={student.id}
                        onClick={() => setPreviewStudentId(student.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isPreviewed
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                            : isChecked
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-white/60 border-slate-200/70 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleStudent(student.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {student.name}
                            </span>
                            {isStudentNotStarted(student) ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold shrink-0">
                                Não iniciado
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded text-[10px] font-bold shrink-0">
                                Aguard. Assinatura
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 truncate">
                            <strong>1º Resp:</strong> {student.responsibleName} ({student.responsibleEmail})
                          </div>

                          {student.responsible2Name && student.responsible2Email && templateDraft.sendToSecondResponsible && (
                            <div className="text-[10px] text-indigo-700 truncate">
                              <strong>+ 2º Resp:</strong> {student.responsible2Name} ({student.responsible2Email})
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>{student.serie}</span>
                            {student.lastReminderSentAt ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Lembrado {student.reminderCount || 1}x (
                                {new Date(student.lastReminderSentAt).toLocaleDateString('pt-BR')})
                              </span>
                            ) : (
                              <span className="text-slate-400">Nunca notificado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Configurable Template & Live Preview */}
            <div className="lg:col-span-7 p-5 flex flex-col gap-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>2. Template Configurável & Pré-visualização</span>
                </h3>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    id="btn-reminder-tab-edit"
                    onClick={() => setActiveEditorTab('edit')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      activeEditorTab === 'edit'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configurar Template</span>
                  </button>
                  <button
                    type="button"
                    id="btn-reminder-tab-preview"
                    onClick={() => setActiveEditorTab('preview')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      activeEditorTab === 'preview'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Prévia do E-mail</span>
                  </button>
                </div>
              </div>

              {templateSavedNotice && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Template salvo como padrão para os próximos disparos!</span>
                </div>
              )}

              {activeEditorTab === 'edit' ? (
                <div className="space-y-3.5 flex-1 flex flex-col">
                  {/* Subject Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assunto do E-mail *
                    </label>
                    <input
                      id="input-reminder-subject"
                      type="text"
                      value={templateDraft.subject}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, subject: e.target.value })
                      }
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                      placeholder="Assunto do e-mail com variáveis dinâmicas"
                    />
                  </div>

                  {/* Quick Variable Insertion Chips */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Clique para inserir variáveis dinâmicas no texto:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {REMINDER_PLACEHOLDERS.map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleInsertTag(item.tag)}
                          title={`Inserir ${item.label}`}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                            item.tag === '{{LINK_PORTAL}}'
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-300'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Corpo da Mensagem Automática *</span>
                      <span className="text-[10px] font-normal text-indigo-600 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        <code>{'{{LINK_PORTAL}}'}</code> gera o link individual do aluno
                      </span>
                    </label>
                    <textarea
                      id="textarea-reminder-body"
                      ref={bodyTextareaRef}
                      rows={9}
                      value={templateDraft.body}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, body: e.target.value })
                      }
                      className="w-full flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white font-sans"
                    />
                  </div>

                  {/* Template Behavioral Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateDraft.sendToSecondResponsible}
                        onChange={(e) =>
                          setTemplateDraft({
                            ...templateDraft,
                            sendToSecondResponsible: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">
                        Enviar também para 2º Responsável
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateDraft.autoIncludePortalLink}
                        onChange={(e) =>
                          setTemplateDraft({
                            ...templateDraft,
                            autoIncludePortalLink: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">
                        Incluir link do Portal automaticamente
                      </span>
                    </label>
                  </div>

                  {/* Template Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Padrão</span>
                    </button>

                    <button
                      type="button"
                      id="btn-save-reminder-template"
                      onClick={handleSaveAsDefault}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Salvar como Template Padrão</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* PREVIEW TAB */
                <div className="flex-1 flex flex-col">
                  {renderedPreview && previewStudent ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex-1 flex flex-col bg-slate-50">
                      {/* Email Envelope Metadata */}
                      <div className="bg-white p-4 border-b border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold w-16">De:</span>
                          <span className="text-slate-800 font-medium">
                            {contractTemplate.schoolName} &lt;{contractTemplate.schoolEmail}&gt;
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 font-semibold w-16 pt-0.5">Para:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {renderedPreview.recipients.map((rec, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md text-[11px] font-semibold"
                              >
                                {rec.name} ({rec.email})
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <span className="text-slate-400 font-semibold w-16">Assunto:</span>
                          <span className="text-slate-900 font-bold">{renderedPreview.subject}</span>
                        </div>
                      </div>

                      {/* Rendered Message Body */}
                      <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-white/80">
                        {renderedPreview.body}

                        {/* Highlighted Direct Portal CTA Card */}
                        <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 whitespace-normal">
                          <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            <span>Acesso Direto ao Portal do Responsável ({previewStudent.name})</span>
                          </div>
                          <div className="text-[11px] font-mono text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 break-all">
                            {renderedPreview.portalUrl}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCopyPortalLink(previewStudent.id)}
                              className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedLinkFor === previewStudent.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Link Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Link Direto</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenPortal(previewStudent);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Visualizar no Portal</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                      Selecione um aluno à esquerda para visualizar o e-mail renderizado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Action Bar */}
        {!dispatchResults && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              {sendError ? (
                <span className="text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {sendError}
                </span>
              ) : (
                <span>
                  Pronto para enviar para{' '}
                  <strong className="text-slate-900">{selectedEligibleIds.length}</strong> aluno(s) com link individual direto ao Portal.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-dispatch-reminders"
                type="button"
                onClick={handleDispatchReminders}
                disabled={isSending || selectedEligibleIds.length === 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSending
                    ? 'Disparando E-mails...'
                    : `Disparar E-mail Automático (${selectedEligibleIds.length})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
