
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import CryptoJS from 'crypto-js';
import axios from 'axios';

// Debug logging utility - disable in production
const DEBUG = import.meta.env.MODE === 'development';
const log = (...args) => DEBUG && console.log(...args);
const logError = (...args) => DEBUG && console.error(...args);

const LOGIN_API_URL = 'https://rddzcmzwy0.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_User_Sign-in';
const REGISTRATION_API_URL = 'https://tbfwx7oig0.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_User_Registartion';
const ADMIN_SIGNOUT_URL = 'https://kfcqaoxdq4.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Admin_Sign-Out';
const COACH_SIGNOUT_URL = 'https://fg0kuvganf.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Coaches_Sign-Out';
const VIEW_COACHES_URL = 'https://i59ysdhpzg.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_All_Coachs';
const ADD_PLAYER_URL = 'https://k55q3tmr76.execute-api.ap-south-1.amazonaws.com/default/CL_Add_Players';
const GET_PLAYERS_URL = 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players';
const UPDATE_PLAYER_URL = 'https://9ydkfa1f6e.execute-api.ap-south-1.amazonaws.com/default/CL_Update_Player';
const DELETE_PLAYER_URL = 'https://0znfad55li.execute-api.ap-south-1.amazonaws.com/default/CL_Delete_Player';
const UPDATE_COACH_URL = 'https://3fae11rhag.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Updating_Coaches';
const DELETE_COACH_URL = 'https://950582ec8g.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Deleting_Coaches';
const UPDATE_REMOVE_ASSIGNED_PLAYER_URL = 'https://50mhdn561a.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Update_Remove_Assigned_Player';
const ASSIGN_PLAYERS_TO_COACH_URL = 'https://2tvxk1vikd.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Assigned_Player_To_Coaches';
const GET_LEARNING_PATHWAY_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const VIEW_USER_PROFILE_URL = 'https://0lvq0g7g24.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_User_Profile';

// Setup axios interceptor to add userToken to all requests
let requestInterceptorId = null;
let responseInterceptorId = null;

const setupAxiosInterceptor = (token) => {
  if (token) {
    // Clear previous interceptor if it exists
    if (requestInterceptorId !== null) {
      axios.interceptors.request.eject(requestInterceptorId);
    }
    
    axios.defaults.headers.common['userToken'] = token;
    
    // Remove Authorization header if it exists (it causes CORS issues)
    delete axios.defaults.headers.common['Authorization'];
    
    // Add request interceptor to log headers and ensure userToken is set
    requestInterceptorId = axios.interceptors.request.use(config => {
      // Track request start time for performance monitoring
      config.metadata = { startTime: Date.now() };
      
      // Set userToken header
      if (token) {
        config.headers['userToken'] = token;
      }
      
      // Remove Authorization header if it exists
      if (config.headers['Authorization']) {
        delete config.headers['Authorization'];
      }
      
      // log('Axios request headers:', config.headers);
      return config;
    });
  }
};

