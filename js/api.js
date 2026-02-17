// API Base URL
const API_URL = 'http://localhost:5000/api';

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
        return { success: false, message: 'Network error: Check if Backend is running at port 5000' };
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

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: getAuthHeader()
        });

        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Fetch Complaints Error:', error);
        return [];
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
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Create Complaint Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function updateComplaintStatus(id, status) {
    try {
        const response = await fetch(`${API_URL}/officer/update-status`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ id, status })
        });

        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Update Status Error:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function assignOfficer(complaintId, officerId) {
    try {
        const response = await fetch(`${API_URL}/admin/assign`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ complaint_id: complaintId, officer_id: officerId })
        });

        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message };
    } catch (error) {
        console.error('Assign Officer Error:', error);
        return { success: false, message: 'Network error' };
    }
}
