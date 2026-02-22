
import { renderNavbar, getStatusBadge, showAlert } from './ui.js';
import * as API from './api.js';

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
    renderNavbar();

    // Page Routing Logic - Normalize path to handle both hyphen and underscore
    const path = window.location.pathname.replace(/_/g, '-');
    console.log('Normalized Path:', path);

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
    const response = await API.fetchComplaints();
    const complaints = response.data || [];
    const tableBody = document.getElementById('complaintTableBody');
    const noData = document.getElementById('noData');

    if (!response.success && !response.data) {
        showAlert('Error loading complaints: ' + (response.message || 'Unknown error'), 'danger');
        noData.innerHTML = `<p class="text-danger">Failed to load data. Please <a href="login.html">login again</a>.</p>`;
        noData.classList.remove('d-none');
        return;
    }

    // Filter to show only OWN complaints (simulated for now by name or ID if available, otherwise show all for demo)
    // For RBAC demo: Citizens should only see their own.
    // Since mockData doesn't track owner ID strictly, we'll allow seeing all for now OR filter by "Citizen User"
    // Let's filter by the current mock user name "Citizen User" if applicable, or just show all to avoid empty states in demo
    const myComplaints = complaints; // In real app: complaints.filter(c => c.userId === currentUser.id)

    if (!myComplaints.length) {
        noData.classList.remove('d-none');
        return;
    } else {
        noData.classList.add('d-none'); // Hide if data is present
    }

    renderComplaints(myComplaints);
    initPaymentForm();
    initFeedbackForm();
}

function renderComplaints(complaints) {
    const activeBody = document.getElementById('complaintsBody');
    const pastBody = document.getElementById('pastComplaintsBody');
    if (!activeBody || !pastBody) return;

    // Separate complaints
    const active = complaints.filter(c => c.status !== 'Resolved');
    const past = complaints.filter(c => c.status === 'Resolved');

    activeBody.innerHTML = active.map(c => `
        <tr>
            <td><span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3">${c.category_name}</span></td>
            <td class="text-truncate" style="max-width: 250px;">${c.description}</td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3" data-action="view" data-id="${c.id}">
                        <i class="fas fa-eye me-1"></i> View
                    </button>
                    ${c.status === 'Awaiting Quotes' ? `
                        <button class="btn btn-sm btn-info text-white rounded-pill px-3" data-action="quotes" data-id="${c.id}">
                            <i class="fas fa-file-invoice-dollar me-1"></i> Quotes
                        </button>
                    ` : ''}
                    ${c.status === 'Awaiting Payment' ? `
                        <button class="btn btn-sm btn-warning rounded-pill px-3" data-action="pay" data-id="${c.id}" data-amount="${c.agreed_price}">
                            <i class="fas fa-credit-card me-1"></i> Pay ₹${c.agreed_price}
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    pastBody.innerHTML = past.map(c => `
        <tr>
            <td><span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-3">${c.category_name}</span></td>
            <td class="text-truncate" style="max-width: 250px;">${c.description}</td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td><span class="badge bg-success rounded-pill px-3">Resolved</span> ${c.payment_status === 'paid' ? '<i class="fas fa-check-circle text-success ms-1" title="Paid"></i>' : ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-success rounded-pill px-3" data-action="feedback" data-id="${c.id}">
                    <i class="fas fa-star me-1"></i> Rate Vendor
                </button>
            </td>
        </tr>
    `).join('');

    // Event delegation for both tables
    [activeBody, pastBody].forEach(body => {
        body.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            const action = btn.dataset.action;

            if (action === 'view') {
                const complaint = complaints.find(c => c.id == id);
                if (complaint) {
                    showComplaintDetails(complaint);
                }
            } else if (action === 'quotes') {
                const modal = new bootstrap.Modal(document.getElementById('quotesModal'));
                modal.show();
                await loadQuotes(id);
            } else if (action === 'pay') {
                const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
                document.getElementById('payComplaintId').value = id;
                document.getElementById('payAmount').innerText = `₹${btn.dataset.amount}`;
                modal.show();
            } else if (action === 'feedback') {
                const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
                document.getElementById('feedbackComplaintId').value = id;
                resetFeedbackModal();
                modal.show();
            }
        });
    });
}

