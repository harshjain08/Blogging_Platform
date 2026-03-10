// Profile functionality
let currentUser = null;
let authReady = false;

// Debug function to log errors
function logError(context, error) {
    console.error(context + ':', error);
    console.log('Current user:', currentUser);
    console.log('DB available:', !!db);
}

// Check auth state and load profile
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const initProfilePage = () => {
        if (!auth) {
            setTimeout(initProfilePage, 100);
            return;
        }

        // Check auth state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.replace('/login');
                return;
            }

            // User is authenticated, load profile
            currentUser = user;
            authReady = true;
            loadUserProfile(currentUser);
            setupEventListeners();
        });
    };

    initProfilePage();
});

// Setup all event listeners
function setupEventListeners() {
    // Logout button
    setupLogoutButton();
    
    // Tab switching
    setupTabSwitching();

    // Edit profile modal
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeModal = document.getElementById('close-modal');
    const editProfileForm = document.getElementById('edit-profile-form');

    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', () => {
            editProfileModal.classList.add('show');
            document.getElementById('edit-name').value = currentUser?.displayName || '';
        });

        closeModal.addEventListener('click', () => {
            editProfileModal.classList.remove('show');
        });

        editProfileModal.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                editProfileModal.classList.remove('show');
            }
        });

        if (editProfileForm) {
            editProfileForm.addEventListener('submit', handleUpdateProfile);
        }
    }

    // Change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleChangePassword);
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }

    // Avatar upload - Add hidden file input
    setupAvatarUpload();
}

// Setup avatar upload functionality
function setupAvatarUpload() {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'avatar-upload';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    // Add click handler to button
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleAvatarUpload(file);
        }
        // Reset input so same file can be selected again
        fileInput.value = '';
    });
}

// Handle avatar upload (base64 - stored in Firestore only)
function handleAvatarUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file!');
        return;
    }

    // Check file size (max 500KB for avatar)
    if (file.size > 500 * 1024) {
        alert('Avatar image must be less than 500KB!');
        return;
    }

    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const originalText = changeAvatarBtn ? changeAvatarBtn.textContent : '📷';
    
    // Show loading state
    if (changeAvatarBtn) {
        changeAvatarBtn.textContent = '⏳';
    }

    // Convert image to base64
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Data = e.target.result;
        console.log('Avatar converted to base64, length:', base64Data.length);
        
        // Store avatar ONLY in Firestore (not in Firebase Auth due to size limits)
        if (currentUser && db) {
            db.collection('users').doc(currentUser.uid).set({
                photoURL: base64Data
            }, { merge: true })
            .then(() => {
                // Update UI directly from Firestore
                const avatarImg = document.getElementById('user-avatar');
                const avatarPlaceholder = document.querySelector('.avatar-placeholder');
                if (avatarImg) {
                    avatarImg.src = base64Data;
                    avatarImg.style.display = 'block';
                    if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
                }
                alert('Profile photo updated successfully!');
            })
            .catch((error) => {
                console.error('Error saving avatar to Firestore:', error);
                alert('Error saving photo. Please try again.');
            })
            .finally(() => {
                // Restore button text
                if (changeAvatarBtn) {
                    changeAvatarBtn.textContent = originalText;
                }
            });
        } else {
            alert('Please login to update profile photo.');
            if (changeAvatarBtn) {
                changeAvatarBtn.textContent = originalText;
            }
        }
    };
    
    reader.onerror = function(error) {
        console.error("Error reading file: ", error);
        alert('Error processing image! Please try again.');
        if (changeAvatarBtn) {
            changeAvatarBtn.textContent = originalText;
        }
    };
    
    // Read the file as Data URL (base64)
    reader.readAsDataURL(file);
}

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Load user profile data
function loadUserProfile(user) {
    console.log('Loading profile for:', user.email, 'displayName:', user.displayName);
    
    // Get elements
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const userAvatarEl = document.getElementById('user-avatar');
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    const avatarInitial = document.getElementById('user-avatar-initial');
    
    // Get user initial for placeholder
    const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 
                   (user.email ? user.email.charAt(0).toUpperCase() : 'U');
    
    // Update profile header - prioritize displayName from Auth
    if (userNameEl) {
        userNameEl.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    }
    if (userEmailEl) {
        userEmailEl.textContent = user.email || '';
    }
    
    // Show placeholder with initial when image is loading (add show class)
    const avatarInitialContainer = document.getElementById('avatar-initial-container');
    if (avatarInitial) {
        avatarInitial.textContent = initial;
    }
    if (avatarInitialContainer) {
        avatarInitialContainer.classList.add('show');
    }
    if (userAvatarEl) {
        userAvatarEl.style.display = 'none';
    }
    
    // Try to load user data from Firestore (includes avatar)
    if (db) {
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    console.log('User data found:', userData);
                    if (userData.name && !user.displayName) {
                        user.updateProfile({ displayName: userData.name });
                        document.getElementById('user-name').textContent = userData.name;
                    }
                    // Load avatar from Firestore
                    if (userData.photoURL) {
                        const avatarImg = document.getElementById('user-avatar');
                        if (avatarImg) {
                            avatarImg.src = userData.photoURL;
                            avatarImg.onload = function() {
                                avatarImg.style.display = 'block';
                                if (avatarPlaceholder) avatarPlaceholder.classList.remove('show');
                            };
                            avatarImg.onerror = function() {
                                avatarImg.style.display = 'none';
                                if (avatarPlaceholder) avatarPlaceholder.classList.add('show');
                            };
                        }
                    }
                    // Show blogs count, views and followers from user document if exists
                    document.getElementById('blogs-count').textContent = userData.blogsCount || 0;
                    document.getElementById('views-count').textContent = userData.totalViews || 0;
                    document.getElementById('followers-count').textContent = userData.followers || 0;
                } else {
                    console.log('No user document found');
                    // Try Auth avatar
                    if (user.photoURL) {
                        const avatarImg = document.getElementById('user-avatar');
                        if (avatarImg) {
                            avatarImg.src = user.photoURL;
                            avatarImg.onload = function() {
                                avatarImg.style.display = 'block';
                                if (avatarPlaceholder) avatarPlaceholder.classList.remove('show');
                            };
                        }
                    }
                }
            })
            .catch((error) => {
                logError('Error loading user data', error);
            });
    } else {
        // Try Auth avatar
        if (user.photoURL) {
            const avatarImg = document.getElementById('user-avatar');
            if (avatarImg) {
                avatarImg.src = user.photoURL;
                avatarImg.onload = function() {
                    avatarImg.style.display = 'block';
                    if (avatarPlaceholder) avatarPlaceholder.classList.remove('show');
                };
            }
        }
    }

    // Always load user's blogs (this will override the count with actual blogs found)
    loadUserBlogs(user.uid);
}

