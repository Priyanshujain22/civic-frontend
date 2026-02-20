import { logoutUser, getCurrentUser } from './api.js';

export function renderNavbar() {
    const user = getCurrentUser();
    const navbar = document.createElement('nav');
    navbar.className = 'navbar navbar-expand-lg navbar-dark bg-primary';

    let links = '';
    if (user) {
        // CorrectRole Display Logic
        const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        links = `
            <li class="nav-item"><span class="nav-link text-white fw-bold">Logged in as: ${roleDisplay}</span></li>
            <li class="nav-item"><a class="nav-link" href="profile.html"><i class="fas fa-user-circle me-1"></i>Profile</a></li>
            <li class="nav-item"><a class="nav-link" href="#" id="logoutBtn">Logout</a></li>
        `;
    } else {
        links = `
            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
            <li class="nav-item"><a class="btn btn-light text-primary ms-2" href="register.html">Register</a></li>
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
        case 'In Progress': return '<span class="badge bg-info text-dark">In Progress</span>';
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
