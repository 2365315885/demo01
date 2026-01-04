import axios from 'axios';
import { getApiBase } from './apiConfig.js';

export function createHttpClient(getToken, onUnauthorized) {
  const instance = axios.create({
    baseURL: getApiBase(),
    timeout: 10000
  });

  instance.interceptors.request.use((config) => {
    config.baseURL = getApiBase();
    const token = getToken?.();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (resp) => resp,
    (err) => {
      const status = err?.response?.status;
      if (status === 401) {
        onUnauthorized?.();
      }
      return Promise.reject(err);
    }
  );

  return instance;
}
