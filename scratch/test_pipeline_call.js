async function test() {
  const requestPayload = {
    customer: 'Test',
    product: {
      name: 'Test Product',
      description: 'Test Description',
      origin_country: 'CA',
      destination_country: 'DE',
      hs_code_hint: '8541.40'
    }
  };

  const response = await fetch('https://circletrade-agent-api-production.up.railway.app/api/pipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'ct-demo-key-2026'
    },
    body: JSON.stringify(requestPayload)
  });

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Body:', JSON.stringify(data, null, 2));
}
test();
