// =====================================================
// Blog Details - Full Interaction Engine
// =====================================================

let currentBlogId = null;
let currentUser = null;

// Logout functionality
document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (auth) {
                auth.signOut().then(() => {
                    window.location.replace('/login');
                });
            }
        });
    }
    
    // Setup mobile menu
    setupMobileMenu();
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

// Initialize the blog page
document.addEventListener('DOMContentLoaded', () => {
    const initBlogPage = () => {
        if (!auth) { setTimeout(initBlogPage, 100); return; }
        auth.onAuthStateChanged((user) => {
            if (!user) { window.location.replace('/login'); return; }
            currentUser = user;
            const blogId = decodeURI(location.pathname.split("/").pop());
            const isBlogListingPage = !blogId || blogId === '' || blogId === 'blog' || blogId === 'blog.html';
            if (isBlogListingPage) {
                window.location.replace('/blog');
            } else {
                currentBlogId = blogId;
                displayIndividualBlog(blogId);
            }
        });
    };
    initBlogPage();
});

// ── Load & display blog ─────────────────────────────
function displayIndividualBlog(blogId) {
    const pageLoader = document.getElementById('page-loader');
    const blogContent = document.getElementById('blog-content');
    if (pageLoader) pageLoader.style.display = 'flex';
    if (blogContent) blogContent.style.display = 'none';

    db.collection('blogs').doc(blogId).get()
        .then(doc => {
            if (!doc.exists) throw 'not_found';
            const data = doc.data();
            incrementBlogViews(blogId);
            setupBlog(data, blogId);

            let bannerImg = data.bannerImage || '/img/header.png';
            if (!bannerImg.startsWith('/') && !bannerImg.startsWith('http') && !bannerImg.startsWith('data:')) bannerImg = '/' + bannerImg;
            const imagePromise = new Promise(res => { const img = new Image(); img.onload = img.onerror = res; img.src = bannerImg; });
            return imagePromise;
        })
        .then(() => {
            if (pageLoader) { pageLoader.style.opacity = '0'; setTimeout(() => pageLoader.style.display = 'none', 500); }
            if (blogContent) blogContent.style.display = '';
        })
        .catch(err => {
            console.error(err);
            if (pageLoader) pageLoader.style.display = 'none';
            if (blogContent) blogContent.style.display = '';
            const blogContainer = document.querySelector('.blog');
            if (blogContainer) blogContainer.innerHTML = '<div class="error-container"><h2>Blog Not Found</h2><p>This blog does not exist or has been removed.</p><a href="/blog" class="btn">Go Home</a></div>';
        });
}

// ── Increment views ─────────────────────────────────
function incrementBlogViews(blogId) {
    if (!db || !blogId) {
        console.log('DB or blogId not available');
        return;
    }
    
    // Get the blog and update views
    db.collection('blogs').doc(blogId).get()
    .then(doc => {
        if (doc.exists) {
            let currentViews = doc.data().views || 0;
            console.log('Current views:', currentViews);
            
            // Increment views normally
            currentViews = currentViews + 1;
            
            console.log('Setting views to:', currentViews);
            
            return db.collection('blogs').doc(blogId).update({ views: currentViews });
        }
    })
    .then(() => {
        console.log('Views updated successfully');
    })
    .catch(err => {
        console.error('Error updating views:', err);
    });
}

