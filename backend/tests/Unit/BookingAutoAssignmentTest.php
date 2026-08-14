<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Models\Partner;
use App\Models\Service;
use App\Models\ServiceLocation;
use App\Models\ServicePackage;
use App\Models\Setting;
use App\Models\SubService;
use App\Support\BookingAutoAssignmentManager;
use App\Support\BookingCustomerMailer;
use App\Support\WalletManager;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BookingAutoAssignmentTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->createSchema();

        $this->mock(WalletManager::class, function ($mock) {
            $mock->shouldReceive('syncBooking')->andReturnNull();
        });

        $this->mock(BookingCustomerMailer::class, function ($mock) {
            $mock->shouldReceive('sendStatusUpdate')->andReturnNull();
            $mock->shouldReceive('sendBookingConfirmation')->andReturnNull();
            $mock->shouldReceive('sendPaymentReceipt')->andReturnNull();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('vendor_jobs');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('partners');
        Schema::dropIfExists('service_locations');
        Schema::dropIfExists('service_packages');
        Schema::dropIfExists('sub_services');
        Schema::dropIfExists('services');
        Schema::dropIfExists('settings');

        parent::tearDown();
    }

    private function createSchema(): void
    {
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('vendor_jobs');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('partners');
        Schema::dropIfExists('service_locations');
        Schema::dropIfExists('service_packages');
        Schema::dropIfExists('sub_services');
        Schema::dropIfExists('services');
        Schema::dropIfExists('settings');

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group')->nullable();
            $table->string('key');
            $table->text('value')->nullable();
            $table->string('type')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('name');
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('sub_services', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_id')->nullable();
            $table->string('name');
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('service_packages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_id')->nullable();
            $table->unsignedBigInteger('sub_service_id')->nullable();
            $table->string('category_key')->nullable();
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('service_locations', function (Blueprint $table) {
            $table->id();
            $table->string('city')->nullable();
            $table->string('area')->nullable();
            $table->string('pincode')->nullable();
            $table->string('availability')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('status')->default('Active');
            $table->string('kyc_status')->default('Pending');
            $table->string('availability')->default('Available');
            $table->decimal('rating', 3, 2)->nullable();
            $table->json('services')->nullable();
            $table->json('service_ids')->nullable();
            $table->json('sub_service_ids')->nullable();
            $table->string('area')->nullable();
            $table->string('city')->nullable();
            $table->string('pincode')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_no')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->string('service_name');
            $table->unsignedBigInteger('service_id')->nullable();
            $table->unsignedBigInteger('service_package_id')->nullable();
            $table->text('address')->nullable();
            $table->unsignedBigInteger('partner_id')->nullable();
            $table->string('professional_name')->nullable();
            $table->string('status')->default('Pending');
            $table->string('payment_status')->default('Pending');
            $table->string('payment_method')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->json('timeline')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('job_no')->nullable();
            $table->unsignedBigInteger('partner_id')->nullable();
            $table->unsignedBigInteger('service_id')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('service_name')->nullable();
            $table->text('address')->nullable();
            $table->string('slot')->nullable();
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('status')->nullable();
            $table->string('next_action')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('channel')->nullable();
            $table->string('audience')->nullable();
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('status')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    private function setAutoSettings(array $values): void
    {
        $defaults = [
            'auto_approve' => '0',
            'enabled' => '0',
            'delay_minutes' => '0',
            'match_area' => '0',
        ];

        foreach ([...$defaults, ...$values] as $key => $value) {
            Setting::updateOrCreate(
                ['group' => 'auto_assignment', 'key' => $key],
                ['value' => (string) $value, 'type' => is_numeric($value) ? 'number' : 'boolean']
            );
        }
    }

    private function seedCatalog(): array
    {
        $service = Service::query()->create([
            'name' => 'AC Service',
            'status' => 'Active',
        ]);

        $subService = SubService::query()->create([
            'service_id' => $service->id,
            'name' => 'Split AC Service',
            'status' => 'Active',
        ]);

        $otherSub = SubService::query()->create([
            'service_id' => $service->id,
            'name' => 'Window AC Service',
            'status' => 'Active',
        ]);

        $package = ServicePackage::query()->create([
            'service_id' => $service->id,
            'sub_service_id' => $subService->id,
            'category_key' => 'service',
            'name' => 'Split AC Service Lite',
            'price' => 499,
            'status' => 'Active',
        ]);

        ServiceLocation::query()->create([
            'city' => 'Lucknow',
            'area' => 'Hazratganj',
            'pincode' => '226001',
            'availability' => 'Available',
            'status' => 'Active',
        ]);

        ServiceLocation::query()->create([
            'city' => 'Lucknow',
            'area' => 'Aliganj',
            'pincode' => '226024',
            'availability' => 'Available',
            'status' => 'Active',
        ]);

        return compact('service', 'subService', 'otherSub', 'package');
    }

    private function makePartner(array $overrides = []): Partner
    {
        return Partner::query()->create(array_merge([
            'name' => 'Vendor One',
            'phone' => '9000000001',
            'status' => 'Active',
            'kyc_status' => 'Approved',
            'availability' => 'Available',
            'rating' => 4.5,
            'service_ids' => [],
            'sub_service_ids' => [],
            'city' => 'Lucknow',
            'area' => 'Hazratganj',
            'pincode' => '226001',
        ], $overrides));
    }

    private function makeBooking(array $catalog, array $overrides = []): Booking
    {
        $package = $catalog['package'];

        return Booking::query()->create(array_merge([
            'booking_no' => 'BK-'.uniqid(),
            'customer_name' => 'Test Customer',
            'customer_phone' => '9800000000',
            'service_name' => $package->name,
            'service_id' => $package->service_id,
            'service_package_id' => $package->id,
            'address' => 'Flat 1, Hazratganj, Lucknow 226001',
            'status' => 'Pending Approval',
            'payment_status' => 'Pending',
            'payment_method' => 'cod',
            'amount' => 499,
            'timeline' => ['Booking placed'],
            'metadata' => [
                'items' => [[
                    'id' => $package->id,
                    'service_package_id' => $package->id,
                    'service_id' => $package->service_id,
                    'name' => $package->name,
                    'quantity' => 1,
                ]],
                'service_address' => [
                    'city' => 'Lucknow',
                    'street' => 'Hazratganj',
                    'pincode' => '226001',
                ],
                'approval' => ['status' => 'pending'],
            ],
            'created_at' => now()->subMinutes(5),
            'updated_at' => now()->subMinutes(5),
        ], $overrides));
    }

    public function test_both_on_approves_and_assigns(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['auto_approve' => '1', 'enabled' => '1', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog);
        $result = app(BookingAutoAssignmentManager::class)->processDueBookings();

        $booking->refresh();
        $this->assertSame(1, $result['approved']);
        $this->assertSame(1, $result['assigned']);
        $this->assertSame('Professional Assigned', $booking->status);
        $this->assertNotNull($booking->partner_id);
    }

    public function test_auto_approve_off_does_not_assign_pending(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['auto_approve' => '0', 'enabled' => '1', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog);
        app(BookingAutoAssignmentManager::class)->processDueBookings();
        $booking->refresh();

        $this->assertSame('Pending Approval', $booking->status);
        $this->assertNull($booking->partner_id);

        $booking->update([
            'status' => 'Accepted',
            'metadata' => [
                ...($booking->metadata ?? []),
                'approval' => [
                    'status' => 'accepted',
                    'accepted_at' => now()->subMinutes(2)->toDateTimeString(),
                ],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->processDueBookings();
        $booking->refresh();

        $this->assertSame('Professional Assigned', $booking->status);
        $this->assertNotNull($booking->partner_id);
    }

    public function test_auto_assign_off_approves_but_leaves_unassigned(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['auto_approve' => '1', 'enabled' => '0', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog);
        app(BookingAutoAssignmentManager::class)->processDueBookings();
        $booking->refresh();

        $this->assertSame('Accepted', $booking->status);
        $this->assertNull($booking->partner_id);
    }

    public function test_both_off_keeps_manual_flow(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['auto_approve' => '0', 'enabled' => '0', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog);
        $result = app(BookingAutoAssignmentManager::class)->processDueBookings();
        $booking->refresh();

        $this->assertSame(0, $result['approved']);
        $this->assertSame(0, $result['assigned']);
        $this->assertSame('Pending Approval', $booking->status);
        $this->assertNull($booking->partner_id);
    }

    public function test_vendor_without_exact_subservice_is_not_assigned(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['auto_approve' => '1', 'enabled' => '1', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['otherSub']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();

        $this->assertNull($booking->partner_id);
        $this->assertSame('Accepted', $booking->status);
    }

    public function test_inactive_and_busy_vendors_are_not_assigned(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '0']);
        $this->makePartner([
            'status' => 'Inactive',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);
        $this->makePartner([
            'name' => 'Busy Vendor',
            'phone' => '9000000099',
            'availability' => 'Busy',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();
        $this->assertNull($booking->partner_id);
    }

    public function test_exact_pincode_vendor_gets_priority(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '0', 'match_area' => '0']);

        $this->makePartner([
            'name' => 'Nearby Vendor',
            'pincode' => '226024',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
            'rating' => 5,
        ]);
        $exact = $this->makePartner([
            'name' => 'Exact Vendor',
            'phone' => '9000000002',
            'pincode' => '226001',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
            'rating' => 3,
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();

        $this->assertSame($exact->id, $booking->partner_id);
    }

    public function test_nearby_pincode_vendor_can_be_assigned(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '0', 'match_area' => '0']);
        $nearby = $this->makePartner([
            'pincode' => '226024',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();

        $this->assertSame($nearby->id, $booking->partner_id);
    }

    public function test_no_vendor_keeps_approved_unassigned_for_retry(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '0']);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();
        $this->assertSame('Accepted', $booking->status);
        $this->assertNull($booking->partner_id);

        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking->fresh());
        $booking->refresh();
        $this->assertSame('Professional Assigned', $booking->status);
    }

    public function test_concurrent_assignment_only_assigns_once(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '0']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);
        $this->makePartner([
            'name' => 'Vendor Two',
            'phone' => '9000000003',
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->subMinutes(5)->toDateTimeString()],
            ],
        ]);

        $manager = app(BookingAutoAssignmentManager::class);
        $first = $manager->assignIfPossible($booking);
        $second = $manager->assignIfPossible($booking->fresh());

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(1, Booking::whereKey($booking->id)->whereNotNull('partner_id')->count());
    }

    public function test_assignment_respects_delay(): void
    {
        $catalog = $this->seedCatalog();
        $this->setAutoSettings(['enabled' => '1', 'delay_minutes' => '5']);
        $this->makePartner([
            'sub_service_ids' => [$catalog['subService']->id],
            'service_ids' => [$catalog['service']->id],
        ]);

        $booking = $this->makeBooking($catalog, [
            'status' => 'Accepted',
            'created_at' => now(),
            'updated_at' => now(),
            'metadata' => [
                'items' => [['id' => $catalog['package']->id, 'service_id' => $catalog['service']->id]],
                'service_address' => ['city' => 'Lucknow', 'pincode' => '226001'],
                'approval' => ['status' => 'accepted', 'accepted_at' => now()->toDateTimeString()],
            ],
        ]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking);
        $booking->refresh();
        $this->assertNull($booking->partner_id);

        $metadata = $booking->metadata;
        $metadata['approval']['accepted_at'] = now()->subMinutes(6)->toDateTimeString();
        $booking->update(['metadata' => $metadata]);

        app(BookingAutoAssignmentManager::class)->assignIfPossible($booking->fresh());
        $booking->refresh();
        $this->assertNotNull($booking->partner_id);
    }
}
