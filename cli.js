/**
 * cli.js
 *
 * Console interface and composition root. This is the only file that
 * builds the concrete rates client and hands it to the calculator.
 */

const readline = require('readline/promises');

const config = require('./config');
const { createRatesClient } = require('./ratesClient');
const { BorrowingPowerCalculator } = require('./borrowingCalculator');

/**
 * Reads a non-negative number, re-prompting until the input is usable.
 */
async function askNumber(rl, prompt) {
    while (true) {
        const answer = await rl.question(prompt);
        const value = Number(answer);

        if (Number.isFinite(value) && value >= 0) {
            return value;
        }

        console.log('  Please enter a non-negative number.');
    }
}

function formatCurrency(amount) {
    return amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

async function runConsoleMode() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const rates = createRatesClient({
        baseUrl: config.api.baseUrl,
        token: config.api.token
    });

    const calculator = new BorrowingPowerCalculator({
        rates,
        termMonths: config.loan.termMonths,
        interestRate: config.loan.interestRate,
        buffer: config.loan.buffer
    });

    console.log('Mortgage Borrowing Power Calculator');
    console.log('===================================');

    try {
        const income = await askNumber(rl, 'Gross Annual Income: $');
        const dependents = await askNumber(rl, 'Number of Dependents: ');
        const expenses = await askNumber(rl, 'Declared Monthly Expenses: $');
        const creditLimits = await askNumber(rl, 'Total Credit Card Limits: $');

        const result = await calculator.calculate({ income, dependents, expenses, creditLimits });

        const years = config.loan.termMonths / 12;

        console.log('\n--- Calculation Summary ---');
        console.log(`Maximum Borrowing Power at ${config.loan.interestRate}%: ${formatCurrency(result.maxLoanAmount)}`);
        console.log(`Assumed Monthly Mortgage Repayment: ${formatCurrency(result.monthlyRepayment)} over ${years} years`);
        console.log(`(Assessed at ${calculator.assessmentRate}%, including a ${config.loan.buffer}% buffer)`);

        if (result.maxLoanAmount === 0) {
            console.log('\nDeclared expenses and commitments leave no capacity for repayments.');
        }
    } catch (error) {
        console.error(`\nCould not complete the calculation: ${error.message}`);
        console.error('Check the rates API is running with: npm run api');
        process.exitCode = 1;
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    runConsoleMode();
}

module.exports = { runConsoleMode };