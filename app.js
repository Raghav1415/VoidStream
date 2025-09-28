// --- Configuration ---

# Supabase Configuration
const SUPABASE_URL = window.REPLIT_DB_URL || 'https://kkfmxgtiihyfwuwfqiju.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm14Z3RpaWh5Znd1d2ZxaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA4ODQsImV4cCI6MjA3NDYzNjg4NH0.B6hz3pw-SSiBKZ899zWPN9MRJ_wLucSc4IycpEzTMFY';

const MAX_POST_LENGTH = 500;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// --- Replit Detection ---
const isReplit = window.location.hostname.includes('replit') || window.location.hostname.includes('repl.it');

// --- Supabase Client Setup ---
let _supabase;
try {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected successfully');
} catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    showErrorMessage('Database connection failed. Please check configuration.');
}

// --- DOM Elements ---
const postInput = document.getElementById('post-input');
const submitButton = document.getElementById('submit-post');
const feed = document.getElementById('feed');

// --- Global State ---
let activeTimers = new Set();
let isLoading = false;
let connectionStatus = 'checking';

// --- Utility Functions ---

/**
 * Shows status message to user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('error', 'success', 'info')
 */
function showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    const styles = {
        error: 'background-color: #ff4444; color: white;',
        success: 'background-color: #44ff44; color: #0d0d0d;',
        info: 'background-color: #39FF14; color: #0d0d0d;'
    };
    
    messageEl.style.cssText = `
        ${styles[type]}
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        text-align: center;
        animation: slideIn 0.3s ease;
        position: relative;
        z-index: 1000;
    `;
    
    // Insert at top of feed
    feed.insertBefore(messageEl, feed.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }, 5000);
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

/**
 * Shows loading state
 * @param {boolean} loading - Whether to show loading state
 */
function setLoadingState(loading) {
    isLoading = loading;
    submitButton.disabled = loading;
    submitButton.textContent = loading ? 'TRANSMITTING...' : 'COMMIT';
    
    if (loading) {
        submitButton.style.animation = 'pulse 1s infinite';
    } else {
        submitButton.style.animation = '';
    }
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

/**
 * Check database connection
 */
async function checkConnection() {
    try {
        if (!_supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await _supabase
            .from('posts')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        
        connectionStatus = 'connected';
        console.log('✅ Database connection verified');
        return true;
    } catch (error) {
        connectionStatus = 'error';
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// --- Main Functions ---

/**
 * Fetches all posts from the database and renders them.
 */
async function fetchPosts() {
    if (connectionStatus === 'error') {
        showErrorMessage('Database connection lost. Please refresh the page.');
        return;
    }
    
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
        
        if (connectionStatus === 'checking') {
            connectionStatus = 'connected';
            showSuccessMessage('✅ Connected to VoidStream network');
        }
        
    } catch (error) {
        console.error('Error fetching posts:', error);
        connectionStatus = 'error';
        showErrorMessage('Failed to load transmissions. Retrying...');
        
        // Auto-retry after 3 seconds
        setTimeout(() => {
            if (connectionStatus === 'error') {
                fetchPosts();
            }
        }, 3000);
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
        emptyEl.innerHTML = `
            <p style="text-align: center; color: #666; padding: 40px 20px;">
                // No transmissions detected. The void awaits your thoughts...
                <br><br>
                ${isReplit ? '<small>🚀 Running on Replit</small>' : ''}
            </p>
        `;
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
                ttlSpan.style.color = '#ff4444';
                // Remove expired post with fade effect
                if (postEl.parentNode) {
                    postEl.style.transition = 'opacity 2s ease';
                    postEl.style.opacity = '0.3';
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
            
            // Color coding for urgency
            if (hours < 1) {
                ttlSpan.style.color = '#ff4444'; // Red for less than 1 hour
            } else if (hours < 6) {
                ttlSpan.style.color = '#ffaa44'; // Orange for less than 6 hours
            } else {
                ttlSpan.style.color = '#39FF14'; // Green for more than 6 hours
            }
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
    
    if (connectionStatus === 'error') {
        showErrorMessage('Cannot transmit: Database connection lost');
        return;
    }
    
    const content = postInput.value.trim();
    
    // Input validation
    if (content.length === 0) {
        showErrorMessage('Transmission cannot be empty');
        postInput.focus();
        return;
    }
    
    if (content.length > MAX_POST_LENGTH) {
        showErrorMessage(`Transmission too long (max ${MAX_POST_LENGTH} characters)`);
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
        updateCharCount();
        showSuccessMessage('✅ Transmission sent to the void');
        
    } catch (error) {
        console.error('Error adding post:', error);
        showErrorMessage('Failed to transmit. Signal lost. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Updates character count display
 */
function updateCharCount() {
    const count = postInput.value.length;
    let charCountEl = document.getElementById('char-count');
    
    if (!charCountEl) {
        charCountEl = document.createElement('div');
        charCountEl.id = 'char-count';
        charCountEl.style.cssText = `
            text-align: right;
            font-size: 0.8rem;
            color: #666;
            margin-top: 5px;
            transition: color 0.2s ease;
        `;
        postInput.parentNode.appendChild(charCountEl);
    }
    
    charCountEl.textContent = `${count}/${MAX_POST_LENGTH}`;
    
    if (count > MAX_POST_LENGTH) {
        charCountEl.style.color = '#ff4444';
    } else if (count > MAX_POST_LENGTH * 0.8) {
        charCountEl.style.color = '#ffaa44';
    } else {
        charCountEl.style.color = '#666';
    }
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

// Listen for real-time changes (new posts) with error handling
function setupRealtimeSubscription() {
    if (!_supabase) return;
    
    try {
        _supabase.channel('custom-all-channel')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'posts' 
            }, (payload) => {
                console.log('📡 Real-time update received:', payload);
                setTimeout(fetchPosts, 500); // Small delay to ensure consistency
            })
            .subscribe((status) => {
                console.log('📡 Real-time subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time updates enabled');
                }
            });
    } catch (error) {
        console.error('❌ Failed to setup real-time subscription:', error);
    }
}

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

// Handle connection issues
window.addEventListener('online', () => {
    console.log('🌐 Connection restored');
    showSuccessMessage('Connection restored');
    fetchPosts();
});

window.addEventListener('offline', () => {
    console.log('📡 Connection lost');
    showErrorMessage('Connection lost. Posts will sync when reconnected.');
});

// Initial setup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 VoidStream initializing...');
    
    if (isReplit) {
        console.log('🔧 Running on Replit environment');
        showMessage('🚀 VoidStream deployed on Replit', 'info');
    }
    
    updateCharCount();
    
    // Check connection and initialize
    const connected = await checkConnection();
    if (connected) {
        await fetchPosts();
        setupRealtimeSubscription();
    } else {
        showErrorMessage('Failed to connect to database. Please check configuration.');
    }
    
    console.log('✅ VoidStream ready');
});
