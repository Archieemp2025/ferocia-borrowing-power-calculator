/**
 * ratesClient.js
 *
 * The only module that knows about HTTP. Wraps the tax and HEM
 * endpoints and returns plain numbers to the rest of the app.
 */

function createRatesClient({baseUrl, token, fetchFn = fetch}) {
  async function request(path, params) {
    // 1. build the URL with query params
    const url = new URL(path, baseUrl);
    url.search = new URLSearchParams(params).toString();

    // 2. call fetchFn with the Authorization header
    const res = await fetchFn(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 3. if (!res.ok) throw, using the server's error/message
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Rates API ${res.status}: ${body.error || 'Request failed'} - ${body.message || ''}`);
    }

    // 4. return the parsed JSON body
    return res.json();
  }

  return {
    async getTax(income) {
      const data = await request('/api/tax', { income });
      return data.tax;
    },
    async getHEM(income, dependents) {
      const data = await request('/api/hem', { income, dependents });
      return data.hem;
    }
  };
}

module.exports = { createRatesClient };
