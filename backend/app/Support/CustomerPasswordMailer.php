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

        $mail = new PHPMailer(true);

        try {
            $this->configureTransport($mail);

            $fromAddress = config('mail.from.address') ?: 'no-reply@localhost';
            $fromName = config('mail.from.name') ?: config('app.name', 'Rehanshi');

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($toEmail, $customerName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $this->htmlBody($customerName, $otp, $intro, $footer);
            $mail->AltBody = "{$intro} {$otp}. {$footer}";
            $mail->send();
        } catch (MailerException $exception) {
            Log::error("Customer {$context} OTP mail failed", [
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
