import { User } from '../types';

// 支援環境變數設定，若無則預設為本地端 3001 port
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper to handle fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 1000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createUser = async (name: string, avatar: string, grade: string, gender: string): Promise<User> => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar, grade, gender }),
    }, 1500);
    
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  } catch (error) {
    console.warn("Backend unreachable or timed out, falling back to LocalStorage mode.", error);
    
    const users: User[] = JSON.parse(localStorage.getItem('sel_users') || '[]');
    const newUser: User = { id: Date.now(), name, avatar, grade, gender };
    users.push(newUser);
    localStorage.setItem('sel_users', JSON.stringify(users));
    return newUser;
  }
};

export const submitResponse = async (userId: number, questionId: number, score: number) => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, question_id: questionId, score }),
    }, 800); 
    
    if (!res.ok) throw new Error('Failed to submit response');
    return res.json();
  } catch (error) {
    const responses = JSON.parse(localStorage.getItem('sel_responses') || '[]');
    responses.push({
      id: Date.now(),
      user_id: userId,
      question_id: questionId,
      score,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('sel_responses', JSON.stringify(responses));
    return { id: Date.now(), status: 'saved_local' };
  }
};

export const fetchAllResponses = async () => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/admin/responses`, {}, 2000);
    if (!res.ok) throw new Error('Failed to fetch responses');
    const data = await res.json();
    return { source: 'DB', data };
  } catch (error) {
    console.warn("Backend unreachable, returning LocalStorage data.");
    const users: User[] = JSON.parse(localStorage.getItem('sel_users') || '[]');
    const responses: any[] = JSON.parse(localStorage.getItem('sel_responses') || '[]');
    
    const joined = responses.map(r => {
      const user = users.find(u => u.id === r.user_id);
      return {
        user_id: user ? user.id : -1,
        user_name: user ? user.name : 'Unknown (Local)',
        user_avatar: user ? user.avatar : '🙂',
        user_grade: user ? user.grade : '',
        user_gender: user ? user.gender : '',
        question_id: r.question_id,
        score: r.score,
        timestamp: r.timestamp
      };
    });

    const sorted = joined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { source: 'LOCAL', data: sorted };
  }
};

export const clearLocalData = () => {
    localStorage.removeItem('sel_users');
    localStorage.removeItem('sel_responses');
};