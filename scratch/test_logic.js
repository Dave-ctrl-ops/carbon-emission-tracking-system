const http = require('http');

const test = (data) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/calculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

async function runTests() {
  console.log("Running Emission Logic Tests...");

  // Test Case 1: Petrol, 100km, 20km/L -> 5L -> 11.55kg (FAIL)
  const res1 = await test({ plate_number: "TEST1", distance: 100, mileage: 20, vehicle_type: "petrol" });
  console.log("Test 1 (FAIL):", res1.body.status === 'FAIL' && res1.body.total_emission.toFixed(2) === '11.55' ? "PASS" : "FAIL", res1.body);

  // Test Case 2: Petrol, 20km, 10km/L -> 2L -> 4.62kg (PASS)
  const res2 = await test({ plate_number: "TEST2", distance: 20, mileage: 10, vehicle_type: "petrol" });
  console.log("Test 2 (PASS):", res2.body.status === 'PASS' && res2.body.total_emission.toFixed(2) === '4.62' ? "PASS" : "FAIL", res2.body);

  // Test Case 3: Diesel, 50km, 25km/L -> 2L -> 5.36kg (FAIL)
  const res3 = await test({ plate_number: "TEST3", distance: 50, mileage: 25, vehicle_type: "diesel" });
  console.log("Test 3 (FAIL):", res3.body.status === 'FAIL' && res3.body.total_emission.toFixed(2) === '5.36' ? "PASS" : "FAIL", res3.body);

  // Test Case 4: Invalid Mileage (0)
  const res4 = await test({ plate_number: "TEST4", distance: 100, mileage: 0, vehicle_type: "petrol" });
  console.log("Test 4 (Invalid Mileage):", res4.status === 400 && res4.body.error === 'Invalid mileage' ? "PASS" : "FAIL", res4.body);

  process.exit(0);
}

runTests();
