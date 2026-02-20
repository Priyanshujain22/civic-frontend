// API Base URL - Hardcoded to production for reliability, or uses env var
export const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://civic-backend-three.vercel.app/api';

// ALWAYS log the API URL being used to help with Vercel debugging
console.log('Using API Base URL:', API_URL);

// --- Auth Utilities ---

function getAuthHeader() {
    const user = getCurrentUser();
    if (user && user.token) {
        return { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
    }
    return { 'Content-Type': 'application/json' };
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

export function logoutUser() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// --- Auth APIs ---

export async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Save token and user details
            const userData = { ...result.data.user, token: result.data.token };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return { success: true, user: userData };
        } else {
            return { success: false, message: result.message || 'Login failed' };
        }
    } catch (error) {
        console.error('Login Error Details:', error);

        // Detailed error message for development, generic for production
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const message = isLocal
            ? 'Network error: Check if Backend is running at port 5000'
            : 'Unable to connect to the server. Please check your internet connection or try again later.';

        return { success: false, message };
    }
}

export async function registerUser(userData) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Register Error:', error);
        return { success: false, message: 'Network error' };
    }
}

// --- Complaint APIs ---

export async function fetchComplaints() {
    const user = getCurrentUser();
    if (!user) return [];

    let endpoint = '/complaints/my'; // Default for citizen
    if (user.role === 'admin') endpoint = '/admin/complaints';
    if (user.role === 'officer') endpoint = '/officer/assigned';
    if (user.role === 'vendor') endpoint = '/vendor/available';

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: getAuthHeader()
        });

        const result = await response.json();
        if (!response.ok) return { success: false, message: result.message || 'Server error' };
        return { success: true, data: result.success ? result.data : [] };
    } catch (error) {
        console.error('Fetch Complaints Error:', error);
        return { success: false, message: 'Network error ' + error.message };
    }
}

export async function createComplaint(complaintData) {
    try {
        const response = await fetch(`${API_URL}/complaints`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(complaintData)
        });
        const result = await response.json();
        return result.success ? { success: true, data: result.data } : { success: false, message: result.message };
    } catch (error) {
        console.error('Create Complaint Error:', error);
        return { success: false, message: 'Network error' };
    }
}

// --- Hybrid Dispatcher APIs ---

export async function routeToGovernment(complaint_id, officer_id) {
    try {
        const response = await fetch(`${API_URL}/admin/route/government`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ complaint_id, officer_id })
        });
        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Route Gov Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function routeToPrivate(complaint_id) {
    try {
        const response = await fetch(`${API_URL}/admin/route/private`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ complaint_id })
        });
        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Route Private Error:', error);
        return { success: false, message: 'Network error' };
    }
}

// --- Vendor & Marketplace APIs ---

export async function submitQuote(complaint_id, price, estimated_time) {
    try {
        const response = await fetch(`${API_URL}/vendor/quote`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ complaint_id, price, estimated_time })
        });
        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Submit Quote Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function fetchComplaintQuotes(complaintId) {
    try {
        const response = await fetch(`${API_URL}/complaints/${complaintId}/quotes`, {
            headers: getAuthHeader()
        });
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Fetch Quotes Error:', error);
        return [];
    }
}

export async function approveQuote(complaintId, vendor_id) {
    try {
        const response = await fetch(`${API_URL}/quotes/${complaintId}/approve`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ vendor_id })
        });
        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Approve Quote Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function verifyVendor(vendor_id) {
    try {
        const response = await fetch(`${API_URL}/admin/vendors/verify`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ vendor_id })
        });
        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Verify Vendor Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function fetchUsers(role = null) {
    try {
        let url = `${API_URL}/admin/users`;
        if (role) url += `?role=${role}`;
        const response = await fetch(url, { headers: getAuthHeader() });
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Fetch Users Error:', error);
        return [];
    }
}

export async function requestPasswordReset(email) {
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Password Reset Error:', error);
        return { success: false, message: 'Network error' };
    }
}
