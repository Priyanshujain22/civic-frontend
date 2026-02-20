import { logoutUser, getCurrentUser } from './api.js';

export function renderNavbar() {
    const user = getCurrentUser();
    const navbar = document.createElement('nav');
    navbar.className = 'navbar navbar-expand-lg navbar-dark bg-primary';

    let links = '';
    if (user) {
        const userName = user.name || 'User';
        const dashboardLink = user.role === 'admin' ? 'admin-dashboard.html' :
            (user.role === 'officer' ? 'officer-dashboard.html' : 'citizen-dashboard.html');

        links = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle fw-bold text-white px-3" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user-circle me-2"></i>${userName}
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 py-2 animate slideIn" aria-labelledby="profileDropdown" style="min-width: 200px; border-radius: 12px;">
                    <li class="px-3 py-2 border-bottom mb-2 bg-light">
                        <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.7rem;">Your Account</small>
                    </li>
                    <li><a class="dropdown-item py-2" href="profile.html"><i class="fas fa-user-edit me-2 text-primary"></i>My Profile</a></li>
                    <li><a class="dropdown-item py-2" href="${dashboardLink}"><i class="fas fa-list-alt me-2 text-success"></i>My Dashboard</a></li>
                    ${user.role === 'citizen' ? '<li><a class="dropdown-item py-2" href="complaint-form.html"><i class="fas fa-plus-circle me-2 text-info"></i>New Complaint</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item py-2 text-danger" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                </ul>
            </li>
        `;
    } else {
        links = `
            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
            <li class="nav-item"><a class="btn btn-light text-primary ms-2 px-4 rounded-pill fw-bold" href="register.html">Register</a></li>
        `;
    }

    navbar.innerHTML = `
        <div class="container">
            <a class="navbar-brand" href="index.html">
                <i class="fas fa-landmark me-2"></i>CivicConnect
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    ${links}
                </ul>
            </div>
        </div>
    `;

    // Insert as first child of body
    document.body.prepend(navbar);

    // Attach event listener for logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
}

export function getStatusBadge(status) {
    switch (status) {
        case 'Pending': return '<span class="badge bg-warning text-dark">Pending</span>';
        case 'Routed': return '<span class="badge bg-secondary">Routed</span>';
        case 'Awaiting Quotes': return '<span class="badge bg-info text-dark">Awaiting Quotes</span>';
        case 'In Progress': return '<span class="badge bg-primary">In Progress</span>';
        case 'Resolved': return '<span class="badge bg-success">Resolved</span>';
        default: return '<span class="badge bg-secondary">Unknown</span>';
    }
}

export function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1050';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