// ── Setup blog content + interactions ───────────────
const setupBlog = (data, blogId) => {
    const banner = document.querySelector('.banner');
    const blogTitle = document.querySelector('.title');
    const titleTag = document.querySelector('title');
    const article = document.querySelector('.article');
    const authorNameText = document.getElementById('author-name-text');
    const publishedText = document.getElementById('published-text');
    const readTimeText = document.querySelector('.read-time');
    const authorAvatarImg = document.getElementById('author-avatar-img');

    // Banner
    let bannerImg = data.bannerImage || '/img/header.png';
    if (!bannerImg.startsWith('/') && !bannerImg.startsWith('http') && !bannerImg.startsWith('data:')) bannerImg = '/' + bannerImg;
    if (banner) { banner.style.backgroundImage = 'url(' + bannerImg + ')'; banner.style.backgroundSize = 'cover'; banner.style.backgroundPosition = 'center'; }

    // Title
    if (titleTag) titleTag.innerHTML = (data.title || 'Blog') + ' - BlogStation';
    if (blogTitle) blogTitle.innerHTML = data.title || '';

    // Author
    const authorName = data.authorName || 'Anonymous';
    if (authorNameText) authorNameText.textContent = authorName;
    
    // Set author profile link
    const authorProfileLink = document.getElementById('author-profile-link');
    if (authorProfileLink && data.authorId) {
        authorProfileLink.href = '/author/' + data.authorId;
    }
    if (publishedText) publishedText.textContent = data.publishedAt || 'Recently';

    // Author profile photo and followers count from Firebase users collection
    if (data.authorId) {
        const avatarPlaceholder = document.querySelector('.author-avatar-placeholder');
        const avatarInitial = document.getElementById('author-avatar-initial');
        
        // Show placeholder with initial
        if (avatarInitial && data.authorName) {
            avatarInitial.textContent = data.authorName.charAt(0).toUpperCase();
        }
        if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'flex';
        }
        authorAvatarImg.style.display = 'none';
        
        // Get user data from Firebase
        db.collection('users').doc(data.authorId).get().then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Load avatar
                if (userData.photoURL) {
                    authorAvatarImg.src = userData.photoURL;
                    authorAvatarImg.onload = function() {
                        authorAvatarImg.style.display = 'block';
                        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
                    };
                    authorAvatarImg.onerror = function() {
                        authorAvatarImg.style.display = 'none';
                        if (avatarPlaceholder) avatarPlaceholder.style.display = 'flex';
                    };
                } else if (data.authorAvatar) {
                    authorAvatarImg.src = data.authorAvatar;
                    authorAvatarImg.onload = function() {
                        authorAvatarImg.style.display = 'block';
                        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
                    };
                }
                
                // Load and display followers count from Firebase
                const followersCountEl = document.querySelector('.followers-count');
                if (followersCountEl) {
                    const followersCount = userData.followers || 0;
                    followersCountEl.textContent = followersCount + ' Followers';
                }
            }
        }).catch(err => {
            console.error('Error loading author data:', err);
            if (data.authorAvatar) {
                authorAvatarImg.src = data.authorAvatar;
                authorAvatarImg.onload = function() {
                    authorAvatarImg.style.display = 'block';
                    if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
                };
            }
        });
    }

    // Read time
    if (readTimeText && data.article) {
        readTimeText.textContent = Math.max(1, Math.ceil(data.article.split(' ').length / 200)) + ' min read';
    }

    // Render article
    if (article) addArticle(article, data.article);

    // Setup all interactions
    setupInteractions(blogId, data);
};

// ── Render article markdown ─────────────────────────
const addArticle = (ele, data) => {
    if (!data) { ele.innerHTML = '<p>No content available.</p>'; return; }
    let paragraphs = data.split('\n').filter(item => item.trim().length > 0);
    paragraphs.forEach(item => {
        if (item[0] === '#') {
            let hCount = 0, i = 0;
            while (item[i] === '#' && i < 6) { hCount++; i++; }
            const content = item.slice(hCount).trim();
            if (content) ele.innerHTML += '<h' + hCount + '>' + content + '</h' + hCount + '>';
        } else if (item[0] === '!' && item[1] === '[') {
            for (let i = 0; i < item.length; i++) {
                if (item[i] === ']' && item[i + 1] === '(' && item[item.length - 1] === ')') {
                    const alt = item.slice(2, i);
                    let src = item.slice(i + 2, item.length - 1);
                    if (!src.startsWith('/') && !src.startsWith('http') && !src.startsWith('data:')) src = '/' + src;
                    ele.innerHTML += '<img src="' + src + '" alt="' + alt + '" class="article-image">';
                    break;
                }
            }
        } else if (item.startsWith('**') && item.endsWith('**')) {
            ele.innerHTML += '<p><strong>' + item.slice(2, -2) + '</strong></p>';
        } else {
            ele.innerHTML += '<p>' + item + '</p>';
        }
    });
};

