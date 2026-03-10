// Login functionality
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const initLogin = () => {
        if (!auth) {
            setTimeout(initLogin, 100);
            return;
        }

        // Check if user is already logged in
        auth.onAuthStateChanged((user) => {
            if (user) {
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                sessionStorage.removeItem('redirectAfterLogin');
                if (redirectUrl) {
                    window.location.replace(redirectUrl);
                } else {
                    window.location.replace('/blog');
                }
                return;
            }
        });

        const loginForm = document.getElementById('login-form');
        const errorMessage = document.getElementById('error-message');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                const submitBtn = loginForm.querySelector('button[type="submit"]');

                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Signing in...</span>';
                errorMessage.classList.remove('show');
                errorMessage.textContent = '';

                // Sign in with Firebase
                auth.signInWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        // Success
                        console.log('Login successful:', userCredential.user);
                        
                        // Check for stored redirect URL
                        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                        sessionStorage.removeItem('redirectAfterLogin');
                        
                        // Redirect to stored URL or default to /blog
                        if (redirectUrl) {
                            window.location.replace(redirectUrl);
                        } else {
                            window.location.replace('/blog');
                        }
                    })
                    .catch((error) => {
                        console.error('Login error:', error);
                        errorMessage.textContent = getErrorMessage(error.code);
                        errorMessage.classList.add('show');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<span>Sign In</span><span class="btn-arrow">→</span>';
                    });
            });
        }
    };

    initLogin();
});


// Get user-friendly error messages
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address. Please check and try again.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'Login failed. Please try again.';
    }
}

