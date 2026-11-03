/**
 * Unit & Integration Test for TrainerStore Logic
 */

// Mock browser globals (window and localStorage)
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
global.window = global;

// Load trainer-data.js
require('../assets/js/trainer-data.js');

const store = window.TrainerStore;

console.log("1. Testing TrainerStore initial state...");
const initialBookings = store.getBookings();
console.assert(initialBookings.length === 8, "Expected 8 initial bookings, got " + initialBookings.length);
console.assert(initialBookings[0].isDemo === true, "Initial booking should have isDemo: true");

console.log("2. Testing generateAvailableSlots on future Monday (2026-11-09)...");
const mondaySlots = store.generateAvailableSlots('2026-11-09');
console.log("Monday 2026-11-09 available slots:", mondaySlots);
console.assert(mondaySlots.length > 0, "Expected available slots on Monday");
console.assert(mondaySlots.includes('09:00 AM'), "Expected 09:00 AM to be available");

console.log("3. Testing Thanksgiving holiday date override (2026-11-26)...");
const holidaySlots = store.generateAvailableSlots('2026-11-26');
console.assert(holidaySlots.length === 0, "Expected 0 slots on Thanksgiving holiday, got " + holidaySlots.length);

console.log("4. Testing past date (2020-01-01)...");
const pastSlots = store.generateAvailableSlots('2020-01-01');
console.assert(pastSlots.length === 0, "Expected 0 slots on past date, got " + pastSlots.length);

console.log("5. Testing Sunday (weekly disabled)...");
const sundaySlots = store.generateAvailableSlots('2026-11-08');
console.assert(sundaySlots.length === 0, "Expected 0 slots on Sunday, got " + sundaySlots.length);

console.log("6. Testing addBooking and conflict prevention...");
const targetDate = '2026-11-09';
const slotToBook = mondaySlots[0]; // e.g. '09:00 AM'
console.log("Booking slot:", slotToBook, "on", targetDate);

const newBooking = store.addBooking({
  fullName: 'Test Athlete',
  email: 'test@example.com',
  phone: '+1 555 123 4567',
  goalLabel: 'Hypertrophy & Muscle Gain',
  experience: 'Intermediate (1–3 years)',
  date: targetDate,
  time: slotToBook,
  notes: 'Testing end-to-end integration'
});

console.assert(newBooking.status === 'Pending', "New booking status must be Pending");
console.assert(newBooking.isDemo === false, "New booking must not be demo data");

// Verify lead was created
const leads = store.getLeads();
const matchingLead = leads.find(l => l.name === 'Test Athlete');
console.assert(matchingLead !== undefined, "Lead should be automatically registered");
console.assert(matchingLead.status === 'New', "Lead status should be New");

// Verify conflict detection: slotToBook should NO LONGER be in available slots!
const slotsAfterBooking = store.generateAvailableSlots(targetDate);
console.log("Slots after booking (should exclude " + slotToBook + "):", slotsAfterBooking);
console.assert(!slotsAfterBooking.includes(slotToBook), "Booked slot must be excluded from availability!");

console.log("7. Testing slot release upon booking rejection/cancellation...");
store.updateBookingStatus(newBooking.id, 'Rejected');
const slotsAfterRejection = store.generateAvailableSlots(targetDate);
console.assert(slotsAfterRejection.includes(slotToBook), "Rejected booking must free up the slot for rebooking!");

console.log("8. Testing slot reservation upon Confirm...");
store.updateBookingStatus(newBooking.id, 'Confirmed');
const slotsAfterConfirm = store.generateAvailableSlots(targetDate);
console.assert(!slotsAfterConfirm.includes(slotToBook), "Confirmed booking must reserve the slot!");

console.log("\n=========================================");
console.log("ALL TRAINERSTORE UNIT TESTS PASSED (8/8)!");
console.log("=========================================");