// ══════════════════════════════════════════════════════
// INTERACTIONS
// ══════════════════════════════════════════════════════
function setupInteractions(blogId, data) {
    setupLike(blogId);
    setupCommentBtn(blogId);
    setupFollow(blogId, data);
    setupSave(blogId);
    setupShare();
    setupMore(blogId);
    loadLikeCount(blogId);
    loadCommentCount(blogId);
}

// ── Like ────────────────────────────────────────────
function setupLike(blogId) {
    const likeBtn = document.querySelector('.like-btn');
    if (!likeBtn) return;
    const likeCountEl = likeBtn.querySelector('.like-count');

    // Check if already liked
    const likedKey = 'liked_' + blogId;
    const isLiked = localStorage.getItem(likedKey) === '1';
    if (isLiked) likeBtn.classList.add('liked');

    likeBtn.addEventListener('click', () => {
        db.collection('blogs').doc(blogId).get().then(doc => {
            if (!doc.exists) return;
            const likes = doc.data().likes || 0;
            const alreadyLiked = localStorage.getItem(likedKey) === '1';
            const newLikes = alreadyLiked ? Math.max(0, likes - 1) : likes + 1;

            db.collection('blogs').doc(blogId).update({ likes: newLikes }).then(() => {
                if (likeCountEl) likeCountEl.textContent = newLikes;
                if (alreadyLiked) {
                    localStorage.removeItem(likedKey);
                    likeBtn.classList.remove('liked');
                } else {
                    localStorage.setItem(likedKey, '1');
                    likeBtn.classList.add('liked');
                    // animate
                    likeBtn.classList.add('pop');
                    setTimeout(() => likeBtn.classList.remove('pop'), 300);
                }
            });
        });
    });
}

function loadLikeCount(blogId) {
    db.collection('blogs').doc(blogId).get().then(doc => {
        if (doc.exists) {
            const likeCountEl = document.querySelector('.like-count');
            if (likeCountEl) likeCountEl.textContent = doc.data().likes || 0;
        }
    });
}

