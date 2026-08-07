<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

class SendCustomerEmailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $toEmail,
        public string $customerName,
        public string $subject,
        public string $html,
        public string $text,
        public string $type,
        public array $context = []
    ) {}

    public function handle(): void
    {
        if (config('mail.default') === 'log') {
            Log::info('Customer booking mail', [
                ...$this->context,
                'email' => $this->toEmail,
                'subject' => $this->subject,
                'type' => $this->type,
            ]);
            return;
        }

        $mail = new PHPMailer(true);

        try {
            $this->configureTransport($mail);

            $fromAddress = config('mail.from.address') ?: 'no-reply@localhost';
            $fromName = config('mail.from.name') ?: config('app.name', 'Rehanshi');

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($this->toEmail, $this->customerName ?: 'Customer');
            $mail->Subject = $this->subject;
            $mail->isHTML(true);
            $mail->Body = $this->html;
            $mail->AltBody = $this->text;
            $mail->send();
        } catch (MailerException $exception) {
            Log::error('Customer booking mail failed', [
                ...$this->context,
                'email' => $this->toEmail,
                'error' => $exception->getMessage(),
                'type' => $this->type,
            ]);
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

        $scheme = config('mail.mailers.smtp.scheme') ?: config('mail.mailers.smtp.encryption');
        if ($scheme) {
            $mail->SMTPSecure = (string) $scheme;
        }
    }
}
