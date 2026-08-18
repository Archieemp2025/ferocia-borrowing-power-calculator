// /**
//  * Borrowing Power Calculator Test Suite
//  */


// const assert = require('assert'); 
// const {calculateBorrowingPower} = require('./borrowingCalculator');

// describe('Term Deposit Calculator Tests', () => {

//   it('should calculate borrowing power for standard values', () => {
//     const result = calculateBorrowingPower(120000, 2, 3000, 10000, 7.5);
//     assert.ok(result.maxLoanAmount > 0, 'Should yield a positive borrowing power amount');
//     assert.strictEqual(result.monthlyRepayment, 4200);
//   });

//   it('should return 0 for invalid negative inputs', () => {
//     const result = calculateBorrowingPower(30000, 3, 4000, 5000, 7.5);
//     assert.strictEqual(result.maxLoanAmount, 0);
//     assert.strictEqual(result.monthlyRepayment, 0);
//   });

// });


/**
 * Borrowing Power Calculator Test Suite
 *
 * The calculator receives its rates client, so these tests inject a fake
 * and run entirely offline. The fake values match what the real API
 * returns for the inputs used below.
 */

const assert = require('assert');
const { BorrowingPowerCalculator, presentValueOfAnnuity } = require('./borrowingCalculator');

/**
 * Minimal stand-in for ratesClient. Anything with these two methods
 * is a valid rates source as far as the calculator is concerned.
 */
function fakeRates(tax, hem) {
    return {
        getTax: async () => tax,
        getHEM: async () => hem
    };
}

describe('BorrowingPowerCalculator', () => {

    it('should calculate borrowing power for standard values', async () => {
        const calculator = new BorrowingPowerCalculator({
            rates: fakeRates(24000, 3100),
            interestRate: 7.5,
            buffer: 0
        });

        const result = await calculator.calculate({
            income: 120000,
            dependents: 2,
            expenses: 3000,
            creditLimits: 10000
        });

        assert.ok(result.maxLoanAmount > 0, 'Should yield a positive borrowing power amount');
        assert.strictEqual(result.monthlyRepayment, 4600);
    });

    it('should return zero when expenses exceed repayment capacity', async () => {
        const calculator = new BorrowingPowerCalculator({
            rates: fakeRates(1500, 2800),
            interestRate: 7.5,
            buffer: 0
        });

        const result = await calculator.calculate({
            income: 30000,
            dependents: 3,
            expenses: 4000,
            creditLimits: 5000
        });

        assert.strictEqual(result.maxLoanAmount, 0);
        assert.strictEqual(result.monthlyRepayment, 0);
    });

    it('uses the HEM baseline when declared expenses are lower', async () => {
        const calculator = new BorrowingPowerCalculator({ rates: fakeRates(24000, 3100) });

        const result = await calculator.calculate({
            income: 120000,
            dependents: 2,
            expenses: 500,          // well below the HEM floor of 3100
            creditLimits: 0
        });

        // 8000 net monthly - 3100 HEM - 0 cards
        assert.strictEqual(result.monthlyRepayment, 4900);
    });

    it('adds the buffer to the interest rate when assessing', () => {
        const calculator = new BorrowingPowerCalculator({
            rates: fakeRates(0, 0),
            interestRate: 7.0,
            buffer: 3.0
        });

        assert.strictEqual(calculator.assessmentRate, 10.0);
    });

    it('requires a rates client', () => {
        assert.throws(() => new BorrowingPowerCalculator({}), /rates client/);
    });

    describe('presentValueOfAnnuity', () => {

        it('returns payment times term when the rate is zero', () => {
            assert.strictEqual(presentValueOfAnnuity(1000, 0, 360), 360000);
        });

        it('returns less than the undiscounted total when interest applies', () => {
            const withInterest = presentValueOfAnnuity(1000, 0.00625, 360);
            assert.ok(withInterest < 360000);
            assert.ok(withInterest > 0);
        });

    });

});