// Setup response interceptor to handle 401 errors globally
const setupResponseInterceptor = () => {
  // Clear previous interceptor if it exists
  if (responseInterceptorId !== null) {
    axios.interceptors.response.eject(responseInterceptorId);
  }

  responseInterceptorId = axios.interceptors.response.use(
    response => {
      // Track response time for successful calls
      if (response.config.metadata) {
        const duration = Date.now() - response.config.metadata.startTime;
        if (DEBUG && duration > 1000) {
          console.warn(`SLOW API: ${response.config.url} took ${duration}ms`);
        }
      }
      
      // Reset unauthorized error count on successful response
      const state = useStore.getState();
      if (state.unauthorizedErrorCount > 0) {
        useStore.setState({ unauthorizedErrorCount: 0 });
      }
      
      return response;
    },
    error => {
      // Track response time for failed calls
      if (error.config && error.config.metadata) {
        const duration = Date.now() - error.config.metadata.startTime;
        console.error(`API ERROR: ${error.config.url} failed after ${duration}ms`);
      }
      
    
      
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Your session has expired';


      // Handle 401 Unauthorized responses - only show modal after 3 consecutive errors
      if (status === 401) {
        const state = useStore.getState();
        const newCount = (state.unauthorizedErrorCount || 0) + 1;
        
        
        try {
          // Update the error counter
          useStore.setState({ unauthorizedErrorCount: newCount });
          
          // Only show the modal after 3 consecutive 401 errors
          if (newCount >= 3) {
            console.error('SHOWING UNAUTHORIZED MODAL - 3 consecutive 401 errors');
            useStore.setState({
              showUnauthorizedModal: true,
              unauthorizedMessage: message
            });
          }
          
        } catch (stateError) {
          console.error('ERROR updating state:', stateError);
        }

        // Return error to prevent further propagation
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );
};

// Clear axios interceptor and headers
const clearAxiosInterceptor = () => {
  // Remove the request interceptor
  if (requestInterceptorId !== null) {
    axios.interceptors.request.eject(requestInterceptorId);
    requestInterceptorId = null;
  }

  // Remove the response interceptor
  if (responseInterceptorId !== null) {
    axios.interceptors.response.eject(responseInterceptorId);
    responseInterceptorId = null;
  }
  
  // Clear all default headers
  delete axios.defaults.headers.common['userToken'];
  delete axios.defaults.headers.common['Authorization'];
  
  // Reset to default state
  axios.defaults.headers.common = {};
};

// Helper function to get persisted auth from localStorage
const getPersistedAuth = () => {
  try {
    const stored = localStorage.getItem('coachlife_auth');
    if (stored) {
      const auth = JSON.parse(stored);
      if (auth.userToken) {
        setupAxiosInterceptor(auth.userToken);
      }
      return auth;
    }
  } catch (error) {
    logError('Error reading auth from localStorage:', error);
  }
  return { currentUser: null, isAuthenticated: false, userToken: null };
};

const initialAuth = getPersistedAuth();

export const useStore = create(
  persist(
    (set, get) => ({
  // Auth state
  currentUser: initialAuth.currentUser,
  isAuthenticated: initialAuth.isAuthenticated,
  userToken: initialAuth.userToken || null,
  lastVisitedPage: null,
  
  // Unauthorized error state
  showUnauthorizedModal: false,
  unauthorizedMessage: 'Your session has expired. Please log in again.',
  unauthorizedErrorCount: 0, // Track consecutive 401 errors

  // Helper methods for role checking
  hasRole: (roleToCheck) => {
    const state = get();
    if (!state.currentUser) return false;
    const roles = state.currentUser.roles || [state.currentUser.role];
    return roles.includes(roleToCheck.toLowerCase());
  },

  hasAnyRole: (rolesToCheck) => {
    const state = get();
    if (!state.currentUser) return false;
    const roles = state.currentUser.roles || [state.currentUser.role];
    return rolesToCheck.some(role => roles.includes(role.toLowerCase()));
  },

  getAllRoles: () => {
    const state = get();
    return state.currentUser?.roles || [state.currentUser?.role] || [];
  },

  // Data state
  players: [],
  coaches: [],
  coachesLoading: false,
  playersLoading: false,
  learningPathway: [],
  selectedPlayer: null, // Persisted to remember last selected player in SessionCardManage
  
  // Cache management
  playersLastFetchTime: 0,
  coachesLastFetchTime: 0,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
  
  sessionHistory: [
    // Dummy sessions for demo
    { sessionId: 's100', playerId: 'p1', coachId: 'c1', playerName: 'John Smith', coachName: 'Coach', sessionDate: '2024-12-05', status: 'draft', rating: 0, defaultPoints: 30, bonusPoints: 0, activities: [{id: 1, activityName: 'Speed Training', programs: ['speed'], defaultPoints: 15}, {id: 2, activityName: 'Strength Work', programs: ['strength'], defaultPoints: 15}], feedback: '', interested: false, repeat: false, onTime: false },
    { sessionId: 's101', playerId: 'p1', coachId: 'c1', playerName: 'John Smith', coachName: 'Coach', sessionDate: '2024-12-01', status: 'submitted', rating: 4, defaultPoints: 25, bonusPoints: 5, activities: [{id: 1, activityName: 'Agility Drills', programs: ['agility'], defaultPoints: 25}], feedback: 'Great improvement!', interested: true, repeat: true, onTime: true },
    { sessionId: 's102', playerId: 'p2', coachId: 'c1', playerName: 'Alex Johnson', coachName: 'Coach', sessionDate: '2024-12-04', status: 'draft', rating: 0, defaultPoints: 35, bonusPoints: 0, activities: [{id: 1, activityName: 'Technical Skills', programs: ['technique'], defaultPoints: 20}, {id: 2, activityName: 'Endurance', programs: ['endurance'], defaultPoints: 15}], feedback: '', interested: false, repeat: false, onTime: false },
    { sessionId: 's103', playerId: 'p2', coachId: 'c1', playerName: 'Alex Johnson', coachName: 'Coach', sessionDate: '2024-11-28', status: 'submitted', rating: 5, defaultPoints: 40, bonusPoints: 10, activities: [{id: 1, activityName: 'Speed Training', programs: ['speed'], defaultPoints: 20}, {id: 2, activityName: 'Strength Work', programs: ['strength'], defaultPoints: 20}], feedback: 'Excellent performance!', interested: true, repeat: false, onTime: true },
    { sessionId: 's104', playerId: 'p3', coachId: 'c1', playerName: 'Jordan Lee', coachName: 'Coach', sessionDate: '2024-12-03', status: 'draft', rating: 0, defaultPoints: 20, bonusPoints: 0, activities: [{id: 1, activityName: 'Speed Training', programs: ['speed'], defaultPoints: 20}], feedback: '', interested: false, repeat: false, onTime: false },
    { sessionId: 's105', playerId: 'p4', coachId: 'c1', playerName: 'Emma Davis', coachName: 'Coach', sessionDate: '2024-12-02', status: 'submitted', rating: 5, defaultPoints: 45, bonusPoints: 15, activities: [{id: 1, activityName: 'Strength Work', programs: ['strength'], defaultPoints: 20}, {id: 2, activityName: 'Endurance', programs: ['endurance'], defaultPoints: 15}, {id: 3, activityName: 'Technical Skills', programs: ['technique'], defaultPoints: 10}], feedback: 'Outstanding work!', interested: true, repeat: false, onTime: true },
  ],
  sessionDrafts: [],
  rewards: [],
  redeemHistory: [],

  // Auth actions
  login: async (username, password) => {
    try {
      const hashedPassword = CryptoJS.SHA256(password).toString();

      const response = await axios.post(LOGIN_API_URL, {
        username,
        password: hashedPassword,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      log('Login raw response:', response);
      log('Login response data:', response.data);

      // Handle different response structures
      let user = null;
      let userToken = null;

      // Try to extract user and token from various possible response structures
      if (response.data?.user && response.data.user.userToken) {
        user = response.data.user;
        userToken = response.data.user.userToken;
        log('Extracted from response.data.user.userToken');
      } else if (response.data?.userToken && (response.data.username || response.data.name)) {
        // User data is at root level with userToken
        user = response.data;
        userToken = response.data.userToken;
        log('Extracted from root level userToken');
      } else if (response.data?.body) {
        // Response might be wrapped in body
        const bodyData = typeof response.data.body === 'string' ? JSON.parse(response.data.body) : response.data.body;
        log('Parsed body data:', bodyData);
        if (bodyData?.userToken) {
          user = bodyData;
          userToken = bodyData.userToken;
          log('Extracted from body.userToken');
        }
      } else if (response.data?.userToken) {
        // Direct token at root with user data
        user = response.data;
        userToken = response.data.userToken;
        log('Extracted from direct root userToken');
      }

      log('Extracted user:', user);
      log('Extracted userToken:', userToken);

      if (user && userToken) {
        // Handle role as string or array
        let userRoles = [];
        if (typeof user.role === 'string') {
          userRoles = user.role.split(',').map(r => r.trim().toLowerCase());
        } else if (Array.isArray(user.role)) {
          userRoles = user.role.map(r => r.toLowerCase());
        } else {
          userRoles = ['coach']; // Default to coach if role not specified
        }

        // Extract userId from various possible response structures
        const userId = user.userId || user._id || user.id;

        const authData = {
          currentUser: {
            id: userId,
            userId: userId, // Store both for compatibility
            name: user.name,
            username: user.username,
            email: user.email,
            roles: userRoles, // Store as array
            role: userRoles[0], // Keep primary role for backward compatibility
            specialization: user.specialization,
            registrationTime: user.registrationTime
          },
          isAuthenticated: true,
          userToken: userToken
        };

        set({
          currentUser: authData.currentUser,
          isAuthenticated: true,
          userToken: userToken,
          unauthorizedErrorCount: 0
        });

        setupAxiosInterceptor(userToken);
        setupResponseInterceptor();
        localStorage.setItem('coachlife_auth', JSON.stringify(authData));

        log('Login successful, authData:', authData);
        return { success: true, user: authData.currentUser, token: userToken };
      } else {
        logError('Could not extract user and token from response:', response.data);
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('Login error:', error);
      logError('Login error full:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  },

      // Fetch assigned players for a coach from remote API
    fetchAssignedPlayersForCoach: async (coachId) => {
      const VIEW_ASSIGNED_PLAYER_URL = 'https://373785xmyf.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Assigned_Player';
      try {
        const state = get();
        const userToken = state.userToken;
        if (!userToken) {
          log('No auth token available for fetching assigned players');
          return { success: false, error: 'Authentication token missing' };
        }
        const payload = { coachId };
        // Try both header formats for compatibility
        const headers = { 
          'Content-Type': 'application/json', 
          'usertoken': userToken,
          'userToken': userToken 
        };
        const response = await axios.post(VIEW_ASSIGNED_PLAYER_URL, payload, { headers });
        let data = response.data;
        if (data && data.body && typeof data.body === 'string') {
          try { data = JSON.parse(data.body); } catch { /* parsing error */ }
        }
        // Expecting data.players or data.Items or data.body
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (Array.isArray(data.players)) items = data.players;
        else if (Array.isArray(data.Items)) items = data.Items;
        else if (Array.isArray(data.body)) items = data.body;
        else if (data.data && Array.isArray(data.data)) items = data.data;
                        
        
        return { success: true, players: items };
      } catch (error) {
        const statusCode = error.response?.status;
        const msg = error.response?.data?.message || error.message || 'Failed to fetch assigned players';
        
        // Don't log 401 errors here - they're already handled by response interceptor
        if (statusCode === 401) {
          logError(`Authentication failed (401) for assigned players fetch - modal shown`);
        } else {
          console.error(`Failed to fetch assigned players: ${msg} (Status: ${statusCode})`);
        }
        return { success: false, error: msg };
      }
    },

    fetchUserProfile: async (userId) => {
      try {
        const state = get();
        const userToken = state.userToken;
        if (!userToken) {
          log('No auth token available for fetching user profile');
          return { success: false, error: 'Authentication token missing' };
        }
        const payload = { userId: userId };
     
        const headers = { 
          'Content-Type': 'application/json', 
          'usertoken': userToken,
          'userToken': userToken 
        };
        const response = await axios.post(VIEW_USER_PROFILE_URL, payload, { headers });
        
        
        let data = response.data;
        if (data && data.body && typeof data.body === 'string') {
          try { data = JSON.parse(data.body); } catch { /* parsing error */ }
        }
        
        // Handle various response formats
        let profileData = null;
        if (data.data) profileData = data.data;
        else if (data.profile) profileData = data.profile;
        else if (data.user) profileData = data.user;
        else if (!Array.isArray(data)) profileData = data;
        
        if (!profileData) {
          return { success: false, error: 'Invalid profile data format' };
        }
        
        return { success: true, profile: profileData };
      } catch (error) {
        const statusCode = error.response?.status;
        const msg = error.response?.data?.message || error.message || 'Failed to fetch user profile';
        if (statusCode === 401) {
          console.error(`Authentication failed (401) for profile fetch: ${msg}`);
        } else {
          console.error(`Failed to fetch user profile: ${msg} (Status: ${statusCode})`);
        }
        return { success: false, error: msg };
      }
    },

  logout: async () => {
    try {
      // Clear axios interceptors and headers first for immediate response
      clearAxiosInterceptor();
      
      // Immediately clear auth state for fast logout
      set({
        currentUser: null,
        isAuthenticated: false,
        userToken: null,
        lastVisitedPage: null,
        showUnauthorizedModal: false,
        unauthorizedErrorCount: 0
      });
      // Clear from localStorage
      localStorage.removeItem('coachlife_auth');
      
      // Note: Sign-out API call removed for instant logout
      // User is already logged out locally, API notification is optional
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure state is cleared even if there's an error
      clearAxiosInterceptor();
      set({
        currentUser: null,
        isAuthenticated: false,
        userToken: null,
        lastVisitedPage: null,
        showUnauthorizedModal: false,
        unauthorizedErrorCount: 0
      });
      localStorage.removeItem('coachlife_auth');
    }
  },

  // Handle logout triggered by 401 unauthorized response
  handleUnauthorizedLogout: async () => {
    try {
      // Immediately clear auth state without waiting for API
      clearAxiosInterceptor();
      
      set({
        currentUser: null,
        isAuthenticated: false,
        userToken: null,
        lastVisitedPage: null,
        showUnauthorizedModal: false,
        unauthorizedMessage: 'Your session has expired. Please log in again.',
        unauthorizedErrorCount: 0
      });
      
      // Clear from localStorage
      localStorage.removeItem('coachlife_auth');
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Unauthorized logout error:', error);
      // Ensure state is cleared even if there's an error
      clearAxiosInterceptor();
      set({
        currentUser: null,
        isAuthenticated: false,
        userToken: null,
        lastVisitedPage: null,
        showUnauthorizedModal: false
      });
      localStorage.removeItem('coachlife_auth');
      window.location.href = '/login';
    }
  },

  setLastVisitedPage: (page) => {
    set({ lastVisitedPage: page });
  },

  // Initialize response interceptor - called on app startup
  initializeInterceptors: () => {
    const state = get();
    if (state.userToken) {
      setupResponseInterceptor();
    }
  },

  // Player actions
  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, { ...player, playerId: `p${state.players.length + 1}` }],
    }));
  },

  updatePlayer: (playerId, updatedData) => {
    set((state) => ({
      players: state.players.map(p => p.playerId === playerId ? { ...p, ...updatedData } : p),
    }));
  },

  deletePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter(p => p.playerId !== playerId),
    }));
  },

  getPlayerById: (playerId) => {
    return get().players.find(p => p.playerId === playerId);
  },

  getCoachById: (coachId) => {
    return get().coaches.find(c => c.coachId === coachId);
  },

  // Players: remote API integrations
  fetchPlayers: async () => {
    try {
      const state = get();
      
      // Enable cache - use cached data if available
      const now = Date.now();
      if (state.players.length > 0 && (now - state.playersLastFetchTime) < state.CACHE_DURATION) {
        return state.players;
      }
      
      set({ playersLoading: true });
      
      const token = state.userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['userToken'] = token;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(GET_PLAYERS_URL, { headers });
      let payload = response.data;
      if (payload && payload.body && typeof payload.body === 'string') {
        try { payload = JSON.parse(payload.body); } catch { /* parsing error */ }
      }

      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (Array.isArray(payload.players)) items = payload.players;
      else if (Array.isArray(payload.Items)) items = payload.Items;
      else if (Array.isArray(payload.body)) items = payload.body;

      const normalized = items.map((p, i) => ({
        playerId: p.playerId || p.id || p._id || `p${i + 1}`,
        name: p.playerName || p.name || p.fullName || 'Unknown',
        fatherName: p.fatherName || p.father || '',
        motherName: p.motherName || p.mother || '',
        dateOfBirth: p.dateOfBirth || p.dob || '',
        bloodGroup: p.bloodGroup || p.blood || '',
        address: p.address || '',
        phone: p.phone || p.mobile || '',
        alternativeNumber: p.alternativeNumber || p.altNumber || '',
        age: p.age || null,
        level: p.level || (p.age ? Math.max(1, Math.floor(p.age / 10)) : 1),
        stage: p.stage || p.stageNumber || 1,
        primaryCoach: p.primaryCoach || p.coachId || null,
        dateOfRegistration: p.dateOfRegistration || p.joinDate || new Date().toISOString().split('T')[0],
        status: p.status || 'active',
        LearningPathway: p.LearningPathway || p.learningPathway || p.pathway || '',
        // normalize total points and balance (API may return different field names)
        totalPoints: p.totalPointsEarned || p.totalPoints || p.TotalPoints || p.Total_Points || p.Total || 0,
        PointBalance: p.currentPoints || p.PointBalance || p.pointBalance || p.Point_Balance || p.PointsBalance || 0,
        progress: p.progress || 0,
        email: p.email || `${(p.playerName || 'player').toLowerCase().replace(/\s+/g, '.')}@example.com`
      }));

      set({ players: normalized, playersLastFetchTime: Date.now(), playersLoading: false });
      return { success: true, players: normalized };
    } catch (error) {
      logError('Fetch players error:', error?.response || error);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch players';
      set({ playersLoading: false });
      return { success: false, error: msg };
    }
  },

  addPlayerRemote: async (player) => {
    try {
      const token = get().userToken;
      log('Adding player with token:', token);
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) { headers['userToken'] = token; }

      // Send payload as-is since form already has correct field names
      const payload = {
        playerName: player.playerName,
        fatherName: player.fatherName || '',
        motherName: player.motherName || '',
        dateOfBirth: player.dateOfBirth || '',
        address: player.address || '',
        phone: player.phone,
        alternativeNumber: player.alternativeNumber || '',
        age: player.age || '',
        LearningPathway: player.LearningPathway,
        status: player.status || 'active'
      };

      log('Add player payload:', payload);
      log('Add player request headers:', headers);
      log('Add player API URL:', ADD_PLAYER_URL);

      const response = await axios.post(ADD_PLAYER_URL, payload, { headers });
      log('Add player response:', response.data);
      
      const data = response.data;

      // If API returns created record, use it; otherwise create local id
      const created = data?.createdPlayer || data?.player || data || {};
      const newPlayer = {
        playerId: created.playerId || created.id || created._id || `p${get().players.length + 1}`,
        name: created.playerName || payload.playerName,
        playerName: payload.playerName,
        fatherName: payload.fatherName,
        motherName: payload.motherName,
        dateOfBirth: payload.dateOfBirth,
        address: payload.address,
        phone: payload.phone,
        alternativeNumber: payload.alternativeNumber,
        age: payload.age,
        LearningPathway: payload.LearningPathway,
        totalPoints: created.totalPoints || created.TotalPoints || 0,
        PointBalance: created.PointBalance || created.pointBalance || 0,
        progress: created.progress || 0,
        email: created.email || `${payload.playerName.toLowerCase().replace(/\s+/g, '.') }@example.com`
      };

      log('New player created:', newPlayer);

      set((state) => ({ players: [...state.players, newPlayer], playersLastFetchTime: 0 }));
      return { success: true, player: newPlayer };
    } catch (error) {
      console.error('Add player error:', error?.response || error);
      logError('Add player error details:', error);
      logError('Add player error response:', error?.response?.data);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to add player';
      return { success: false, error: msg };
    }
  },

  updatePlayerRemote: async (playerId, updatedData) => {
    try {
      const token = get().userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) { headers['userToken'] = token; }

      // Add playerId to the payload as required by the API
      const payload = {
        ...updatedData,
        playerId: playerId
      };
      
      log('Update player payload:', payload);
      log('Update player URL:', UPDATE_PLAYER_URL);

      const response = await axios.post(UPDATE_PLAYER_URL, payload, { headers });
      const data = response.data || {};

      log('Update player response:', data);

      const updated = data.updatedPlayer || data.player || {};
      
      // Construct full player object with all fields
      const fullUpdatedPlayer = {
        playerId: playerId,
        name: updated.playerName || updatedData.playerName,
        playerName: updated.playerName || updatedData.playerName,
        fatherName: updated.fatherName || updatedData.fatherName || '',
        motherName: updated.motherName || updatedData.motherName || '',
        dateOfBirth: updated.dateOfBirth || updatedData.dateOfBirth || '',
        bloodGroup: updated.bloodGroup || updatedData.bloodGroup || '',
        address: updated.address || updatedData.address || '',
        phone: updated.phone || updatedData.phone || '',
        alternativeNumber: updated.alternativeNumber || updatedData.alternativeNumber || '',
        age: updated.age || updatedData.age || '',
        LearningPathway: updated.LearningPathway || updatedData.LearningPathway || '',
        stage: updated.stage || updatedData.stage || 'foundation',
        totalPoints: updated.totalPoints || updated.TotalPoints || 0,
        PointBalance: updated.PointBalance || updated.pointBalance || 0,
        progress: updated.progress || 0,
        email: updated.email || `${(updatedData.playerName || 'player').toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: updated.status || updatedData.status || 'active'
      };

      log('Updated player:', fullUpdatedPlayer);

      set((state) => ({
        players: state.players.map(p => p.playerId === playerId ? { ...p, ...fullUpdatedPlayer } : p),
        playersLastFetchTime: 0
      }));

      return { success: true, player: fullUpdatedPlayer };
    } catch (error) {
      console.error('Update player error:', error?.response || error);
      logError('Update player error details:', error);
      logError('Update player error response:', error?.response?.data);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to update player';
      return { success: false, error: msg };
    }
  },

  deletePlayerRemote: async (playerId) => {
    try {
      const state = get();
      const token = state.userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) { headers['userToken'] = token; }

      if (!token) {
        console.warn('No authentication token available');
        return { success: false, error: 'Authentication token missing' };
      }

      log('Delete player with ID:', playerId);
      log('Delete player headers:', headers);
      
      const response = await axios.delete(DELETE_PLAYER_URL, {
        headers,
        data: { playerId }
      });
      const data = response.data || {};

      log('Delete player response:', data);

      // Remove locally regardless of API response success to keep UI responsive
      set((state) => ({ players: state.players.filter(p => p.playerId !== playerId) }));
      return { success: true, data };
    } catch (error) {
      console.error('Delete player error:', error?.response?.status, error?.response?.data || error);
      logError('Delete player error details:', error);
      logError('Delete player error response:', error?.response?.data);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to delete player';
      return { success: false, error: msg };
    }
  },

  // Delete coach remotely
  deleteCoachRemote: async (coachId) => {
    try {
      const token = get().userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) { headers['userToken'] = token; }

      const response = await axios.delete(DELETE_COACH_URL, { headers, data: { coachId } });
      const data = response.data || {};

      // Remove locally regardless to keep UI responsive
      set((state) => ({ coaches: state.coaches.filter(c => c.coachId !== coachId) }));

      return { success: true, data };
    } catch (error) {
      console.error('Delete coach error:', error?.response || error);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to delete coach';
      return { success: false, error: msg };
    }
  },

  // Update coach remotely
  updateCoachRemote: async (coachId, updatedData) => {
    try {
      const token = get().userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) { headers['userToken'] = token; }

      const payload = { coachId, ...updatedData };
      const response = await axios.put(UPDATE_COACH_URL, payload, { headers });
      const data = response.data || {};

      // Normalize returned coach if any
      const updated = data.updatedCoach || data.coach || updatedData;

      set((state) => ({
        coaches: state.coaches.map(c => c.coachId === coachId ? { ...c, ...updated } : c)
      }));

      return { success: true, coach: updated };
    } catch (error) {
      console.error('Update coach error:', error?.response || error);
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to update coach';
      return { success: false, error: msg };
    }
  },

  // Registration action for new coaches
  registerCoach: async (name, username, password, specialization) => {
    try {
      const hashedPassword = CryptoJS.SHA256(password).toString();
      
      const response = await fetch('https://puz8n6lct8.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Admin_Registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          username,
          password: hashedPassword,
          specialization,
          role: 'coach'
        })
      });

      const data = await response.json();
      
      if (response.ok || data.statusCode === 200) {
        // Add coach to local store
        set((state) => ({
          coaches: [...state.coaches, {
            coachId: `c${state.coaches.length + 1}`,
            name,
            email: `${username}@technology-garage.com`,
            specialization,
            assignedPlayers: [],
            totalSessions: 0,
            joinDate: new Date().toISOString().split('T')[0]
          }]
        }));
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'An error occurred during registration' };
    }
  },

  // Fetch coaches from remote API (requires admin userToken header)
  fetchCoaches: async () => {
    try {
      const state = get();
      
      // Enable cache - use cached data if available
      const now = Date.now();
      if (state.coaches.length > 0 && (now - state.coachesLastFetchTime) < state.CACHE_DURATION) {
        set({ coachesLoading: false });
        return state.coaches;
      }
      
      // mark loading start
      set({ coachesLoading: true });
      const token = state.userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['userToken'] = token;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(VIEW_COACHES_URL, { headers });

      let payload = response.data;

      // Some APIs wrap the payload in a `body` string
      if (payload && payload.body && typeof payload.body === 'string') {
        try {
          payload = JSON.parse(payload.body);
        } catch {
          // leave payload as-is if parsing fails
        }
      }

      // Try to find an array of items in common keys
      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (Array.isArray(payload.coaches)) items = payload.coaches;
      else if (Array.isArray(payload.Items)) items = payload.Items;
      else if (Array.isArray(payload.body)) items = payload.body;

      // Normalize to app's coach shape
      const normalized = items.map((c, i) => ({
        coachId: c.coachId || c.id || c._id || `c${i + 1}`,
        _id: c._id,
        name: c.name || c.fullName || c.username || 'Unknown',
        username: c.username || c.userName || c.username || '',
        email: c.email || `${c.username || 'user'}@technology-garage.com`,
        role: Array.isArray(c.role) ? c.role : (c.role ? [c.role] : []),
        specialization: c.specialization || c.speciality || 'General',
        assignedPlayers: c.PlayersList || c.assignedPlayers || [],
        PlayersList: c.PlayersList || c.assignedPlayers || [],
        totalSessions: c.sessions || c.totalSessions || 0,
        rating: c.rating || 0,
        joinDate: c.joinDate || c.registrationTime || new Date().toISOString().split('T')[0],
        lastLogin: c.lastLogin || c.last_login || c.lastLoginTime || c.lastLoginAt || ''
      }));

      set({ coaches: normalized, coachesLastFetchTime: Date.now(), coachesLoading: false });
      return { success: true, coaches: normalized };
    } catch (error) {
      console.error('Fetch coaches error:', error?.response || error);
      // ensure loading flag is cleared on error
      set({ coachesLoading: false });
      const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to fetch coaches';
      return { success: false, error: msg };
    }
  },

  clearCoachesCache: () => {
    set({ coachesLastFetchTime: 0 });
  },

  // Coach actions
  addCoach: (coach) => {
    set((state) => ({
      coaches: [...state.coaches, { ...coach, coachId: `c${state.coaches.length + 1}` }],
    }));
  },

  updateCoach: (coachId, updatedData) => {
    set((state) => ({
      coaches: state.coaches.map(c => c.coachId === coachId ? { ...c, ...updatedData } : c),
    }));
  },

  deleteCoach: (coachId) => {
    set((state) => ({
      coaches: state.coaches.filter(c => c.coachId !== coachId),
    }));
  },

  assignPlayerToCoach: async (playerId, coachId) => {
    try {
      const state = get();
      const userToken = state.userToken;

      if (!userToken) {
        return { success: false, error: 'Authentication token missing' };
      }

      const payload = {
        coachId: coachId,
        playerIds: [playerId]
      };

      const response = await axios.post(ASSIGN_PLAYERS_TO_COACH_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'userToken': userToken
        }
      });

      // Update local state
      set((state) => ({
        players: state.players.map(p =>
          p.playerId === playerId ? { ...p, primaryCoach: coachId } : p
        ),
        coaches: state.coaches.map(c =>
          c.coachId === coachId && !c.assignedPlayers?.includes(playerId)
            ? { ...c, assignedPlayers: [...(c.assignedPlayers || []), playerId] }
            : c
        ),
      }));

      return { success: true, message: response.data?.message || 'Player assigned successfully' };
    } catch (error) {
      console.error('Assign player error:', error?.response || error);
      const msg = error.response?.data?.message || error.message || 'Failed to assign player to coach';
      return { success: false, error: msg };
    }
  },

  removePlayerFromCoach: async (payload) => {
    try {
      const state = get();
      const userToken = state.userToken;

      if (!userToken) {
        return { success: false, error: 'Authentication token missing' };
      }

      

      const response = await axios.post(UPDATE_REMOVE_ASSIGNED_PLAYER_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'userToken': userToken
        }
      });


      // Update local state
      set((state) => ({
        players: state.players.map(p =>
          p.playerId === payload.playerId ? { ...p, primaryCoach: null } : p
        ),
        coaches: state.coaches.map(c =>
          c.coachId === payload.fromCoachId
            ? { ...c, assignedPlayers: (c.assignedPlayers || []).filter(id => id !== payload.playerId) }
            : c
        ),
      }));

      return { success: true, message: response.data?.message || 'Player unassigned successfully' };
    } catch (error) {
      console.error('🔴 Remove player error:', error?.response || error);
      const msg = error.response?.data?.message || error.message || 'Failed to remove player from coach';
      return { success: false, error: msg };
    }
  },

  swapPlayerBetweenCoaches: async (playerId, fromCoachId, toCoachId) => {
    try {
      const state = get();
      const userToken = state.userToken;

      if (!userToken) {
        return { success: false, error: 'Authentication token missing' };
      }

      const payload = {
        playerId: playerId,
        fromCoachId: fromCoachId,
        toCoachId: toCoachId
      };

      const headers = {
        'Content-Type': 'application/json',
        'userToken': userToken
      };

      log('🔵 Swap Player API Call:', {
        url: UPDATE_REMOVE_ASSIGNED_PLAYER_URL,
        payload: payload,
        headers: headers,
        userToken: userToken ? `present (${userToken})` : 'missing'
      });

      const response = await axios.post(UPDATE_REMOVE_ASSIGNED_PLAYER_URL, payload, {
        headers: headers
      });

      log('🔵 Swap Player API Response:', response.data);

      // Update local state
      set((state) => ({
        players: state.players.map(p =>
          p.playerId === playerId ? { ...p, primaryCoach: toCoachId } : p
        ),
        coaches: state.coaches.map(c => {
          if (c.coachId === fromCoachId) {
            return { ...c, assignedPlayers: (c.assignedPlayers || []).filter(id => id !== playerId) };
          }
          if (c.coachId === toCoachId && !c.assignedPlayers?.includes(playerId)) {
            return { ...c, assignedPlayers: [...(c.assignedPlayers || []), playerId] };
          }
          return c;
        }),
      }));

      return { success: true, message: response.data?.message || 'Player swapped successfully' };
    } catch (error) {
      logError('🔵 Swap player error:', error);
      logError('🔵 Swap player error response:', error?.response?.data);
      logError('🔵 Swap player error status:', error?.response?.status);
      const msg = error.response?.data?.message || error.message || 'Failed to swap player between coaches';
      return { success: false, error: msg };
    }
  },

  // Fetch learning pathways
  fetchLearningPathway: async () => {
    try {
      const state = get();
      const token = state.userToken;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['userToken'] = token;
      }

      const response = await axios.get(GET_LEARNING_PATHWAY_URL, { headers });
      let payload = response.data;

      if (payload && payload.body && typeof payload.body === 'string') {
        try {
          payload = JSON.parse(payload.body);
        } catch {
          // leave payload as-is if parsing fails
        }
      }


      let sessions = [];
      if (Array.isArray(payload)) {
        sessions = payload;
      } else if (Array.isArray(payload?.sessions)) {
        sessions = payload.sessions;
      } else if (Array.isArray(payload?.data)) {
        sessions = payload.data;
      }


      set({ learningPathway: sessions });
      return { success: true, sessions };
    } catch (error) {
      logError('Fetch learning pathway error:', error?.response || error);
      const msg = error.response?.data?.message || error.message || 'Failed to fetch learning pathway';
      return { success: false, error: msg };
    }
  },

  // Session actions
  createSessionDraft: (draft) => {
    set((state) => ({
      sessionDrafts: [...state.sessionDrafts, draft],
    }));
  },

  updateSessionDraft: (sessionId, updatedData) => {
    set((state) => ({
      sessionDrafts: state.sessionDrafts.map(s =>
        s.sessionId === sessionId ? { ...s, ...updatedData } : s
      ),
    }));
  },

  completeSession: (sessionDraft) => {
    const completed = {
      ...sessionDraft,
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
    };
    set((state) => ({
      sessionHistory: [...state.sessionHistory, completed],
      sessionDrafts: state.sessionDrafts.filter(s => s.sessionId !== sessionDraft.sessionId),
    }));
  },

  getSessionsByplayer: (playerId) => {
    return get().sessionHistory.filter(s => s.playerId === playerId);
  },

  getCoachSessions: (coachId) => {
    return get().sessionHistory.filter(s => s.coachId === coachId);
  },

  getCoachDrafts: (coachId) => {
    return get().sessionDrafts.filter(s => s.coachId === coachId);
  },

  // Reward actions
  redeemReward: (playerId, rewardId) => {
    const reward = get().rewards.find(r => r.rewardId === rewardId);
    if (reward) {
      const redeem = {
        redeemId: `rd${get().redeemHistory.length + 1}`,
        playerId,
        rewardId,
        rewardName: reward.name,
        pointsUsed: reward.pointsRequired,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
      };
      set((state) => ({
        redeemHistory: [...state.redeemHistory, redeem],
      }));
    }
  },

  getPlayerRedeemHistory: (playerId) => {
    return get().redeemHistory.filter(r => r.playerId === playerId);
  },

  // Session Card actions - Create new sessions
  createSession: (playerId, coachId, sessionData) => {
    const newSession = {
      sessionId: `s${Date.now()}`,
      playerId,
      coachId,
      playerName: get().getPlayerById(playerId)?.name || 'player',
      coachName: get().getCoachById(coachId)?.name || 'Coach',
      sessionDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      rating: 0,
      pointsEarned: 0,
      activities: sessionData?.activities || [],
      feedback: sessionData?.feedback || '',
      defaultPoints: sessionData?.defaultPoints || 0,
      bonusPoints: sessionData?.bonusPoints || 0,
      interested: sessionData?.interested || false,
      repeat: sessionData?.repeat || false,
      onTime: sessionData?.onTime || false,
      ...sessionData,
    };
    
    set((state) => ({
      sessionHistory: [...state.sessionHistory, newSession],
    }));
    
    return newSession;
  },

  // Get sessions for a specific player
  getPlayerSessions: (playerId) => {
    return get().sessionHistory.filter(s => s.playerId === playerId);
  },

  // Get sessions for coach's players only
  getCoachplayersessions: (coachId) => {
    const coachplayers = get().players.filter(p => p.primaryCoach === coachId);
    const playerIds = coachplayers.map(s => s.playerId);
    return get().sessionHistory.filter(s => playerIds.includes(s.playerId));
  },

  // Update session
  updateSession: (sessionId, updatedData) => {
    set((state) => ({
      sessionHistory: state.sessionHistory.map(s => 
        s.sessionId === sessionId ? { ...s, ...updatedData } : s
      ),
    }));
  },

  // Submit session (change status from draft to submitted)
  submitSession: (sessionId) => {
    set((state) => ({
      sessionHistory: state.sessionHistory.map(s => 
        s.sessionId === sessionId ? { ...s, status: 'submitted' } : s
      ),
    }));
  },

  // Session Card Management
  setSelectedPlayer: (player) => {
    set({ selectedPlayer: player });
  },

  clearSelectedPlayer: () => {
    set({ selectedPlayer: null });
  },
    }),
    {
      name: 'coachlife-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        userToken: state.userToken,
        lastVisitedPage: state.lastVisitedPage,
        selectedPlayer: state.selectedPlayer, // Persist selected player
      }),
    }
  )
);
// Initialize response interceptor for persisted auth on app load
// (Will be initialized with 'set' in store creation when user logs in)
