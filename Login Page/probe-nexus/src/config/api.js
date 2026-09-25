export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Retrieves the authentication token from localStorage or session.
 */
export async function getAuthToken() {
  let token = localStorage.getItem('probnexus_token') || localStorage.getItem('token');
  if (token) return token;

  // Seamless fallback for demo/development: authenticate as investigator if no token is saved
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_investigator@probnexus.gov.in',
        password: 'password123'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('probnexus_token', data.token);
        return data.token;
      }
    } else {
      // If demo user doesn't exist, create it
      const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Senior Investigator',
          departmentId: 'INV99',
          email: 'demo_investigator@probnexus.gov.in',
          password: 'password123',
          confirmPassword: 'password123'
        })
      });
      // Try login again
      const retryRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo_investigator@probnexus.gov.in',
          password: 'password123'
        })
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if (retryData.token) {
          localStorage.setItem('probnexus_token', retryData.token);
          return retryData.token;
        }
      }
    }
  } catch (err) {
    console.warn('Auto-login fallback error:', err);
  }

  return null;
}

/**
 * Generalized authenticated fetch
 */
export async function apiFetch(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  if (import.meta.env.DEV) {
    console.log(`[API Request] URL: ${url} | token exists: ${Boolean(token)}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (import.meta.env.DEV) {
    console.log(`[API Response] URL: ${url} | status: ${response.status}`);
  }
  
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const error = new Error(errBody.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = errBody;
    throw error;
  }

  return response.json();
}

/**
 * Case Management APIs
 */
export async function fetchCases() {
  const data = await apiFetch('/cases');
  return data.cases || [];
}

export async function createCase(caseData) {
  return apiFetch('/cases', {
    method: 'POST',
    body: JSON.stringify(caseData)
  });
}

export async function fetchCaseById(caseId) {
  return apiFetch(`/cases/${caseId}`);
}

/**
 * Ingestion APIs: FIR, Calls (CDR), and Financial Transactions
 */
export async function createFir(caseId, firData) {
  return apiFetch(`/cases/${caseId}/firs`, {
    method: 'POST',
    body: JSON.stringify(firData)
  });
}

export async function fetchFirs(caseId) {
  const data = await apiFetch(`/cases/${caseId}/firs`);
  return data.firRecords || [];
}

export async function deleteFir(caseId, firId) {
  return apiFetch(`/cases/${caseId}/firs/${firId}`, {
    method: 'DELETE'
  });
}

export async function createCall(caseId, callData) {
  return apiFetch(`/cases/${caseId}/calls`, {
    method: 'POST',
    body: JSON.stringify(callData)
  });
}

export async function fetchCalls(caseId) {
  const data = await apiFetch(`/cases/${caseId}/calls`);
  return data.callRecords || [];
}

export async function deleteCall(caseId, callId) {
  return apiFetch(`/cases/${caseId}/calls/${callId}`, {
    method: 'DELETE'
  });
}

export async function createTransaction(caseId, txData) {
  return apiFetch(`/cases/${caseId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(txData)
  });
}

export async function fetchTransactions(caseId) {
  const data = await apiFetch(`/cases/${caseId}/transactions`);
  return data.transactions || [];
}

export async function deleteTransaction(caseId, txId) {
  return apiFetch(`/cases/${caseId}/transactions/${txId}`, {
    method: 'DELETE'
  });
}

export async function extractCaseEntities(caseId) {
  return apiFetch(`/cases/${caseId}/entities/extract`, {
    method: 'POST'
  });
}

/**
 * Network and Relationship APIs
 */
export async function fetchCaseNetwork(caseId) {
  return apiFetch(`/cases/${caseId}/network`);
}

export async function buildCaseRelationships(caseId) {
  return apiFetch(`/cases/${caseId}/relationships/build`, {
    method: 'POST'
  });
}

export async function fetchEntityDetail(caseId, entityId) {
  return apiFetch(`/cases/${caseId}/entities/${entityId}`);
}

export async function fetchEvidenceRecord(caseId, recordType, recordId) {
  try {
    if (recordType === 'CALL') {
      const data = await apiFetch(`/cases/${caseId}/calls/${recordId}`);
      return { type: 'CALL', record: data.callRecord };
    }
    if (recordType === 'TRANSACTION') {
      const data = await apiFetch(`/cases/${caseId}/transactions/${recordId}`);
      return { type: 'TRANSACTION', record: data.transaction };
    }
    if (recordType === 'FIR') {
      const data = await apiFetch(`/cases/${caseId}/firs/${recordId}`);
      return { type: 'FIR', record: data.firRecord };
    }
  } catch (err) {
    console.warn(`Could not fetch evidence detail for ${recordType} ${recordId}:`, err);
  }
  return null;
}

/**
 * AI/ML Analytics & Intelligence APIs (SIH26189)
 */
export async function runCaseAnalytics(caseId) {
  return apiFetch(`/cases/${caseId}/analytics/run`, {
    method: 'POST'
  });
}

export async function fetchCaseAnalytics(caseId) {
  return apiFetch(`/cases/${caseId}/analytics`);
}

export async function fetchKeyPlayers(caseId) {
  return apiFetch(`/cases/${caseId}/analytics/key-players`);
}

export async function fetchCommunities(caseId) {
  return apiFetch(`/cases/${caseId}/analytics/communities`);
}

export async function fetchSuspiciousPatterns(caseId) {
  return apiFetch(`/cases/${caseId}/analytics/suspicious-patterns`);
}

export async function fetchRiskEntities(caseId) {
  return apiFetch(`/cases/${caseId}/analytics/risk`);
}

export async function runLinkPredictions(caseId) {
  return apiFetch(`/cases/${caseId}/link-predictions/run`, {
    method: 'POST'
  });
}

export async function fetchLinkPredictions(caseId) {
  return apiFetch(`/cases/${caseId}/link-predictions`);
}

export async function fetchExplanations(caseId) {
  return apiFetch(`/cases/${caseId}/explanations`);
}

export async function fetchEntityIntelligence(caseId, entityId) {
  return apiFetch(`/cases/${caseId}/entities/${entityId}/intelligence`);
}

/**
 * User Management APIs (Admin only)
 */
export async function fetchUserStats() {
  return apiFetch('/users/stats');
}

export async function fetchUsersList() {
  const data = await apiFetch('/users');
  return data.users;
}

export async function fetchUserSessions(userId) {
  const data = await apiFetch(`/users/${userId}/sessions`);
  return data.sessions;
}

/**
 * Logout — calls backend to close session, then clears client state.
 */
export async function logoutUser() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Backend logout call failed (continuing):', err);
  }
}
