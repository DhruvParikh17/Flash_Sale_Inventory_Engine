import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 200,         // 200 virtual users blasting requests simultaneously
  duration: '10s',  // Duration of traffic spike
};

export default function () {
  const url = 'http://localhost:3000/api/orders';
  const payload = JSON.stringify({
    userId: `user_${__VU}_${__ITER}`,
    quantity: 1,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 201 or 400': (r) => r.status === 201 || r.status === 400,
  });
}