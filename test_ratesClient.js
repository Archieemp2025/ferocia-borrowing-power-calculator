/**
 * ratesClient Test Suite
 *
 * These tests never touch the network. The client accepts a `fetchFn`,
 * so each test injects a stub that returns whatever Response-shaped
 * object the case requires.
 */

const assert = require('assert');
const { createRatesClient } = require('./ratesClient');

const TOKEN = 'test-token';
const BASE_URL = 'http://localhost:3000';

/**
 * Builds a stub fetch that always resolves with the given status and body.
 * The client only reads .ok, .status and .json(), so that is all we fake.
 */
function stubFetch(status, body) {
    return async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    });
}

/**
 * Builds a stub fetch that also records how it was called,
 * so we can assert on the URL and headers the client produced.
 */
function spyFetch(status, body) {
    const calls = [];
    const fetchFn = async (url, options) => {
        calls.push({ url, options });
        return {
            ok: status >= 200 && status < 300,
            status,
            json: async () => body
        };
    };
    return { fetchFn, calls };
}

function makeClient(fetchFn) {
    return createRatesClient({ baseUrl: BASE_URL, token: TOKEN, fetchFn });
}

describe('ratesClient', () => {

    describe('getTax', () => {

        it('returns the tax value from the response body', async () => {
            const client = makeClient(stubFetch(200, { income: 120000, tax: 24000 }));
            const tax = await client.getTax(120000);
            assert.strictEqual(tax, 24000);
        });

        it('requests the tax endpoint with income as a query parameter', async () => {
            const { fetchFn, calls } = spyFetch(200, { tax: 24000 });
            await makeClient(fetchFn).getTax(120000);

            assert.strictEqual(calls.length, 1);
            assert.strictEqual(calls[0].url, `${BASE_URL}/api/tax?income=120000`);
        });

        it('sends the personal access token as a Bearer header', async () => {
            const { fetchFn, calls } = spyFetch(200, { tax: 24000 });
            await makeClient(fetchFn).getTax(120000);

            assert.strictEqual(
                calls[0].options.headers.Authorization,
                `Bearer ${TOKEN}`
            );
        });

    });

    describe('getHEM', () => {

        it('returns the hem value from the response body', async () => {
            const client = makeClient(stubFetch(200, { income: 120000, dependents: 2, hem: 3100 }));
            const hem = await client.getHEM(120000, 2);
            assert.strictEqual(hem, 3100);
        });

        it('requests the hem endpoint with income and dependents', async () => {
            const { fetchFn, calls } = spyFetch(200, { hem: 3100 });
            await makeClient(fetchFn).getHEM(120000, 2);

            assert.strictEqual(calls[0].url, `${BASE_URL}/api/hem?income=120000&dependents=2`);
        });

    });

    describe('error handling', () => {

        it('rejects when the token is rejected by the API', async () => {
            const client = makeClient(stubFetch(401, {
                error: 'Invalid Personal Access Token',
                message: 'The provided token is invalid.'
            }));

            await assert.rejects(
                () => client.getTax(120000),
                /401/,
                'Error should identify the status code'
            );
        });

        it('surfaces the error text supplied by the API', async () => {
            const client = makeClient(stubFetch(400, {
                error: 'Income is required',
                message: 'Provide income parameter.'
            }));

            await assert.rejects(
                () => client.getTax(),
                /Income is required/
            );
        });

        it('still reports the status when the error body is not JSON', async () => {
            const brokenFetch = async () => ({
                ok: false,
                status: 500,
                json: async () => { throw new SyntaxError('Unexpected token <'); }
            });

            await assert.rejects(
                () => makeClient(brokenFetch).getTax(120000),
                /500/
            );
        });

        it('propagates network failures to the caller', async () => {
            const deadServer = async () => { throw new TypeError('fetch failed'); };

            await assert.rejects(
                () => makeClient(deadServer).getTax(120000),
                /fetch failed/
            );
        });

    });

});