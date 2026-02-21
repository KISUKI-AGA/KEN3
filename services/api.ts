import { User } from '../types';

const API_URL = 'http://localhost:3001/api';

// Helper to handle fetch with timeout
// If backend doesn't respond in 1000ms, we assume it's offline and fallback immediately.
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

// Helper to simulate network delay for better UX in offline mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createUser = async (name: string, avatar: string, grade: string, gender: string): Promise<User> => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar, grade, gender }),
    }, 1500); // 1.5s timeout for login
    
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  } catch (error) {
    console.warn("Backend unreachable or timed out, falling back to LocalStorage mode.", error);
    
    // Mock Local Storage Implementation
    const users: User[] = JSON.parse(localStorage.getItem('sel_users') || '[]');
    const newUser: User = {
      id: Date.now(), // Generate a pseudo-unique ID
      name,
      avatar,
      grade,
      gender
    };
    users.push(newUser);
    localStorage.setItem('sel_users', JSON.stringify(users));
    return newUser;
  }
};

export const submitResponse = async (userId: number, questionId: number, score: number) => {
  try {
    // Very short timeout for responses to ensure UI stays snappy
    const res = await fetchWithTimeout(`${API_URL}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, question_id: questionId, score }),
    }, 800); 
    
    if (!res.ok) throw new Error('Failed to submit response');
    return res.json();
  } catch (error) {
    // Silent fallback
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

// Returns an object containing the data and the source (DB or LOCAL)
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
    
    // Simulate SQL Join: responses JOIN users ON user_id
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

    // Sort by timestamp desc
    const sorted = joined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { source: 'LOCAL', data: sorted };
  }
};

export const clearLocalData = () => {
    localStorage.removeItem('sel_users');
    localStorage.removeItem('sel_responses');
};
