
import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// ---------------------------------------------------------------------------
// JWT Authentication
// AuthContext manages secure token storage and updates this API client.
// ---------------------------------------------------------------------------

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function getAuthToken() {
  return authToken;
}

api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const getCaptcha = () =>
  api.get('/auth/captcha').then((r) => r.data);

export const registerUser = (payload) =>
  api.post('/auth/register', payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post('/auth/login', payload).then((r) => r.data);

export const getCurrentUser = () =>
  api.get('/auth/me').then((r) => r.data);

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (payload) =>
  api.post('/auth/reset-password', payload).then((r) => r.data);

export const updateProfile = (payload) =>
  api.put('/auth/profile', payload).then((r) => r.data);

export const changePassword = (payload) =>
  api.post('/auth/change-password', payload).then((r) => r.data);

// Always resolve to an array so a malformed/empty response can never crash a
// screen that maps or .find()s over it.
export const asArray = (value) =>
  Array.isArray(value) ? value : [];

// ---------------------------------------------------------------------------
// Parking areas / spaces
// ---------------------------------------------------------------------------

export const getAreas = () =>
  api.get('/areas').then((r) => r.data);

export const getArea = (id) =>
  api.get(`/areas/${id}`).then((r) => r.data);

export const getAreaSpaces = (id) =>
  api.get(`/areas/${id}/spaces`).then((r) => r.data);

export const createArea = (payload) =>
  api.post('/areas', payload).then((r) => r.data);

export const updateArea = (id, payload) =>
  api.put(`/areas/${id}`, payload).then((r) => r.data);

export const deleteArea = (id) =>
  api.delete(`/areas/${id}`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const getAllTransactions = () =>
  api.get('/transactions').then((r) => r.data);

export const getActiveTransactions = () =>
  api.get('/transactions/active').then((r) => r.data);

export const getStudentTransactions = (userId) =>
  api.get(`/transactions/student/${userId}`).then((r) => r.data);

export const submitParkingPhoto = (transactionId, photoBase64) =>
  api.post(`/transactions/${transactionId}/photo`, { photoBase64 })
    .then((r) => r.data);

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

export const guardScan = (payload) =>
  api.post('/guard/scan', payload).then((r) => r.data);

export const guardExit = (payload) =>
  api.post('/guard/exit', payload).then((r) => r.data);

export const createVisitorEntry = (payload) =>
  api.post('/guard/visitor', payload).then((r) => r.data);

export const visitorExit = (payload) =>
  api.post('/guard/visitor/exit', payload).then((r) => r.data);

// ---------------------------------------------------------------------------
// Reservations (faculty/admin only - backend enforces this)
// ---------------------------------------------------------------------------

export const createReservation = (payload) =>
  api.post('/reservations', payload).then((r) => r.data);

export const getReservations = () =>
  api.get('/reservations').then((r) => r.data);

export const cancelReservation = (id) =>
  api.put(`/reservations/${id}/cancel`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const getAdminOverview = () =>
  api.get('/admin/overview').then((r) => r.data);

export const getAdminUsers = () =>
  api.get('/admin/users').then((r) => r.data);

export const getAdminVisitors = () =>
  api.get('/admin/visitors').then((r) => r.data);

export const getAdminVehicles = () =>
  api.get('/admin/vehicles').then((r) => r.data);

export const getAdminPhotos = () =>
  api.get('/admin/photos').then((r) => r.data);

export const adminCheckout = (transactionId) =>
  api.post(`/admin/checkout/${transactionId}`).then((r) => r.data);

export const getGuardRequests = (status) =>
  api.get('/admin/guard-requests', {
    params: status ? { status } : {},
  }).then((r) => r.data);

export const approveGuard = (id) =>
  api.post(`/admin/guards/${id}/approve`).then((r) => r.data);

export const rejectGuard = (id) =>
  api.post(`/admin/guards/${id}/reject`).then((r) => r.data);

export const deleteAdminUser = (id) =>
  api.delete(`/admin/users/${id}`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

export const reportViolation = (payload) =>
  api.post('/violations', payload).then((r) => r.data);

export const getViolations = () =>
  api.get('/violations').then((r) => r.data);

export const updateViolationStatus = (id, status) =>
  api.put(`/violations/${id}/status`, { status }).then((r) => r.data);

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export const createAnnouncement = (payload) =>
  api.post('/announcements', payload).then((r) => r.data);

export const getAnnouncements = () =>
  api.get('/announcements').then((r) => r.data);

// ---------------------------------------------------------------------------
// Campus navigation (schematic, non-GPS)
// ---------------------------------------------------------------------------

export const getCampusNodes = () =>
  api.get('/navigation/nodes').then((r) => r.data);

export const getCampusEdges = () =>
  api.get('/navigation/edges').then((r) => r.data);

export const getCampusRoute = (fromKey, areaId) =>
  api.get('/navigation/route', {
    params: { from: fromKey, to: areaId },
  }).then((r) => r.data);

export default api;
