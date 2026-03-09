const blogSection = document.querySelector('.blogs-section');

// Logout functionality
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (auth) {
                auth.signOut().then(() => {
                    window.location.href = '/login';
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
                window.location.href = '/login';
                return;
            }

            // User is authenticated, proceed with blog loading
            const blogId = decodeURI(location.pathname.split("/").pop());
            const isBlogListingPage = !blogId || blogId === '' || blogId === 'blog' || blogId === 'blog.html';

            if (isBlogListingPage) {
                loadBlogListing();
            } else {
                displayIndividualBlog(blogId);
            }
        });
    };

    initBlogPage();
});

// Load individual blog
function loadIndividualBlog(blogId) {
    // Check if Firebase is properly configured and initialized
    const firebaseReady = typeof isFirebaseConfigured === 'function' && 
                         typeof db !== 'undefined' && 
                         db !== null && 
                         isFirebaseConfigured();
    
    if (firebaseReady) {
        // Load from Firebase
        let docRef = db.collection("blogs").doc(blogId);
        return docRef.get()
            .then((doc) => {
                if (doc.exists) {
                    console.log("Blog loaded from Firebase");
                    return doc.data();
                }
                console.log("Blog not found in Firebase");
                return null;
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                return null;
            });
    } else {
        // Firebase not available
        console.log("Firebase not available");
        return Promise.resolve(null);
    }
}

// Load and display individual blog
function displayIndividualBlog(blogId) {
    loadIndividualBlog(blogId)
        .then((data) => {
            console.log("Blog data:", data);
            const blogContainer = document.querySelector('.blog');
            if (data) {
                setupBlog(data, blogId);
                incrementBlogViews(blogId);
                // Load related blogs, excluding the current one
                loadRelatedBlogs(blogId);
            } else if (blogContainer) {
                // Blog not found - show error
                blogContainer.innerHTML = '<div class="error-container"><h2>Blog Not Found</h2><p>The blog you are looking for does not exist or has been removed.</p><a href="/blog" class="btn dark">Go Home</a></div>';
            }
        })
        .catch((error) => {
            console.error("Error loading blog: ", error);
            const blogContainer = document.querySelector('.blog');
            if (blogContainer) {
                blogContainer.innerHTML = '<div class="error-container"><h2>Error Loading Blog</h2><p>Something went wrong. Please try again later.</p><a href="/blog" class="btn dark">Go Home</a></div>';
            }
        });
}

// Increment blog views
function incrementBlogViews(blogId) {
    if (!db || !blogId) return;
    
    // Get current blog document
    db.collection('blogs').doc(blogId).get()
        .then((doc) => {
            if (doc.exists) {
                const currentViews = doc.data().views || 0;
                // Increment views by 1
                return db.collection('blogs').doc(blogId).update({
                    views: currentViews + 1
                });
            }
        })
        .catch((error) => {
            console.error('Error incrementing views:', error);
        });
}

const setupBlog = (data, blogId) => {
    const banner = document.querySelector('.banner');
    const blogTitle = document.querySelector('.title');
    const titleTag = document.querySelector('title');
    const publish = document.querySelector('.published');
    const article = document.querySelector('.article');
    
    // Set banner image - handle both URLs and base64
    let bannerImg = data.bannerImage || '/img/header.png';
    // If it's a base64 image (starts with data:), use it directly
    // If it's a relative path (not starting with / or http or data:), make it absolute
    if (bannerImg && !bannerImg.startsWith('/') && !bannerImg.startsWith('http') && !bannerImg.startsWith('data:')) {
        bannerImg = '/' + bannerImg;
    }
    if (banner) {
        banner.style.backgroundImage = 'url(' + bannerImg + ')';
        banner.style.backgroundSize = 'cover';
        banner.style.backgroundPosition = 'center';
    }

    // Set title
    if (titleTag) titleTag.innerHTML = data.title + ' - Blog';
    if (blogTitle) blogTitle.innerHTML = data.title;
    
    // Set published date and author
    let authorName = data.authorName || 'Anonymous';
    if (publish) publish.innerHTML = '<span>By </span>' + authorName + '<span> | Published on </span>' + (data.publishedAt || 'Recently');

    // Render article content
    if (article) addArticle(article, data.article);
};

