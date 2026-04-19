import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api/v1',
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

export interface CreateSubjectDTO {
  title_en: string;
  title_vi: string;
  slug?: string;
  color?: string;
}

export interface CreateGradeDTO {
  title_en: string;
  title_vi: string;
  slug?: string;
  subject_id: number;
}

export interface Subject {
  id: number;
  slug: string;
  title_en: string;
  title_vi: string;
  color?: string | null;
}

export interface Grade {
  id: number;
  slug: string;
  title_en: string;
  title_vi: string;
  subject_id?: number | null;
  subject?: Subject | null;
}

export interface Lesson {
  id: string;
  title_en: string;
  title_vi: string;
  content_markdown_en: string;
  content_markdown_vi: string;
  grade_id: number;
  subject_id: number;
  order_index: number;
  grade?: Grade | null;
  subject?: Subject | null;
}

export interface LessonMastery {
  lesson_id: string;
  completion_status: string;
  mastery_score: number;
  total_study_time?: number;
  total_test_time?: number;
  last_activity_at?: string;
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
  
  list: async (): Promise<Lesson[]> => {
    const response = await api.get('/lessons');
    return response.data;
  },

  getById: async (id: string): Promise<Lesson> => {
    const res = await api.get(`/lessons/${id}`);
    return res.data;
  },
  
  getGrades: async (): Promise<Grade[]> => {
    const response = await api.get('/lessons/grades');
    return response.data;
  },

  createGrade: async (data: CreateGradeDTO) => {
    const response = await api.post('/lessons/grades', data);
    return response.data;
  },

  getSubjects: async (): Promise<Subject[]> => {
    const response = await api.get('/lessons/subjects');
    return response.data;
  },

  createSubject: async (data: CreateSubjectDTO) => {
    const response = await api.post('/lessons/subjects', data);
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

  getMasteryAll: async (): Promise<LessonMastery[]> => {
    const response = await api.get('/lessons/mastery/all');
    return response.data;
  },

  trackStudyTime: async (id: string, seconds: number) => {
    const response = await api.post(`/lessons/${id}/study-time`, { seconds });
    return response.data;
  }
};
