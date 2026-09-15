<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

class CustomerPasswordMailer
{
    public function sendOtp(string $toEmail, string $customerName, string $otp): void
    {
        $this->send(
            $toEmail,
            $customerName,
            $otp,
            'Your KwalityCare password reset OTP',
            'Use this OTP to reset your KwalityCare account password:',
            'This OTP expires in 10 minutes. If you did not request a password reset, you can ignore this email.',
            'password_reset'
        );
    }

    public function sendLoginOtp(string $toEmail, string $customerName, string $otp): void
    {
        $this->send(
            $toEmail,
            $customerName,
            $otp,
            'Your KwalityCare login OTP',
            'Use this OTP to log in to your KwalityCare account:',
            'This OTP expires in 10 minutes. If you did not request this login, you can ignore this email.',
            'login'
        );
    }

    public function sendGuestCartOtp(string $toEmail, string $customerName, string $otp): void
    {
        $this->send(
            $toEmail,
            $customerName,
            $otp,
            'Your KwalityCare verification OTP',
            'Use this OTP to continue checkout on KwalityCare:',
            'This OTP expires in 10 minutes. If you did not request this, you can ignore this email.',
            'guest_cart'
        );
    }

    public function sendSignupOtp(string $toEmail, string $customerName, string $otp): void
    {
        $this->send(
            $toEmail,
            $customerName,
            $otp,
            'Your KwalityCare registration OTP',
            'Use this OTP to complete your KwalityCare account registration:',
            'This OTP expires in 10 minutes. If you did not request this registration, you can ignore this email.',
            'signup'
        );
    }

    public function sendSupportTicketAcknowledgement(
        string $toEmail,
        string $customerName,
        string $ticketNo,
        string $subject,
        string $issueType
    ): void {
        $safeName = e($customerName ?: 'Customer');
        $safeTicket = e($ticketNo);
        $safeSubject = e($subject);
        $safeType = e($issueType);

        $html = <<<HTML
            <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
                <p>Hi {$safeName},</p>
                <p>We have received your support ticket. Our team will review it shortly.</p>
                <p><strong>Ticket number:</strong> {$safeTicket}</p>
                <p><strong>Issue type:</strong> {$safeType}</p>
                <p><strong>Title:</strong> {$safeSubject}</p>
                <p>Please keep this ticket number for future reference.</p>
                <p>— KwalityCare Support</p>
            </div>
        HTML;

        $this->sendHtml(
            $toEmail,
            $customerName,
            "Ticket raised: {$ticketNo}",
            $html,
            "Your KwalityCare support ticket {$ticketNo} has been raised for \"{$subject}\". Issue type: {$issueType}.",
            'support_ticket'
        );
    }

