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

export interface CreateLessonDTO {
  title_en: string;
  title_vi: string;
  content_markdown_en: string;
  content_markdown_vi: string;
  grade_id: number;
  subject_id: number;
  order_index: number;
}

export const lessonService = {
  create: async (data: CreateLessonDTO) => {
    const response = await api.post('/lessons', data);
    return response.data;
  },

  update: async (id: string, data: CreateLessonDTO) => {
    const response = await api.put(`/lessons/${id}`, data);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete(`/lessons/${id}`);
    return response.data;
  },
  
  list: async () => {
    const response = await api.get('/lessons');
    return response.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/lessons/${id}`);
    return res.data;
  },
  
  getGrades: async () => {
    const response = await api.get('/lessons/grades');
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get('/lessons/subjects');
    return response.data;
  },

  startPractice: async (id: string, difficulty?: string) => {
    const response = await api.post(`/lessons/${id}/practice`, {
      difficulty: difficulty && difficulty !== "all" ? difficulty : undefined,
    });
    return response.data;
  },

  getAvailablePractices: async () => {
    const response = await api.get('/lessons/practice-available');
    return response.data;
  },

  getMasteryAll: async () => {
    const response = await api.get('/lessons/mastery/all');
    return response.data;
  },

  trackStudyTime: async (id: string, seconds: number) => {
    const response = await api.post(`/lessons/${id}/study-time`, { seconds });
    return response.data;
  }
};
