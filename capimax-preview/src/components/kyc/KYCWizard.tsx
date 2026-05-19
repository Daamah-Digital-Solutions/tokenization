import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Camera,
  MapPin,
  Shield,
  Check,
  AlertTriangle,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar
} from 'lucide-react';
import { DocumentUpload, type UploadedFile } from './DocumentUpload';
import { LivenessVerification, type LivenessResult } from './LivenessVerification';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';

interface KYCWizardProps {
  onComplete?: (data: KYCData) => void;
  onStepChange?: (step: number) => void;
  initialStep?: number;
  userType?: 'investor' | 'property_owner' | 'broker';
  className?: string;
}

export interface KYCData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    residencyCountry: string;
  };
  documents: {
    passport?: UploadedFile;
    nationalId?: UploadedFile;
    utilityBill?: UploadedFile;
    bankStatement?: UploadedFile;
  };
  liveness: LivenessResult | null;
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  submittedAt: Date;
}

type KYCStep = 'intro' | 'personal-info' | 'identity-docs' | 'address-docs' | 'liveness' | 'review' | 'complete';

interface StepConfig {
  id: KYCStep;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
}

const STEPS: StepConfig[] = [
  {
    id: 'intro',
    title: 'Introduction',
    description: 'KYC requirements overview',
    icon: Shield,
    required: true
  },
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Date of birth & nationality',
    icon: User,
    required: true
  },
  {
    id: 'identity-docs',
    title: 'Identity Verification',
    description: 'Upload government-issued ID',
    icon: FileText,
    required: true
  },
  {
    id: 'address-docs',
    title: 'Address Verification',
    description: 'Proof of residence',
    icon: MapPin,
    required: true
  },
  {
    id: 'liveness',
    title: 'Liveness Check',
    description: 'Live selfie verification',
    icon: Camera,
    required: true
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Final verification review',
    icon: Check,
    required: true
  }
];

const DOCUMENT_REQUIREMENTS = {
  investor: {
    identity: ['Passport', 'National ID', 'Driver License'],
    address: ['Utility Bill', 'Bank Statement', 'Government Letter'],
    additional: []
  },
  property_owner: {
    identity: ['Passport', 'National ID'],
    address: ['Utility Bill', 'Bank Statement'],
    additional: ['Business Registration', 'Tax Documents']
  },
  broker: {
    identity: ['Passport', 'National ID'],
    address: ['Utility Bill', 'Bank Statement'],
    additional: ['Professional License', 'Certification']
  }
};