    public function sendContactInquiryCustomerConfirmation(
        string $toEmail,
        string $customerName,
        string $ticketNo,
        string $queryType,
        string $phone,
        string $message
    ): void {
        $safeName = e($customerName ?: 'Valued Customer');
        $safeTicket = e($ticketNo);
        $safeType = e($queryType ?: 'General Inquiry');
        $safePhone = e($phone);
        $safeMessage = nl2br(e($message));
        $year = date('Y');

        $html = <<<HTML
            <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; color: #1e293b;">
                <div style="background: linear-gradient(135deg, #003F86 0%, #0054A6 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">KwalityCare Support</h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #e2e8f0;">Your Trusted Home Service Partner</p>
                </div>
                <div style="padding: 28px 24px;">
                    <h2 style="margin: 0 0 12px; font-size: 18px; color: #003F86;">Thank You for Reaching Out!</h2>
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                        Hi <strong>{$safeName}</strong>,<br>
                        We have successfully received your inquiry. Our support team is reviewing your message and will connect with you shortly.
                    </p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                        <h3 style="margin: 0 0 12px; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Inquiry Details</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Reference ID:</strong></td>
                                <td style="padding: 6px 0; color: #003F86; font-weight: 700;">{$safeTicket}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><strong>Subject / Type:</strong></td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{$safeType}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><strong>Contact Phone:</strong></td>
                                <td style="padding: 6px 0; color: #0f172a;">{$safePhone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; vertical-align: top;"><strong>Message:</strong></td>
                                <td style="padding: 6px 0; color: #334155; line-height: 1.5;">{$safeMessage}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="margin: 16px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                        Please keep your Reference ID (<strong>{$safeTicket}</strong>) for any future follow-up regarding this request.
                    </p>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #475569;">
                        Warm regards,<br>
                        <strong>KwalityCare Support Team</strong>
                    </div>
                </div>
                <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
                    &copy; {$year} KwalityCare. All rights reserved. Transparent pricing &bull; Trained professionals &bull; Quality assured
                </div>
            </div>
        HTML;

        $alt = "Hi {$customerName}, thank you for contacting KwalityCare. We received your query (Ticket #{$ticketNo}). Type: {$queryType}. Phone: {$phone}. Message: {$message}. Our team will get back to you shortly.";

        $this->sendHtml(
            $toEmail,
            $customerName,
            "We received your inquiry [Ticket #{$ticketNo}] - KwalityCare Support",
            $html,
            $alt,
            'contact_inquiry_customer'
        );
    }

    public function sendContactInquiryAdminNotification(
        string $adminEmail,
        string $customerName,
        string $customerEmail,
        string $customerPhone,
        string $ticketNo,
        string $queryType,
        string $message
    ): void {
        $safeName = e($customerName ?: 'Customer');
        $safeEmail = e($customerEmail);
        $safePhone = e($customerPhone);
        $safeTicket = e($ticketNo);
        $safeType = e($queryType ?: 'General Inquiry');
        $safeMessage = nl2br(e($message));
        $now = now()->format('d M Y, h:i A');

        $html = <<<HTML
            <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; color: #1e293b;">
                <div style="background: #0f172a; padding: 22px 24px; text-align: center; color: #ffffff;">
                    <div style="display: inline-block; background: #67B529; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 12px; margin-bottom: 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                        New Contact Inquiry
                    </div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Contact Form Submission</h1>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Ticket #{$safeTicket}</p>
                </div>
                <div style="padding: 24px;">
                    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
                        A new customer query has been submitted via the Contact Us form on the website.
                    </p>

                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; width: 130px; background: #f1f5f9;">Ticket ID</td>
                            <td style="padding: 10px 14px; color: #003F86; font-weight: 700;">{$safeTicket}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9;">Customer Name</td>
                            <td style="padding: 10px 14px; color: #0f172a; font-weight: 700;">{$safeName}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9;">Email</td>
                            <td style="padding: 10px 14px;"><a href="mailto:{$safeEmail}" style="color: #0066FF; text-decoration: none; font-weight: 600;">{$safeEmail}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9;">Phone</td>
                            <td style="padding: 10px 14px;"><a href="tel:{$safePhone}" style="color: #0066FF; text-decoration: none; font-weight: 600;">{$safePhone}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9;">Query Type</td>
                            <td style="padding: 10px 14px; color: #0f172a; font-weight: 600;">{$safeType}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9; vertical-align: top;">Message</td>
                            <td style="padding: 10px 14px; color: #334155; line-height: 1.6;">{$safeMessage}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 14px; color: #64748b; font-weight: 600; background: #f1f5f9;">Submitted At</td>
                            <td style="padding: 10px 14px; color: #64748b;">{$now}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 20px; text-align: center;">
                        <a href="mailto:{$safeEmail}?subject=Re:%20Inquiry%20[Ticket%20%23{$safeTicket}]" style="display: inline-block; background: #003F86; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 700;">
                            Reply to Customer
                        </a>
                    </div>
                </div>
            </div>
        HTML;

        $alt = "New Contact Inquiry from {$customerName} ({$customerEmail}, {$customerPhone}). Ticket #{$ticketNo}. Type: {$queryType}. Message: {$message}. Submitted at {$now}.";

        $this->sendHtml(
            $adminEmail,
            'Admin',
            "🔔 New Contact Inquiry: {$safeType} [Ticket #{$ticketNo}] - {$customerName}",
            $html,
            $alt,
            'contact_inquiry_admin'
        );
    }

    public function sendCampaign(string $toEmail, string $recipientName, string $subject, string $message, ?string $imageUrl = null): void
    {
        $safeName = e($recipientName ?: 'Customer');
        $safeMessage = nl2br(e($message));
        $imageHtml = '';
        if ($imageUrl) {
            $safeImage = e($imageUrl);
            $imageHtml = "<p style=\"margin:16px 0 0;\"><img src=\"{$safeImage}\" alt=\"\" style=\"max-width:100%;border-radius:8px;\" /></p>";
        }

        $html = <<<HTML
            <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
                <p>Hi {$safeName},</p>
                <p>{$safeMessage}</p>
                {$imageHtml}
                <p>— KwalityCare</p>
            </div>
        HTML;

        $this->sendHtml(
            $toEmail,
            $recipientName,
            $subject,
            $html,
            $message,
            'campaign'
        );
    }

    private function send(
        string $toEmail,
        string $customerName,
        string $otp,
        string $subject,
        string $intro,
        string $footer,
        string $context
    ): void {
        if (config('mail.default') === 'log') {
            Log::info("Customer {$context} OTP", [
                'email' => $toEmail,
                'otp' => $otp,
            ]);

            return;
        }

        $this->deliverMail(
            $toEmail,
            $customerName,
            $subject,
            $this->htmlBody($customerName, $otp, $intro, $footer),
            "{$intro} {$otp}. {$footer}",
            $context
        );
    }

    private function sendHtml(
        string $toEmail,
        string $customerName,
        string $subject,
        string $htmlBody,
        string $altBody,
        string $context
    ): void {
        if (config('mail.default') === 'log') {
            Log::info("Customer {$context} mail", [
                'email' => $toEmail,
                'subject' => $subject,
            ]);

            return;
        }

        $this->deliverMail($toEmail, $customerName, $subject, $htmlBody, $altBody, $context);
    }

    private function deliverMail(
        string $toEmail,
        string $customerName,
        string $subject,
        string $htmlBody,
        string $altBody,
        string $context
    ): void {
        $mail = new PHPMailer(true);

        try {
            $this->configureTransport($mail);

            $fromAddress = config('mail.from.address') ?: 'no-reply@localhost';
            $fromName = config('mail.from.name') ?: config('app.name', 'Rehanshi');

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($toEmail, $customerName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $htmlBody;
            $mail->AltBody = $altBody;
            $mail->send();
        } catch (MailerException $exception) {
            Log::error("Customer {$context} mail failed", [
                'email' => $toEmail,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    private function configureTransport(PHPMailer $mail): void
    {
        if (config('mail.default') !== 'smtp') {
            $mail->isMail();

            return;
        }

        $mail->isSMTP();
        $mail->Host = (string) config('mail.mailers.smtp.host');
        $mail->Port = (int) config('mail.mailers.smtp.port');
        $mail->SMTPAuth = filled(config('mail.mailers.smtp.username'));
        $mail->Username = (string) config('mail.mailers.smtp.username');
        $mail->Password = (string) config('mail.mailers.smtp.password');

        $encryption = config('mail.mailers.smtp.encryption');
        if ($encryption) {
            $mail->SMTPSecure = (string) $encryption;
        }
    }

    private function htmlBody(string $customerName, string $otp, string $intro, string $footer): string
    {
        $safeName = e($customerName ?: 'Customer');
        $safeOtp = e($otp);
        $safeIntro = e($intro);
        $safeFooter = e($footer);

        return <<<HTML
            <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
                <p>Hi {$safeName},</p>
                <p>{$safeIntro}</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{$safeOtp}</p>
                <p>{$safeFooter}</p>
            </div>
        HTML;
    }
}
