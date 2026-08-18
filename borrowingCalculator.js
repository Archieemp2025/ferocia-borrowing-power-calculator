/**
 * Borrowing Power Calculator
 *
 * Holds the lending rules: how income, tax, living expenses and existing
 * credit commitments translate into a maximum loan amount.
 *
 * This module performs no I/O. Tax and HEM values are supplied by an
 * injected `rates` client, so the rules can be tested without a network.
 */

/**
 * Present value of an ordinary annuity.
 *
 * Answers "what loan size does this monthly payment support?", which is the
 * standard mortgage formula rearranged to solve for the principal.
 *
 *   P = M * (1 - (1 + R)^-N) / R
 */
function presentValueOfAnnuity(monthlyPayment, monthlyRate, termMonths) {
    if (monthlyRate <= 0) {
        // With no interest, the loan is simply every repayment added together.
        return monthlyPayment * termMonths;
    }

    return monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
}


class BorrowingPowerCalculator {

    /**
     * @param {object}  options
     * @param {object}  options.rates         Supplies getTax(income) and getHEM(income, dependents)
     * @param {number} [options.termMonths]   Loan term in months (360 = 30 years)
     * @param {number} [options.interestRate] Advertised annual rate, as a percentage
     * @param {number} [options.buffer]       Serviceability buffer added on top, as a percentage
     */
    constructor({ rates, termMonths = 360, interestRate = 7.0, buffer = 3.0 }) {
        if (!rates) {
            throw new Error('A rates client is required.');
        }

        this.rates = rates;
        this.termMonths = termMonths;
        this.interestRate = interestRate;
        this.buffer = buffer;
    }

    /**
     * Loans are assessed at the advertised rate plus a buffer, so borrowers
     * are not approved for a loan they could not service if rates rose.
     */
    get assessmentRate() {
        return this.interestRate + this.buffer;
    }

    /**
     * Calculates the total borrowing power amount and the monthly repayment capacity.
     */
    async calculate({ income, dependents, expenses, creditLimits }) {
        // Tax and HEM are independent lookups, so request them concurrently.
        const [annualTax, baselineHEM] = await Promise.all([
            this.rates.getTax(income),
            this.rates.getHEM(income, dependents)
        ]);

        // 1. Calculate Net Monthly Income after tax deductions
        const netMonthlyIncome = (income - annualTax) / 12;

        // 2. Determine living expenses (User declared expenses vs HEM baseline, whichever is higher)
        const totalLivingExpenses = Math.max(expenses, baselineHEM);

        // 3. Calculate credit card liability (~3% of total limits)
        const creditCardLiability = creditLimits * 0.03;

        // 4. Calculate monthly repayment capacity
        const maxMonthlyRepayment = netMonthlyIncome - totalLivingExpenses - creditCardLiability;

        // Return early if user cannot afford a loan at all
        if (maxMonthlyRepayment <= 0) {
            return { maxLoanAmount: 0, monthlyRepayment: 0 };
        }

        // 5. Calculate the monthly interest rate from the assessment rate
        const monthlyRate = (this.assessmentRate / 100) / 12;

        // 6. Convert the monthly capacity into a maximum loan amount
        const maxLoanAmount = presentValueOfAnnuity(maxMonthlyRepayment, monthlyRate, this.termMonths);

        return {
            maxLoanAmount: Number(maxLoanAmount.toFixed(2)),
            monthlyRepayment: Number(maxMonthlyRepayment.toFixed(2))
        };
    }
}

module.exports = { BorrowingPowerCalculator, presentValueOfAnnuity };