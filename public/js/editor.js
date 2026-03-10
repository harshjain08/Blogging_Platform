// Initialize editor page
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements inside DOMContentLoaded to ensure they exist
    const blogTitleField = document.querySelector('.title');
    const articleField = document.querySelector('.article');
    const banner = document.querySelector(".banner");
    const publishBtn = document.querySelector('.publish-btn');
    const bannerImage = document.querySelector('#banner-upload');
    const uploadInput = document.querySelector('#image-upload');

    let bannerPath = null;
    let editingSlug = null;

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
            initEditor(blogTitleField, articleField, banner, publishBtn, bannerImage, uploadInput);
        });
    };

    initEditorPage();

    // Initialize editor (only when authenticated)
    function initEditor(blogTitleField, articleField, banner, publishBtn, bannerImage, uploadInput) {
        // Check if we're editing an existing blog
        const urlParams = new URLSearchParams(window.location.search);
        const editSlug = urlParams.get('edit');

        // Setup event listeners after getting elements
        if (bannerImage) {
            bannerImage.addEventListener('change', () => {
                uploadImage(bannerImage, "banner", publishBtn, banner, blogTitleField, articleField);
            });
        }

        if (uploadInput) {
            uploadInput.addEventListener('change', () => {
                uploadImage(uploadInput, "image", publishBtn, null, blogTitleField, articleField);
            });
        }

        if (blogTitleField) {
            blogTitleField.addEventListener('input', function() {
                autoResize(this);
            });
        }

        if (articleField) {
            articleField.addEventListener('input', function() {
                autoResize(this);
            });
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                handlePublish(blogTitleField, articleField, banner, publishBtn, editingSlug);
            });
        }

        if (editSlug) {
            loadBlogForEditing(editSlug, blogTitleField, articleField, banner, publishBtn);
        }
    }

    async function loadBlogForEditing(slug, blogTitleField, articleField, banner, publishBtn) {
        if (!db || !auth) return;
        
        const currentUser = auth.currentUser;
        
        try {
            const doc = await db.collection('blogs').doc(slug).get();
            if (doc.exists) {
                const data = doc.data();
                
                if (!currentUser || data.authorId !== currentUser.uid) {
                    alert('You can only edit your own blogs!');
                    window.location.href = '/';
                    return;
                }
                
                editingSlug = slug;
                
                blogTitleField.value = data.title || '';
                articleField.value = data.article || '';
                bannerPath = data.bannerImage || null;
                
                if (bannerPath) {
                    banner.style.backgroundImage = 'url(' + bannerPath + ')';
                    banner.classList.add('has-image');
                }
                
                publishBtn.textContent = 'Update Blog';
                
                autoResize(blogTitleField);
                autoResize(articleField);
            }
        } catch (error) {
            console.error('Error loading blog for editing:', error);
        }
    }

    // Upload image as base64
    function uploadImage(uploadFile, uploadType, publishBtn, banner, blogTitleField, articleField) {
        if (!uploadFile) return;
        
        const [file] = uploadFile.files;
        if (file && file.type.includes("image")) {
            if (file.size > 1 * 1024 * 1024) {
                alert("Image size must be less than 1MB for direct storage!");
                return;
            }

            if (publishBtn && uploadType === "banner") {
                publishBtn.textContent = 'Processing...';
                publishBtn.disabled = true;
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                const base64Data = e.target.result;
                console.log('Image converted to base64, length:', base64Data.length);
                
                if (uploadType === "image" && articleField) {
                    addImage(base64Data, file.name, articleField);
                } else if (banner) {
                    bannerPath = base64Data;
                    banner.style.backgroundImage = 'url(' + base64Data + ')';
                    banner.classList.add('has-image');
                }
                
                if (publishBtn) {
                    publishBtn.textContent = 'Publish';
                    publishBtn.disabled = false;
                }
            };
            
            reader.onerror = function(error) {
                console.error("Error reading file: ", error);
                alert("Error processing image! Please try again.");
                if (publishBtn) {
                    publishBtn.textContent = 'Publish';
                    publishBtn.disabled = false;
                }
            };
            
            reader.readAsDataURL(file);
        } else {
            alert("Please select a valid image file!");
        }
    }

    // Add image to article content
    function addImage(imagepath, alt, articleField) {
        if (!articleField) return;
        let curPos = articleField.selectionStart;
        let textToInsert = '\n![' + alt + '](' + imagepath + ')\n';
        articleField.value = articleField.value.slice(0, curPos) + textToInsert + articleField.value.slice(curPos);
    }

    // Publish button click handler
    function handlePublish(blogTitleField, articleField, banner, publishBtn, editingSlug) {
        const currentUser = auth ? auth.currentUser : null;
        if (!currentUser) {
            alert("Please login to publish a blog!");
            window.location.replace('/login');
            return;
        }

        if (!blogTitleField || blogTitleField.value.trim().length === 0) {
            alert("Please enter a blog title!");
            if (blogTitleField) blogTitleField.focus();
            return;
        }

        if (!articleField || articleField.value.trim().length === 0) {
            alert("Please write some content for your blog!");
            if (articleField) articleField.focus();
            return;
        }

        const isEditing = editingSlug !== null;
        const slug = isEditing ? editingSlug : (
            blogTitleField.value.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-' + Date.now()
        );

        if (publishBtn) {
            publishBtn.textContent = isEditing ? 'Updating...' : 'Publishing...';
            publishBtn.disabled = true;
        }

        let blogData = {
            title: blogTitleField.value.trim(),
            article: articleField.value.trim(),
            bannerImage: bannerPath || '/img/header.png',
            publishedAt: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            publishedTimestamp: Date.now(),
            slug: slug,
            authorId: currentUser ? currentUser.uid : null,
            authorEmail: currentUser ? currentUser.email : null,
            authorName: currentUser && currentUser.displayName ? currentUser.displayName : 
                       (currentUser ? currentUser.email.split('@')[0] : 'Anonymous')
        };

        const firebaseReady = typeof isFirebaseConfigured === 'function' && 
                             typeof db !== 'undefined' && 
                             db !== null && 
                             isFirebaseConfigured();
        
        if (firebaseReady) {
            const operation = isEditing 
                ? db.collection("blogs").doc(slug).set(blogData, { merge: true })
                : db.collection("blogs").doc(slug).set(blogData);
            
            operation
                .then(() => {
                    console.log(isEditing ? "Blog updated successfully" : "Blog saved to Firebase successfully");
                    
                    if (!isEditing && currentUser) {
                        db.collection('users').doc(currentUser.uid).get()
                            .then((doc) => {
                                if (doc.exists) {
                                    const currentCount = doc.data().blogsCount || 0;
                                    return db.collection('users').doc(currentUser.uid).update({
                                        blogsCount: currentCount + 1
                                    });
                                } else {
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
                    location.href = '/blog';
                })
                .catch((error) => {
                    console.error("Firebase error: ", error);
                    alert("Error saving blog! Please try again.");
                    if (publishBtn) {
                        publishBtn.textContent = isEditing ? 'Update Blog' : 'Publish';
                        publishBtn.disabled = false;
                    }
                });
        } else {
            alert("Firebase is not available. Please check your internet connection and refresh the page.");
            if (publishBtn) {
                publishBtn.textContent = isEditing ? 'Update Blog' : 'Publish';
                publishBtn.disabled = false;
            }
        }
    }

    // Auto-resize textarea
    function autoResize(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
});

