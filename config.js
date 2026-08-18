/**
 * config.js
 *
 * Environment-specific values, kept out of the calculation logic.
 * The development PAT is defaulted so the project runs from a clean
 * clone, but can be overridden without touching source.
 */

module.exports = {
    api: {
        baseUrl: process.env.RATES_API_URL || 'http://localhost:3000',
        token: process.env.RATES_API_TOKEN || 'pat_abcdefghijklmnopqrstuvwxyz0123456789'
    },
    loan: {
        termMonths: 360,       // 30 years
        interestRate: 7.0,     // advertised annual rate, as a percentage
        buffer: 3.0            // serviceability buffer added on assessment, as a percentage
    }
}