// Simple test to verify pay cycle calculations
const { getCurrentPayCycle, formatPayCyclePeriod, isDateInPayCycle } = require('./lib/pay-cycle-utils.ts');

// Test current pay cycle
const today = new Date('2024-12-04'); // December 4th, 2024
const cycle = getCurrentPayCycle(today);

console.log('Today:', today.toDateString());
console.log('Current Pay Cycle Start:', cycle.start.toDateString());
console.log('Current Pay Cycle End:', cycle.end.toDateString());
console.log('Formatted Period:', formatPayCyclePeriod(cycle.start, cycle.end));

// Test if today falls within the cycle
console.log('Is today in current cycle?', isDateInPayCycle(today, cycle.start, cycle.end));

// Test with a date before the 6th
const beforeCycle = new Date('2024-12-03'); // December 3rd
const beforeCyclePeriod = getCurrentPayCycle(beforeCycle);
console.log('\nDecember 3rd cycle:');
console.log('Start:', beforeCyclePeriod.start.toDateString());
console.log('End:', beforeCyclePeriod.end.toDateString());

// Test with a date after the 6th
const afterCycle = new Date('2024-12-10'); // December 10th
const afterCyclePeriod = getCurrentPayCycle(afterCycle);
console.log('\nDecember 10th cycle:');
console.log('Start:', afterCyclePeriod.start.toDateString());
console.log('End:', afterCyclePeriod.end.toDateString());