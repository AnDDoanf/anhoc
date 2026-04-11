import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
});

// Add interceptor to include token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateTemplateDTO {
  lesson_id?: string;
  template_type: string;
  body_template_en: string;
  body_template_vi: string;
  explanation_template_en?: string;
  explanation_template_vi?: string;
  logic_config?: any;
  accepted_formulas?: string[];
}

export const testService = {
  createTemplate: async (data: CreateTemplateDTO) => {
    const response = await api.post('/tests/templates', data);
    return response.data;
  },
  listTemplates: async () => {
    const response = await api.get('/tests/templates');
    return response.data;
  },
  updateTemplate: async (id: string, data: CreateTemplateDTO) => {
    const response = await api.put(`/tests/templates/${id}`, data);
    return response.data;
  },
  removeTemplate: async (id: string) => {
    const response = await api.delete(`/tests/templates/${id}`);
    return response.data;
  },

  getAttempt: async (attemptId: string) => {
    const response = await api.get(`/tests/attempts/${attemptId}`);
    return response.data;
  },
  submitAnswer: async (snapshotId: string, studentAnswer: string) => {
    const response = await api.post('/tests/submit-answer', { snapshotId, studentAnswer });
    return response.data;
  },
  finishAttempt: async (attemptId: string) => {
    const response = await api.post(`/tests/attempts/${attemptId}/finish`);
    return response.data;
  },

  getPracticeHistory: async () => {
    const response = await api.get('/tests/my-practice-history');
    return response.data;
  }
};
