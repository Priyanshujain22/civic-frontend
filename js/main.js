
import { renderNavbar, getStatusBadge, showAlert } from './ui.js';
import * as API from './api.js';

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    // Page Routing Logic
    const path = window.location.pathname;

    if (path.includes('login.html')) initLogin();
    else if (path.includes('register.html')) initRegister();
    else if (path.includes('citizen-dashboard.html')) checkRoleAccess('citizen', initCitizenDashboard);
    else if (path.includes('complaint-form.html')) checkRoleAccess('citizen', initComplaintForm);
    else if (path.includes('admin-dashboard.html')) checkRoleAccess('admin', initAdminDashboard);
    else if (path.includes('officer-dashboard.html')) checkRoleAccess('officer', initOfficerDashboard);
    else if (path.includes('profile.html')) initProfilePage();
    else if (path.endsWith('/') || path.includes('index.html')) initHomePage();
});

// Access Control Helper
function checkRoleAccess(requiredRole, initFunction) {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role !== requiredRole) {
        // Redirect to correct dashboard if role mismatch
        if (user.role === 'citizen') window.location.href = 'citizen-dashboard.html';
        else if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (user.role === 'officer') window.location.href = 'officer-dashboard.html';
        return;
    }

    // Role matches, proceed
    initFunction();
}

// --- Page Initializers ---

function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Hide role dropdown if it exists, as we use credentials now
    const roleDiv = document.getElementById('loginRole')?.closest('.mb-3');
    if (roleDiv) roleDiv.style.display = 'none';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showAlert('Please fill in all fields', 'danger');
            return;
        }

        const response = await API.loginUser(email, password);
        if (response.success) {
            const role = response.user.role;
            // Redirect based on role
            if (role === 'citizen') window.location.href = 'citizen-dashboard.html';
            else if (role === 'admin') window.location.href = 'admin-dashboard.html';
            else if (role === 'officer') window.location.href = 'officer-dashboard.html';
        } else {
            showAlert(response.message || 'Login failed', 'danger');
        }
    });
}

function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            name: document.getElementById('registerName').value,
            email: document.getElementById('registerEmail').value,
            phone: document.getElementById('registerPhone').value,
            role: document.getElementById('registerRole').value,
            password: document.getElementById('registerPassword').value
        };

        const confirmPass = document.getElementById('registerConfirmPassword').value;
        if (userData.password !== confirmPass) {
            showAlert('Passwords do not match!', 'danger');
            return;
        }

        const response = await API.registerUser(userData);
        if (response.success) {
            showAlert('Registration Successful! Please login.');
            setTimeout(() => window.location.href = 'login.html', 1500);
        }
    });
}

async function initCitizenDashboard() {
    // Role check already done by checkRoleAccess
    const complaints = await API.fetchComplaints();
    const tableBody = document.getElementById('complaintTableBody');
    const noData = document.getElementById('noData');

    // Filter to show only OWN complaints (simulated for now by name or ID if available, otherwise show all for demo)
    // For RBAC demo: Citizens should only see their own.
    // Since mockData doesn't track owner ID strictly, we'll allow seeing all for now OR filter by "Citizen User"
    // Let's filter by the current mock user name "Citizen User" if applicable, or just show all to avoid empty states in demo
    const myComplaints = complaints; // In real app: complaints.filter(c => c.userId === currentUser.id)

    if (!myComplaints.length) {
        noData.classList.remove('d-none');
        return;
    }

    tableBody.innerHTML = myComplaints.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.category_name}</td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>
                <button class="btn btn-sm btn-info text-white" data-action="view" data-id="${c.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');

    // Event delegation for View button
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="view"]');
        if (btn) {
            const id = parseInt(btn.dataset.id);
            const complaint = myComplaints.find(c => c.id === id);
            if (complaint) {
                document.getElementById('viewCategory').innerText = complaint.category_name;
                document.getElementById('viewDescription').innerText = complaint.description;
                document.getElementById('viewLocation').innerText = complaint.location;
                document.getElementById('viewStatus').innerHTML = getStatusBadge(complaint.status);

                const resSection = document.getElementById('resolutionSection');
                if (complaint.status === 'Resolved' && complaint.resolution_notes) {
                    document.getElementById('viewResolutionNotes').innerText = complaint.resolution_notes;
                    resSection.classList.remove('d-none');
                } else {
                    resSection.classList.add('d-none');
                }

                new bootstrap.Modal(document.getElementById('viewModal')).show();
            }
        }
    });
}

function initComplaintForm() {
    const form = document.getElementById('complaintForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const complaintData = {
            category: document.getElementById('complaintCategory').value, // Assuming value acts as name for now, or update form to have IDs
            description: document.getElementById('complaintDescription').value,
            location: document.getElementById('complaintLocation').value,
            // citizenName not needed, backend takes from token
        };

        const response = await API.createComplaint(complaintData);
        if (response.success) {
            showAlert('Complaint Submitted!');
            setTimeout(() => window.location.href = 'citizen-dashboard.html', 1500);
        }
    });
}

