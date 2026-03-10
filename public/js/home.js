// Home page - Public landing page, no login required initially
// Auth check only happens when user clicks Write or Read buttons

// Setup navbar - check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    setupNavbar();
    setupMobileMenu();
    
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

// Mobile Menu Toggle
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('mobile-active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('mobile-active');
            }
        });
        
        // Close menu when window is resized to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('mobile-active');
            }
        });
        
        // Close menu when clicking a nav link
        const navLinksItems = navLinks.querySelectorAll('.nav-link');
        navLinksItems.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('mobile-active');
            });
        });
    }
}

// Update navbar based on auth state
function updateNavbarForAuth(user) {
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');
    const profileLink = document.getElementById('profile-link');
    const logoutLink = document.getElementById('logout-link');

    // Hide/show the parent <li> to avoid layout gaps
    const loginLi = loginLink ? loginLink.parentElement : null;
    const signupLi = signupLink ? signupLink.parentElement : null;
    const profileLi = profileLink ? profileLink.parentElement : null;
    const logoutLi = logoutLink ? logoutLink.parentElement : null;

    if (user) {
        // User is logged in - show profile and logout, hide login/signup
        if (loginLi) loginLi.style.display = 'none';
        if (signupLi) signupLi.style.display = 'none';
        if (profileLi) profileLi.style.display = 'list-item';
        if (logoutLi) logoutLi.style.display = 'list-item';
    } else {
        // User not logged in - show login and signup, hide profile/logout
        if (loginLi) loginLi.style.display = 'list-item';
        if (signupLi) signupLi.style.display = 'list-item';
        if (profileLi) profileLi.style.display = 'none';
        if (logoutLi) logoutLi.style.display = 'none';
    }
}

// Setup navbar with user info
function setupNavbar() {
    // Check initial auth state
    if (typeof auth !== 'undefined' && auth.currentUser) {
        updateNavbarForAuth(auth.currentUser);
    }
    
    // Handle logout link click
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.href = '/';
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            }
        });
    }
}

