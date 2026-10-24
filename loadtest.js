import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  iterations: 1000,
};

export default function () {
  const response = http.get(`${__ENV.TARGET_URL}/pets`);

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
