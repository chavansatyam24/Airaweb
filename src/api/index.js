import api from './http';

// ============ DASHBOARD ============
export const dashboardApi = {
  overdueLeaderboard: (params) => api.get('/api/dashboard/overdue-leaderboard', { params }).then(r => r.data),
  latestReport: (date) => api.get('/api/dashboard/reports/latest', { params: date ? { date } : undefined }).then(r => r.data),
  reports: () => api.get('/api/dashboard/reports').then(r => r.data),
};

// ============ CLIENT DUE REPORT ============
export const clientDueReportApi = {
  summary: () => api.get('/api/client-due-report/summary').then(r => r.data),
  conversationsSummary: () => api.get('/api/client-due-report/conversations-summary').then(r => r.data),
  topOverDueReport: (limit = 5, page = 1, search, filter, sort) =>
    api.get('/api/client-due-report/topOverDueReport', {
      params: {
        limit, page,
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(filter && filter !== 'all' ? { filter } : {}),
        ...(sort ? { sort } : {}),
      },
    }).then(r => r.data),
};

// ============ CLIENTS ============
export const clientApi = {
  list: (params) => api.get('/api/clients', { params }).then(r => r.data),
  get: (id) => api.get(`/api/clients/${id}`).then(r => r.data),
  pause: (id, body) => api.post(`/api/clients/${id}/pause`, body).then(r => r.data),
  block: (id, body) => api.post(`/api/clients/${id}/order-block`, body).then(r => r.data),
  setTier: (id, body) => api.patch(`/api/clients/${id}/tier`, body).then(r => r.data),
  setScreenshotPref: (id, body) => api.patch(`/api/clients/${id}/screenshot-preference`, body).then(r => r.data),
  sendMessage: (id, body) => api.post(`/api/clients/${id}/send-message`, body).then(r => r.data),
};

// ============ QUEUE / APPROVAL ============
export const queueApi = {
  list: (params) => api.get('/api/queue', { params }).then(r => r.data),
  awaitingApproval: (params) => api.get('/api/approvals', { params }).then(r => r.data),
  updateBody: (id, body) => api.patch(`/api/approvals/${id}/body`, body).then(r => r.data),
  approve: (id, payload) => api.post(`/api/approvals/${id}/approve`, payload).then(r => r.data),
  reject: (id, body) => api.post(`/api/approvals/${id}/reject`, body).then(r => r.data),
  held: (params) => api.get('/api/approvals/held', { params }).then(r => r.data),
};

// ============ BRAIN ============
export const brainApi = {
  lessons: (params) => api.get('/api/brain/lessons', { params }).then(r => r.data),
  lessonsStats: () => api.get('/api/brain/lessons/stats').then(r => r.data),
  getLesson: (id) => api.get(`/api/brain/lessons/${id}`).then(r => r.data),
  deleteLesson: (id) => api.delete(`/api/brain/lessons/${id}`).then(r => r.data),
  constitution: () => api.get('/api/brain/constitution').then(r => r.data),
  expertKnowledge: () => api.get('/api/brain/expert-knowledge').then(r => r.data),
  clientProfile: (clientId) => api.get(`/api/brain/profile/${clientId}`).then(r => r.data),
};

// ============ KNOWLEDGE ============
export const knowledgeApi = {
  list: (params) => api.get('/api/knowledge', { params }).then(r => r.data),
  approvePattern: (id, editedText) =>
    api.patch(`/api/historical/patterns/${id}`, editedText ? { status: 'approved', editedPattern: editedText } : { status: 'approved' }).then(r => r.data),
  rejectPattern: (id, reason) =>
    api.patch(`/api/historical/patterns/${id}`, { status: 'rejected', ...(reason ? { rejectionReason: reason } : {}) }).then(r => r.data),
  bulkApprove: (ids, userId) =>
    api.post('/api/historical/patterns/bulk-approve', { ids, userId }).then(r => r.data),
};

// ============ POOJA CHAT ============
export const poojaChatApi = {
  messages: (userId, limit = 100) => api.get('/api/pooja-chat/messages', { params: { userId, limit } }).then(r => r.data),
  send: (body, userId) => api.post('/api/pooja-chat/send', { body, userId }).then(r => r.data),
  confirm: (msgId, userId, approved) => api.post(`/api/pooja-chat/confirm/${msgId}`, { userId, approved }).then(r => r.data),
  instructions: (params) => api.get('/api/pooja-chat/instructions', { params }).then(r => r.data),
  updateInstruction: (id, body) => api.patch(`/api/pooja-chat/instructions/${id}`, body).then(r => r.data),
  deleteInstruction: (id) => api.delete(`/api/pooja-chat/instructions/${id}`).then(r => r.data),
};

