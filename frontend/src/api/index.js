import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const crmAPI = {
  // Contacts
  getContacts: (params = {}) => api.get('/contacts', { params }),
  getContact: (id) => api.get(`/contacts/${id}`),
  createContact: (data) => api.post('/contacts', data),
  updateContact: (id, data) => api.put(`/contacts/${id}`, data),
  deleteContact: (id) => api.delete(`/contacts/${id}`),
  searchContacts: (query, limit = 20) => api.get('/contacts/search', { params: { q: query, limit } }),
  getContactInteractions: (id, limit = 50) => api.get(`/contacts/${id}/interactions`, { params: { limit } }),

  // Interactions
  createInteraction: (data) => api.post('/interactions', data),

  // Email Templates
  getTemplates: () => api.get('/templates'),
  getTemplate: (id) => api.get(`/templates/${id}`),
  createTemplate: (data) => api.post('/templates', data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),

  // Campaigns
  getCampaigns: () => api.get('/campaigns'),
  getCampaign: (id) => api.get(`/campaigns/${id}`),
  createCampaign: (data) => api.post('/campaigns', data),
  sendCampaign: (id) => api.post(`/campaigns/${id}/send`),

  // Email Sequences
  getSequences: () => api.get('/sequences'),
  getSequence: (id) => api.get(`/sequences/${id}`),
  createSequence: (data) => api.post('/sequences', data),
  enrollContactInSequence: (sequenceId, contactId) => 
    api.post(`/sequences/${sequenceId}/enroll/${contactId}`),

  // Analytics
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getLeadSourceStats: () => api.get('/analytics/lead-sources'),
  getContactStatusStats: () => api.get('/analytics/contact-status'),
  getRecentActivity: (limit = 10) => api.get('/analytics/recent-activity', { params: { limit } }),

  // System
  processSequences: () => api.post('/system/process-sequences'),
  sendTestEmail: (data) => api.post('/email/test', data),
};

export default api;