async function initAdminDashboard() {
    const user = API.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const complaints = await API.fetchComplaints();

    // Stats
    document.getElementById('totalStats').innerText = complaints.length;
    document.getElementById('pendingStats').innerText = complaints.filter(c => c.status === 'Pending').length;
    document.getElementById('resolvedStats').innerText = complaints.filter(c => c.status === 'Resolved').length;

    // Table
    const tableBody = document.getElementById('adminTableBody');
    tableBody.innerHTML = complaints.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.citizen_name}</td>
            <td>${c.category_name}</td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>${c.officer_name || '<span class="text-muted">Unassigned</span>'}</td>
            <td>
                ${c.status === 'Resolved' ? `
                    <button class="btn btn-sm btn-success w-100" disabled>
                        <i class="fas fa-check-circle me-1"></i> Completed
                    </button>
                ` : `
                    <button class="btn btn-sm btn-outline-primary w-100" data-action="assign" data-id="${c.id}">
                        <i class="fas fa-edit me-1"></i> Assign
                    </button>
                `}
            </td>
        </tr>
    `).join('');

    // Event delegation for Assign buttons
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="assign"]');
        if (btn) {
            const id = btn.dataset.id;
            document.getElementById('assignComplaintId').value = id;
            new bootstrap.Modal(document.getElementById('assignModal')).show();
        }
    });

    // Assign Form Submit
    document.getElementById('assignForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('assignComplaintId').value;
        const officerId = 2; // HARDCODED DEMO for "Officer Raj" ID from SQL seed
        // Proper way: Fetch officers list and map naming to ID.
        // For now, since select has names, we'll force ID 2 if they select Officer Raj.
        // TODO: Update Admin Dashboard to fetch users and populate dropdown dynamically ideally.

        const response = await API.assignOfficer(id, officerId);
        if (response.success) {
            showAlert(`Assigned successfully`);
            setTimeout(() => location.reload(), 1000);
        }
    });
}

async function initOfficerDashboard() {
    const user = API.getCurrentUser();
    if (!user || user.role !== 'officer') {
        window.location.href = 'login.html';
        return;
    }

    const myComplaints = await API.fetchComplaints();

    const container = document.getElementById('tasksContainer');
    if (!myComplaints.length) {
        document.getElementById('noTasks').classList.remove('d-none');
        return;
    }

    container.innerHTML = myComplaints.map(task => `
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm h-100 border-${task.status === 'Resolved' ? 'success' : 'warning'}">
                <div class="card-header d-flex justify-content-between align-items-center bg-white">
                    <strong>#${task.id}</strong>
                    ${getStatusBadge(task.status)}
                </div>
                <div class="card-body">
                    <h5 class="card-title text-primary">${task.category_name}</h5>
                    <p class="card-text text-muted small mb-2">
                        <i class="fas fa-map-marker-alt me-1"></i> ${task.location}
                    </p>
                    <p class="card-text">${task.description}</p>
                    <p class="small text-muted">Reported by: ${task.citizen_name} on ${new Date(task.created_at).toLocaleDateString()}</p>
                </div>
                <div class="card-footer bg-white border-top-0">
                    <button class="btn btn-primary w-100" data-action="update" data-id="${task.id}">
                        <i class="fas fa-clipboard-check me-2"></i> Update Status
                    </button>
                    <!-- Delete button hidden for Officer -->
                </div>
            </div>
        </div>
    `).join('');

    // Event delegation
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="update"]');
        if (btn) {
            const id = btn.dataset.id;
            document.getElementById('updateComplaintId').value = id;
            new bootstrap.Modal(document.getElementById('updateModal')).show();
        }
    });

    document.getElementById('updateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('updateComplaintId').value;
        const status = document.getElementById('updateStatus').value;
        const resolution_notes = document.getElementById('updateNotes').value;

        const response = await API.updateComplaintStatus(id, status, resolution_notes);
        if (response.success) {
            showAlert('Status Updated');
            setTimeout(() => location.reload(), 1000);
        }
    });
}
async function initProfilePage() {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const roleInput = document.getElementById('profileRole');
    const roleHeader = document.getElementById('profileRoleHeader');
    const backBtn = document.getElementById('backToDashboard');

    // Populate with cached data first
    nameInput.value = user.name || '';
    emailInput.value = user.email || '';
    roleInput.value = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    roleHeader.innerText = roleInput.value;

    // Fetch fresh profile data to get phone
    const fullProfile = await API.fetchUserProfile();
    if (fullProfile) {
        nameInput.value = fullProfile.name || '';
        phoneInput.value = fullProfile.phone || '';
        // Update local storage if name changed
        if (fullProfile.name !== user.name) {
            const updatedUser = { ...user, name: fullProfile.name };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
    }

    // Back to dashboard logic
    backBtn.addEventListener('click', () => {
        if (user.role === 'citizen') window.location.href = 'citizen-dashboard.html';
        else if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (user.role === 'officer') window.location.href = 'officer-dashboard.html';
    });

    const form = document.getElementById('profileForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            name: nameInput.value,
            phone: phoneInput.value
        };

        const response = await API.updateUserProfile(userData);
        if (response.success) {
            showAlert('Profile updated successfully!');
            // Update local storage
            const updatedUser = { ...user, name: userData.name };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert(response.message || 'Failed to update profile', 'danger');
        }
    });
}

/**
 * Initialize dynamic content for the Home Page
 */
function initHomePage() {
    const user = API.getCurrentUser();
    const raiseBtn = document.getElementById('heroRaiseBtn');

    if (user && raiseBtn) {
        // Change logic based on role
        if (user.role === 'citizen') {
            raiseBtn.href = 'complaint-form.html';
        } else if (user.role === 'admin') {
            raiseBtn.href = 'admin-dashboard.html';
            raiseBtn.innerText = 'Go to Dashboard';
        } else if (user.role === 'officer') {
            raiseBtn.href = 'officer-dashboard.html';
            raiseBtn.innerText = 'Go to Dashboard';
        }
    }
}
