import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                register: resolve(__dirname, 'register.html'),
                citizenDashboard: resolve(__dirname, 'citizen-dashboard.html'),
                adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
                officerDashboard: resolve(__dirname, 'officer-dashboard.html'),
                complaintForm: resolve(__dirname, 'complaint-form.html'),
                profile: resolve(__dirname, 'profile.html'),
                forgotPassword: resolve(__dirname, 'forgot-password.html'),
            }
        }
    }
});
