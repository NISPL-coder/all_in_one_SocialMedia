import axios from 'axios';
import {
  PlatformType,
  SocialPostDTO,
  MediaAssetDTO,
  ConnectedAccountDTO,
  DashboardSummaryDTO,
  AICaptionRequest,
  AICaptionResponse,
} from '@socialhub/shared';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token is stored in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('socialhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    localStorage.removeItem('socialhub_token');
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Analytics
  getDashboardSummary: async (): Promise<DashboardSummaryDTO & { recentErrors: any[] }> => {
    const res = await apiClient.get('/analytics/summary');
    return res.data.summary;
  },
  getPlatformStats: async () => {
    const res = await apiClient.get('/analytics/platforms');
    return res.data.platforms;
  },

  // Accounts
  getAccounts: async (): Promise<ConnectedAccountDTO[]> => {
    const res = await apiClient.get('/accounts');
    return res.data.accounts;
  },
  connectAccount: async (platform: PlatformType) => {
    const res = await apiClient.post(`/accounts/${platform.toLowerCase()}/connect`);
    return res.data;
  },
  testAccount: async (id: string) => {
    const res = await apiClient.post(`/accounts/${id}/test`);
    return res.data;
  },
  disconnectAccount: async (id: string) => {
    const res = await apiClient.delete(`/accounts/${id}`);
    return res.data;
  },
  saveAccountToken: async (
    platform: PlatformType,
    data: { accessToken: string; externalId?: string; accountName?: string }
  ) => {
    const res = await apiClient.post(`/accounts/${platform.toLowerCase()}/token`, data);
    return res.data;
  },

  // Posts
  getPosts: async (status?: string, search?: string): Promise<SocialPostDTO[]> => {
    const res = await apiClient.get('/posts', { params: { status, search } });
    return res.data.posts;
  },
  getPost: async (id: string): Promise<SocialPostDTO> => {
    const res = await apiClient.get(`/posts/${id}`);
    return res.data.post;
  },
  createPost: async (data: any): Promise<SocialPostDTO> => {
    const res = await apiClient.post('/posts', data);
    return res.data.post;
  },
  publishPostNow: async (id: string) => {
    const res = await apiClient.post(`/posts/${id}/publish`);
    return res.data;
  },
  schedulePost: async (id: string, scheduledTime: string) => {
    const res = await apiClient.post(`/posts/${id}/schedule`, { scheduledTime });
    return res.data;
  },
  cancelScheduledPost: async (id: string) => {
    const res = await apiClient.post(`/posts/${id}/cancel`);
    return res.data;
  },
  retryFailedPost: async (id: string) => {
    const res = await apiClient.post(`/posts/${id}/retry`);
    return res.data;
  },
  previewPost: async (data: any) => {
    const res = await apiClient.post('/posts/preview', data);
    return res.data.previews;
  },
  deletePost: async (id: string) => {
    const res = await apiClient.delete(`/posts/${id}`);
    return res.data;
  },

  // Media
  getMediaList: async (): Promise<MediaAssetDTO[]> => {
    const res = await apiClient.get('/media');
    return res.data.media;
  },
  uploadMedia: async (file: File): Promise<MediaAssetDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.media;
  },
  deleteMedia: async (id: string) => {
    const res = await apiClient.delete(`/media/${id}`);
    return res.data;
  },

  // AI Assistant
  generateAICaptions: async (data: AICaptionRequest): Promise<AICaptionResponse> => {
    const res = await apiClient.post('/ai/generate', data);
    return res.data;
  },

  // Settings
  getSettings: async () => {
    const res = await apiClient.get('/settings');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await apiClient.patch('/settings/profile', data);
    return res.data;
  },
};
