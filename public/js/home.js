// Home page - Public landing page, no login required initially
// Auth check only happens when user clicks Write or Read buttons

// Setup navbar - check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    setupNavbar();
    
    // Listen for auth state changes to update navbar
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(function(user) {
            updateNavbarForAuth(user);
        });
    }
    
    // Handle logout if present
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                auth.signOut().then(() => {
                    window.location.href = '/';
                }).catch((error) => {
                    console.error('Logout error:', error);
                    alert('Error logging out. Please try again.');
                });
            }
        });
    }
});

// Update navbar based on auth state
function updateNavbarForAuth(user) {
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');
    const profileLink = document.getElementById('profile-link');
    const logoutLink = document.getElementById('logout-link');
    
    if (user) {
        // User is logged in - show profile and logout
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
    } else {
        // User not logged in - show login and signup
        if (loginLink) loginLink.style.display = 'block';
        if (signupLink) signupLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

// Setup navbar with user info
function setupNavbar() {
    // Check initial auth state
    if (typeof auth !== 'undefined' && auth.currentUser) {
        updateNavbarForAuth(auth.currentUser);
    }
}

