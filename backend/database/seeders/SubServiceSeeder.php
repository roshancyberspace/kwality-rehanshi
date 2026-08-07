<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\SubService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SubServiceSeeder extends Seeder
{
    public function run(): void
    {
        $subServiceCatalog = [
            "Women's Salon & Spa" => [
                ['name' => 'Salon for Women', 'price' => 'Rs. 299', 'desc' => 'Complete doorstep hair and beauty salon care by professional beauticians.', 'icon' => 'https://img.icons8.com/color/128/hairdresser.png'],
                ['name' => 'Spa for Women', 'price' => 'Rs. 799', 'desc' => 'Relaxing full body massages and aromatic spa therapies at home.', 'icon' => 'https://img.icons8.com/color/128/spa.png'],
                ['name' => 'Hair Studio for Women', 'price' => 'Rs. 399', 'desc' => 'Haircuts, blowout styling, hair spa, and advanced coloring treatments.', 'icon' => 'https://img.icons8.com/color/128/scissors.png'],
                ['name' => 'Makeup, Saree & Styling', 'price' => 'Rs. 999', 'desc' => 'Professional event makeovers, bridal styling, and flawless saree draping.', 'icon' => 'https://img.icons8.com/color/128/lipstick.png'],
                ['name' => 'Manicure & Pedicure', 'price' => 'Rs. 449', 'desc' => 'Hygienic nail grooming, cuticle care, and nourishing spa manicures/pedicures.', 'icon' => 'https://img.icons8.com/color/128/nail-polish.png'],
                ['name' => 'Facial & Cleanup', 'price' => 'Rs. 499', 'desc' => 'Deep pore cleansing, exfoliating facials, and instant glow treatments.', 'icon' => 'https://img.icons8.com/color/128/mirror.png'],
            ],
            "Men's Salon & Massage" => [
                ['name' => 'Haircut & Styling for Men', 'price' => 'Rs. 199', 'desc' => 'Expert hair grooming, styling, and relaxing head wash at home.', 'icon' => 'https://img.icons8.com/color/128/barbershop.png'],
                ['name' => 'Beard Shaving & Grooming', 'price' => 'Rs. 149', 'desc' => 'Beard trims, precision contouring, and luxurious hot towel shaving.', 'icon' => 'https://img.icons8.com/fluency/128/razor.png'],
                ['name' => 'Massage therapy for Men', 'price' => 'Rs. 699', 'desc' => 'Rejuvenating deep tissue and stress-relief Ayurvedic massage therapies.', 'icon' => 'https://img.icons8.com/color/128/massage.png'],
                ['name' => 'Face Care & Cleanup for Men', 'price' => 'Rs. 399', 'desc' => 'De-tan facial scrubs, oil control cleanup, and skin detox for men.', 'icon' => 'https://img.icons8.com/color/128/comb.png'],
                ['name' => 'Hair & Scalp Treatment', 'price' => 'Rs. 499', 'desc' => 'Anti-dandruff treatments, hair root nourishment, and cooling hair spa.', 'icon' => 'https://img.icons8.com/color/128/shampoo.png'],
                ['name' => 'Manicure & Pedicure for Men', 'price' => 'Rs. 399', 'desc' => 'Relaxing foot scrubs, cuticle nail shaping, and energizing spa pedicures/manicures for men.', 'icon' => 'https://img.icons8.com/color/128/pedicure.png'],
            ],
            'Cleaning' => [
                ['name' => 'Full Home Deep Cleaning', 'price' => 'Rs. 2499', 'desc' => 'Intense end-to-end cleaning for living rooms, bedrooms, balconies, and floors.', 'icon' => 'https://img.icons8.com/color/128/broom.png'],
                ['name' => 'Bathroom & Kitchen Deep Cleaning', 'price' => 'Rs. 899', 'desc' => 'Stubborn stain removal, descaling fixtures, chimney grease removal, and sanitization.', 'icon' => 'https://img.icons8.com/color/128/toilet-bowl.png'],
                ['name' => 'Sofa & Carpet Shampooing', 'price' => 'Rs. 599', 'desc' => 'Deep foam wet vacuuming and fabric sanitization for sofas, mattresses, and carpets.', 'icon' => 'https://img.icons8.com/color/128/sofa.png'],
                ['name' => 'Disinfection & Sanitization Services', 'price' => 'Rs. 799', 'desc' => 'Hospital-grade disinfectant misting and anti-viral surface treatments.', 'icon' => 'https://img.icons8.com/color/128/vacuum-cleaner.png'],
                ['name' => 'Post Construction Cleaning', 'price' => 'Rs. 3499', 'desc' => 'Removal of paint specks, concrete residue, debris, and thorough surface wash.', 'icon' => 'https://img.icons8.com/fluency/128/clean.png'],
            ],
            'AC Service' => [
                ['name' => 'Foam-Jet AC Service', 'price' => 'Rs. 599', 'desc' => 'Deep indoor coil and outdoor unit wash using specialized foam and high-pressure jet.', 'icon' => 'https://img.icons8.com/color/128/air-conditioner.png'],
                ['name' => 'AC Gas Repair & Refill', 'price' => 'Rs. 2199', 'desc' => 'Leak testing, vacuum sealing, and authentic refrigerant gas top-up / refill.', 'icon' => 'https://img.icons8.com/color/128/cooling.png'],
                ['name' => 'AC Installation & Uninstallation', 'price' => 'Rs. 699', 'desc' => 'Safe mounting, piping setup, and gas-locked uninstallation for Split/Window ACs.', 'icon' => 'https://img.icons8.com/color/128/wrench.png'],
                ['name' => 'AC PCB & Parts Repair', 'price' => 'Rs. 499', 'desc' => 'Diagnosis and reliable servicing for motherboards, capacitors, sensors, and motors.', 'icon' => 'https://img.icons8.com/color/128/motherboard.png'],
                ['name' => 'Annual Maintenance Contract (AMC)', 'price' => 'Rs. 1599', 'desc' => 'Year-round preventive care, routine foam washes, and priority emergency repairs.', 'icon' => 'https://img.icons8.com/color/128/contract.png'],
            ],
            'Appliance Repair' => [
                ['name' => 'Washing Machine Repair & Service', 'price' => 'Rs. 299', 'desc' => 'Expert fixes for spin motor, water drainage, drum issues, and circuit malfunctions.', 'icon' => 'https://img.icons8.com/color/128/washing-machine.png'],
                ['name' => 'Refrigerator & Fridge Repair', 'price' => 'Rs. 299', 'desc' => 'Solving cooling loss, thermostat faults, compressor issues, and gas refill.', 'icon' => 'https://img.icons8.com/color/128/fridge.png'],
                ['name' => 'Microwave Oven Repair', 'price' => 'Rs. 249', 'desc' => 'Magnetron replacement, touchpad repair, heating diagnosis, and turntable fixes.', 'icon' => 'https://img.icons8.com/color/128/microwave.png'],
                ['name' => 'RO & Water Purifier Service', 'price' => 'Rs. 349', 'desc' => 'Filter membrane replacement, TDS adjustment, tank sanitization, and leak repair.', 'icon' => 'https://img.icons8.com/color/128/water.png'],
                ['name' => 'Geyser & Water Heater Repair', 'price' => 'Rs. 299', 'desc' => 'Heating element replacement, tank scaling cleanup, and thermostat servicing.', 'icon' => 'https://img.icons8.com/color/128/water-heater.png'],
            ],
            'Electricians' => [
                ['name' => 'Wiring & Fuse Rewiring', 'price' => 'Rs. 199', 'desc' => 'Internal wiring repair, circuit overload diagnostics, and main distribution box fixes.', 'icon' => 'https://img.icons8.com/color/128/lightning-bolt.png'],
                ['name' => 'Fan & Light Installation', 'price' => 'Rs. 149', 'desc' => 'Ceiling fan mounting, chandelier hanging, tube light fixtures, and LED strip installations.', 'icon' => 'https://img.icons8.com/color/128/idea.png'],
                ['name' => 'Switchboard & Inverter Repair', 'price' => 'Rs. 199', 'desc' => 'Socket replacement, switch modular upgrade, and home inverter connection checks.', 'icon' => 'https://img.icons8.com/fluency/128/plug.png'],
                ['name' => 'MCB & Distribution Box Setup', 'price' => 'Rs. 399', 'desc' => 'Replacing faulty tripping MCBs, RCCB protection setup, and electrical load balancing.', 'icon' => 'https://img.icons8.com/color/128/shield.png'],
                ['name' => 'Earthing & Safety Inspection', 'price' => 'Rs. 499', 'desc' => 'Proper ground leakage correction and household electrical safety evaluation.', 'icon' => 'https://img.icons8.com/fluency/128/shield.png'],
            ],
            'Interior Designing' => [
                ['name' => 'Full Home Interior Design', 'price' => 'Free Consult', 'desc' => 'Comprehensive turnkey planning, bespoke modular designs, and project execution.', 'icon' => 'https://img.icons8.com/color/128/interior.png'],
                ['name' => 'Modular Kitchen & Wardrobes', 'price' => 'Rs. 999', 'desc' => 'Custom functional kitchen layouts, ergonomic storage, and premium finish wardrobes.', 'icon' => 'https://img.icons8.com/color/128/wardrobe.png'],
                ['name' => 'Living Room & Bedroom Decor', 'price' => 'Rs. 799', 'desc' => 'Tailored accent walls, custom drapery selections, furniture layout, and aesthetic styling.', 'icon' => 'https://img.icons8.com/color/128/living-room.png'],
                ['name' => 'False Ceiling & Lighting Layouts', 'price' => 'Rs. 599', 'desc' => 'Gypsum designer ceilings, cove ambient lighting, and acoustic insulation planning.', 'icon' => 'https://img.icons8.com/color/128/spotlight.png'],
                ['name' => '3D Visualization & Space Planning', 'price' => 'Rs. 1499', 'desc' => 'Realistic interactive 3D floor plans and walkthroughs before implementation.', 'icon' => 'https://img.icons8.com/color/128/blueprint.png'],
            ],
            'IT Hardware & Services' => [
                ['name' => 'Laptop Diagnosis & Repair', 'price' => 'Rs. 299', 'desc' => 'Screen replacement, keyboard fixing, battery troubleshooting, and thermal cooling cleanup.', 'icon' => 'https://img.icons8.com/color/128/laptop.png'],
                ['name' => 'Desktop PC Assembly & Upgrade', 'price' => 'Rs. 499', 'desc' => 'Custom gaming workstation PC build, RAM/SSD upgrades, and power supply diagnostics.', 'icon' => 'https://img.icons8.com/color/128/computer.png'],
                ['name' => 'Windows & Software Support', 'price' => 'Rs. 249', 'desc' => 'OS re-installation, driver updates, virus cleanup, and office productivity suite fixes.', 'icon' => 'https://img.icons8.com/color/128/windows.png'],
                ['name' => 'Wi-Fi Router & Network Setup', 'price' => 'Rs. 349', 'desc' => 'High-speed router config, mesh network coverage expansion, and dead-zone elimination.', 'icon' => 'https://img.icons8.com/color/128/wifi.png'],
                ['name' => 'CCTV Installation & Security Setup', 'price' => 'Rs. 799', 'desc' => 'IP surveillance HD camera cabling, DVR/NVR remote phone playback configuration.', 'icon' => 'https://img.icons8.com/color/128/router.png'],
            ],
            'Manpower Services' => [
                ['name' => 'Household Helper & Domestic Aid', 'price' => 'Rs. 399 / day', 'desc' => 'Verified housekeeping staff, cooking support, and trusted home care attendants.', 'icon' => 'https://img.icons8.com/color/128/housekeeper.png'],
                ['name' => 'Event Technicians & Support Staff', 'price' => 'Rs. 799 / day', 'desc' => 'Reliable lighting technicians, coordinators, and logistics helpers for corporate & home functions.', 'icon' => 'https://img.icons8.com/color/128/microphone.png'],
                ['name' => 'Drivers on Call & Chauffeur Services', 'price' => 'Rs. 499 / trip', 'desc' => 'Professional verified drivers for city commutes, outstation journeys, and hourly rentals.', 'icon' => 'https://img.icons8.com/color/128/driver.png'],
                ['name' => 'Security Guards & Facility Staff', 'price' => 'Rs. 699 / shift', 'desc' => 'Trained uniformed security personnel for residential apartments and corporate sites.', 'icon' => 'https://img.icons8.com/fluency/128/shield.png'],
                ['name' => 'Office Boy & Pantry Management', 'price' => 'Rs. 499 / shift', 'desc' => 'Dedicated workplace assistants for file handling, refreshment service, and desk organization.', 'icon' => 'https://img.icons8.com/color/128/coffee.png'],
            ],
            'Pest Control' => [
                ['name' => 'Cockroach & Kitchen Pest Treatment', 'price' => 'Rs. 699', 'desc' => 'Odorless herbal gel baiting and crack spray treatment safe for children and pets.', 'icon' => 'https://img.icons8.com/color/128/cockroach.png'],
                ['name' => 'Anti-Termite Deep Wood Treatment', 'price' => 'Rs. 1499', 'desc' => 'Drill-fill-seal chemical barriers to eradicate subterranean termite infestations in woodwork.', 'icon' => 'https://img.icons8.com/color/128/wood.png'],
                ['name' => 'Bed Bug Extermination', 'price' => 'Rs. 1199', 'desc' => 'Two-part chemical spray and steam sanitization penetrating mattress seams and upholstery.', 'icon' => 'https://img.icons8.com/color/128/bug.png'],
                ['name' => 'Rodent & Rat Control Solutions', 'price' => 'Rs. 899', 'desc' => 'Strategic bait stations, glue trapping, and entry-way sealing to make premises rodent-free.', 'icon' => 'https://img.icons8.com/color/128/insect.png'],
                ['name' => 'Mosquito Control & Fogging', 'price' => 'Rs. 799', 'desc' => 'Outdoor space thermal fogging and indoor larvicidal spraying for immediate relief.', 'icon' => 'https://img.icons8.com/color/128/mosquito.png'],
            ],
        ];

        // Remove any incorrectly assigned Men's sub-services from Women's Salon & Spa (service_id = 1)
        SubService::where('service_id', 1)
            ->whereIn('name', [
                'Haircut & Styling for Men',
                'Beard Shaving & Grooming',
                'Massage therapy for Men',
                'Face Care & Cleanup for Men',
                'Hair & Scalp Treatment',
            ])->delete();

        foreach ($subServiceCatalog as $serviceName => $subServices) {
            $service = Service::where('name', $serviceName)->where('status', 'Active')->first()
                    ?? Service::where('name', $serviceName)->first()
                    ?? Service::where('status', 'Active')->where('name', 'like', explode(' ', $serviceName)[0] . '%')->first();
            if (!$service) {
                continue;
            }

            foreach ($subServices as $index => $item) {
                SubService::updateOrCreate(
                    [
                        'service_id' => $service->id,
                        'name' => $item['name'],
                    ],
                    [
                        'slug' => Str::slug($service->name . '-' . $item['name']),
                        'icon' => $item['icon'],
                        'description' => $item['desc'],
                        'sort_order' => $index + 1,
                        'status' => 'Active',
                    ]
                );
            }
        }
    }
}
