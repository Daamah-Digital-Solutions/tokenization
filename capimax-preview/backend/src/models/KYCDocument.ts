import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DocumentType, DocumentStatus } from '../types';
import { User } from './User';

export interface KYCDocumentAttributes {
  id: string;
  userId: string;
  documentType: DocumentType;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  verificationNotes?: string;
  expiryDate?: Date;
  documentNumber?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  confidenceScore?: number;
  ocrData?: any;
  verificationData?: any;
  issuingCountry?: string;
  issuingAuthority?: string;
  extractedData?: any;
  securityFeatures?: any;
  biometricData?: any;
  livenessCheckPassed?: boolean;
  duplicateCheck?: boolean;
  sanctionsCheck?: boolean;
  pepsCheck?: boolean;
  adverseMediaCheck?: boolean;
  riskScore?: number;
  complianceFlags?: string[];
  processingLogs?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCDocumentCreationAttributes extends Optional<KYCDocumentAttributes,
  'id' | 'status' | 'verificationNotes' | 'expiryDate' | 'documentNumber' | 
  'verifiedBy' | 'verifiedAt' | 'rejectionReason' | 'confidenceScore' | 'ocrData' |
  'verificationData' | 'issuingCountry' | 'issuingAuthority' | 'extractedData' |
  'securityFeatures' | 'biometricData' | 'livenessCheckPassed' | 'duplicateCheck' |
  'sanctionsCheck' | 'pepsCheck' | 'adverseMediaCheck' | 'riskScore' |
  'complianceFlags' | 'processingLogs' | 'createdAt' | 'updatedAt'> {}

export class KYCDocument extends Model<KYCDocumentAttributes, KYCDocumentCreationAttributes> implements KYCDocumentAttributes {
  public id!: string;
  public userId!: string;
  public documentType!: DocumentType;
  public filePath!: string;
  public fileName!: string;
  public fileSize!: number;
  public mimeType!: string;
  public status!: DocumentStatus;
  public verificationNotes?: string;
  public expiryDate?: Date;
  public documentNumber?: string;
  public verifiedBy?: string;
  public verifiedAt?: Date;
  public rejectionReason?: string;
  public confidenceScore?: number;
  public ocrData?: any;
  public verificationData?: any;
  public issuingCountry?: string;
  public issuingAuthority?: string;
  public extractedData?: any;
  public securityFeatures?: any;
  public biometricData?: any;
  public livenessCheckPassed?: boolean;
  public duplicateCheck?: boolean;
  public sanctionsCheck?: boolean;
  public pepsCheck?: boolean;
  public adverseMediaCheck?: boolean;
  public riskScore?: number;
  public complianceFlags?: string[];
  public processingLogs?: any[];
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: User;
  public verifier?: User;

