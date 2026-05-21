import axios from 'axios';

// Dedicated axios instance for replaying queued submissions. Deliberately
// has NO interceptors: the global 401 interceptor in main.jsx would log the
// user out mid-replay if the queued JWT happens to be expired. The replay
// loop handles 401 itself by marking the record failed-auth and stopping.
export const replayClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
