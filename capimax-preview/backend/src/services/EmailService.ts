import nodemailer from 'nodemailer';
import logger, { LoggerService } from '../utils/logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static async initialize(): Promise<void> {
    try {
      // Configure transporter based on environment
      if (process.env.SENDGRID_API_KEY) {
        // SendGrid configuration
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
      } else {
        // SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  private static async sendEmail(
    to: string, 
    template: EmailTemplate, 
    from?: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const mailOptions = {
        from: from || process.env.EMAIL_FROM || 'noreply@capimax.com',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      LoggerService.logUserAction('system', 'email_sent', {
        to,
        subject: template.subject,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendVerificationEmail(
    email: string, 
    firstName: string, 
    verificationToken: string
  ): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const template: EmailTemplate = {
      subject: 'Verify Your Capimax Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Capimax!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for registering with Capimax Real Estate Tokenization Platform.</p>
              <p>To complete your registration and start investing in tokenized real estate, please verify your email address by clicking the button below:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              
              <p>This verification link will expire in 24 hours.</p>
              
              <p>If you didn't create this account, you can safely ignore this email.</p>
              
              <p>Best regards,<br>The Capimax Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Capimax. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Capimax!
        
        Hello ${firstName},
        
        Thank you for registering with Capimax Real Estate Tokenization Platform.
        
        To complete your registration, please verify your email address by visiting:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create this account, you can safely ignore this email.
        
        Best regards,
        The Capimax Team
      `
    };

    return this.sendEmail(email, template);
  }

  static async sendPasswordResetEmail(
    email: string, 
    firstName: string, 
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const template: EmailTemplate = {
      subject: 'Reset Your Capimax Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #dc2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We received a request to reset the password for your Capimax account.</p>
              
              <div class="warning">
                <strong>Important:</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p>To reset your password, click the button below:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              
              <p>This reset link will expire in 1 hour for security reasons.</p>
              
              <p>Best regards,<br>The Capimax Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Capimax. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hello ${firstName},
        
        We received a request to reset the password for your Capimax account.
        
        To reset your password, visit:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you did not request this password reset, please ignore this email.
        
        Best regards,
        The Capimax Team
      `
    };

    return this.sendEmail(email, template);
  }

  static async sendWelcomeEmail(
    email: string, 
    firstName: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: 'Welcome to Capimax - Start Your Real Estate Investment Journey!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Capimax</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 10px 5px;
            }
            .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { margin: 15px 0; padding: 10px; border-left: 4px solid #10b981; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Capimax!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Congratulations! Your email has been verified and your Capimax account is now active.</p>
              
              <p>You're now part of the future of real estate investment. With Capimax, you can:</p>
              <ul>
                <li>🏠 Invest in premium real estate properties</li>
                <li>💰 Earn passive income through rental yields</li>
                <li>📈 Benefit from property appreciation</li>
                <li>🔗 Trade tokenized real estate on the blockchain</li>
                <li>📊 Track your portfolio performance in real-time</li>
              </ul>
              
              <div class="steps">
                <h3>Next Steps to Start Investing:</h3>
                <div class="step">
                  <strong>1. Complete KYC Verification</strong><br>
                  Upload your identification documents to comply with regulations.
                </div>
                <div class="step">
                  <strong>2. Browse Properties</strong><br>
                  Explore our curated selection of investment-grade properties.
                </div>
                <div class="step">
                  <strong>3. Make Your First Investment</strong><br>
                  Start with as little as $100 and build your real estate portfolio.
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/properties" class="button">Browse Properties</a>
              </div>
              
              <p>If you have any questions, our support team is here to help. Reply to this email or contact us through the platform.</p>
              
              <p>Happy investing!<br>The Capimax Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Capimax. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Capimax!
        
        Hello ${firstName},
        
        Congratulations! Your email has been verified and your Capimax account is now active.
        
        You're now part of the future of real estate investment. With Capimax, you can:
        - Invest in premium real estate properties
        - Earn passive income through rental yields
        - Benefit from property appreciation
        - Trade tokenized real estate on the blockchain
        - Track your portfolio performance in real-time
        
        Next Steps:
        1. Complete KYC Verification
        2. Browse Properties
        3. Make Your First Investment
        
        Visit your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
        
        Happy investing!
        The Capimax Team
      `
    };

    return this.sendEmail(email, template);
  }

  static async sendKYCApprovalEmail(
    email: string, 
    firstName: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: '✅ KYC Approved - You Can Now Invest!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>KYC Approved</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .success { background: #ecfdf5; padding: 20px; border-radius: 8px; border: 1px solid #10b981; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 KYC Verification Complete!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${firstName}!</h2>
              
              <div class="success">
                <h3>✅ Your identity verification has been approved!</h3>
                <p>You can now access all Capimax investment features and start building your real estate portfolio.</p>
              </div>
              
              <p>Now that you're fully verified, you can:</p>
              <ul>
                <li>💎 Invest in premium tokenized properties</li>
                <li>💰 Receive dividend payments from rental income</li>
                <li>🔄 Buy and sell property tokens on the secondary market</li>
                <li>📊 Access detailed property analytics and reports</li>
                <li>🏆 Participate in exclusive investment opportunities</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/properties" class="button">Start Investing Now</a>
              </div>
              
              <p>Thank you for choosing Capimax for your real estate investment journey. We're excited to help you build wealth through tokenized real estate.</p>
              
              <p>Best regards,<br>The Capimax Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Capimax. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return this.sendEmail(email, template);
  }

  static async sendInvestmentConfirmationEmail(
    email: string,
    firstName: string,
    propertyName: string,
    tokenAmount: number,
    investmentAmount: number,
    transactionHash?: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Investment Confirmed - ${propertyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Investment Confirmed</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .content { padding: 20px; background: #f9fafb; }
            .investment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Investment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Great news! Your investment has been successfully processed and confirmed.</p>
              
              <div class="investment-details">
                <h3>Investment Details</h3>
                <div class="detail-row">
                  <span><strong>Property:</strong></span>
                  <span>${propertyName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Tokens Purchased:</strong></span>
                  <span>${tokenAmount.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Investment Amount:</strong></span>
                  <span>$${investmentAmount.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${new Date().toLocaleDateString()}</span>
                </div>
                ${transactionHash ? `
                <div class="detail-row">
                  <span><strong>Transaction Hash:</strong></span>
                  <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${transactionHash}</span>
                </div>
                ` : ''}
              </div>
              
              <p>Your property tokens have been added to your portfolio and you'll start receiving rental income distributions according to the property's payment schedule.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/investments" class="button">View Your Portfolio</a>
              </div>
              
              <p>Thank you for investing with Capimax!</p>
              
              <p>Best regards,<br>The Capimax Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Capimax. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return this.sendEmail(email, template);
  }
}