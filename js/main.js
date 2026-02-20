
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
    else if (path.includes('vendor-dashboard.html')) checkRoleAccess('vendor', initVendorDashboard);
    else if (path.includes('profile.html')) initProfilePage();
    else if (path.includes('forgot-password.html')) initForgotPassword();
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
        else if (user.role === 'vendor') window.location.href = 'vendor-dashboard.html';
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
            else if (role === 'vendor') window.location.href = 'vendor-dashboard.html';
        } else {
            showAlert(response.message || 'Login failed', 'danger');
        }
    });
}

function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const roleSelect = document.getElementById('registerRole');
    const vendorFields = document.getElementById('vendorFields');

    roleSelect.addEventListener('change', () => {
        vendorFields.style.display = roleSelect.value === 'vendor' ? 'block' : 'none';
        // Make fields required if vendor
        document.getElementById('businessName').required = roleSelect.value === 'vendor';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            name: document.getElementById('registerName').value,
            email: document.getElementById('registerEmail').value,
            phone: document.getElementById('registerPhone').value,
            role: roleSelect.value,
            password: document.getElementById('registerPassword').value,
            business_name: document.getElementById('businessName')?.value,
            service_type: document.getElementById('serviceType')?.value
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
        } else {
            showAlert(response.message || 'Registration failed', 'danger');
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
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" data-action="view" data-id="${c.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${c.status === 'Awaiting Quotes' ? `
                        <button class="btn btn-sm btn-info text-white" data-action="quotes" data-id="${c.id}">
                            <i class="fas fa-file-invoice-dollar"></i> Quotes
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    // Event delegation
    tableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === 'view') {
            const complaint = complaints.find(c => c.id == id);
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
        } else if (action === 'quotes') {
            const modal = new bootstrap.Modal(document.getElementById('quotesModal'));
            modal.show();
            await loadQuotes(id);
        }
    });
}

async function loadQuotes(complaintId) {
    const table = document.getElementById('quotesTable');
    const tableBody = document.getElementById('quotesTableBody');
    const loading = document.getElementById('quotesLoading');
    const noQuotes = document.getElementById('noQuotes');

    loading.style.display = 'block';
    table.style.display = 'none';
    noQuotes.classList.add('d-none');

    const quotes = await API.fetchComplaintQuotes(complaintId);
    loading.style.display = 'none';

    if (quotes.length === 0) {
        noQuotes.classList.remove('d-none');
    } else {
        table.style.display = 'table';
        tableBody.innerHTML = quotes.map(q => `
            <tr>
                <td><strong>${q.business_name || 'Vendor'}</strong></td>
                <td class="text-success fw-bold">₹${q.price}</td>
                <td>${q.estimated_time}</td>
                <td>
                    <button class="btn btn-sm btn-success rounded-pill px-3 btn-approve-quote" 
                            data-complaint="${complaintId}" data-vendor="${q.vendor_id}">
                        Hire
                    </button>
                </td>
            </tr>
        `).join('');

        tableBody.querySelectorAll('.btn-approve-quote').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to hire this vendor?')) {
                    const res = await API.approveQuote(btn.dataset.complaint, btn.dataset.vendor);
                    if (res.success) {
                        showAlert('Vendor hired successfully!');
                        location.reload();
                    }
                }
            });
        });
    }
}

function initComplaintForm() {
    const form = document.getElementById('complaintForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const complaintData = {
            category: document.getElementById('complaintCategory').value,
            description: document.getElementById('complaintDescription').value,
            location: document.getElementById('complaintLocation').value,
            resolution_type: document.getElementById('resolutionType').value // Get preference
        };

        const response = await API.createComplaint(complaintData);
        if (response.success) {
            showAlert('Complaint Submitted Successfully!');
            setTimeout(() => window.location.href = 'citizen-dashboard.html', 1500);
        } else {
            showAlert(response.message || 'Failed to submit complaint', 'danger');
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
                    <button class="btn btn-sm btn-dark w-100" data-action="dispatch" data-id="${c.id}">
                        <i class="fas fa-paper-plane me-1"></i> Dispatch
                    </button>
                `}
            </td>
        </tr>
    `).join('');

    // Event delegation for Dispatch buttons
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="dispatch"]');
        if (btn) {
            document.getElementById('dispatchComplaintId').value = btn.dataset.id;
            new bootstrap.Modal(document.getElementById('dispatchModal')).show();
        }
    });

    // Toggle dispatch fields
    document.querySelectorAll('input[name="resolutionType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isPrivate = e.target.value === 'private';
            document.getElementById('govDispatchFields').style.display = isPrivate ? 'none' : 'block';
            document.getElementById('privateDispatchFields').style.display = isPrivate ? 'block' : 'none';
        });
    });

    // Dispatch Form Submit
    document.getElementById('dispatchForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('dispatchComplaintId').value;
        const resType = document.querySelector('input[name="resolutionType"]:checked').value;

        let response;
        if (resType === 'private') {
            response = await API.routeToPrivate(id);
        } else {
            const officerId = document.getElementById('officerSelect').value;
            if (!officerId) return showAlert('Please select an officer', 'danger');
            response = await API.routeToGovernment(id, officerId);
        }

        if (response.success) {
            showAlert(`Complaint dispatched successfully`);
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert(response.message, 'danger');
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

        let response;
        if (status === 'Resolved') {
            response = await fetch(`${API_URL}/officer/upload-proof`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({ complaint_id: id, proof_notes: resolution_notes })
            }).then(r => r.json());
        } else {
            response = await API.updateComplaintStatus(id, status, resolution_notes);
        }

        if (response.success) {
            showAlert('Status Updated & Proof Logged');
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

function initForgotPassword() {
    const form = document.getElementById('forgotPasswordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        const btn = document.getElementById('resetBtn');
        const originalText = btn.innerText;

        // Show loading state
        btn.innerText = 'Sending...';
        btn.disabled = true;

        const response = await API.requestPasswordReset(email);

        btn.innerText = originalText;
        btn.disabled = false;

        if (response.success) {
            document.getElementById('sentEmail').innerText = email;
            const modal = new bootstrap.Modal(document.getElementById('resetSuccessModal'));
            modal.show();
        } else {
            showAlert(response.message || 'Failed to send reset link', 'danger');
        }
    });
}

async function initVendorDashboard() {
    const jobsList = document.getElementById('jobsList');
    const quotesTableBody = document.getElementById('quotesTableBody');
    const activeJobsList = document.getElementById('activeJobsList');
    const refreshBtn = document.getElementById('refreshJobs');
    const quoteForm = document.getElementById('quoteForm');

    const loadData = async () => {
        const complaints = await API.fetchComplaints();
        renderAvailableJobs(complaints, jobsList);

        // Fetch specific vendor data for quotes and active jobs
        const myQuotes = await API.fetchComplaints(); // We need a specific endpoint for vendor's own quotes?
        // Actually vendor_routes has /my-jobs
        const activeJobs = await fetch(`${API.API_URL}/vendor/my-jobs`, {
            headers: { 'Authorization': `Bearer ${API.getCurrentUser().token}` }
        }).then(r => r.json());

        if (activeJobs.success) {
            renderActiveJobs(activeJobs.data, activeJobsList);
            document.getElementById('activeBidsCount').innerText = activeJobs.data.length;
        }
    };

    if (refreshBtn) refreshBtn.addEventListener('click', loadData);

    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const complaintId = document.getElementById('quoteComplaintId').value;
            const price = document.getElementById('quotePrice').value;
            const time = document.getElementById('quoteTime').value;

            const response = await API.submitQuote(complaintId, price, time);
            if (response.success) {
                showAlert('Quotation Submitted!');
                bootstrap.Modal.getInstance(document.getElementById('quoteModal')).hide();
                loadData();
            } else {
                showAlert(response.message, 'danger');
            }
        });
    }

    loadData();
}

function renderAvailableJobs(jobs, container) {
    if (!container) return;
    if (jobs.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No new jobs available in the marketplace.</p></div>';
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm border-0 job-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">${job.category_name}</span>
                        <small class="text-muted"><i class="far fa-clock me-1"></i>${new Date(job.created_at).toLocaleDateString()}</small>
                    </div>
                    <h5 class="card-title fw-bold">${job.description.substring(0, 50)}...</h5>
                    <p class="text-muted mb-3"><i class="fas fa-map-marker-alt me-2"></i>${job.location}</p>
                    <button class="btn btn-primary w-100 rounded-pill btn-quote" data-id="${job.id}">
                        <i class="fas fa-plus-circle me-2"></i>Submit Quote
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-quote').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('quoteComplaintId').value = btn.dataset.id;
            new bootstrap.Modal(document.getElementById('quoteModal')).show();
        });
    });
}

function renderActiveJobs(jobs, container) {
    if (!container) return;
    container.innerHTML = jobs.map(job => `
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm border-0 border-start border-success border-4 h-100">
                <div class="card-body">
                    <h5 class="fw-bold">Job #${job.complaint_id}</h5>
                    <p class="text-muted">${job.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-success fw-bold">Accepted: ₹${job.price}</span>
                        <button class="btn btn-sm btn-success rounded-pill btn-complete" data-id="${job.complaint_id}">
                            Mark Completed
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Mark this job as completed?')) {
                const res = await API.updateComplaintStatus(btn.dataset.id, 'Resolved');
                if (res.success) {
                    showAlert('Job completed!');
                    location.reload();
                }
            }
        });
    });
}