// ============ CONVERSATIONS ============
export const conversationApi = {
  feed: () => api.get('/api/conversations/feed').then(r => r.data),
  recent: () => api.get('/api/conversations/recent').then(r => r.data),
  clientOverview: (clientCode) => api.get('/api/conversations/client-overview', { params: { clientCode } }).then(r => r.data),
  clientChats: (params) => api.get('/api/conversations/client-chats', { params }).then(r => r.data),
  forClient: (clientId) => api.get('/api/conversations', { params: { clientId } }).then(r => r.data),
  sendDirect: (body) => api.post('/api/conversations/send-direct', body).then(r => r.data),
  editAmount: (id, body) => api.patch(`/api/conversations/${id}/edit-amount`, body).then(r => r.data),
};

// ============ PROMISES ============
export const promiseApi = {
  stats: () => api.get('/api/promises/stats').then(r => r.data),
  clients: (params) => api.get('/api/promises/clients', { params }).then(r => r.data),
  list: (params) => api.get('/api/promises', { params }).then(r => r.data),
  board: () => api.get('/api/promises/board').then(r => r.data),
  delete: (id) => api.delete(`/api/promises/${id}`).then(r => r.data),
};

// ============ DISPUTES ============
export const disputeApi = {
  list: (params) => api.get('/api/disputes/all', { params }).then(r => r.data),
  counts: () => api.get('/api/disputes/counts').then(r => r.data),
  board: () => api.get('/api/disputes/board').then(r => r.data),
  updateStatus: (id, body) => api.patch(`/api/disputes/${id}/status`, body).then(r => r.data),
  delete: (id) => api.delete(`/api/disputes/${id}`).then(r => r.data),
};

// ============ UNFIX SETTLEMENTS ============
export const unfixApi = {
  list: (params) => api.get('/api/unfix-settlements', { params }).then(r => r.data),
  board: () => api.get('/api/unfix-settlements/board').then(r => r.data),
  get: (id) => api.get(`/api/unfix-settlements/${id}`).then(r => r.data),
  ceoApprove: (id, body) => api.post(`/api/unfix-settlements/${id}/ceo-approve`, body).then(r => r.data),
  close: (id, body) => api.post(`/api/unfix-settlements/${id}/close`, body).then(r => r.data),
  liveRates: () => api.get('/api/unfix-settlements/rates/live').then(r => r.data),
};

// ============ ADMIN ============
export const adminApi = {
  config: () => api.get('/api/admin/config').then(r => r.data),
  toggleApproval: (enabled, by) => api.patch('/api/admin/approval-mode', { enabled, by }).then(r => r.data),
  testCliq: () => api.post('/api/admin/test-cliq').then(r => r.data),
  auditLog: (limit = 100) => api.get('/api/admin/audit-log', { params: { limit } }).then(r => r.data),
  registerPushToken: (token, userId) => api.post('/api/admin/push-token', { token, userId }).then(r => r.data),
  regeneratePendingReminders: () => api.post('/api/admin/regenerate-pending-reminders', undefined, { timeout: 120000 }).then(r => r.data),
  regenerateReminder: (convId) => api.post('/api/admin/regenerate-reminder', { convId }, { timeout: 120000 }).then(r => r.data),
  generateTemplate: (clientCode) => api.post('/api/admin/generate-template', { clientCode }, { timeout: 60000 }).then(r => r.data),
};

// ============ AUTH ============
export const authApi = {
  login: (username, password, rememberMe = false) =>
    api.post('/api/auth/login', { username, password, rememberMe }).then(r => {
      if (!r.data.success || !r.data.data) {
        const err = new Error(r.data.message ?? 'Login failed');
        err.serverMessage = r.data.message;
        throw err;
      }
      return {
        token: r.data.data.token,
        user: {
          id: r.data.data._id,
          username: r.data.data.username,
          name: r.data.data.username,
          rights: r.data.data.rights,
        },
      };
    }),
  me: () => api.get('/api/auth/me').then(r => r.data),
  logout: () => api.post('/api/auth/logout').then(r => r.data),
};

export const permissionsApi = {
  fetch: () => api.get('/api/auth/permissions').then(r => r.data),
};
