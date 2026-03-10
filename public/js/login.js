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

        // ---- Google Sign-In ----
        const googleBtn = document.getElementById('google-login-btn');
        const googleError = document.getElementById('google-error');

        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                googleBtn.disabled = true;
                googleBtn.querySelector('span').textContent = 'Signing in...';
                if (googleError) {
                    googleError.classList.remove('show');
                    googleError.textContent = '';
                }

                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });

                auth.signInWithPopup(provider)
                    .then((result) => {
                        const user = result.user;
                        const isNewUser = result.additionalUserInfo && result.additionalUserInfo.isNewUser;

                        // Save to Firestore if new user
                        if (isNewUser && db) {
                            db.collection('users').doc(user.uid).set({
                                name: user.displayName || '',
                                email: user.email || '',
                                createdAt: new Date().toISOString(),
                                photoURL: user.photoURL || null,
                                bio: '',
                                blogsCount: 0
                            }, { merge: true });
                        }

                        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.replace(redirectUrl || '/blog');
                    })
                    .catch((error) => {
                        console.error('Google login error code:', error.code);
                        console.error('Google login error message:', error.message);
                        if (googleError) {
                            let msg = 'Google sign-in failed. Please try again.';
                            if (error.code === 'auth/popup-closed-by-user') {
                                msg = 'Sign-in popup was closed. Please try again.';
                            } else if (error.code === 'auth/unauthorized-domain') {
                                msg = 'Domain not authorized. Please add localhost in Firebase Console → Authentication → Settings → Authorized Domains.';
                            } else if (error.code === 'auth/operation-not-allowed') {
                                msg = 'Google Sign-In is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Google.';
                            } else if (error.code === 'auth/popup-blocked') {
                                msg = 'Popup was blocked by browser. Please allow popups for this site.';
                            }
                            googleError.textContent = msg;
                            googleError.classList.add('show');
                        }
                        googleBtn.disabled = false;
                        googleBtn.querySelector('span').textContent = 'Continue with Google';
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