// ── Comment ─────────────────────────────────────────
function setupCommentBtn(blogId) {
    const commentBtn = document.querySelector('.comment-btn');
    if (!commentBtn) return;

    // Auto-show comments when scrolling to bottom of blog
    let commentsInjected = false;
    
    const checkScrollAndShowComments = () => {
        if (commentsInjected) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        // When user scrolls within 300px of the bottom
        if (scrollTop + clientHeight >= scrollHeight - 300) {
            commentsInjected = true;
            injectCommentsSection(blogId);
        }
    };
    
    // Add scroll listener
    window.addEventListener('scroll', checkScrollAndShowComments);
    
    // Also check on page load in case blog is short
    setTimeout(checkScrollAndShowComments, 500);
    
    commentBtn.addEventListener('click', () => {
        if (!commentsInjected) {
            commentsInjected = true;
            injectCommentsSection(blogId);
        }
        const target = document.getElementById('comments-section');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function loadCommentCount(blogId) {
    db.collection('blogs').doc(blogId).collection('comments').get().then(snap => {
        const commentCountEl = document.querySelector('.comment-count');
        if (commentCountEl) commentCountEl.textContent = snap.size;
    });
}

function injectCommentsSection(blogId) {
    const blogMain = document.querySelector('.blog-main');
    if (!blogMain) return;

    const section = document.createElement('div');
    section.id = 'comments-section';
    section.className = 'comments-section';
    section.innerHTML = `
        <h3 class="comments-title">Comments</h3>
        <div class="comment-form">
            <textarea id="comment-input" class="comment-input" placeholder="Write a thoughtful comment…" rows="3"></textarea>
            <button id="post-comment-btn" class="post-comment-btn">Post Comment</button>
        </div>
        <div id="comments-list" class="comments-list">
            <div style="text-align:center;padding:24px;color:var(--text-light)"><div class="spinner" style="width:30px;height:30px;border-width:3px;margin:0 auto 8px"></div>Loading comments…</div>
        </div>`;
    blogMain.appendChild(section);

    loadComments(blogId);

    document.getElementById('post-comment-btn').addEventListener('click', () => postComment(blogId));
}

function loadComments(blogId) {
    const list = document.getElementById('comments-list');
    if (!list) return;

    db.collection('blogs').doc(blogId).collection('comments')
        .orderBy('createdAt', 'desc').get()
        .then(snap => {
            if (snap.empty) { list.innerHTML = '<p class="no-comments">Be the first to comment!</p>'; return; }
            list.innerHTML = '';
            
            // Process each comment and fetch user profile photo
            const commentPromises = snap.docs.map(doc => {
                const c = doc.data();
                const commentData = { id: doc.id, ...c };
                
                // Fetch user profile photo from users collection
                if (c.authorId) {
                    return db.collection('users').doc(c.authorId).get()
                        .then(userDoc => {
                            commentData.photoURL = userDoc.exists ? userDoc.data().photoURL : null;
                            return commentData;
                        })
                        .catch(() => commentData);
                }
                return Promise.resolve(commentData);
            });

            Promise.all(commentPromises).then(comments => {
                comments.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'comment-item';
                    
                    // Determine avatar content - photo or initials
                    let avatarContent = '';
                    if (c.photoURL) {
                        avatarContent = `<img src="${c.photoURL}" alt="${c.authorName || 'User'}" class="comment-avatar-img" onerror="this.parentElement.innerHTML='${(c.authorName || 'A')[0].toUpperCase()}'">`;
                    } else {
                        avatarContent = (c.authorName || 'A')[0].toUpperCase();
                    }
                    
                    el.innerHTML = `
                        <div class="comment-avatar">${avatarContent}</div>
                        <div class="comment-content">
                            <div class="comment-author">${c.authorName || 'Anonymous'}</div>
                            <p class="comment-text">${c.text}</p>
                            <span class="comment-time">${formatTime(c.createdAt)}</span>
                        </div>`;
                    list.appendChild(el);
                });
            });
        }).catch(() => { if (list) list.innerHTML = '<p class="no-comments">Could not load comments.</p>'; });
}

function postComment(blogId) {
    const input = document.getElementById('comment-input');
    const text = input ? input.value.trim() : '';
    if (!text) { input.focus(); return; }

    const btn = document.getElementById('post-comment-btn');
    btn.disabled = true;

    db.collection('blogs').doc(blogId).collection('comments').add({
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = '';
        btn.disabled = false;
        loadComments(blogId);
        // Update count
        loadCommentCount(blogId);
    }).catch(() => { btn.disabled = false; });
}

function formatTime(ts) {
    if (!ts) return 'Just now';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Follow ──────────────────────────────────────────
function setupFollow(blogId, data) {
    const followBtn = document.querySelector('.follow-btn');
    if (!followBtn || !data.authorId) return;

    // Store authorId on the button for later use
    followBtn.dataset.authorId = data.authorId;
    
    const followKey = 'following_' + data.authorId;
    
    // Hide button initially until we check Firebase
    followBtn.style.opacity = '0.5';
    
    // First check Firebase for actual following status
    checkFollowStatusFromFirebase(data.authorId, followBtn, followKey);

    // Restore opacity after checking
    followBtn.style.opacity = '1';

    followBtn.addEventListener('click', () => {
        handleFollowClick(data.authorId, followBtn, followKey);
    });
}

// Check if user is actually following from Firebase
// This function ALWAYS checks Firebase to get the real state, not localStorage
function checkFollowStatusFromFirebase(authorId, followBtn, followKey) {
    if (!currentUser || !db) {
        // Not logged in, show follow button as not following
        updateFollowButtonUI(followBtn, false);
        return;
    }

    // Don't allow following yourself
    if (currentUser.uid === authorId) {
        followBtn.style.display = 'none';
        return;
    }

    // ALWAYS check Firebase to get the actual follow status
    // This ensures consistency across all devices
    db.collection('users').doc(authorId).collection('followers').doc(currentUser.uid).get()
        .then(doc => {
            const isFollowing = doc.exists;
            console.log('Checking follow status from Firebase:', isFollowing);
            
            // Sync localStorage with Firebase to ensure consistency
            if (isFollowing) {
                localStorage.setItem(followKey, '1');
            } else {
                localStorage.removeItem(followKey);
            }
            updateFollowButtonUI(followBtn, isFollowing);
        })
        .catch(err => {
            console.error('Error checking follow status:', err);
            // On error, show button as not following (safest default)
            localStorage.removeItem(followKey);
            updateFollowButtonUI(followBtn, false);
        });
}

// Update follow button UI
function updateFollowButtonUI(followBtn, isFollowing) {
    if (isFollowing) {
        followBtn.textContent = 'Following';
        followBtn.classList.add('following');
    } else {
        followBtn.textContent = 'Follow';
        followBtn.classList.remove('following');
    }
    
    // Update followers count display if exists
    updateFollowersCountDisplay();
}

// Update the followers count in the UI from Firebase
function updateFollowersCountDisplay() {
    const followBtn = document.querySelector('.follow-btn');
    if (!followBtn || !followBtn.dataset.authorId) return;
    
    const authorId = followBtn.dataset.authorId;
    
    db.collection('users').doc(authorId).get()
        .then(doc => {
            if (doc.exists) {
                const followersCountEl = document.querySelector('.followers-count');
                if (followersCountEl) {
                    const count = doc.data().followers || 0;
                    followersCountEl.textContent = count + ' Followers';
                }
            }
        })
        .catch(err => {
            console.error('Error updating followers count:', err);
        });
}

// Handle follow click - Always check Firebase first to ensure consistent counts across devices
function handleFollowClick(authorId, followBtn, followKey) {
    if (!currentUser) {
        showToast('Please login to follow authors');
        return;
    }

    // Don't allow following yourself
    if (currentUser.uid === authorId) {
        showToast('You cannot follow yourself');
        return;
    }

    // Show loading state
    followBtn.disabled = true;
    const originalText = followBtn.textContent;

    // ALWAYS get the current state from Firebase - don't rely on localStorage
    // This ensures consistent counts across all devices
    db.collection('users').doc(authorId).collection('followers').doc(currentUser.uid).get()
        .then(doc => {
            const isCurrentlyFollowing = doc.exists;
            console.log('Current follow status from Firebase:', isCurrentlyFollowing);
            
            if (isCurrentlyFollowing) {
                // Unfollow - Remove from followers subcollection
                return db.collection('users').doc(authorId).collection('followers').doc(currentUser.uid).delete()
                    .then(() => {
                        // Get current follower count from Firebase and decrement
                        return db.collection('users').doc(authorId).get();
                    })
                    .then(userDoc => {
                        if (userDoc.exists) {
                            const currentFollowers = userDoc.data().followers || 0;
                            // Use Firestore increment for atomic update
                            return db.collection('users').doc(authorId).update({
                                followers: firebase.firestore.FieldValue.increment(-1)
                            });
                        }
                    })
                    .then(() => {
                        // Update localStorage to reflect the actual state
                        localStorage.removeItem(followKey);
                        updateFollowButtonUI(followBtn, false);
                        showToast('Unfollowed author');
                    });
            } else {
                // Follow - Add to followers subcollection
                return db.collection('users').doc(authorId).collection('followers').doc(currentUser.uid).set({
                    followedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    followerId: currentUser.uid
                })
                .then(() => {
                    // Get current follower count from Firebase and increment
                    return db.collection('users').doc(authorId).get();
                })
                .then(userDoc => {
                    if (userDoc.exists) {
                        // Use Firestore increment for atomic update
                        return db.collection('users').doc(authorId).update({
                            followers: firebase.firestore.FieldValue.increment(1)
                        });
                    }
                })
                .then(() => {
                    // Update localStorage to reflect the actual state
                    localStorage.setItem(followKey, '1');
                    updateFollowButtonUI(followBtn, true);
                    showToast('Following author');
                });
            }
        })
        .catch(err => {
            console.error('Error in follow/unfollow:', err);
            showToast('Error updating follow status');
        })
        .finally(() => {
            followBtn.disabled = false;
        });
}

// ── Save / Bookmark ─────────────────────────────────
function setupSave(blogId) {
    const saveBtn = document.querySelector('.save-btn');
    if (!saveBtn) return;

    const savedKey = 'saved_' + blogId;
    if (localStorage.getItem(savedKey) === '1') saveBtn.classList.add('saved');

    saveBtn.addEventListener('click', () => {
        const isSaved = localStorage.getItem(savedKey) === '1';
        if (isSaved) {
            localStorage.removeItem(savedKey);
            saveBtn.classList.remove('saved');
            showToast('Removed from saved');
        } else {
            localStorage.setItem(savedKey, '1');
            saveBtn.classList.add('saved');
            saveBtn.classList.add('pop');
            setTimeout(() => saveBtn.classList.remove('pop'), 300);
            showToast('Saved!');
        }
    });
}

// ── Share ───────────────────────────────────────────
function setupShare() {
    const shareBtn = document.querySelector('.share-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let menu = document.getElementById('share-menu');
        if (menu) { menu.remove(); return; }

        menu = document.createElement('div');
        menu.id = 'share-menu';
        menu.className = 'dropdown-menu';
        menu.innerHTML = `
            <button onclick="shareNative()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button>
            <button onclick="copyLink()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link</button>
            <button onclick="shareTwitter()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.265 5.638L18.244 2.25z"/></svg> X (Twitter)</button>`;

        shareBtn.style.position = 'relative';
        shareBtn.appendChild(menu);
        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
    });
}

window.shareNative = () => {
    if (navigator.share) {
        navigator.share({ title: document.title, url: window.location.href });
    } else {
        copyLink();
    }
};

window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'));
    const menu = document.getElementById('share-menu');
    if (menu) menu.remove();
};

window.shareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, '_blank');
    const menu = document.getElementById('share-menu');
    if (menu) menu.remove();
};

// ── More menu ───────────────────────────────────────
function setupMore(blogId) {
    const moreBtn = document.querySelector('.more-btn');
    if (!moreBtn) return;

    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let menu = document.getElementById('more-menu');
        if (menu) { menu.remove(); return; }

        const isAuthor = currentUser && currentUser.uid;
        menu = document.createElement('div');
        menu.id = 'more-menu';
        menu.className = 'dropdown-menu';
        menu.innerHTML = `
            <button onclick="reportBlog()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Report</button>
            <button onclick="openInNewTab()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open in new tab</button>`;

        moreBtn.style.position = 'relative';
        moreBtn.appendChild(menu);
        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
    });
}

window.reportBlog = () => {
    showToast('Blog reported. Thank you!');
    const menu = document.getElementById('more-menu');
    if (menu) menu.remove();
};

window.openInNewTab = () => {
    window.open(window.location.href, '_blank');
    const menu = document.getElementById('more-menu');
    if (menu) menu.remove();
};

// ── Toast notification ──────────────────────────────
function showToast(msg) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.className = 'toast-msg';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