const addArticle = (ele, data) => {
    if (!data) {
        ele.innerHTML = '<p>No content available.</p>';
        return;
    }
    
    let paragraphs = data.split("\n").filter(item => item.trim().length > 0);

    paragraphs.forEach(item => {
        // Check for heading
        if (item[0] === '#') {
            let hCount = 0;
            let i = 0;
            while (item[i] === '#' && i < 6) {
                hCount++;
                i++;
            }
            let tag = 'h' + hCount;
            let content = item.slice(hCount, item.length).trim();
            if (content) {
                ele.innerHTML += '<' + tag + '>' + content + '</' + tag + '>';
            }
        }
        // Check for image format ![alt](url)
        else if (item[0] === "!" && item[1] === "[") {
            let seperator = -1;

            for (let i = 0; i <= item.length; i++) {
                if (item[i] === "]" && item[i + 1] === "(" && item[item.length - 1] === ")") {
                    seperator = i;
                    break;
                }
            }

            if (seperator !== -1) {
                let alt = item.slice(2, seperator);
                let src = item.slice(seperator + 2, item.length - 1);
                // Make sure path is absolute - but also handle base64
                if (!src.startsWith('/') && !src.startsWith('http') && !src.startsWith('data:')) {
                    src = '/' + src;
                }
                ele.innerHTML += '<img src="' + src + '" alt="' + alt + '" class="article-image">';
            }
        }
        // Check for bold text **text**
        else if (item.startsWith('**') && item.endsWith('**')) {
            ele.innerHTML += '<p><strong>' + item.slice(2, -2) + '</strong></p>';
        }
        // Regular paragraph
        else if (item.trim()) {
            ele.innerHTML += '<p>' + item + '</p>';
        }
    });
};

// Load related blogs from Firebase
const loadRelatedBlogs = (currentBlogId) => {
    const relatedSection = document.querySelector('.blogs-section');
    
    if (!relatedSection) return;
    
    relatedSection.innerHTML =
        '<div class="blogs-header">' +
        '  <div class="blogs-header-text">' +
        '    <span class="blogs-tag">More to read</span>' +
        '    <h2 class="blogs-heading">More Blogs</h2>' +
        '  </div>' +
        '</div>' +
        '<div class="blogs-grid"></div>';

    // Check if Firebase is ready
    const firebaseReady = typeof isFirebaseConfigured === 'function' && 
                         typeof db !== 'undefined' && 
                         db !== null && 
                         isFirebaseConfigured();
    
    if (firebaseReady) {
        // Try with timestamp field first
        db.collection("blogs").orderBy("publishedTimestamp", "desc").get()
            .then((snapshot) => {
                // If query fails or no timestamp field, load all and sort client-side
                if (snapshot.empty || snapshot.size === 0) {
                    loadRelatedBlogsClientSide(currentBlogId);
                    return;
                }
                
                let count = 0;
                snapshot.forEach((doc) => {
                    const blog = doc.data();
                    // Skip current blog
                    if (blog.slug !== currentBlogId && count < 3) {
                        count++;
                        createRelatedBlogCard(blog, doc.id);
                    }
                });

                if (count === 0) {
                    relatedSection.innerHTML += '<div class="no-blogs"><p>No other blogs available yet.</p></div>';
                }
            })
            .catch((error) => {
                console.error("Error loading related blogs:", error);
                // Fallback to client-side sorting
                loadRelatedBlogsClientSide(currentBlogId);
            });
    } else {
        relatedSection.innerHTML += '<div class="no-blogs"><p>No other blogs available yet.</p></div>';
    }
};

// Fallback: Load all blogs and sort client-side
function loadRelatedBlogsClientSide(currentBlogId) {
    const relatedSection = document.querySelector('.blogs-section');
    if (!relatedSection) return;
    
    db.collection("blogs").get()
        .then((snapshot) => {
            if (snapshot.empty) {
                relatedSection.innerHTML += '<div class="no-blogs"><p>No other blogs available yet.</p></div>';
                return;
            }
            
            // Convert to array and sort by timestamp
            let blogsArray = [];
            snapshot.forEach((doc) => {
                blogsArray.push({ id: doc.id, data: doc.data() });
            });
            
            // Sort by timestamp (newest first)
            blogsArray.sort((a, b) => {
                const timeA = a.data.publishedTimestamp || 0;
                const timeB = b.data.publishedTimestamp || 0;
                return timeB - timeA;
            });
            
            let count = 0;
            blogsArray.forEach((blogItem) => {
                if (blogItem.id !== currentBlogId && count < 3) {
                    count++;
                    createRelatedBlogCard(blogItem.data, blogItem.id);
                }
            });

            if (count === 0) {
                relatedSection.innerHTML += '<div class="no-blogs"><p>No other blogs available yet.</p></div>';
            }
        })
        .catch((error) => {
            console.error("Error loading related blogs:", error);
            relatedSection.innerHTML += '<div class="no-blogs"><p>Error loading blogs.</p></div>';
        });
}

