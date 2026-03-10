const blogTitleField = document.querySelector('.title');
const articleField = document.querySelector('.article');
const banner = document.querySelector(".banner");
const publishBtn = document.querySelector('.publish-btn');
const bannerImage = document.querySelector('#banner-upload');
const uploadInput = document.querySelector('#image-upload');

let bannerPath = null;
let editingSlug = null; // Track if we're editing an existing blog

// Initialize editor page
document.addEventListener('DOMContentLoaded', () => {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (auth) {
                auth.signOut().then(() => {
                    window.location.replace('/login');
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            }
        });
    }

    // Wait for Firebase to be ready
    const initEditorPage = () => {
        if (!auth) {
            setTimeout(initEditorPage, 100);
            return;
        }

        // Check auth state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.replace('/login');
                return;
            }

            // User is authenticated, proceed with editor
            initEditor();
        });
    };

    initEditorPage();
});

// Initialize editor (only when authenticated)
function initEditor() {
    // Check if we're editing an existing blog
    const urlParams = new URLSearchParams(window.location.search);
    const editSlug = urlParams.get('edit');

    if (editSlug) {
        loadBlogForEditing(editSlug);
    }
}

async function loadBlogForEditing(slug) {
    if (!db || !auth) return;
    
    // Get current user
    const currentUser = auth.currentUser;
    
    try {
        const doc = await db.collection('blogs').doc(slug).get();
        if (doc.exists) {
            const data = doc.data();
            
            // Check if current user is the author
            if (!currentUser || data.authorId !== currentUser.uid) {
                alert('You can only edit your own blogs!');
                window.location.href = '/';
                return;
            }
            
            editingSlug = slug;
            
            // Fill form with existing data
            blogTitleField.value = data.title || '';
            articleField.value = data.article || '';
            bannerPath = data.bannerImage || null;
            
            if (bannerPath) {
                banner.style.backgroundImage = 'url(' + bannerPath + ')';
                banner.classList.add('has-image');
            }
            
            // Change button text
            publishBtn.textContent = 'Update Blog';
            
            // Trigger auto-resize
            autoResize(blogTitleField);
            autoResize(articleField);
        }
    } catch (error) {
        console.error('Error loading blog for editing:', error);
    }
}

// Banner upload handler
bannerImage.addEventListener('change', () => {
    uploadImage(bannerImage, "banner");
});

// Image upload handler
uploadInput.addEventListener('change', () => {
    uploadImage(uploadInput, "image");
});

// Upload image as base64 (stored directly in Firestore)
const uploadImage = (uploadFile, uploadType) => {
    const [file] = uploadFile.files;
    if (file && file.type.includes("image")) {
        // Check file size (max 1MB for base64 storage)
        if (file.size > 1 * 1024 * 1024) {
            alert("Image size must be less than 1MB for direct storage!");
            return;
        }

        // Show loading state
        if (uploadType === "banner") {
            publishBtn.textContent = 'Processing...';
        }
        publishBtn.disabled = true;

        // Convert image to base64
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const base64Data = e.target.result;
            console.log('Image converted to base64, length:', base64Data.length);
            
            if (uploadType === "image") {
                addImage(base64Data, file.name);
            } else {
                bannerPath = base64Data;
                banner.style.backgroundImage = 'url(' + base64Data + ')';
                banner.classList.add('has-image');
            }
            publishBtn.textContent = 'Publish';
            publishBtn.disabled = false;
        };
        
        reader.onerror = function(error) {
            console.error("Error reading file: ", error);
            alert("Error processing image! Please try again.");
            publishBtn.textContent = 'Publish';
            publishBtn.disabled = false;
        };
        
        // Read the file as Data URL (base64)
        reader.readAsDataURL(file);
    } else {
        alert("Please select a valid image file!");
    }
};

// Add image to article content
const addImage = (imagepath, alt) => {
    let curPos = articleField.selectionStart;
    let textToInsert = '\n![' + alt + '](' + imagepath + ')\n';
    articleField.value = articleField.value.slice(0, curPos) + textToInsert + articleField.value.slice(curPos);
};

// Save to localStorage (fallback)
const saveToLocalStorage = (blogData) => {
    let blogs = JSON.parse(localStorage.getItem('blogs') || '[]');
    blogs.unshift(blogData);
    localStorage.setItem('blogs', JSON.stringify(blogs));
    return blogData.slug;
};

