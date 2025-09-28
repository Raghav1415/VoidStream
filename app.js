// --- Configuration ---

const MAX_POST_LENGTH = 500;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// --- Supabase Client Setup ---
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const postInput = document.getElementById('post-input');
const submitButton = document.getElementById('submit-post');
const feed = document.getElementById('feed');

// --- Global State ---
let activeTimers = new Set();
let isLoading = false;

// --- Utility Functions ---

/**
 * Shows error message to user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
    // Create error element
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.style.cssText = `
        background-color: #ff4444;
        color: white;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        text-align: center;
    `;
    
    // Insert at top of feed
    feed.insertBefore(errorEl, feed.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorEl.parentNode) {
            errorEl.parentNode.removeChild(errorEl);
        }
    }, 5000);
}

/**
 * Shows loading state
 * @param {boolean} loading - Whether to show loading state
 */
function setLoadingState(loading) {
    isLoading = loading;
    submitButton.disabled = loading;
    submitButton.textContent = loading ? 'TRANSMITTING...' : 'COMMIT';
}

/**
 * Clears all active timers
 */
function clearAllTimers() {
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers.clear();
}

/**
 * Retry function for failed operations
 * @param {Function} operation - Function to retry
 * @param {number} attempts - Number of attempts remaining
 * @returns {Promise} - Promise that resolves when operation succeeds
 */
async function withRetry(operation, attempts = RETRY_ATTEMPTS) {
    try {
        return await operation();
    } catch (error) {
        if (attempts > 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return withRetry(operation, attempts - 1);
        }
        throw error;
    }
}

// --- Main Functions ---

/**
 * Fetches all posts from the database and renders them.
 */
async function fetchPosts() {
    try {
        const { data: posts, error } = await withRetry(async () => {
            const result = await _supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (result.error) throw result.error;
            return result;
        });

        if (error) throw error;
        
        clearAllTimers(); // Clear existing timers
        renderPosts(posts || []);
        
    } catch (error) {
        console.error('Error fetching posts:', error);
        showErrorMessage('Failed to load posts. Please refresh the page.');
    }
}

/**
 * Renders an array of post objects to the DOM.
 * @param {Array} posts - The array of posts to render.
 */
function renderPosts(posts) {
    feed.innerHTML = ''; // Clear existing feed
    
    if (posts.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'empty-state';
        emptyEl.innerHTML = '<p style="text-align: center; color: #666;">// No transmissions detected. The void awaits...</p>';
        feed.appendChild(emptyEl);
        return;
    }

    posts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.classList.add('post');

        const content = document.createElement('p');
        content.classList.add('post-content');
        content.textContent = post.content;
        
        const footer = document.createElement('div');
        footer.classList.add('post-footer');
        
        const ttlSpan = document.createElement('span');
        ttlSpan.classList.add('ttl');
        
        // Calculate TTL countdown
        const createdAt = new Date(post.created_at);
        const expiresAt = createdAt.getTime() + (24 * 60 * 60 * 1000);

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = expiresAt - now;

            if (distance < 0) {
                ttlSpan.textContent = 'EXPIRED';
                // Remove expired post
                if (postEl.parentNode) {
                    postEl.style.opacity = '0.5';
                    setTimeout(() => {
                        if (postEl.parentNode) {
                            postEl.parentNode.removeChild(postEl);
                        }
                    }, 2000);
                }
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            ttlSpan.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };

        const timerInterval = setInterval(updateTimer, 1000);
        activeTimers.add(timerInterval); // Track the timer
        updateTimer(); // Initial call
        
        footer.innerHTML = '// time-to-live: ';
        footer.appendChild(ttlSpan);
        
        postEl.appendChild(content);
        postEl.appendChild(footer);
        feed.appendChild(postEl);
    });
}

/**
 * Submits a new post to the database.
 */
async function addPost() {
    if (isLoading) return;
    
    const content = postInput.value.trim();
    
    // Input validation
    if (content.length === 0) {
        showErrorMessage('Post cannot be empty');
        postInput.focus();
        return;
    }
    
    if (content.length > MAX_POST_LENGTH) {
        showErrorMessage(`Post too long (max ${MAX_POST_LENGTH} characters)`);
        return;
    }
    
    setLoadingState(true);
    
    try {
        const { data, error } = await withRetry(async () => {
            const result = await _supabase
                .from('posts')
                .insert([{ content: content }]);
            
            if (result.error) throw result.error;
            return result;
        });
        
        if (error) throw error;
        
        postInput.value = ''; // Clear input on success
        
    } catch (error) {
        console.error('Error adding post:', error);
        showErrorMessage('Failed to transmit post. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Updates character count display
 */
function updateCharCount() {
    const count = postInput.value.length;
    const charCountEl = document.getElementById('char-count') || createCharCountElement();
    charCountEl.textContent = `${count}/${MAX_POST_LENGTH}`;
    charCountEl.style.color = count > MAX_POST_LENGTH ? '#ff4444' : '#666';
}

/**
 * Creates character count element
 */
function createCharCountElement() {
    const charCountEl = document.createElement('div');
    charCountEl.id = 'char-count';
    charCountEl.style.cssText = `
        text-align: right;
        font-size: 0.8rem;
        color: #666;
        margin-top: 5px;
    `;
    postInput.parentNode.appendChild(charCountEl);
    return charCountEl;
}

// --- Event Listeners and Initializers ---

// Submit post when button is clicked
submitButton.addEventListener('click', addPost);

// Submit post with Enter key (but allow Shift+Enter for new lines)
postInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addPost();
    }
});

// Update character count as user types
postInput.addEventListener('input', updateCharCount);

// Listen for real-time changes (new posts)
_supabase.channel('custom-all-channel')
    .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' 
    }, (payload) => {
        console.log('Change received!', payload);
        fetchPosts(); // Re-fetch all posts to update the feed
    })
    .subscribe();

// Handle page visibility changes (pause/resume timers)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearAllTimers();
    } else {
        fetchPosts(); // Refresh when page becomes visible again
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    clearAllTimers();
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    updateCharCount();
});
