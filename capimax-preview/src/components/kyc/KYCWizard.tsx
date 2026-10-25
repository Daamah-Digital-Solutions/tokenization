import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  User,
  FileText,
  MapPin,
  Camera,
  Check,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { LivenessVerification } from './LivenessVerification';
import { kycErrorMessage } from './kycErrors';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { getLocalizedCountries, localizedCountryName } from '../../utils/countries';
import {
  KYCService,
  type KYCDocumentType,
  type KYCGroupKey,
  type KYCServerDocument,
  type KYCStatusPayload,
} from '../../services/user/KYCService';

/**
 * KYC wizard driven by the SERVER's state (client round 3, items 5–7).
 *
 * The old wizard kept everything in local state: re-opening the page showed
 * empty slots, uploading again hit "Document of type X already exists",
 * "Remove" never reached the server, the selfie was never uploaded and the
 * submit error was a generic "Failed to submit". Now every step reads the
 * documents and completion status from /kyc/status/, uploads replace on the
 * server, and the user resumes exactly where they stopped.
 */

/** Legacy type kept for the components barrel export. */
export interface KYCData {
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  submittedAt: Date;
}

interface KYCWizardProps {
  status: KYCStatusPayload;
  /** Reload /kyc/status/ and return the fresh payload. */
  onRefresh: () => Promise<KYCStatusPayload | null>;
  onSubmitted: (payload: KYCStatusPayload | null) => void;
  className?: string;
}

type StepId = 'intro' | 'personal' | 'identity' | 'address' | 'selfie' | 'review';

const STEPS: Array<{ id: StepId; icon: React.ComponentType<any> }> = [
  { id: 'intro', icon: Shield },
  { id: 'personal', icon: User },
  { id: 'identity', icon: FileText },
  { id: 'address', icon: MapPin },
  { id: 'selfie', icon: Camera },
  { id: 'review', icon: Check },
];

const IDENTITY_TYPES: KYCDocumentType[] = ['passport', 'national_id', 'driving_license'];
const ADDRESS_TYPES: KYCDocumentType[] = ['utility_bill', 'bank_statement', 'proof_of_address'];
const READY_STATES = ['uploaded', 'approved'];

const groupState = (status: KYCStatusPayload, key: KYCGroupKey) =>
  status.completion_status.groups.find((g) => g.key === key)?.state ??
  status.completion_status.optional_groups.find((g) => g.key === key)?.state ??
  'missing';

const initialStep = (status: KYCStatusPayload): number => {
  const cs = status.completion_status;
  const index = (id: StepId) => STEPS.findIndex((s) => s.id === id);
  if (cs.missing_personal_info.length) {
    return status.documents.length ? index('personal') : index('intro');
  }
  if (!READY_STATES.includes(groupState(status, 'identity'))) return index('identity');
  if (!READY_STATES.includes(groupState(status, 'selfie'))) return index('selfie');
  return index('review');
};