// Publish button click handler
publishBtn.addEventListener('click', () => {
    // Check if user is logged in
    const currentUser = auth ? auth.currentUser : null;
    if (!currentUser) {
        alert("Please login to publish a blog!");
        window.location.replace('/login');
        return;
    }

    // Validate inputs
    if (blogTitleField.value.trim().length === 0) {
        alert("Please enter a blog title!");
        blogTitleField.focus();
        return;
    }

    if (articleField.value.trim().length === 0) {
        alert("Please write some content for your blog!");
        articleField.focus();
        return;
    }

    // Determine if we're updating or creating new
    const isEditing = editingSlug !== null;
    const slug = isEditing ? editingSlug : (
        blogTitleField.value.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now()
    );

    // Show loading state
    publishBtn.textContent = isEditing ? 'Updating...' : 'Publishing...';
    publishBtn.disabled = true;

    // Create blog data object with author info
    let blogData = {
        title: blogTitleField.value.trim(),
        article: articleField.value.trim(),
        bannerImage: bannerPath || '/img/header.png',
        publishedAt: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        publishedTimestamp: Date.now(), // For sorting - latest first
        slug: slug,
        // Add author info - link blog to user profile by email
        authorId: currentUser ? currentUser.uid : null,
        authorEmail: currentUser ? currentUser.email : null,
        authorName: currentUser && currentUser.displayName ? currentUser.displayName : 
                   (currentUser ? currentUser.email.split('@')[0] : 'Anonymous')
    };

    // Save to Firebase (primary storage only)
    const firebaseReady = typeof isFirebaseConfigured === 'function' && 
                         typeof db !== 'undefined' && 
                         db !== null && 
                         isFirebaseConfigured();
    
    if (firebaseReady) {
        // Use set with merge for update, or just set for new
        const operation = isEditing 
            ? db.collection("blogs").doc(slug).set(blogData, { merge: true })
            : db.collection("blogs").doc(slug).set(blogData);
        
        operation
            .then(() => {
                console.log(isEditing ? "Blog updated successfully" : "Blog saved to Firebase successfully");
                
                // Update user's blog count (only for new blogs)
                if (!isEditing && currentUser) {
                    db.collection('users').doc(currentUser.uid).get()
                        .then((doc) => {
                            if (doc.exists) {
                                const currentCount = doc.data().blogsCount || 0;
                                return db.collection('users').doc(currentUser.uid).update({
                                    blogsCount: currentCount + 1
                                });
                            } else {
                                // Create user document if doesn't exist
                                return db.collection('users').doc(currentUser.uid).set({
                                    email: currentUser.email,
                                    name: currentUser.displayName || currentUser.email.split('@')[0],
                                    blogsCount: 1
                                });
                            }
                        })
                        .catch((err) => console.error('Error updating blog count:', err));
                }
                
                alert(isEditing ? "Blog updated successfully!" : "Blog published successfully!");
                // After publish/update, go to all blogs listing page
                location.href = '/blog';
            })
            .catch((error) => {
                console.error("Firebase error: ", error);
                alert("Error saving blog! Please try again.");
                publishBtn.textContent = isEditing ? 'Update Blog' : 'Publish';
                publishBtn.disabled = false;
            });
    } else {
        // Firebase not available - show error
        alert("Firebase is not available. Please check your internet connection and refresh the page.");
        publishBtn.textContent = isEditing ? 'Update Blog' : 'Publish';
        publishBtn.disabled = false;
    }
});

// Save blog locally
const saveLocally = (blogData) => {
    try {
        saveToLocalStorage(blogData);
        alert("Blog published successfully!");
        
        // Clear the form
        blogTitleField.value = '';
        articleField.value = '';
        banner.style.backgroundImage = '';
        bannerPath = null;
        
        // Redirect to all blogs page
        location.href = '/blog';
    } catch (error) {
        console.error("Error saving locally: ", error);
        alert("Error publishing blog! Please try again.");
        publishBtn.textContent = 'Publish';
        publishBtn.disabled = false;
    }
};

// Auto-resize textarea
const autoResize = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
};

blogTitleField.addEventListener('input', function() {
    autoResize(this);
});

articleField.addEventListener('input', function() {
    autoResize(this);
});

