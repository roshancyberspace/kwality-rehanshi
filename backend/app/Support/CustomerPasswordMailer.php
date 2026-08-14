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