// Load user's blogs - get all and filter client-side
function loadUserBlogs(userId) {
    const userBlogsContainer = document.getElementById('user-blogs');
    if (!userBlogsContainer) {
        console.error('User blogs container not found');
        return;
    }

    // Show loading state
    userBlogsContainer.innerHTML = '<div class="loader-container" style="text-align: center; padding: 40px; font-size: 1.2rem; color: var(--text-color);"><div class="spinner"></div><p>Loading your blogs...</p></div>';

    if (!db) {
        console.error('DB not available');
        userBlogsContainer.innerHTML = '<p class="no-blogs">Database not available. Please refresh the page.</p>';
        return;
    }

    // Get current user's email for matching
    const userEmail = currentUser ? currentUser.email : null;
    console.log('Loading blogs for userId:', userId, 'email:', userEmail);

    // Get all blogs
    db.collection('blogs').get()
        .then((snapshot) => {
            console.log('Total blogs in database:', snapshot.size);
            
            if (snapshot.empty) {
                userBlogsContainer.innerHTML = `
                    <p class="no-blogs">No blogs yet. <a href="/editor">Write your first blog!</a></p>
                `;
                return;
            }

            let userBlogs = [];
            snapshot.forEach((doc) => {
                const blog = doc.data();
                // Match by authorId or authorEmail (for backward compatibility with old blogs)
                const isAuthor = blog.authorId === userId || 
                                (userEmail && blog.authorEmail === userEmail);
                
                if (isAuthor) {
                    console.log('Found user blog:', doc.id, blog.title);
                    userBlogs.push({ id: doc.id, data: blog });
                }
            });

            console.log('User blogs found:', userBlogs.length);

            // Sort by timestamp (newest first)
            userBlogs.sort((a, b) => {
                const dateA = a.data.publishedTimestamp || 0;
                const dateB = b.data.publishedTimestamp || 0;
                return dateB - dateA;
            });

            if (userBlogs.length === 0) {
                userBlogsContainer.innerHTML = `
                    <p class="no-blogs">No blogs yet. <a href="/editor">Write your first blog!</a></p>
                `;
                // Update blogs count to 0
                document.getElementById('blogs-count').textContent = '0';
                return;
            }

            let blogsHTML = '';
            let totalViews = 0;
            
            userBlogs.forEach((blogItem) => {
                const blog = blogItem.data;
                const slug = blogItem.id;
                const date = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Recently';
                const views = blog.views || 0;
                totalViews += views;
                
                // Handle both URLs and base64 images
                let blogImg = blog.bannerImage || '/img/header.png';
                if (!blogImg.startsWith('/') && !blogImg.startsWith('http') && !blogImg.startsWith('data:')) {
                    blogImg = '/' + blogImg;
                }
                
                blogsHTML += `
                    <div class="user-blog-item">
                        <img src="${blogImg}" alt="${blog.title}">
                        <div class="user-blog-info">
                            <h3 class="user-blog-title">${blog.title || 'Untitled'}</h3>
                            <p class="user-blog-date">Published: ${date} | Views: ${views}</p>
                            <div class="user-blog-actions">
                                <a href="/blog/${slug}" class="view-blog-btn">View</a>
                                <a href="/editor?edit=${slug}" class="edit-blog-btn">Edit</a>
                                <button class="delete-blog-btn" data-slug="${slug}">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });

            userBlogsContainer.innerHTML = blogsHTML;

            // Update counts based on actual blogs found
            document.getElementById('blogs-count').textContent = userBlogs.length;
            document.getElementById('views-count').textContent = totalViews;

            // Add delete handlers
            document.querySelectorAll('.delete-blog-btn').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const slug = e.target.dataset.slug;
                    handleDeleteBlog(slug);
                });
            });
        })
        .catch((error) => {
            logError('Error loading blogs', error);
            userBlogsContainer.innerHTML = '<p class="no-blogs">Error loading blogs. Please try again.</p>';
        });
}

// Handle logout
function handleLogout() {
    auth.signOut()
        .then(() => {
            window.location.replace('/login');
        })
        .catch((error) => {
            logError('Logout error', error);
        });
}

// Handle profile update
function handleUpdateProfile(e) {
    e.preventDefault();

    const newName = document.getElementById('edit-name').value.trim();
    if (!newName) {
        alert('Please enter your name.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    // Update Firebase Auth profile
    currentUser.updateProfile({
        displayName: newName
    })
    .then(() => {
        // Update Firestore
        if (db) {
            return db.collection('users').doc(currentUser.uid).set({
                name: newName,
                email: currentUser.email,
                blogsCount: 0,
                totalViews: 0
            }, { merge: true });
        }
    })
    .then(() => {
        document.getElementById('user-name').textContent = newName;
        document.getElementById('edit-profile-modal').classList.remove('show');
        alert('Profile updated successfully!');
    })
    .catch((error) => {
        logError('Error updating profile', error);
        alert('Error updating profile. Please try again.');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    });
}

// Handle password change
function handleChangePassword() {
    const email = currentUser?.email;
    if (!email) {
        alert('Unable to change password. Please contact support.');
        return;
    }

    if (confirm('We will send a password reset email to your email address. Continue?')) {
        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert('Password reset email sent! Please check your inbox.');
            })
            .catch((error) => {
                logError('Error sending reset email', error);
                alert('Error sending reset email. Please try again.');
            });
    }
}

// Handle account deletion
function handleDeleteAccount() {
    const confirmDelete = confirm('⚠️ WARNING: This will permanently delete your account and all your blogs. This action cannot be undone!\n\nAre you sure you want to continue?');
    
    if (!confirmDelete) return;

    const doubleConfirm = confirm('Are you absolutely sure? Type "DELETE" to confirm.');
    if (doubleConfirm) {
        const userInput = prompt('Type DELETE to confirm account deletion:');
        if (userInput !== 'DELETE') {
            return;
        }
    } else {
        return;
    }

    // Delete all user blogs first
    if (db) {
        db.collection('blogs')
            .where('authorId', '==', currentUser.uid)
            .get()
            .then((snapshot) => {
                const deletePromises = [];
                snapshot.forEach((doc) => {
                    deletePromises.push(doc.ref.delete());
                });
                return Promise.all(deletePromises);
            })
            .then(() => {
                // Delete user document
                return db.collection('users').doc(currentUser.uid).delete();
            })
            .then(() => {
                // Delete auth account
                return currentUser.delete();
            })
            .then(() => {
                alert('Account deleted successfully.');
                window.location.href = '/';
            })
            .catch((error) => {
                logError('Error deleting account', error);
                if (error.code === 'auth/requires-recent-login') {
                    alert('Please logout and login again, then try deleting your account.');
                } else {
                    alert('Error deleting account. Please try again.');
                }
            });
    } else {
        alert('Database not available. Please try again later.');
    }
}

// Handle blog deletion
function handleDeleteBlog(slug) {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    if (!db) return;

    // First get the blog to calculate updated views
    db.collection('blogs').doc(slug).get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error('Blog not found');
            }
            const blogData = doc.data();
            const viewsToSubtract = blogData.views || 0;
            
            // Delete the blog
            return db.collection('blogs').doc(slug).delete()
                .then(() => ({ viewsToSubtract }));
        })
        .then(({ viewsToSubtract }) => {
            // Update blogs count and total views
            if (currentUser) {
                return db.collection('users').doc(currentUser.uid).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            const currentCount = userData.blogsCount || 0;
                            const currentViews = userData.totalViews || 0;
                            return db.collection('users').doc(currentUser.uid).update({
                                blogsCount: Math.max(0, currentCount - 1),
                                totalViews: Math.max(0, currentViews - viewsToSubtract)
                            });
                        }
                    });
            }
        })
        .then(() => {
            // Reload blogs and profile
            loadUserBlogs(currentUser.uid);
            alert('Blog deleted successfully!');
        })
        .catch((error) => {
            logError('Error deleting blog', error);
            alert('Error deleting blog. Please try again.');
        });
}

// Tab switching functionality
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update button states
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide content
            document.querySelectorAll('.tab-content').forEach(content => {
                if (content.dataset.content === tabName) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
            
            // Load saved blogs if switching to saved tab
            if (tabName === 'saved') {
                loadSavedBlogs();
            }
        });
    });
}

// Load saved blogs
function loadSavedBlogs() {
    const savedBlogsContainer = document.getElementById('saved-blogs');
    if (!savedBlogsContainer) return;
    
    // Check if already loaded
    if (savedBlogsContainer.dataset.loaded === 'true') return;
    
    // Show loading state
    savedBlogsContainer.innerHTML = '<div class="loader-container" style="text-align: center; padding: 40px; font-size: 1.2rem; color: var(--text-color);"><div class="spinner"></div><p>Loading saved blogs...</p></div>';
    
    if (!db || !currentUser) {
        savedBlogsContainer.innerHTML = '<p class="no-blogs">Please login to view saved blogs.</p>';
        return;
    }
    
    // Get all saved blog IDs from localStorage
    const savedKeys = Object.keys(localStorage).filter(key => key.startsWith('saved_'));
    const savedBlogIds = savedKeys.map(key => key.replace('saved_', ''));
    
    console.log('Saved blog IDs:', savedBlogIds);
    
    if (savedBlogIds.length === 0) {
        savedBlogsContainer.innerHTML = '<p class="no-blogs">No saved blogs yet. Go to a blog and click the bookmark icon to save it!</p>';
        savedBlogsContainer.dataset.loaded = 'true';
        return;
    }
    
    // Fetch saved blogs from database
    const blogPromises = savedBlogIds.map(blogId => 
        db.collection('blogs').doc(blogId).get()
    );
    
    Promise.all(blogPromises)
        .then(results => {
            const savedBlogs = [];
            results.forEach(snap => {
                if (snap.exists) {
                    savedBlogs.push({ id: snap.id, data: snap.data() });
                }
            });
            
            // Sort by timestamp (newest first)
            savedBlogs.sort((a, b) => {
                const dateA = a.data.publishedTimestamp || 0;
                const dateB = b.data.publishedTimestamp || 0;
                return dateB - dateA;
            });
            
            if (savedBlogs.length === 0) {
                savedBlogsContainer.innerHTML = '<p class="no-blogs">No saved blogs yet. Go to a blog and click the bookmark icon to save it!</p>';
                return;
            }
            
            let blogsHTML = '';
            
            savedBlogs.forEach(blogItem => {
                const blog = blogItem.data;
                const slug = blogItem.id;
                const date = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Recently';
                const views = blog.views || 0;
                
                let blogImg = blog.bannerImage || '/img/header.png';
                if (!blogImg.startsWith('/') && !blogImg.startsWith('http') && !blogImg.startsWith('data:')) {
                    blogImg = '/' + blogImg;
                }
                
                blogsHTML += `
                    <div class="user-blog-item">
                        <img src="${blogImg}" alt="${blog.title}">
                        <div class="user-blog-info">
                            <h3 class="user-blog-title">${blog.title || 'Untitled'}</h3>
                            <p class="user-blog-date">Published: ${date} | Views: ${views}</p>
                            <div class="user-blog-actions">
                                <a href="/blog/${slug}" class="view-blog-btn">View</a>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            savedBlogsContainer.innerHTML = blogsHTML;
            savedBlogsContainer.dataset.loaded = 'true';
        })
        .catch((error) => {
            logError('Error loading saved blogs', error);
            savedBlogsContainer.innerHTML = '<p class="no-blogs">Error loading saved blogs. Please try again.</p>';
        });
}