  // Virtual fields
  public get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  public get daysToExpiry(): number | null {
    if (!this.expiryDate) return null;
    const diffTime = this.expiryDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public get overallRiskLevel(): 'low' | 'medium' | 'high' {
    if (!this.riskScore) return 'medium';
    if (this.riskScore < 30) return 'low';
    if (this.riskScore < 70) return 'medium';
    return 'high';
  }

  public get verificationStatus(): {
    isVerified: boolean;
    isPending: boolean;
    isRejected: boolean;
    needsReview: boolean;
  } {
    return {
      isVerified: this.status === DocumentStatus.APPROVED,
      isPending: this.status === DocumentStatus.PENDING,
      isRejected: this.status === DocumentStatus.REJECTED,
      needsReview: this.status === DocumentStatus.IN_REVIEW
    };
  }

  // Instance methods
  public async approve(verifierId: string, notes?: string): Promise<void> {
    this.status = DocumentStatus.APPROVED;
    this.verifiedBy = verifierId;
    this.verifiedAt = new Date();
    if (notes) {
      this.verificationNotes = notes;
    }
    this.addProcessingLog('approved', { verifierId, notes });
    await this.save();
  }

  public async reject(verifierId: string, reason: string, notes?: string): Promise<void> {
    this.status = DocumentStatus.REJECTED;
    this.verifiedBy = verifierId;
    this.verifiedAt = new Date();
    this.rejectionReason = reason;
    if (notes) {
      this.verificationNotes = notes;
    }
    this.addProcessingLog('rejected', { verifierId, reason, notes });
    await this.save();
  }

  public async markForReview(notes?: string): Promise<void> {
    this.status = DocumentStatus.IN_REVIEW;
    if (notes) {
      this.verificationNotes = notes;
    }
    this.addProcessingLog('marked_for_review', { notes });
    await this.save();
  }

  public async updateOCRData(ocrResults: any): Promise<void> {
    this.ocrData = ocrResults;
    this.extractedData = this.parseOCRData(ocrResults);
    this.addProcessingLog('ocr_processed', { confidence: ocrResults.confidence });
    await this.save();
  }

  public async updateVerificationData(verificationResults: any): Promise<void> {
    this.verificationData = verificationResults;
    this.confidenceScore = verificationResults.confidence || 0;
    this.securityFeatures = verificationResults.securityFeatures;
    this.addProcessingLog('verification_processed', { confidence: this.confidenceScore });
    await this.save();
  }

  public async runComplianceChecks(): Promise<void> {
    // This would integrate with external compliance services
    const checks = await this.performComplianceChecks();
    
    this.sanctionsCheck = checks.sanctionsCheck;
    this.pepsCheck = checks.pepsCheck;
    this.adverseMediaCheck = checks.adverseMediaCheck;
    this.riskScore = checks.riskScore;
    this.complianceFlags = checks.flags;
    
    this.addProcessingLog('compliance_checks', checks);
    await this.save();
  }

  private addProcessingLog(action: string, data: any): void {
    if (!this.processingLogs) {
      this.processingLogs = [];
    }
    
    this.processingLogs.push({
      action,
      timestamp: new Date(),
      data
    });
  }

  private parseOCRData(ocrResults: any): any {
    // Extract structured data from OCR results based on document type
    const extracted: any = {};
    
    if (this.documentType === DocumentType.PASSPORT) {
      extracted.documentNumber = this.extractField(ocrResults, ['passport_number', 'document_number']);
      extracted.firstName = this.extractField(ocrResults, ['first_name', 'given_name']);
      extracted.lastName = this.extractField(ocrResults, ['last_name', 'surname']);
      extracted.dateOfBirth = this.extractField(ocrResults, ['date_of_birth', 'birth_date']);
      extracted.expiryDate = this.extractField(ocrResults, ['expiry_date', 'expiration_date']);
      extracted.nationality = this.extractField(ocrResults, ['nationality', 'country']);
    } else if (this.documentType === DocumentType.NATIONAL_ID) {
      extracted.idNumber = this.extractField(ocrResults, ['id_number', 'national_id']);
      extracted.firstName = this.extractField(ocrResults, ['first_name', 'given_name']);
      extracted.lastName = this.extractField(ocrResults, ['last_name', 'surname']);
      extracted.dateOfBirth = this.extractField(ocrResults, ['date_of_birth']);
      extracted.address = this.extractField(ocrResults, ['address']);
    }
    
    return extracted;
  }

  private extractField(ocrResults: any, fieldNames: string[]): string | null {
    for (const fieldName of fieldNames) {
      if (ocrResults[fieldName]) {
        return ocrResults[fieldName];
      }
    }
    return null;
  }

  private async performComplianceChecks(): Promise<any> {
    // Mock compliance check results
    // In production, this would integrate with actual compliance services
    return {
      sanctionsCheck: true,
      pepsCheck: true,
      adverseMediaCheck: true,
      riskScore: Math.floor(Math.random() * 100),
      flags: []
    };
  }

  public toSafeJSON(): Partial<KYCDocumentAttributes> {
    const safeData = { ...this.toJSON() };
    
    // Remove sensitive fields for non-admin users
    delete (safeData as any).filePath;
    delete (safeData as any).ocrData;
    delete (safeData as any).verificationData;
    delete (safeData as any).biometricData;
    delete (safeData as any).processingLogs;
    
    return safeData;
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<KYCDocument[]> {
    return KYCDocument.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  public static async findPendingReviews(): Promise<KYCDocument[]> {
    return KYCDocument.findAll({
      where: { 
        status: [DocumentStatus.PENDING, DocumentStatus.IN_REVIEW] 
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'ASC']]
    });
  }

  public static async getKYCStatus(userId: string): Promise<{
    overallStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
    documents: any[];
    livenessCheck?: any;
    complianceScore: number;
    missingDocuments: DocumentType[];
  }> {
    const documents = await KYCDocument.findByUserId(userId);
    const requiredDocs = [DocumentType.PASSPORT, DocumentType.UTILITY_BILL];
    
    const documentsByType = documents.reduce((acc, doc) => {
      acc[doc.documentType] = doc;
      return acc;
    }, {} as any);

    const missingDocuments = requiredDocs.filter(type => !documentsByType[type]);
    
    const approvedDocs = documents.filter(doc => doc.status === DocumentStatus.APPROVED);
    const rejectedDocs = documents.filter(doc => doc.status === DocumentStatus.REJECTED);
    const pendingDocs = documents.filter(doc => 
      doc.status === DocumentStatus.PENDING || doc.status === DocumentStatus.IN_REVIEW
    );

    let overallStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
    
    if (rejectedDocs.length > 0) {
      overallStatus = 'rejected';
    } else if (missingDocuments.length > 0 || pendingDocs.length > 0) {
      if (pendingDocs.some(doc => doc.status === DocumentStatus.IN_REVIEW)) {
        overallStatus = 'in_review';
      } else {
        overallStatus = 'pending';
      }
    } else if (approvedDocs.length >= requiredDocs.length) {
      overallStatus = 'approved';
    } else {
      overallStatus = 'pending';
    }

    const avgRiskScore = documents.reduce((sum, doc) => sum + (doc.riskScore || 50), 0) / documents.length;

    return {
      overallStatus,
      documents: documents.map(doc => doc.toSafeJSON()),
      complianceScore: Math.round(100 - avgRiskScore),
      missingDocuments
    };
  }
}

// Initialize the model
KYCDocument.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    documentType: {
      type: DataTypes.ENUM(...Object.values(DocumentType)),
      allowNull: false,
      field: 'document_type'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path'
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
      validate: {
        min: 0
      }
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DocumentStatus)),
      defaultValue: DocumentStatus.PENDING
    },
    verificationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'verification_notes'
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiry_date'
    },
    documentNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'document_number'
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason'
    },
    confidenceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'confidence_score',
      validate: {
        min: 0,
        max: 100
      }
    },
    ocrData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ocr_data'
    },
    verificationData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'verification_data'
    },
    issuingCountry: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'issuing_country'
    },
    issuingAuthority: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'issuing_authority'
    },
    extractedData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'extracted_data'
    },
    securityFeatures: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'security_features'
    },
    biometricData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'biometric_data'
    },
    livenessCheckPassed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'liveness_check_passed'
    },
    duplicateCheck: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'duplicate_check'
    },
    sanctionsCheck: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'sanctions_check'
    },
    pepsCheck: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'peps_check'
    },
    adverseMediaCheck: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'adverse_media_check'
    },
    riskScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'risk_score',
      validate: {
        min: 0,
        max: 100
      }
    },
    complianceFlags: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'compliance_flags'
    },
    processingLogs: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'processing_logs'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    modelName: 'KYCDocument',
    tableName: 'kyc_documents',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['document_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['verified_by']
      },
      {
        fields: ['created_at']
      },
      {
        unique: true,
        fields: ['user_id', 'document_type']
      }
    ]
  }
);

// Define associations
KYCDocument.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});

KYCDocument.belongsTo(User, { 
  foreignKey: 'verifiedBy', 
  as: 'verifier',
  onDelete: 'SET NULL'
});