const ageOn = (iso: string) => {
  const today = new Date();
  const birth = new Date(iso);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const KYCWizard: React.FC<KYCWizardProps> = ({ status, onRefresh, onSubmitted, className }) => {
  const { t, i18n } = useTranslation('kyc');
  const lang = i18n.language || 'en';
  const countries = useMemo(() => getLocalizedCountries(lang), [lang]);

  const [step, setStep] = useState(() => initialStep(status));
  const [personal, setPersonal] = useState({ dob: '', nationality: '', residency: '' });
  const [personalErrors, setPersonalErrors] = useState<Record<string, string>>({});
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; steps: string[] } | null>(null);

  const docs = useMemo(() => {
    const map: Partial<Record<KYCDocumentType, KYCServerDocument>> = {};
    status.documents.forEach((d) => {
      map[d.document_type] = d;
    });
    return map;
  }, [status.documents]);

  const [identityType, setIdentityType] = useState<KYCDocumentType>(
    () => IDENTITY_TYPES.find((type) => docs[type]) || 'passport',
  );
  const [addressType, setAddressType] = useState<KYCDocumentType>(
    () => ADDRESS_TYPES.find((type) => docs[type]) || 'utility_bill',
  );

  // Pre-fill personal info from the server.
  useEffect(() => {
    let alive = true;
    KYCService.getPersonalInfo()
      .then((info) => {
        if (!alive) return;
        setPersonal({
          dob: info.date_of_birth || '',
          nationality: info.nationality || '',
          residency: info.country || '',
        });
      })
      .catch(() => {
        /* fields stay empty; the user fills them in */
      });
    return () => {
      alive = false;
    };
  }, []);

  const currentId = STEPS[step].id;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang.startsWith('ar') ? 'ar' : 'en', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  // ---------------------------------------------------------------- actions
  const upload = async (type: KYCDocumentType, file: File, sameGroup: KYCDocumentType[] = []) => {
    setUploading((u) => ({ ...u, [type]: true }));
    setDocErrors((e) => ({ ...e, [type]: null }));
    try {
      await KYCService.uploadDocument(type, file);
      // Keep ONE document per group on file: drop superseded, non-approved
      // siblings (e.g. a rejected passport after uploading a national ID).
      for (const sibling of sameGroup) {
        const old = docs[sibling];
        if (sibling !== type && old && old.status !== 'approved') {
          await KYCService.deleteDocument(old.id).catch(() => undefined);
        }
      }
      await onRefresh();
    } catch (err) {
      setDocErrors((e) => ({ ...e, [type]: kycErrorMessage(t, err, lang) }));
      throw err;
    } finally {
      setUploading((u) => ({ ...u, [type]: false }));
    }
  };

  const remove = async (doc: KYCServerDocument) => {
    setDocErrors((e) => ({ ...e, [doc.document_type]: null }));
    try {
      await KYCService.deleteDocument(doc.id);
      await onRefresh();
    } catch (err) {
      setDocErrors((e) => ({ ...e, [doc.document_type]: kycErrorMessage(t, err, lang) }));
    }
  };

  const validatePersonal = () => {
    const errors: Record<string, string> = {};
    if (!personal.dob) errors.dob = t('wizard.personal.errors.dobRequired');
    else if (new Date(personal.dob) > new Date()) errors.dob = t('wizard.personal.errors.dobFuture');
    else if (ageOn(personal.dob) < 18) errors.dob = t('wizard.personal.errors.dobUnderage');
    if (!personal.nationality) errors.nationality = t('wizard.personal.errors.nationalityRequired');
    if (!personal.residency) errors.residency = t('wizard.personal.errors.residencyRequired');
    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = async () => {
    if (currentId === 'personal') {
      if (!validatePersonal()) return;
      setSavingPersonal(true);
      try {
        await KYCService.savePersonalInfo({
          date_of_birth: personal.dob,
          nationality: personal.nationality,
          residency_country: personal.residency,
        });
        await onRefresh();
      } catch (err) {
        setPersonalErrors({ form: kycErrorMessage(t, err, lang) || t('wizard.personal.errors.saveFailed') });
        return;
      } finally {
        setSavingPersonal(false);
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = await KYCService.submitForReview();
      onSubmitted(payload);
    } catch (err: any) {
      const nextSteps: Array<{ step: string; title: string }> =
        err?.details?.completion_status?.next_steps || [];
      setSubmitError({
        message: kycErrorMessage(t, err, lang),
        steps: nextSteps
          .filter((s) => s.step !== 'submit')
          .map((s) => t(`steps.${s.step}`, { defaultValue: s.title })),
      });
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentId) {
      case 'personal':
        return !!(personal.dob && personal.nationality && personal.residency) && !savingPersonal;
      case 'identity':
        return READY_STATES.includes(groupState(status, 'identity'));
      case 'selfie':
        return READY_STATES.includes(groupState(status, 'selfie'));
      default:
        return true;
    }
  };

  // ---------------------------------------------------------------- pieces
  const typeSelector = (types: KYCDocumentType[], value: KYCDocumentType, onChange: (v: KYCDocumentType) => void) => (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          className={cn(
            'px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors',
            value === type
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-400',
          )}
        >
          {t(`docTypes.${type}`)}
          {docs[type] && <Check className="inline w-3.5 h-3.5 ms-1.5" />}
        </button>
      ))}
    </div>
  );

  const stepHeader = (title: string, desc?: string) => (
    <div className="text-center mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
      {desc && <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">{desc}</p>}
    </div>
  );

  const selectClass = (hasError?: string) =>
    cn(
      'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
      'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
      hasError ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600',
    );

  const fieldError = (msg?: string) =>
    msg ? (
      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
        <AlertTriangle className="w-4 h-4" />
        {msg}
      </p>
    ) : null;

  const renderStep = () => {
    switch (currentId) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            {stepHeader(t('wizard.intro.title'), t('wizard.intro.desc'))}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{t('wizard.intro.timeNote')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('wizard.intro.needTitle')}</h3>
              <div className="space-y-3">
                {[
                  { icon: FileText, title: t('wizard.intro.needId'), desc: t('wizard.intro.needIdDesc') },
                  { icon: Camera, title: t('wizard.intro.needSelfie'), desc: t('wizard.intro.needSelfieDesc') },
                  { icon: MapPin, title: t('wizard.intro.needAddress'), desc: t('wizard.intro.needAddressDesc') },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Icon className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('wizard.intro.processing')}</p>
          </div>
        );

      case 'personal':
        return (
          <div>
            {stepHeader(t('wizard.personal.title'), t('wizard.personal.desc'))}
            <div className="max-w-md mx-auto space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('wizard.personal.dob')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={personal.dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setPersonal((p) => ({ ...p, dob: e.target.value }));
                      setPersonalErrors((er) => ({ ...er, dob: '' }));
                    }}
                    className={cn(selectClass(personalErrors.dob), 'ps-10')}
                  />
                </div>
                {fieldError(personalErrors.dob)}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('wizard.personal.dobHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('wizard.personal.nationality')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={personal.nationality}
                  onChange={(e) => {
                    setPersonal((p) => ({ ...p, nationality: e.target.value }));
                    setPersonalErrors((er) => ({ ...er, nationality: '' }));
                  }}
                  className={selectClass(personalErrors.nationality)}
                >
                  <option value="">{t('wizard.personal.nationalityPlaceholder')}</option>
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {fieldError(personalErrors.nationality)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('wizard.personal.residency')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={personal.residency}
                  onChange={(e) => {
                    setPersonal((p) => ({ ...p, residency: e.target.value }));
                    setPersonalErrors((er) => ({ ...er, residency: '' }));
                  }}
                  className={selectClass(personalErrors.residency)}
                >
                  <option value="">{t('wizard.personal.residencyPlaceholder')}</option>
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {fieldError(personalErrors.residency)}
              </div>
              {personalErrors.form && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                  {personalErrors.form}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 shrink-0" />
                {t('wizard.personal.privacy')}
              </p>
            </div>
          </div>
        );

      case 'identity': {
        const descKey = identityType === 'passport' ? 'passportDesc' : identityType === 'national_id' ? 'nationalIdDesc' : 'drivingDesc';
        return (
          <div>
            {stepHeader(t('wizard.identity.title'), t('wizard.identity.desc'))}
            <div className="max-w-xl mx-auto space-y-4">
              {typeSelector(IDENTITY_TYPES, identityType, setIdentityType)}
              <DocumentUpload
                key={identityType}
                title={t(`docTypes.${identityType}`)}
                description={t(`wizard.identity.${descKey}`)}
                requirements={[t('wizard.identity.req1'), t('wizard.identity.req2'), t('wizard.identity.req3'), t('wizard.identity.req4')]}
                document={docs[identityType]}
                uploading={!!uploading[identityType]}
                error={docErrors[identityType]}
                onUpload={(file) => upload(identityType, file, IDENTITY_TYPES).catch(() => undefined)}
                onRemove={docs[identityType] ? () => remove(docs[identityType] as KYCServerDocument) : undefined}
              />
            </div>
          </div>
        );
      }

      case 'address': {
        const available = ADDRESS_TYPES.filter((type) => type !== 'proof_of_address' || docs[type]);
        return (
          <div>
            {stepHeader(t('wizard.address.title'), t('wizard.address.desc'))}
            <div className="max-w-xl mx-auto space-y-4">
              {typeSelector(available, addressType, setAddressType)}
              <DocumentUpload
                key={addressType}
                title={t(`docTypes.${addressType}`)}
                description={addressType === 'bank_statement' ? t('wizard.address.bankDesc') : t('wizard.address.utilityDesc')}
                requirements={[t('wizard.address.req1'), t('wizard.address.req2'), t('wizard.address.req3')]}
                document={docs[addressType]}
                uploading={!!uploading[addressType]}
                error={docErrors[addressType]}
                onUpload={(file) => upload(addressType, file, ADDRESS_TYPES).catch(() => undefined)}
                onRemove={docs[addressType] ? () => remove(docs[addressType] as KYCServerDocument) : undefined}
              />
            </div>
          </div>
        );
      }

      case 'selfie': {
        const selfie = docs.selfie;
        const rejected = selfie && ['rejected', 'resubmission_required', 'expired'].includes(selfie.status);
        return (
          <div>
            {stepHeader(t('wizard.selfie.title'), t('wizard.selfie.desc'))}
            {rejected && selfie?.rejection_reason && (
              <div className="max-w-lg mx-auto mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                <strong>{t('upload.rejectedReason')}</strong> {selfie.rejection_reason}
              </div>
            )}
            <LivenessVerification
              key={selfie?.id || 'new'}
              existingSelfieUrl={selfie && !rejected ? selfie.file_url : null}
              onCaptured={(file) => upload('selfie', file)}
            />
          </div>
        );
      }

      case 'review': {
        const groups = status.completion_status.groups;
        const optional = status.completion_status.optional_groups;
        const docFor = (types: KYCDocumentType[]) => types.map((type) => docs[type]).find(Boolean);
        const row = (label: string, value: string, ok: boolean) => (
          <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
            <span className={cn('text-sm font-medium text-end', ok ? 'text-slate-900 dark:text-white' : 'text-amber-600')}>
              {value}
            </span>
          </div>
        );
        return (
          <div>
            {stepHeader(t('wizard.review.title'), t('wizard.review.desc'))}
            <div className="max-w-xl mx-auto space-y-5">
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('wizard.review.personal')}
                </h3>
                {row(t('wizard.review.dob'), personal.dob ? fmtDate(personal.dob) : t('wizard.review.missing'), !!personal.dob)}
                {row(t('wizard.review.nationality'), personal.nationality ? localizedCountryName(personal.nationality, lang) : t('wizard.review.missing'), !!personal.nationality)}
                {row(t('wizard.review.residency'), personal.residency ? localizedCountryName(personal.residency, lang) : t('wizard.review.missing'), !!personal.residency)}
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('wizard.review.documents')}
                </h3>
                {[...groups, ...optional].map((g) => {
                  const doc = docFor(g.types);
                  const isOptional = optional.includes(g);
                  const value = doc ? `${t(`docTypes.${doc.document_type}`)} · ${t(`docStatus.${doc.status}`)}` : isOptional ? t('wizard.review.optional') : t('wizard.review.missing');
                  return (
                    <React.Fragment key={g.key}>
                      {row(t(`groups.${g.key}`), value, READY_STATES.includes(g.state) || isOptional)}
                    </React.Fragment>
                  );
                })}
              </div>

              {submitError && (
                <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {submitError.message}
                  </p>
                  {submitError.steps.length > 0 && (
                    <ul className="mt-2 ms-6 list-disc text-sm text-red-700 dark:text-red-300 space-y-1">
                      {submitError.steps.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">{t('wizard.review.consent')}</p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={submit}
                disabled={submitting || !status.completion_status.can_submit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    {t('wizard.review.submitting')}
                  </>
                ) : (
                  t('wizard.review.submit')
                )}
              </Button>
              {!status.completion_status.can_submit && !submitError && (
                <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc ms-5 space-y-1">
                  {status.completion_status.next_steps
                    .filter((s) => s.step !== 'submit')
                    .map((s) => (
                      <li key={s.step}>{t(`steps.${s.step}`, { defaultValue: s.title })}</li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        );
      }
    }
  };

  const BackIcon = lang.startsWith('ar') ? ChevronRight : ChevronLeft;
  const NextIcon = lang.startsWith('ar') ? ChevronLeft : ChevronRight;

  return (
    <div className={cn('w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 sm:p-8', className)}>
      {/* Step indicator */}
      <ol className="flex items-center justify-between gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.id} className="flex items-center flex-1 last:flex-none min-w-0">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i >= step}
                className="flex flex-col items-center gap-1 shrink-0"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors',
                    active || done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400',
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </span>
                <span className={cn('text-[11px] leading-tight text-center', active ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500 hidden sm:block')}>
                  {t(`wizard.steps.${s.id}`)}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className={cn('flex-1 h-0.5 mx-1.5 rounded', done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700')} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="min-h-[360px]">{renderStep()}</div>

      {currentId !== 'review' && (
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={goBack} className={cn('flex items-center gap-1', step === 0 && 'invisible')}>
            <BackIcon className="w-4 h-4" />
            {t('wizard.back')}
          </Button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('wizard.stepOf', { current: step + 1, total: STEPS.length })}
          </span>
          <Button variant="primary" onClick={goNext} disabled={!canProceed()} className="flex items-center gap-1">
            {savingPersonal && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentId === 'address' && !docs[addressType] ? t('wizard.skip') : t('wizard.next')}
            <NextIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
      {currentId === 'review' && (
        <div className="flex pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={goBack} className="flex items-center gap-1">
            <BackIcon className="w-4 h-4" />
            {t('wizard.back')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default KYCWizard;
