const blogSection = document.querySelector('.blogs-section');

// Logout functionality
document.addEventListener('DOMContentLoaded', function() {
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
});

// Initialize the blog page
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const initBlogPage = () => {
        if (!auth) {
            setTimeout(initBlogPage, 100);
            return;
        }

        // Check auth state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.replace('/login');
                return;
            }

            // User is authenticated, proceed with blog loading
            loadBlogListing();
        });
    };

    initBlogPage();
});

// Refresh blog listing when user returns to the page (after viewing a blog)
window.addEventListener('pageshow', (event) => {
    // Check if this is a back navigation (bfcache)
    if (event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
        loadBlogListing();
    }
});



// Create Medium-style blog card
function createRelatedBlogCard(blog, slug, likes = 0, comments = 0, views = 0) {
    const relatedSection = document.querySelector('.blogs-section');
    if (!relatedSection) return;
    const grid = relatedSection.querySelector('.blogs-grid');

    let img = blog.bannerImage || '/img/header.png';
    if (!img.startsWith('/') && !img.startsWith('http') && !img.startsWith('data:')) {
        img = '/' + img;
    }

    let title = blog.title || 'Untitled';
    let excerpt = blog.article ? blog.article.replace(/#+\s/g, '').substring(0, 120) + '...' : 'No content available.';
    let author = blog.authorName || 'Anonymous';
    let date = blog.publishedAt || 'Recently';
    let blogViews = blog.views || 0;

    let blogCard = document.createElement('a');
    blogCard.className = 'blog-card';
    blogCard.href = '/blog/' + slug;

    blogCard.innerHTML =
        '<div class="card-image-wrap">' +
            '<img src="' + img + '" class="blog-image" alt="' + title + '">' +
        '</div>' +
        '<div class="card-body">' +
            '<div class="card-author-row">' +
                '<span class="card-author-tag">✍</span>' +
                '<span class="card-author-text">by <strong>' + author + '</strong></span>' +
            '</div>' +
            '<h2 class="blog-title">' + title + '</h2>' +
            '<p class="blog-overview">' + excerpt + '</p>' +
            '<div class="card-stats">' +
                '<span class="card-date">📅 ' + date + '</span>' +
                '<span class="card-sep">·</span>' +
                '<span class="card-views">👁 ' + blogViews + '</span>' +
                '<span class="card-sep">·</span>' +
                '<span class="card-likes">❤️ ' + likes + '</span>' +
                '<span class="card-sep">·</span>' +
                '<span class="card-comments">💬 ' + comments + '</span>' +
            '</div>' +
        '</div>';

    (grid || relatedSection).appendChild(blogCard);
};


// Load all blogs for listing page
function loadBlogListing() {
    const relatedSection = document.querySelector('.blogs-section');
    if (!relatedSection) return;

    // Check if Firebase is ready
    const firebaseReady = typeof isFirebaseConfigured === 'function' &&
                         typeof db !== 'undefined' &&
                         db !== null &&
                         isFirebaseConfigured();

    if (firebaseReady) {
        // Show full-width centered loader — NO header yet
        relatedSection.innerHTML =
            '<div class="loader-container">' +
                '<div class="spinner"></div>' +
                '<p>Loading blogs...</p>' +
            '</div>';

        // Get all blogs and sort client-side
        db.collection("blogs").get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    relatedSection.innerHTML =
                        '<div class="blogs-header">' +
                        '  <div class="blogs-header-text">' +
                        '    <span class="blogs-tag">Discover</span>' +
                        '    <h2 class="blogs-heading">Latest Blogs</h2>' +
                        '  </div>' +
                        '</div>' +
                        '<div class="no-blogs">' +
                        '  <p>No blogs available yet. Be the first to write!</p>' +
                        '  <p><a href="/editor" class="btn dark">Create Your First Blog</a></p>' +
                        '</div>';
                    return;
                }

                // Convert and sort
                let blogsArray = [];
                snapshot.forEach((doc) => {
                    blogsArray.push({ id: doc.id, data: doc.data() });
                });

                blogsArray.sort((a, b) => {
                    const timeA = a.data.publishedTimestamp || 0;
                    const timeB = b.data.publishedTimestamp || 0;
                    return timeB - timeA;
                });

                // Now inject header + grid
                relatedSection.innerHTML =
                    '<div class="blogs-header">' +
                    '  <div class="blogs-header-text">' +
                    '    <span class="blogs-tag">Discover</span>' +
                    '    <h2 class="blogs-heading">Latest Blogs</h2>' +
                    '  </div>' +
                    '</div>' +
                    '<div class="blogs-grid"></div>';

                // Fetch likes and comments for each blog
                const blogPromises = blogsArray.map(blogItem => {
                    const blogData = blogItem.data;
                    const blogId = blogItem.id;
                    const likes = blogData.likes || 0;
                    const views = blogData.views || 0;
                    
                    // Get comment count from subcollection
                    return db.collection('blogs').doc(blogId).collection('comments').get()
                        .then(snap => {
                            return {
                                blog: blogData,
                                slug: blogId,
                                likes: likes,
                                comments: snap.size,
                                views: views
                            };
                        })
                        .catch(() => {
                            return {
                                blog: blogData,
                                slug: blogId,
                                likes: likes,
                                comments: 0,
                                views: views
                            };
                        });
                });

                Promise.all(blogPromises).then(blogsWithCounts => {
                    blogsWithCounts.forEach(item => {
                        createRelatedBlogCard(item.blog, item.slug, item.likes, item.comments, item.views);
                    });
                });
            })
            .catch((error) => {
                console.error("Error loading blogs:", error);
                relatedSection.innerHTML =
                    '<div class="blogs-header">' +
                    '  <div class="blogs-header-text">' +
                    '    <span class="blogs-tag">Discover</span>' +
                    '    <h2 class="blogs-heading">Latest Blogs</h2>' +
                    '  </div>' +
                    '</div>' +
                    '<div class="no-blogs"><p>Error loading blogs. Please try again later.</p></div>';
            });
    } else {
        console.error('Firebase not ready');
        relatedSection.innerHTML =
            '<div class="no-blogs"><p>Database connection not available.</p></div>';
    }
}

// Initialize individual blog page
function initIndividualBlog() {
    // If blogId is empty or is a path, redirect to home
    if (!blogId || blogId === '' || blogId === 'blog') {
        location.replace("/blog");
        throw new Error("Redirecting to blog listing");
    }

    // Require login before accessing the website (but allow reading blogs)
    // Check auth state - if not logged in, redirect to login
    if (typeof auth !== 'undefined') {
        let authChecked = false;
        
        const checkAuthAndProceed = () => {
            if (authChecked) return;
            authChecked = true;
            
            if (!auth.currentUser) {
                window.location.replace('/login');
                return;
            }
            
            loadBlog();
        };
        
        auth.onAuthStateChanged((user) => {
            if (authChecked) return;
            
            if (!user) {
                window.location.replace('/login');
                return;
            }
            
            authChecked = true;
            loadBlog();
        });
        
        if (auth.currentUser) {
            checkAuthAndProceed();
        } else {
            setTimeout(() => {
                if (!authChecked && auth.currentUser) {
                    checkAuthAndProceed();
                }
            }, 2000);
        }
    } else {
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h1>Error</h1><p>Authentication not available.</p></div>';
    }
}

