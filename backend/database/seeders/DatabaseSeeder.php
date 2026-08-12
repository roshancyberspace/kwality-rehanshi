<?php

namespace Database\Seeders;

use App\Models\AppContent;
use App\Models\AdminNotification;
use App\Models\AdminUser;
use App\Models\BookingLedger;
use App\Models\Booking;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CustomerProfile;
use App\Models\Partner;
use App\Models\Payment;
use App\Models\Role;
use App\Models\Service;
use App\Models\ServiceLocation;
use App\Models\ServicePackage;
use App\Models\ServicePackageSection;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\SavedAddress;
use App\Models\VendorJob;
use App\Models\VendorWallet;
use App\Models\WalletTransaction;
use App\Support\WalletManager;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')]
        );

        $brandLogos = [
            'LG' => 'https://logo.clearbit.com/lg.com',
            'VOLTAS' => 'https://logo.clearbit.com/voltas.com',
            'Haier' => 'https://logo.clearbit.com/haier.com',
            'HITACHI' => 'https://logo.clearbit.com/hitachi.com',
            'Panasonic' => 'https://logo.clearbit.com/panasonic.com',
            'Mitsubishi Electric' => 'https://logo.clearbit.com/mitsubishielectric.com',
            'Blue Star' => 'https://logo.clearbit.com/bluestarindia.com',
            'Daikin' => 'https://logo.clearbit.com/daikin.com',
            'SAMSUNG' => 'https://logo.clearbit.com/samsung.com',
            'Godrej' => 'https://logo.clearbit.com/godrej.com',
            'TOSHIBA' => 'https://logo.clearbit.com/toshiba.com',
            'Whirlpool' => 'https://logo.clearbit.com/whirlpool.com',
        ];

        foreach (array_keys($brandLogos) as $index => $brandName) {
            Brand::updateOrCreate(
                ['name' => $brandName],
                ['logo' => $brandLogos[$brandName], 'sort_order' => $index + 1, 'status' => 'Active']
            );
        }

        $permissionsFor = fn (array $modules, array $actions) => collect($modules)
            ->flatMap(fn ($module) => collect($actions)->map(fn ($action) => $module.'.'.$action))
            ->values()
            ->all();

        Role::updateOrCreate(['slug' => 'super-admin'], ['name' => 'Super Admin', 'permissions' => ['*'], 'status' => 'Active']);
        Role::updateOrCreate(['slug' => 'manager'], ['name' => 'Manager', 'permissions' => $permissionsFor(['Dashboard', 'Reports', 'Profiles', 'Customers', 'Saved Addresses', 'Partners', 'Documents', 'Vendor Jobs', 'Categories', 'Services', 'Sub-Services', 'Service Packages', 'Bookings', 'Assign Professional', 'Reviews', 'Support Tickets', 'Notifications'], ['view', 'create', 'edit', 'assign']), 'status' => 'Active']);
        Role::updateOrCreate(['slug' => 'finance-manager'], ['name' => 'Finance Manager', 'permissions' => $permissionsFor(['Dashboard', 'Reports', 'Profiles', 'Bookings', 'Payments', 'Payouts', 'Vendor Wallet', 'Customer Wallet', 'Wallet Transactions', 'Booking Ledger'], ['view', 'approve', 'export']), 'status' => 'Active']);

        $serviceCatalog = [
            ["Women's Salon & Spa", 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80', null, 'Rs. 299', '45-120 mins', '4.8', 'Doorstep beauty care by trained salon professionals using hygienic tools and branded products.', ['Haircut and styling', 'Facial and cleanup', 'Waxing and threading', 'Manicure and pedicure']],
            ["Men's Salon & Massage", 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=80', null, 'Rs. 199', '30-90 mins', '4.7', 'Grooming, haircut, shaving, and relaxation services delivered at home with clean kits.', ['Haircut and beard trim', 'Head massage', 'Face cleanup', 'Body massage']],
            ['Cleaning', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', null, 'Rs. 499', '60-240 mins', '4.9', 'Deep cleaning for rooms, bathrooms, kitchens, and furniture with professional equipment.', ['Bathroom deep cleaning', 'Kitchen degreasing', 'Sofa shampooing', 'Full home cleaning']],
            ['Painting & Water proofing', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80', 'New', 'Free visit', 'Site based', '4.6', 'Wall painting, texture work, seepage treatment, and waterproofing after expert inspection.', ['Interior painting', 'Wall texture', 'Dampness repair', 'Terrace waterproofing']],
            ['AC & Appliance Repair', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80', '46 mins', 'Rs. 249', '45-120 mins', '4.8', 'Quick diagnosis, repair, installation, and maintenance for ACs and common home appliances.', ['AC service and gas refill', 'Washing machine repair', 'Refrigerator repair', 'Microwave repair']],
            ['Electrician, Plumber & Carpenter', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80', '46 mins', 'Rs. 149', '30-180 mins', '4.7', 'Reliable home repairs for wiring, leakage, installation, fixtures, and furniture work.', ['Switch and fan repair', 'Tap and pipe leakage', 'Furniture assembly', 'Door and lock repair']],
            ['Laptop Repairing', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', 'New', 'Rs. 299', '30-120 mins', '4.8', 'Doorstep laptop diagnosis, software support, hardware checks, and transparent repair estimates.', ['Laptop diagnosis visit', 'Software troubleshooting', 'Keyboard and screen check', 'Battery and charging issue']],
        ];

        $categoryCommissions = [
            "Women's Salon & Spa" => 22,
            "Men's Salon & Massage" => 20,
            'Cleaning' => 18,
            'Painting & Water proofing' => 15,
            'AC & Appliance Repair' => 18,
            'Electrician, Plumber & Carpenter' => 16,
            'Laptop Repairing' => 14,
        ];

        foreach ($serviceCatalog as $index => [$name, $image, $badge, $price, $duration, $rating, $description, $includes]) {
            Category::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'image' => $image, 'badge' => $badge, 'description' => $description, 'sort_order' => $index + 1, 'commission_percentage' => $categoryCommissions[$name] ?? 18, 'status' => 'Active']
            );
        }

        foreach ($serviceCatalog as $index => [$name, $image, $badge, $price, $duration, $rating, $description, $includes]) {
            $category = Category::where('name', $name)->first();
            $service = Service::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['category_id' => $category?->id, 'name' => $name, 'image' => $image, 'duration' => $duration, 'rating' => $rating, 'description' => $description, 'includes' => $includes, 'sort_order' => $index + 1, 'status' => 'Active']
            );

            foreach ($includes as $packageIndex => $packageName) {
                $numericPrice = preg_match('/\d+/', $price, $matches) ? (int) $matches[0] + ($packageIndex * 150) : 0;
                $package = ServicePackage::updateOrCreate(
                    ['name' => $packageName, 'service_id' => $service->id],
                    [
                        'category_key' => 'general',
                        'image' => $image,
                        'price' => $numericPrice,
                        'duration' => $packageIndex === 0 ? $duration : (45 + $packageIndex * 20).' mins',
                        'rating' => $rating,
                        'jobs' => (8 + $packageIndex * 3).'K bookings',
                        'description' => $packageIndex === 0 ? $description : 'Professional '.Str::lower($packageName).' with inspection, setup, cleanup, and quality support.',
                        'highlights' => ['Trained professional', 'Transparent pricing'],
                        'included' => ['Inspection', $packageName, 'Cleanup', 'Quality check'],
                        'not_included' => ['Spare parts', 'Extra material unless specified'],
                        'process' => ['Book slot', 'Professional arrives', 'Service delivery', 'Final quality check'],
                        'warranty' => '30 day service support on eligible service issues.',
                        'sort_order' => $packageIndex + 1,
                        'status' => 'Active',
                    ]
                );
                $this->seedPackageSections($package);
            }
        }

        Service::whereIn('slug', ['women-salon-at-home', 'men-haircut-at-home', 'deep-home-cleaning', 'ac-repair', 'electrician-visit'])
            ->update(['status' => 'Inactive']);
        ServicePackage::whereIn('service_id', Service::whereIn('slug', ['women-salon-at-home', 'men-haircut-at-home', 'deep-home-cleaning', 'ac-repair', 'electrician-visit'])->pluck('id'))
            ->update(['status' => 'Inactive']);

        $acService = Service::where('slug', 'ac-appliance-repair')->first();
        $acPackages = [
            ['Annual plan [2 times/year]', 'annual', 1098, 1198, '2 visits', '4.76', '2.4M reviews', 'Save up to 25%', 'Rs. 549 per AC', '6 options', 'Get 1st service now, choose 2nd service anytime in 2026.', ['Applicable for both window or split ACs', 'Two foam-jet services included'], ['Two foam-jet services in one year', 'Cooling coil and filter cleaning', 'Drain tray cleaning', 'Final cooling check'], ['Gas refill', 'Spare parts', 'Repair work beyond servicing'], ['Book first service slot', 'Technician performs foam-jet service', 'Second service can be booked later', 'Final cooling and drainage check'], '30 day service warranty on each completed service visit.', 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=280&q=80'],
            ['Foam-jet service (2 ACs)', 'service', 1098, 1198, '1 hr 30 mins', '4.76', '2.4M reviews', 'Rs. 549 per AC', 'Rs. 549 per AC', null, 'Indoor unit deep cleaning with foam and jet spray for both split and window ACs.', ['Applicable for both window or split ACs', 'Indoor unit deep cleaning with foam & jet spray'], ['Filter cleaning', 'Cooling coil foam wash', 'Blower and drain tray cleaning', 'Cooling performance check'], ['Outdoor unit wet cleaning', 'Gas charging', 'Spare parts'], ['Pre-service inspection', 'Foam application and jet wash', 'Drainage cleanup', 'Final cooling test'], '30 day service warranty for service-related issues.', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=280&q=80'],
            ['Foam-jet AC service', 'service', 599, null, '45 mins', '4.76', '2.4M reviews', null, 'Free gas check', '9 options', 'Single AC foam-jet service with filter wash, cooling coil cleaning, and drain tray cleaning.', ['Applicable for both window & split ACs', 'Indoor unit deep cleaning with foam & jet spray'], ['Filter wash', 'Indoor coil cleaning', 'Drain tray cleaning', 'Basic temperature check'], ['Gas refill', 'Outdoor unit service', 'Part replacement'], ['AC inspection', 'Foam and jet cleaning', 'Water drainage check', 'Final test run'], '30 day service warranty for eligible cleaning issues.', 'https://images.unsplash.com/photo-1597008641621-cefdcf718256?auto=format&fit=crop&w=280&q=80'],
            ['Lite AC service', 'service', 499, null, '45 mins', '4.78', '283K reviews', null, 'Rs. 499 per AC', null, 'Indoor unit cleaning with water jet spray and basic performance check.', ['Applicable for both window & split ACs', 'Indoor unit cleaning with water jet spray'], ['Filter wash', 'Indoor unit cleaning', 'Drain pipe check', 'Cooling check'], ['Foam wash', 'Gas refill', 'Spare parts'], ['Basic inspection', 'Water jet cleaning', 'Drainage check', 'Performance test'], '30 day service warranty for eligible service issues.', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=280&q=80'],
            ['AC repair visit', 'repair', 299, 399, '30 mins', '4.79', '799K reviews', null, 'Free gas check', '4 options', 'Complete check-up to identify issues before repair. Spare parts are quoted after inspection.', ['Issue diagnosis', 'Transparent quote'], ['AC diagnosis', 'Repair estimate', 'Basic wiring and cooling check', 'Technician recommendation'], ['Spare parts', 'Gas refill', 'Major repair labor after diagnosis'], ['Technician inspection', 'Problem identification', 'Repair quote approval', 'Repair if approved'], 'Warranty depends on the repair completed and parts used.', 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=280&q=80'],
            ['Gas refill & check-up', 'repair', 2800, null, '2 hrs 30 mins', '4.78', '115K reviews', null, 'Cooling guarantee check', null, 'Gas leak check, vacuuming, and refill after technician inspection.', ['Leak check', 'Vacuuming', 'Cooling test'], ['Leakage check', 'Vacuuming', 'Gas refill', 'Cooling performance test'], ['Copper pipe replacement', 'Major leakage repair', 'Compressor replacement'], ['Pressure and leakage inspection', 'Vacuuming', 'Gas refill', 'Cooling test'], 'Gas refill warranty applies only if no major leakage is found after inspection.', 'https://images.unsplash.com/photo-1597008641621-cefdcf718256?auto=format&fit=crop&w=280&q=80'],
            ['Split AC installation', 'install', 1499, 1799, '120 mins', '4.81', '126K reviews', null, 'Free gas check', '2 options', 'Installation of indoor and outdoor units with free gas check.', ['Mounting included', 'Cooling test', 'Copper pipe extra'], ['Indoor and outdoor unit mounting', 'Drain pipe setup', 'Gas pressure check', 'Cooling test'], ['Copper pipe', 'Outdoor stand', 'Electrical wiring extension'], ['Installation site check', 'Unit mounting', 'Pipe and drain setup', 'Final cooling test'], '30 day warranty on installation workmanship.', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=280&q=80'],
            ['Split AC uninstallation', 'install', 699, 899, '60 mins', '4.78', '124K reviews', null, 'Safe gas lock', '2 options', 'Uninstallation of indoor and outdoor units with safe gas lock.', ['Gas lock included', 'Safe removal', 'Shift-ready'], ['Gas lock', 'Indoor unit removal', 'Outdoor unit removal', 'Basic packing support'], ['Reinstallation', 'Wall repair', 'Transport support'], ['AC condition check', 'Gas lock', 'Unit removal', 'Safe handover'], 'Service warranty applies to uninstallation workmanship only.', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=280&q=80'],
        ];

        foreach ($acPackages as $index => [$name, $key, $price, $original, $duration, $rating, $jobs, $badge, $offer, $optionCount, $description, $highlights, $included, $notIncluded, $process, $warranty, $image]) {
            $package = ServicePackage::updateOrCreate(
                ['name' => $name, 'service_id' => $acService?->id],
                ['category_key' => $key, 'price' => $price, 'original_price' => $original, 'duration' => $duration, 'rating' => $rating, 'jobs' => $jobs, 'badge' => $badge, 'offer' => $offer, 'option_count' => $optionCount, 'description' => $description, 'highlights' => $highlights, 'included' => $included, 'not_included' => $notIncluded, 'process' => $process, 'warranty' => $warranty, 'image' => $image, 'sort_order' => $index + 1, 'status' => 'Active']
            );
            $this->seedPackageSections($package);
        }

        ServicePackage::where('status', 'Active')->get()->each(fn (ServicePackage $package) => $this->seedPackageSections($package));

        foreach ([['Amit AC Care', '+91 90011 22334', 'AC Repair', 'Gomti Nagar', 'Approved', 'Available', 4.8, 84200, 17], ['CleanPro Lucknow', '+91 90022 33445', 'Cleaning', 'Hazratganj', 'Approved', 'Busy', 4.7, 62900, null], ['StyleAtHome', '+91 90033 44556', 'Salon', 'Indira Nagar', 'Pending', 'Available', 4.5, 21400, 24], ['FixIt Electricals', '+91 90044 55667', 'Electrical', 'Aliganj', 'Approved', 'Available', 4.6, 33800, 16]] as [$name, $phone, $skill, $area, $kyc, $availability, $rating, $earnings, $commission]) {
            Partner::updateOrCreate(['phone' => $phone], ['name' => $name, 'phone' => $phone, 'skill' => $skill, 'area' => $area, 'kyc_status' => $kyc, 'availability' => $availability, 'rating' => $rating, 'earnings' => $earnings, 'commission_percentage' => $commission, 'status' => 'Active']);
        }

        foreach ([['Ananya Singh', '+91 91234 56780', 'ananya@example.com', 'Hazratganj, Lucknow', 12], ['Ravi Verma', '+91 99887 77665', 'ravi@example.com', 'Aliganj, Lucknow', 8], ['KwalityCareKumar', '+91 98765 43210', 'rehanshi@example.com', 'Gomti Nagar, Lucknow', 19]] as [$name, $phone, $email, $address, $count]) {
            CustomerProfile::updateOrCreate(['phone' => $phone], ['name' => $name, 'email' => $email, 'address' => $address, 'bookings_count' => $count, 'status' => 'Active']);
        }

        foreach ([['Ananya Singh', 2450, 0], ['Ravi Verma', 900, 0], ['KwalityCareKumar', 2500, 0]] as [$name, $credit, $debit]) {
            $customer = CustomerProfile::where('name', $name)->first();
            if ($customer) {
                WalletTransaction::updateOrCreate(
                    ['transaction_no' => 'WTX-SEED-TOPUP-'.$customer->id],
                    ['wallet_type' => 'Customer', 'customer_profile_id' => $customer->id, 'direction' => 'Credit', 'type' => 'Top Up', 'amount' => $credit, 'balance_after' => $credit, 'status' => 'Posted', 'description' => 'Seed wallet opening balance.']
                );
                app(WalletManager::class)->rebuildCustomerWallet($customer);
            }
        }

        $KwalityCare= CustomerProfile::where('phone', '+91 98765 43210')->first();
        foreach ([['Home', 'KwalityCareKumar', '98765 43210', 'B-204', 'Gomti Nagar, near Patrakarpuram', 'Lucknow'], ['Work', 'Office Manager', '98765 43210', 'Shop 12', 'Hazratganj main market', 'Lucknow']] as [$label, $contact, $mobile, $flat, $street, $city]) {
            SavedAddress::updateOrCreate(['label' => $label, 'mobile' => $mobile], ['customer_profile_id' => $rehanshi?->id, 'contact_name' => $contact, 'flat' => $flat, 'street' => $street, 'city' => $city, 'status' => 'Active']);
        }

        foreach ([['BK-24018', 'KwalityCareKumar', '+91 98765 43210', 'AC & Appliance Repair', '2026-05-05 17:00:00', 'Gomti Nagar', 'Amit AC Care', 'Completed', 'Cash', 599], ['BK-24019', 'Ananya Singh', '+91 91234 56780', 'Cleaning', '2026-05-05 19:00:00', 'Hazratganj', 'CleanPro Lucknow', 'Completed', 'Wallet', 1999], ['BK-24020', 'Ravi Verma', '+91 99887 77665', 'Electrician, Plumber & Carpenter', '2026-05-05 20:30:00', 'Aliganj', 'FixIt Electricals', 'Completed', 'Paid', 199]] as [$no, $customer, $phone, $service, $at, $address, $professional, $status, $payment, $amount]) {
            $partnerModel = Partner::where('name', $professional)->first();
            $booking = Booking::updateOrCreate(['booking_no' => $no], ['customer_name' => $customer, 'customer_phone' => $phone, 'service_name' => $service, 'scheduled_at' => $at, 'address' => $address, 'partner_id' => $partnerModel?->id, 'professional_name' => $professional, 'status' => $status, 'payment_status' => $payment === 'Wallet' ? 'Paid' : $payment, 'payment_method' => $payment === 'Cash' ? 'Cash' : ($payment === 'Wallet' ? 'Wallet' : 'UPI'), 'amount' => $amount, 'timeline' => ['Booking placed', 'Service completed']]);
            Payment::updateOrCreate(['payment_no' => 'PAY-'.$no], ['customer_name' => $customer, 'amount' => $amount, 'method' => $payment === 'Cash' ? 'Cash' : ($payment === 'Wallet' ? 'Wallet' : 'UPI'), 'status' => $payment === 'Wallet' ? 'Paid' : $payment]);
            app(WalletManager::class)->syncBooking($booking);
        }

        foreach ([['HC-24018', 'Amit AC Care', 'KwalityCareKumar', 'Foam-jet AC service', 'B-204, Gomti Nagar, Lucknow', 'Today, 5:00 PM', 599, 'Accepted', 'Start trip'], ['HC-24022', 'Amit AC Care', 'Nikhil Sharma', 'AC gas refill', 'Vikas Khand, Gomti Nagar, Lucknow', 'Today, 8:00 PM', 2199, 'New request', 'Accept job']] as [$jobNo, $partner, $customer, $service, $address, $slot, $amount, $status, $action]) {
            $partnerModel = Partner::where('name', $partner)->first();
            VendorJob::updateOrCreate(['job_no' => $jobNo], ['partner_id' => $partnerModel?->id, 'customer_name' => $customer, 'service_name' => $service, 'address' => $address, 'slot' => $slot, 'amount' => $amount, 'status' => $status, 'next_action' => $action]);
        }

        foreach ([['Amit AC Care', 18400, 6200, 4428, 13972, 1116, 'Ready'], ['CleanPro Lucknow', 12900, 8500, 4280, 8620, 1700, 'Review'], ['StyleAtHome', 7600, 2300, 2178, 5422, 414, 'Pending']] as [$partner, $online, $cash, $commission, $payable, $due, $settlement]) {
            $partnerModel = Partner::where('name', $partner)->first();
            VendorWallet::updateOrCreate(['partner_name' => $partner], ['partner_id' => $partnerModel?->id, 'online_earning' => $online, 'cash_collected' => $cash, 'company_commission' => $commission, 'vendor_payable' => $payable, 'company_due' => $due, 'settlement' => $settlement]);
        }

        Partner::all()->each(fn (Partner $partner) => app(WalletManager::class)->rebuildVendorWallet($partner));

        foreach ([['LED-101', 'BK-24018', 'Amit AC Care', 'Cash', 599, 108, 491, 108, 'Unsettled'], ['LED-102', 'BK-24020', 'FixIt Electricals', 'Online', 199, 36, 163, 0, 'Ready'], ['LED-103', 'BK-24021', 'StyleAtHome', 'Online', 599, 132, 467, 0, 'Paid']] as [$ledgerNo, $bookingNo, $partner, $method, $gross, $commission, $vendorAmount, $companyDue, $status]) {
            $booking = Booking::where('booking_no', $bookingNo)->first();
            if ($booking) {
                BookingLedger::updateOrCreate(['booking_id' => $booking->id], ['ledger_no' => $ledgerNo, 'booking_no' => $bookingNo, 'partner_name' => $partner, 'method' => $method, 'gross' => $gross, 'commission' => $commission, 'vendor_amount' => $vendorAmount, 'company_due' => $companyDue, 'status' => $status]);
            }
        }

        foreach ([
            ['WELCOME20', 'Percentage', '20%', 499, '2026-05-31', 500, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'],
            ['HOME150', 'Fixed', 'Rs. 150', 799, '2026-06-30', 300, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'],
            ['CHECKUP', 'Fixed', 'Free inspection', null, '2026-06-30', 200, 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80'],
            ['CLEAN100', 'Fixed', 'Rs. 100', 999, '2026-06-15', 200, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'],
        ] as [$code, $type, $value, $minimum, $expiry, $limit, $image]) {
            Coupon::updateOrCreate(['code' => $code], ['type' => $type, 'value' => $value, 'minimum_order' => $minimum, 'expires_at' => $expiry, 'usage_limit' => $limit, 'status' => 'Active', 'metadata' => ['image' => $image]]);
        }

        foreach ([['Lucknow', 'Gomti Nagar', '226010', 34], ['Lucknow', 'Hazratganj', '226001', 21], ['Lucknow', 'Aliganj', '226024', 18]] as [$city, $area, $pin, $pros]) {
            ServiceLocation::updateOrCreate(['city' => $city, 'area' => $area], ['pincode' => $pin, 'availability' => 'Available', 'professionals_count' => $pros, 'status' => 'Active']);
        }

        $frontendContents = [
            ['hero', 'Quality Home services in Lucknow', 'Trained professionals for cleaning, beauty, repair, laptop repairing, painting and more, delivered at your doorstep.', 'https://forestgreen-hyena-746082.hostingersite.com/backend/public/settings-images/haircut-BippSfdv.png', ['images' => ['https://forestgreen-hyena-746082.hostingersite.com/backend/public/settings-images/ac-3-DWwe2OV-.png', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80'], 'stats' => [['value' => '4.8', 'label' => 'Service rating'], ['value' => '7+', 'label' => 'Live services'], ['value' => 'Admin', 'label' => 'Managed content']]]],
            ['services_section', 'What are you looking for?', 'Services', null, []],
            ['offers', 'Offers & discounts', 'Deals for you', null, []],
            ['most_booked', 'Most booked services', 'Most booked', null, ['mode' => 'auto', 'service_ids' => [], 'limit' => 4]],
            ['salon_services', 'Salon care at your doorstep', 'Salon services', null, ['mode' => 'auto', 'service_ids' => [], 'keywords' => ['salon', 'hair', 'beard', 'spa', 'facial'], 'limit' => 4]],
            ['makeup_services', 'Makeup and styling for every occasion', 'Makeup services', null, ['mode' => 'auto', 'service_ids' => [], 'keywords' => ['makeup', 'bridal', 'beauty', 'facial', 'spa'], 'limit' => 4]],
            ['popular_services', 'Book trusted experts near you', 'Popular right now', null, []],
            ['services_page', 'Book trusted home services in Lucknow', 'All services', null, ['stats' => [['value' => '4.8', 'label' => 'Average rating'], ['value' => '12M+', 'label' => 'Bookings served'], ['value' => '46 mins', 'label' => 'Quick slots']]]],
            ['service_promise', 'KwalityCarePromise', 'Quality Assured', null, ['items' => ['Verified Professionals', 'Hassle Free Booking', 'Transparent Pricing']]],
        ];

        foreach ($frontendContents as $index => [$type, $title, $subtitle, $image, $metadata]) {
            AppContent::updateOrCreate(
                ['type' => $type],
                ['title' => $title, 'subtitle' => $subtitle, 'image' => $image, 'metadata' => $metadata, 'sort_order' => $index + 1, 'status' => 'Active']
            );
        }

        SupportTicket::updateOrCreate(['ticket_no' => 'TIC-1041'], ['name' => 'Ananya Singh', 'type' => 'Reschedule', 'subject' => 'Need to change slot', 'priority' => 'Medium', 'status' => 'Open']);

        foreach ([
            ['Push', 'Admin', 'New booking received', 'BK-24019 Deep Home Cleaning is waiting for assignment.', 'Sent', now()->subSeconds(12), null, ['actor_name' => 'Ananya Singh', 'actor_role' => 'Customer', 'related_type' => 'Booking', 'related_label' => 'BK-24019', 'avatar_url' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80']],
            ['Push', 'Admin', 'Payment collected', 'Rs. 599 cash payment recorded for BK-24018.', 'Sent', now()->subHours(2), null, ['actor_name' => 'KwalityCareKumar', 'actor_role' => 'Customer', 'related_type' => 'Payment', 'related_label' => 'BK-24018', 'avatar_url' => 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=160&q=80']],
            ['Email', 'Admin', 'Partner KYC pending', 'StyleAtHome has submitted KYC details for review.', 'Sent', now()->subHours(9), null, ['actor_name' => 'StyleAtHome', 'actor_role' => 'Partner', 'related_type' => 'Partner', 'related_label' => 'KYC Review', 'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80']],
            ['SMS', 'Admin', 'Support ticket opened', 'TIC-1041 needs a reschedule response.', 'Sent', now()->subDay(), now()->subHours(4), ['actor_name' => 'Ananya Singh', 'actor_role' => 'Customer Support', 'related_type' => 'Support', 'related_label' => 'TIC-1041', 'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80']],
        ] as [$channel, $audience, $title, $message, $status, $sentAt, $readAt, $metadata]) {
            AdminNotification::updateOrCreate(
                ['title' => $title],
                ['channel' => $channel, 'audience' => $audience, 'message' => $message, 'status' => $status, 'sent_at' => $sentAt, 'read_at' => $readAt, 'metadata' => $metadata]
            );
        }

        $settings = [
            ['branding', 'app_name', 'Rehanshi', 'text', ['label' => 'App name']],
            ['branding', 'tagline', 'Home services, simplified', 'text', ['label' => 'Tagline']],
            ['branding', 'logo_text', 'HC', 'text', ['label' => 'Logo text']],
            ['branding', 'logo_url', '', 'image', ['label' => 'Logo image URL']],
            ['branding', 'logo_is_circular', '0', 'boolean', ['label' => 'Circular logo']],
            ['branding', 'footer_description', 'Verified professionals for repair, cleaning, beauty, appliance care, and everyday home needs in Lucknow.', 'textarea', ['label' => 'Footer description']],
            ['contact', 'phone', '+91 98765 43210', 'text', ['label' => 'Phone']],
            ['contact', 'email', 'support@Rehanshi.com', 'text', ['label' => 'Email']],
            ['contact', 'whatsapp', '+91 98765 43210', 'text', ['label' => 'WhatsApp']],
            ['contact', 'address', 'Lucknow, Uttar Pradesh', 'textarea', ['label' => 'Address']],
            ['contact', 'service_area_text', 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.', 'textarea', ['label' => 'Service area text']],
            ['legal', 'copyright_text', '(c) 2026 Rehanshi. All rights reserved.', 'text', ['label' => 'Copyright text']],
            ['legal', 'powered_by_text', 'Powered by KwalityCareServices', 'text', ['label' => 'Powered by text']],
            ['legal', 'footer_bottom_text', 'Transparent pricing | Trained professionals | Quality assured', 'text', ['label' => 'Footer bottom text']],
            ['social_links', 'facebook', '', 'url', ['label' => 'Facebook']],
            ['social_links', 'instagram', '', 'url', ['label' => 'Instagram']],
            ['social_links', 'linkedin', '', 'url', ['label' => 'LinkedIn']],
            ['social_links', 'youtube', '', 'url', ['label' => 'YouTube']],
            ['payment_methods', 'cod', '1', 'boolean', ['label' => 'Pay after service', 'description' => 'Customer pays after service completion.']],
            ['payment_methods', 'online', '1', 'boolean', ['label' => 'Pay online', 'description' => 'Online payment at checkout.']],
            ['payment_methods', 'upi', '0', 'boolean', ['label' => 'UPI', 'description' => 'UPI payment option.']],
            ['payment_methods', 'wallet', '0', 'boolean', ['label' => 'Wallet', 'description' => 'Customer wallet payment option.']],
            ['payment_methods', 'razorpay', '0', 'boolean', ['label' => 'Razorpay', 'description' => 'Razorpay payment gateway.', 'provider' => 'razorpay', 'mode' => 'test', 'public_key' => '', 'secret_key' => '']],
            ['payment_methods', 'phonepe', '0', 'boolean', ['label' => 'PhonePe', 'description' => 'PhonePe payment gateway.', 'provider' => 'phonepe', 'mode' => 'test', 'merchant_id' => '', 'salt_key' => '', 'salt_index' => '']],
            ['payment_methods', 'paypal', '0', 'boolean', ['label' => 'PayPal', 'description' => 'PayPal payment gateway.', 'provider' => 'paypal', 'mode' => 'sandbox', 'client_id' => '', 'client_secret' => '']],
            ['auto_assignment', 'enabled', '0', 'boolean', ['label' => 'Enable automatic assignment']],
            ['auto_assignment', 'auto_approve', '1', 'boolean', ['label' => 'Auto approve booking before assignment']],
            ['auto_assignment', 'delay_minutes', '2', 'number', ['label' => 'Assignment delay in minutes']],
            ['auto_assignment', 'match_area', '0', 'boolean', ['label' => 'Match professional area with booking address']],
        ];

        foreach ($settings as [$group, $key, $value, $type, $metadata]) {
            Setting::updateOrCreate(['group' => $group, 'key' => $key], ['value' => $value, 'type' => $type, 'metadata' => $metadata]);
        }

        foreach ([['Admin Owner', 'owner@Rehanshi.com', 'Super Admin', ['*'], 'admin12345', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'], ['Operations Manager', 'manager@Rehanshi.com', 'Manager', null, 'manager12345', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80'], ['Finance Manager', 'finance@Rehanshi.com', 'Finance Manager', null, 'finance12345', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80']] as [$name, $email, $roleName, $permissions, $password, $avatarUrl]) {
            $role = Role::where('name', $roleName)->first();
            AdminUser::updateOrCreate(['email' => $email], ['name' => $name, 'password' => $password, 'role_id' => $role?->id, 'role_name' => $roleName, 'permissions' => $permissions ?? $role?->permissions ?? [], 'status' => 'Active', 'metadata' => ['avatar_url' => $avatarUrl]]);
        }

        $this->call([
            SubServiceSeeder::class,
            ServicePackageSubServiceSeeder::class,
        ]);
    }

    private function seedPackageSections(ServicePackage $package): void
    {
        $included = $package->included ?: $package->highlights ?: ['Inspection', 'Service delivery', 'Final quality check'];
        $notIncluded = $package->not_included ?: ['Spare parts', 'Extra material unless specified'];
        $process = $package->process ?: ['Book slot', 'Professional arrives', 'Service delivery', 'Final quality check'];
        $descriptionPoints = [
            $package->description ?: 'Professional service completed by a trained expert.',
            'Transparent quote is shared before any additional work is started.',
            'Service is completed with a final quality check and basic clean-up.',
        ];

        $sections = [
            [
                'key' => 'summary',
                'type' => 'summary',
                'title' => 'Package summary',
                'body' => $package->description,
                'items' => ['Service warranty available', 'Price shown before booking', 'Professional brings required tools'],
                'metadata' => ['offer' => $package->offer],
            ],
            [
                'key' => 'included',
                'type' => 'list',
                'title' => 'Included in this service',
                'items' => $included,
                'metadata' => ['tone' => 'positive'],
            ],
            [
                'key' => 'not_included',
                'type' => 'list',
                'title' => 'Not included',
                'items' => $notIncluded,
                'metadata' => ['tone' => 'neutral'],
            ],
            [
                'key' => 'process',
                'type' => 'steps',
                'title' => 'Our process',
                'items' => $process,
            ],
            [
                'key' => 'requirements',
                'type' => 'cards',
                'title' => 'What we will need from you',
                'items' => ['Access to service area', 'Adult supervision during service'],
                'body' => 'Please keep the service area accessible before the professional arrives.',
            ],
            [
                'key' => 'description',
                'type' => 'list',
                'title' => 'Package description',
                'items' => $descriptionPoints,
            ],
            [
                'key' => 'brands',
                'type' => 'grid',
                'title' => 'We service all brands*',
                'body' => '*Brand names are used for service compatibility information only.',
                'items' => ['LG', 'VOLTAS', 'Haier', 'HITACHI', 'Panasonic', 'SAMSUNG', 'Godrej', '& more'],
            ],
            [
                'key' => 'faq',
                'type' => 'faq',
                'title' => 'Frequently asked questions',
                'items' => ['What does this service include?', 'Will extra material be charged separately?', 'Is there any service warranty?'],
                'metadata' => [
                    'faqs' => [
                        ['question' => 'What does this service include?', 'answer' => 'The included work is listed in the included section for this package.'],
                        ['question' => 'Will extra material be charged separately?', 'answer' => 'Yes, spare parts or extra material are quoted after inspection and used only after approval.'],
                        ['question' => 'Is there any service warranty?', 'answer' => $package->warranty ?: 'Eligible service issues are covered under the stated service warranty.'],
                    ],
                ],
            ],
            [
                'key' => 'reviews',
                'type' => 'review_summary',
                'title' => 'Customer reviews',
                'metadata' => ['rating' => $package->rating ?: '4.8', 'reviews' => $package->jobs ?: '8K bookings', 'five_star_percent' => 86],
            ],
            [
                'key' => 'warranty',
                'type' => 'note',
                'title' => 'Warranty and important notes',
                'body' => $package->warranty ?: '30 day service warranty is applicable on eligible service issues.',
            ],
        ];

        foreach ($sections as $index => $section) {
            ServicePackageSection::firstOrCreate(
                [
                    'service_package_id' => $package->id,
                    'section_key' => $section['key'],
                ],
                [
                    'service_id' => $package->service_id,
                    'section_type' => $section['type'],
                    'title' => $section['title'],
                    'body' => $section['body'] ?? null,
                    'items' => $section['items'] ?? [],
                    'metadata' => $section['metadata'] ?? null,
                    'sort_order' => $index + 1,
                    'status' => 'Active',
                    'is_visible' => true,
                ]
            );
        }
    }
}