function showComplaintDetails(complaint) {
    document.getElementById('viewCategory').innerText = complaint.category_name;
    document.getElementById('viewDescription').innerText = complaint.description;
    document.getElementById('viewLocation').innerHTML = `<i class="fas fa-map-marker-alt text-danger me-2"></i> ${complaint.location}`;
    document.getElementById('viewStatus').innerHTML = getStatusBadge(complaint.status);

    const resSection = document.getElementById('resolutionSection');
    if (complaint.status === 'Resolved' && complaint.resolution_notes) {
        document.getElementById('viewResolutionNotes').innerText = complaint.resolution_notes;
        resSection.classList.remove('d-none');
    } else {
        resSection.classList.add('d-none');
    }

    // Vendor and Price
    const vendorSection = document.getElementById('vendorSection');
    const priceSection = document.getElementById('priceSection');
    if (complaint.selected_vendor_id && complaint.vendor_name) {
        document.getElementById('viewVendor').innerText = complaint.vendor_name;
        vendorSection.classList.remove('d-none');
        if (complaint.agreed_price) {
            document.getElementById('viewPrice').innerText = `₹${complaint.agreed_price}`;
            priceSection.classList.remove('d-none');
        } else {
            priceSection.classList.add('d-none');
        }
    } else {
        vendorSection.classList.add('d-none');
        priceSection.classList.add('d-none');
    }

    // Progress Timeline
    const timelineSection = document.getElementById('timelineSection');
    const timelineBody = document.getElementById('updateTimeline');
    if (complaint.status === 'In Progress' || complaint.status === 'Resolved') {
        API.fetchJobUpdates(complaint.id).then(updates => {
            if (updates && updates.length > 0) {
                timelineBody.innerHTML = updates.map(up => `
                    <div class="mb-3 position-relative">
                        <small class="text-muted d-block">${new Date(up.created_at).toLocaleString()}</small>
                        <p class="mb-1 fw-bold text-dark">${up.message}</p>
                        ${up.image_url ? `<img src="${up.image_url}" class="img-fluid rounded border mb-2" style="max-height: 200px;">` : ''}
                        <small class="text-info d-block">By: ${up.business_name || 'Vendor'}</small>
                    </div>
                `).join('');
                timelineSection.classList.remove('d-none');
            } else {
                timelineSection.classList.add('d-none');
            }
        });
    } else {
        timelineSection.classList.add('d-none');
    }

    new bootstrap.Modal(document.getElementById('viewModal')).show();
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
                <td>
                    <strong>${q.business_name || 'Vendor'}</strong>
                    <div class="small text-warning">
                        ${q.rating ? `<i class="fas fa-star me-1"></i>${q.rating.toFixed(1)}` : '<i class="far fa-star me-1"></i>New'}
                    </div>
                </td>
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
                        showAlert('Vendor selected! Please complete payment to start the job.');
                        bootstrap.Modal.getInstance(document.getElementById('quotesModal')).hide();
                        window.location.reload(); // Refresh to show 'Awaiting Payment' button
                    } else {
                        showAlert(res.message, 'danger');
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

    const response = await API.fetchComplaints();
    if (!response.success && !response.data) {
        console.error('Fetch Complaints Error Details:', response);
        showAlert('Error loading complaints: ' + (response.message || 'Check Console'), 'danger');
        return;
    }
    const complaints = response.data || [];

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
            <td class="text-truncate" style="max-width: 200px;">${c.description}</td>
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

    // Helper to populate officers based on category
    async function populateOfficers(category = '') {
        const officerSelect = document.getElementById('officerSelect');
        if (!officerSelect) return;

        officerSelect.innerHTML = '<option value="">Loading officers...</option>';
        const users = await API.fetchUsers('officer', category);

        if (users && users.length > 0) {
            officerSelect.innerHTML = '<option value="">Select Officer...</option>';
            users.forEach(off => {
                const opt = document.createElement('option');
                opt.value = off.id;
                opt.textContent = `${off.name} (${off.department || 'General'})`;
                officerSelect.appendChild(opt);
            });
        } else {
            officerSelect.innerHTML = '<option value="">No officers found for this category</option>';
        }
    }

    // Helper to populate vendors based on category
    async function populateVendors(category = '') {
        const vendorSelect = document.getElementById('vendorSelect');
        if (!vendorSelect) return;

        vendorSelect.innerHTML = '<option value="">Loading vendors...</option>';
        const users = await API.fetchUsers('vendor', category);

        if (users && users.length > 0) {
            vendorSelect.innerHTML = '<option value="">Select Vendor...</option>';
            users.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                // Use business_name if available, otherwise just name
                const displayName = v.business_name ? `${v.business_name} (${v.name})` : v.name;
                opt.textContent = `${displayName} - ${v.service_type || 'General'}`;
                vendorSelect.appendChild(opt);
            });
        } else {
            console.log(`No vendors found for category: ${category}`);
            vendorSelect.innerHTML = '<option value="">No vendors found (Check backend restart)</option>';
        }
    }

    // Event delegation for Dispatch buttons
    tableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action="dispatch"]');
        if (btn) {
            const complaintId = btn.dataset.id;
            const complaint = complaints.find(c => c.id == complaintId);
            const category = complaint ? complaint.category_name : '';

            document.getElementById('dispatchComplaintId').value = complaintId;

            // Auto-select the complaint's category in both filter dropdowns
            const govCategoryFilter = document.getElementById('govCategoryFilter');
            const privateCategoryFilter = document.getElementById('privateCategoryFilter');
            if (govCategoryFilter) govCategoryFilter.value = category;
            if (privateCategoryFilter) privateCategoryFilter.value = category;

            // Initial population of dropdowns based on complaint category
            populateOfficers(category);
            populateVendors(category);

            new bootstrap.Modal(document.getElementById('dispatchModal')).show();
        }
    });

    // Handle Category Filter changes in the modal
    document.getElementById('govCategoryFilter')?.addEventListener('change', (e) => populateOfficers(e.target.value));
    document.getElementById('privateCategoryFilter')?.addEventListener('change', (e) => populateVendors(e.target.value));

    // Toggle dispatch fields (Government vs Private)
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
            const vendor_id = document.getElementById('vendorSelect').value;
            if (vendor_id) {
                response = await API.routeToVendor(id, vendor_id);
            } else {
                response = await API.routeToPrivate(id);
            }
        } else {
            const officer_id = document.getElementById('officerSelect').value;
            response = await API.routeToGovernment(id, officer_id || null);
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

    const response = await API.fetchComplaints();
    if (!response.success && !response.data) {
        showAlert('Error loading tasks: ' + (response.message || 'Unknown error'), 'danger');
        return;
    }
    const myComplaints = response.data || [];

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
            response = await fetch(`${API.API_URL}/officer/upload-proof`, {
                method: 'POST',
                headers: API.getAuthHeader(),
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
        // 1. Available marketplace jobs
        const response = await fetch(`${API.API_URL}/vendor/available`, {
            headers: API.getAuthHeader()
        }).then(r => r.json());

        if (response.success) {
            renderAvailableJobs(response.data, jobsList);
        }

        // 2. Active jobs (assigned specifically to this vendor)
        const activeJobs = await fetch(`${API.API_URL}/vendor/my-jobs`, {
            headers: API.getAuthHeader()
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

    if (document.getElementById('progressForm')) {
        document.getElementById('progressForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const complaintId = document.getElementById('progressComplaintId').value;
            const message = document.getElementById('progressMessage').value;
            const imageUrl = document.getElementById('progressImage').value;

            const response = await API.postJobUpdate(complaintId, message, imageUrl);
            if (response.success) {
                showAlert('Progress update posted!');
                bootstrap.Modal.getInstance(document.getElementById('progressModal')).hide();
                document.getElementById('progressForm').reset();
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
                        <span class="text-success fw-bold">${job.price ? `Accepted: ₹${job.price}` : 'Direct Assignment'}</span>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-info rounded-pill px-3 btn-progress" data-id="${job.id || job.complaint_id}">
                                <i class="fas fa-tasks me-1"></i> Update
                            </button>
                            <button class="btn btn-sm btn-success rounded-pill px-3 btn-complete" data-id="${job.id || job.complaint_id}">
                                Mark Completed
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-progress').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('progressComplaintId').value = btn.dataset.id;
            new bootstrap.Modal(document.getElementById('progressModal')).show();
        });
    });

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

 f u n c t i o n   i n i t P a y m e n t F o r m ( )   { 
         c o n s t   f o r m   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p a y m e n t F o r m ' ) ; 
         i f   ( ! f o r m )   r e t u r n ; 
 
         f o r m . a d d E v e n t L i s t e n e r ( ' s u b m i t ' ,   a s y n c   ( e )   = >   { 
                 e . p r e v e n t D e f a u l t ( ) ; 
                 c o n s t   i d   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p a y C o m p l a i n t I d ' ) . v a l u e ; 
                 c o n s t   b t n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' c o n f i r m P a y m e n t B t n ' ) ; 
                 
                 b t n . d i s a b l e d   =   t r u e ; 
                 b t n . i n n e r H T M L   =   ' < i   c l a s s = \ 
 
 f a s 
 
 f a - s p i n n e r 
 
 f a - s p i n 
 
 m e - 2 \ > < / i > P r o c e s s i n g . . . ' ; 
 
                 c o n s t   r e s p o n s e   =   a w a i t   A P I . p a y C o m p l a i n t ( i d ) ; 
                 i f   ( r e s p o n s e . s u c c e s s )   { 
                         s h o w A l e r t ( ' P a y m e n t   S u c c e s s f u l ! ' ) ; 
                         b o o t s t r a p . M o d a l . g e t I n s t a n c e ( d o c u m e n t . g e t E l e m e n t B y I d ( ' p a y m e n t M o d a l ' ) ) . h i d e ( ) ; 
                         w i n d o w . l o c a t i o n . r e l o a d ( ) ;   
                 
        }   e l s e   { 
                         s h o w A l e r t ( r e s p o n s e . m e s s a g e ,   ' d a n g e r ' ) ; 
                 
        } 
                 b t n . d i s a b l e d   =   f a l s e ; 
                 b t n . i n n e r H T M L   =   ' C o n f i r m   P a y m e n t ' ; 
         
    } ) ; 
 
} 
 
 f u n c t i o n   i n i t F e e d b a c k F o r m ( )   { 
         c o n s t   f o r m   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' f e e d b a c k F o r m ' ) ; 
         i f   ( ! f o r m )   r e t u r n ; 
 
         / /   S t a r   r a t i n g   l o g i c 
         c o n s t   s t a r s   =   d o c u m e n t . q u e r y S e l e c t o r A l l ( ' . s t a r - r a t i n g   i ' ) ; 
         s t a r s . f o r E a c h ( s t a r   = >   { 
                 s t a r . a d d E v e n t L i s t e n e r ( ' c l i c k ' ,   ( )   = >   { 
                         c o n s t   r a t i n g   =   s t a r . d a t a s e t . r a t i n g ; 
                         d o c u m e n t . g e t E l e m e n t B y I d ( ' s e l e c t e d R a t i n g ' ) . v a l u e   =   r a t i n g ; 
                         
                         / /   H i g h l i g h t   s t a r s 
                         s t a r s . f o r E a c h ( s   = >   { 
                                 i f   ( p a r s e I n t ( s . d a t a s e t . r a t i n g )   < =   p a r s e I n t ( r a t i n g ) )   { 
                                         s . c l a s s L i s t . r e p l a c e ( ' f a r ' ,   ' f a s ' ) ; 
                                         s . c l a s s L i s t . a d d ( ' t e x t - w a r n i n g ' ) ; 
                                 
                }   e l s e   { 
                                         s . c l a s s L i s t . r e p l a c e ( ' f a s ' ,   ' f a r ' ) ; 
                                         s . c l a s s L i s t . r e m o v e ( ' t e x t - w a r n i n g ' ) ; 
                                 
                } 
                         
            } ) ; 
                 
        } ) ; 
         
    } ) ; 
 
         f o r m . a d d E v e n t L i s t e n e r ( ' s u b m i t ' ,   a s y n c   ( e )   = >   { 
                 e . p r e v e n t D e f a u l t ( ) ; 
                 c o n s t   i d   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' f e e d b a c k C o m p l a i n t I d ' ) . v a l u e ; 
                 c o n s t   r a t i n g   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' s e l e c t e d R a t i n g ' ) . v a l u e ; 
                 c o n s t   c o m m e n t   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' f e e d b a c k C o m m e n t ' ) . v a l u e ; 
 
                 i f   ( r a t i n g   = =   0 )   { 
                         s h o w A l e r t ( ' P l e a s e   s e l e c t   a   r a t i n g ' ,   ' w a r n i n g ' ) ; 
                         r e t u r n ; 
                 
        } 
 
                 c o n s t   r e s p o n s e   =   a w a i t   A P I . p o s t F e e d b a c k ( i d ,   r a t i n g ,   c o m m e n t ) ; 
                 i f   ( r e s p o n s e . s u c c e s s )   { 
                         s h o w A l e r t ( ' T h a n k   y o u   f o r   y o u r   f e e d b a c k ! ' ) ; 
                         b o o t s t r a p . M o d a l . g e t I n s t a n c e ( d o c u m e n t . g e t E l e m e n t B y I d ( ' f e e d b a c k M o d a l ' ) ) . h i d e ( ) ; 
                         w i n d o w . l o c a t i o n . r e l o a d ( ) ; 
                 
        }   e l s e   { 
                         s h o w A l e r t ( r e s p o n s e . m e s s a g e ,   ' d a n g e r ' ) ; 
                 
        } 
         
    } ) ; 
 
} 
 
 f u n c t i o n   r e s e t F e e d b a c k M o d a l ( )   { 
         d o c u m e n t . g e t E l e m e n t B y I d ( ' s e l e c t e d R a t i n g ' ) . v a l u e   =   ' 0 ' ; 
         d o c u m e n t . g e t E l e m e n t B y I d ( ' f e e d b a c k C o m m e n t ' ) . v a l u e   =   ' ' ; 
         c o n s t   s t a r s   =   d o c u m e n t . q u e r y S e l e c t o r A l l ( ' . s t a r - r a t i n g   i ' ) ; 
         s t a r s . f o r E a c h ( s   = >   { 
                 s . c l a s s L i s t . r e p l a c e ( ' f a s ' ,   ' f a r ' ) ; 
                 s . c l a s s L i s t . r e m o v e ( ' t e x t - w a r n i n g ' ) ; 
         
    } ) ; 
 
} 
 
 
 