// Create related blog card HTML
function createRelatedBlogCard(blog, slug) {
    const relatedSection = document.querySelector('.blogs-section');
    if (!relatedSection) return;
    const grid = relatedSection.querySelector('.blogs-grid');
    
    let blogCard = document.createElement('a');
    blogCard.className = 'blog-card';
    blogCard.href = '/blog/' + slug;
    let title = blog.title ? blog.title.substring(0, 50) + (blog.title.length > 50 ? '...' : '') : 'Untitled';
    let overview = blog.article ? blog.article.substring(0, 100) + '...' : 'No content';
    let img = blog.bannerImage || '/img/header.png';
    // Handle base64 images
    if (!img.startsWith('/') && !img.startsWith('http') && !img.startsWith('data:')) {
        img = '/' + img;
    }
    
    blogCard.innerHTML = '<img src="' + img + '" class="blog-image" alt="' + blog.title + '">' +
        '<div class="blog-content">' +
        '<h1 class="blog-title">' + title + '</h1>' +
        '<p class="blog-overview">' + overview + '</p>' +
        '</div>';
    (grid || relatedSection).appendChild(blogCard);
};

// Load all blogs for listing page
function loadBlogListing() {
    const blogContainer = document.querySelector('.blog');
    const banner = document.querySelector('.banner');
    const title = document.querySelector('.title');
    const published = document.querySelector('.published');
    const article = document.querySelector('.article');
    
    // Hide individual blog elements, show listing only
    if (title) title.style.display = 'none';
    if (published) published.style.display = 'none';
    if (article) article.style.display = 'none';
    if (banner) banner.style.display = 'none';
    const blogMain = document.querySelector('.blog-main');
    if (blogMain) blogMain.style.display = 'none';
    
    const relatedSection = document.querySelector('.blogs-section');
    if (relatedSection) {
        relatedSection.style.display = 'block';
        relatedSection.classList.add('is-listing');

        const layout = document.querySelector('.blog-layout');
        if (layout) {
            layout.classList.add('is-listing-layout');
        }
        relatedSection.innerHTML =
            '<div class="blogs-header">' +
            '  <div class="blogs-header-text">' +
            '    <span class="blogs-tag">Discover</span>' +
            '    <h2 class="blogs-heading">Latest Blogs</h2>' +
            '  </div>' +
            '</div>' +
            '<div class="blogs-grid"></div>';
        
        // Check if Firebase is ready
        const firebaseReady = typeof isFirebaseConfigured === 'function' && 
                             typeof db !== 'undefined' && 
                             db !== null && 
                             isFirebaseConfigured();
        
        console.log('Firebase ready check:', {
            isFirebaseConfigured: typeof isFirebaseConfigured,
            db: typeof db,
            dbValue: db,
            isConfigured: isFirebaseConfigured ? isFirebaseConfigured() : false
        });
        
        if (firebaseReady) {
            console.log('Firebase is ready, loading blogs...');
            
            // Get all blogs and sort client-side
            db.collection("blogs").get()
                .then((snapshot) => {
                    console.log('Blogs query completed, snapshot size:', snapshot.size);
                    
                    if (snapshot.empty) {
                        console.log('No blogs found in database');
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
                    
                    // Convert to array and sort by publishedTimestamp (latest first)
                    let blogsArray = [];
                    snapshot.forEach((doc) => {
                        blogsArray.push({ id: doc.id, data: doc.data() });
                    });
                    
                    blogsArray.sort((a, b) => {
                        const timeA = a.data.publishedTimestamp || 0;
                        const timeB = b.data.publishedTimestamp || 0;
                        return timeB - timeA;
                    });
                    
                    console.log('Processing', blogsArray.length, 'blogs');
                    blogsArray.forEach((blogItem) => {
                        createRelatedBlogCard(blogItem.data, blogItem.id);
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
                '<div class="blogs-header">' +
                '  <div class="blogs-header-text">' +
                '    <span class="blogs-tag">Discover</span>' +
                '    <h2 class="blogs-heading">Latest Blogs</h2>' +
                '  </div>' +
                '</div>' +
                '<div class="no-blogs"><p>Database connection not available.</p></div>';
        }
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
                window.location.href = '/login';
                return;
            }
            
            loadBlog();
        };
        
        auth.onAuthStateChanged((user) => {
            if (authChecked) return;
            
            if (!user) {
                window.location.href = '/login';
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