export const KYCWizard: React.FC<KYCWizardProps> = ({
  onComplete,
  onStepChange,
  initialStep = 0,
  userType = 'investor',
  className
}) => {
  const { state: authState } = useAuth();
  const user = authState.user;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [kycData, setKYCData] = useState<Partial<KYCData>>({
    personalInfo: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      dateOfBirth: '',
      nationality: '',
      residencyCountry: user?.country || ''
    },
    documents: {},
    liveness: null,
    verificationStatus: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [personalInfoErrors, setPersonalInfoErrors] = useState<Record<string, string>>({});

  const currentStepConfig = STEPS[currentStep];
  const requirements = DOCUMENT_REQUIREMENTS[userType];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  };

  /**
   * Upload a KYC document to the real backend.
   *
   * Previously this used setTimeout + Math.random() to fake approval/rejection.
   * That created the dangerous illusion of KYC working without sending any
   * actual document to the compliance pipeline.
   *
   * Now: POST /kyc/documents/upload/ with multipart form data. The document
   * starts in `pending` status server-side; the UI shows it as `processing`
   * until an admin or automated check transitions it. Polling for status is
   * out of scope for this method — the review step refreshes /kyc/status/.
   */
  const handleDocumentUpload = async (documentType: string, file: File) => {
    setLoading(true);

    // Optimistic UI: show the file immediately in "processing" state.
    const optimisticFile: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadDate: new Date(),
      status: 'processing',
    };
    setKYCData(prev => ({
      ...prev,
      documents: { ...prev.documents, [documentType]: optimisticFile },
    }));

    try {
      const { KYCService } = await import('../../services/user/KYCService');

      // Map UI-side document keys to backend DocumentType choices.
      const documentTypeMap: Record<string, string> = {
        passport: 'passport',
        nationalId: 'national_id',
        utilityBill: 'utility_bill',
        bankStatement: 'bank_statement',
      };
      const backendDocType = documentTypeMap[documentType] || documentType;

      const uploaded = await KYCService.uploadDocument({
        file,
        document_type: backendDocType as any,
      });

      // Reflect the backend's status verbatim. The backend uses lowercase
      // strings ('pending', 'approved', 'rejected', etc.). If the type is
      // unknown, fall back to 'processing' so the UI doesn't lie about it.
      const backendStatus = (uploaded as any)?.status || 'processing';
      setKYCData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: {
            ...optimisticFile,
            status: backendStatus === 'approved' ? 'approved'
                  : backendStatus === 'rejected' ? 'rejected'
                  : 'processing',
            rejectionReason: (uploaded as any)?.rejection_reason || undefined,
          },
        },
      }));
    } catch (apiError: any) {
      console.error('KYC document upload failed:', apiError);
      // Surface the failure so the user knows the upload didn't go through.
      setKYCData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: {
            ...optimisticFile,
            status: 'rejected',
            rejectionReason:
              apiError?.message || 'Upload failed. Please try again.',
          },
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentRemove = (documentType: string) => {
    setKYCData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: undefined
      }
    }));
  };

  const handleLivenessComplete = (result: LivenessResult) => {
    setKYCData(prev => ({
      ...prev,
      liveness: result
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 1. Save personal info (including DOB) to /kyc/personal-info/. If this
      //    fails we MUST abort the submission — proceeding with stale DOB
      //    creates a compliance hole. The earlier version of this code logged
      //    the error and continued, which is exactly what the audit flagged.
      const personalInfo = kycData.personalInfo;
      if (personalInfo?.dateOfBirth) {
        const { apiClient } = await import('../../services/api/ApiClient');
        await apiClient.patch('/kyc/personal-info/', {
          date_of_birth: personalInfo.dateOfBirth,
          nationality: personalInfo.nationality,
          residency_country: personalInfo.residencyCountry,
        });
      }

      // 2. Submit the KYC profile for review. The backend transitions
      //    status PENDING → IN_REVIEW and queues the compliance workflow.
      const { KYCService } = await import('../../services/user/KYCService');
      await KYCService.submitForReview();

      const completeData: KYCData = {
        personalInfo: {
          firstName: user?.first_name || personalInfo?.firstName || '',
          lastName: user?.last_name || personalInfo?.lastName || '',
          dateOfBirth: personalInfo?.dateOfBirth || '',
          nationality: personalInfo?.nationality || '',
          residencyCountry: personalInfo?.residencyCountry || ''
        },
        documents: kycData.documents || {},
        liveness: kycData.liveness || null,
        verificationStatus: 'processing',
        submittedAt: new Date()
      };

      onComplete?.(completeData);
      setCurrentStep(STEPS.length);

    } catch (error) {
      setErrors({ submit: 'Failed to submit KYC data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const validatePersonalInfo = (): boolean => {
    const errors: Record<string, string> = {};
    const info = kycData.personalInfo;

    if (!info?.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      // Validate age is at least 18
      const today = new Date();
      const birthDate = new Date(info.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old to use this platform';
      }
      if (birthDate > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (!info?.nationality?.trim()) {
      errors.nationality = 'Nationality is required';
    }

    if (!info?.residencyCountry?.trim()) {
      errors.residencyCountry = 'Country of residence is required';
    }

    setPersonalInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canProceedToNext = (): boolean => {
    switch (STEPS[currentStep].id) {
      case 'intro':
        return true;
      case 'personal-info':
        return validatePersonalInfo();
      case 'identity-docs':
        return !!(kycData.documents?.passport || kycData.documents?.nationalId);
      case 'address-docs':
        return !!(kycData.documents?.utilityBill || kycData.documents?.bankStatement);
      case 'liveness':
        return !!kycData.liveness;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                isActive && 'border-emerald-500 bg-emerald-500 text-white',
                isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                !isActive && !isCompleted && 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <StepIcon className="w-5 h-5" />
              )}
            </div>
            
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 ml-2 transition-all duration-200',
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderIntroStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <Shield className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Identity Verification Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            To comply with regulations and protect our platform, we need to verify your identity.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Important Information
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              This process typically takes 5-10 minutes and requires access to your camera and valid identification documents.
              Your information is encrypted and securely stored.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          What you'll need:
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Government-issued ID
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {requirements.identity.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Proof of Address
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {requirements.address.join(', ')} (issued within 3 months)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Camera className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Live Selfie
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Real-time photo to verify your identity
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
          <Clock className="w-4 h-4" />
          Processing Time
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Most verifications are processed within 24 hours. You'll receive email updates on your status.
        </p>
      </div>
    </motion.div>
  );

  const renderPersonalInfoStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Personal Information
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Please provide your date of birth and nationality for verification
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Date of Birth */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={kycData.personalInfo?.dateOfBirth || ''}
              onChange={(e) => {
                setKYCData(prev => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo!,
                    dateOfBirth: e.target.value
                  }
                }));
                if (personalInfoErrors.dateOfBirth) {
                  setPersonalInfoErrors(prev => ({ ...prev, dateOfBirth: '' }));
                }
              }}
              className={cn(
                'w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                'transition-all duration-200',
                personalInfoErrors.dateOfBirth
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-slate-300 dark:border-slate-600'
              )}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          {personalInfoErrors.dateOfBirth && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {personalInfoErrors.dateOfBirth}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You must be at least 18 years old to invest on this platform
          </p>
        </div>

        {/* Nationality */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nationality <span className="text-red-500">*</span>
          </label>
          <select
            value={kycData.personalInfo?.nationality || ''}
            onChange={(e) => {
              setKYCData(prev => ({
                ...prev,
                personalInfo: {
                  ...prev.personalInfo!,
                  nationality: e.target.value
                }
              }));
              if (personalInfoErrors.nationality) {
                setPersonalInfoErrors(prev => ({ ...prev, nationality: '' }));
              }
            }}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'transition-all duration-200',
              personalInfoErrors.nationality
                ? 'border-red-300 dark:border-red-600'
                : 'border-slate-300 dark:border-slate-600'
            )}
          >
            <option value="">Select your nationality</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="AE">United Arab Emirates</option>
            <option value="SA">Saudi Arabia</option>
            <option value="EG">Egypt</option>
            <option value="JO">Jordan</option>
            <option value="LB">Lebanon</option>
            <option value="KW">Kuwait</option>
            <option value="QA">Qatar</option>
            <option value="BH">Bahrain</option>
            <option value="OM">Oman</option>
            <option value="OTHER">Other</option>
          </select>
          {personalInfoErrors.nationality && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {personalInfoErrors.nationality}
            </p>
          )}
        </div>

        {/* Country of Residence */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Country of Residence <span className="text-red-500">*</span>
          </label>
          <select
            value={kycData.personalInfo?.residencyCountry || ''}
            onChange={(e) => {
              setKYCData(prev => ({
                ...prev,
                personalInfo: {
                  ...prev.personalInfo!,
                  residencyCountry: e.target.value
                }
              }));
              if (personalInfoErrors.residencyCountry) {
                setPersonalInfoErrors(prev => ({ ...prev, residencyCountry: '' }));
              }
            }}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'transition-all duration-200',
              personalInfoErrors.residencyCountry
                ? 'border-red-300 dark:border-red-600'
                : 'border-slate-300 dark:border-slate-600'
            )}
          >
            <option value="">Select your country of residence</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="AE">United Arab Emirates</option>
            <option value="SA">Saudi Arabia</option>
            <option value="EG">Egypt</option>
            <option value="JO">Jordan</option>
            <option value="LB">Lebanon</option>
            <option value="KW">Kuwait</option>
            <option value="QA">Qatar</option>
            <option value="BH">Bahrain</option>
            <option value="OM">Oman</option>
            <option value="OTHER">Other</option>
          </select>
          {personalInfoErrors.residencyCountry && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {personalInfoErrors.residencyCountry}
            </p>
          )}
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <Shield className="w-4 h-4 inline mr-1" />
          Your personal information is encrypted and securely stored in compliance with data protection regulations.
        </p>
      </div>
    </motion.div>
  );

  const renderIdentityDocsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Upload Identity Documents
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Please upload a clear photo of your government-issued identification
        </p>
      </div>

      <div className="space-y-6">
        <DocumentUpload
          documentType="passport"
          title="Passport"
          description="Upload a clear photo of your passport (preferred)"
          requirements={[
            'Full document must be visible',
            'All text must be readable',
            'No glare or shadows',
            'Valid and not expired'
          ]}
          onUpload={(file) => handleDocumentUpload('passport', file)}
          onRemove={() => handleDocumentRemove('passport')}
          uploadedFile={kycData.documents?.passport}
          loading={loading}
          error={errors.passport}
        />

        <div className="text-center">
          <span className="px-4 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm rounded-full">
            OR
          </span>
        </div>

        <DocumentUpload
          documentType="id"
          title="National ID / Driver License"
          description="Upload front and back of your national ID or driver license"
          requirements={[
            'Both sides clearly visible',
            'All text must be readable',
            'Valid and not expired',
            'Government-issued only'
          ]}
          onUpload={(file) => handleDocumentUpload('nationalId', file)}
          onRemove={() => handleDocumentRemove('nationalId')}
          uploadedFile={kycData.documents?.nationalId}
          loading={loading}
          error={errors.nationalId}
        />
      </div>
    </motion.div>
  );

  const renderAddressDocsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Verify Your Address
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Upload a document that shows your current residential address
        </p>
      </div>

      <div className="space-y-6">
        <DocumentUpload
          documentType="utility_bill"
          title="Utility Bill"
          description="Recent utility bill (electricity, water, gas, internet)"
          requirements={[
            'Issued within the last 3 months',
            'Your name and address visible',
            'Official company letterhead',
            'All text clearly readable'
          ]}
          acceptedFormats={['image/jpeg', 'image/png', 'application/pdf']}
          onUpload={(file) => handleDocumentUpload('utilityBill', file)}
          onRemove={() => handleDocumentRemove('utilityBill')}
          uploadedFile={kycData.documents?.utilityBill}
          loading={loading}
          error={errors.utilityBill}
        />

        <div className="text-center">
          <span className="px-4 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm rounded-full">
            OR
          </span>
        </div>

        <DocumentUpload
          documentType="bank_statement"
          title="Bank Statement"
          description="Recent bank statement showing your address"
          requirements={[
            'Issued within the last 3 months',
            'Your name and address visible',
            'Official bank letterhead',
            'Account details can be redacted'
          ]}
          acceptedFormats={['image/jpeg', 'image/png', 'application/pdf']}
          onUpload={(file) => handleDocumentUpload('bankStatement', file)}
          onRemove={() => handleDocumentRemove('bankStatement')}
          uploadedFile={kycData.documents?.bankStatement}
          loading={loading}
          error={errors.bankStatement}
        />
      </div>
    </motion.div>
  );

  const renderLivenessStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <LivenessVerification
        onComplete={handleLivenessComplete}
        loading={loading}
        error={errors.liveness}
      />
    </motion.div>
  );

  const renderReviewStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Review Your Information
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Please review all uploaded documents before submission
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h3>
          <div className="space-y-3">
            {kycData.personalInfo?.dateOfBirth && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">
                  Date of Birth: {new Date(kycData.personalInfo.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            )}
            {kycData.personalInfo?.nationality && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">
                  Nationality: {kycData.personalInfo.nationality}
                </span>
              </div>
            )}
            {kycData.personalInfo?.residencyCountry && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">
                  Country of Residence: {kycData.personalInfo.residencyCountry}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Identity Documents */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Identity Verification
          </h3>
          <div className="space-y-3">
            {kycData.documents?.passport && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">Passport uploaded</span>
              </div>
            )}
            {kycData.documents?.nationalId && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">National ID uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Address Documents */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Address Verification
          </h3>
          <div className="space-y-3">
            {kycData.documents?.utilityBill && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">Utility bill uploaded</span>
              </div>
            )}
            {kycData.documents?.bankStatement && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">Bank statement uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Liveness Verification */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Liveness Verification
          </h3>
          {kycData.liveness ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">
                Live selfie captured (Confidence: {(kycData.liveness.livenessScore * 100).toFixed(1)}%)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium">Liveness verification not completed</span>
            </div>
          )}
        </div>
      </div>

      {errors.submit && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {errors.submit}
          </span>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={loading}
        disabled={loading}
      >
        {loading ? 'Submitting KYC...' : 'Submit for Review'}
      </Button>
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
        <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          KYC Submitted Successfully!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Your identity verification has been submitted for review
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
        <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
          What's Next?
        </h3>
        <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-2 text-left">
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Review process typically takes 24-48 hours
          </li>
          <li className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Our compliance team will verify your documents
          </li>
          <li className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            You'll receive email updates on your verification status
          </li>
        </ul>
      </div>

      <Button
        onClick={() => console.log('Navigate to dashboard')}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Continue to Dashboard
      </Button>
    </motion.div>
  );

  const renderCurrentStep = () => {
    switch (STEPS[currentStep]?.id) {
      case 'intro':
        return renderIntroStep();
      case 'personal-info':
        return renderPersonalInfoStep();
      case 'identity-docs':
        return renderIdentityDocsStep();
      case 'address-docs':
        return renderAddressDocsStep();
      case 'liveness':
        return renderLivenessStep();
      case 'review':
        return renderReviewStep();
      default:
        return renderCompleteStep();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8', className)}
    >
      {/* Progress Bar */}
      {currentStep < STEPS.length && renderProgressBar()}

      {/* Step Content */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {currentStep < STEPS.length && currentStepConfig.id !== 'liveness' && (
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            size="lg"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              'flex items-center gap-2',
              currentStep === 0 && 'invisible'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            disabled={!canProceedToNext() || currentStepConfig.id === 'review'}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};