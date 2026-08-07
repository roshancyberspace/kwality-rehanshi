<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('content');
            $table->string('status', 50)->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        DB::table('pages')->insert([
            [
                'title' => 'Privacy Policy',
                'slug' => 'privacy-policy',
                'content' => '<h2 class="text-xl font-bold text-[#003F86] mt-4 mb-3">1. Overview</h2>
<p class="mb-4 text-blue-900 leading-7">At Rehanshi, protecting your privacy and personal information is our core commitment. This Privacy Policy outlines our practices regarding data gathering, utilization, retention, and sharing when you visit our marketplace website or request home services.</p>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">2. Information We Collect</h2>
<p class="mb-2 text-blue-900 leading-7">We collect information to deliver reliable, safe, and transparent home services. The types of data we collect include:</p>
<ul class="list-disc list-inside space-y-2 mb-4 text-blue-900">
  <li><strong>Account &amp; Profile Data:</strong> Name, phone number, email address, and saved address locations provided during sign-up or booking.</li>
  <li><strong>Service &amp; Booking Details:</strong> Service schedules, repair notes, chosen packages, instructions for service technicians, and transaction history.</li>
  <li><strong>Location Information:</strong> Service delivery addresses and geolocation data needed to connect you with verified professionals in Lucknow and operational zones.</li>
</ul>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">3. How We Use Your Information</h2>
<p class="mb-4 text-blue-900 leading-7">We leverage your collected personal information strictly to operate and enhance our service delivery, match your requests with verified professionals, facilitate order tracking, prevent fraud, and continuously optimize pricing transparency.</p>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">4. Data Sharing &amp; Security</h2>
<p class="mb-4 text-blue-900 leading-7">We respect your privacy and never sell or monetize your individual profile information to advertisers. Relevant contact numbers and address details are shared exclusively with the assigned background-checked technician to fulfill your booking.</p>',
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Terms & Conditions',
                'slug' => 'terms-and-condition',
                'content' => '<h2 class="text-xl font-bold text-[#003F86] mt-4 mb-3">1. Acceptance of Terms</h2>
<p class="mb-4 text-blue-900 leading-7">By accessing our website, initiating a booking, or engaging with services provided through Rehanshi, you explicitly accept and agree to be bound by these Terms &amp; Conditions. If you do not agree to any clause in this policy, please refrain from using our marketplace platform.</p>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">2. Description of Service</h2>
<p class="mb-4 text-blue-900 leading-7">KwalityCareoperates as a digital service marketplace enabling homeowners and commercial establishments to discover and book verified, background-checked independent service professionals for AC repair, appliance care, salon at home, deep cleaning, electrical works, and everyday repairs.</p>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">3. Transparent Pricing &amp; Payments</h2>
<ul class="list-disc list-inside space-y-2 mb-4 text-blue-900">
  <li><strong>Standard Package Rates:</strong> Published prices on our catalog cover defined repair diagnoses, maintenance routines, or fixed-scope installations without hidden surprises.</li>
  <li><strong>Spare Parts &amp; Consumables:</strong> If diagnosis requires replacement components or specialized wiring not covered in standard booking inclusions, technician estimates will be communicated for customer approval prior to installation.</li>
  <li><strong>Payment Settlement:</strong> Payments can be settled via online digital mechanisms, cards, or cash directly upon satisfactory completion of assigned milestones.</li>
</ul>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">4. 30-Day Service Warranty</h2>
<p class="mb-4 text-blue-900 leading-7">Eligible repairs and service interventions include a standard 30-day labor guarantee. Should identical operational issues re-occur within 30 days of completion, a rework technician will be assigned without additional labor service fee charges.</p>
<h2 class="text-xl font-bold text-[#003F86] mt-6 mb-3">5. Limitation of Liability &amp; Jurisdiction</h2>
<p class="mb-4 text-blue-900 leading-7">Our liability is limited to professional re-performance of the booked service or refund of verified labor fees. These Terms &amp; Conditions are governed by municipal laws and fall under the exclusive jurisdiction of the courts located in Lucknow, Uttar Pradesh.</p>',
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
