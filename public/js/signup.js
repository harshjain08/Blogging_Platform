// Signup functionality
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const initSignup = () => {
        if (!auth) {
            setTimeout(initSignup, 100);
            return;
        }

        // Check if user is already logged in - redirect to blog page
        auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = '/blog';
                return;
            }
        });

        const signupForm = document.getElementById('signup-form');
        const errorMessage = document.getElementById('error-message');

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = document.getElementById('name').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                const submitBtn = signupForm.querySelector('button[type="submit"]');

                // Validate inputs
                if (password.length < 6) {
                    errorMessage.textContent = 'Password must be at least 6 characters.';
                    errorMessage.classList.add('show');
                    return;
                }

                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Creating account...</span>';
            errorMessage.classList.remove('show');
            errorMessage.textContent = '';

            // Create user with Firebase
            console.log('Attempting to create user with email:', email);
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('User created successfully:', userCredential.user.email);
                    // Success - update user profile with name
                    const user = userCredential.user;
                    
                    // Update display name
                    user.updateProfile({
                        displayName: name
                    }).then(() => {
                        // Create user document in Firestore
                        if (db) {
                            db.collection('users').doc(user.uid).set({
                                name: name,
                                email: email,
                                createdAt: new Date().toISOString(),
                                photoURL: null,
                                bio: '',
                                blogsCount: 0
                            }).then(() => {
                                console.log('User profile created in Firestore');
                                // Check for stored redirect URL
                                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                                sessionStorage.removeItem('redirectAfterLogin');
                                window.location.href = redirectUrl || '/blog';
                            }).catch((error) => {
                                console.error('Error creating user profile:', error);
                                // Still redirect even if Firestore fails
                                window.location.href = '/blog';
                            });
                        } else {
                            window.location.href = '/blog';
                        }
                    }).catch((error) => {
                        console.error('Error updating profile:', error);
                        window.location.href = '/blog';
                    });
                })
                .catch((error) => {
                    console.error('Signup error:', error);
                    console.error('Error code:', error.code);
                    console.error('Error message:', error.message);
                    errorMessage.textContent = getErrorMessage(error.code);
                    errorMessage.classList.add('show');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Create Account</span><span class="btn-arrow">→</span>';
                });
        });
    }

    initSignup();
});
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login instead.';
        case 'auth/invalid-email':
            return 'Invalid email address. Please check and try again.';
        case 'auth/operation-not-allowed':
            return 'Email/password authentication is not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable Email/Password.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use a stronger password.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/internal-error':
            return 'Firebase configuration error. Please check your Firebase Console settings.';
        default:
            return 'Signup failed: ' + errorCode + '. Please check Firebase Console Authentication settings.';
    }
}
