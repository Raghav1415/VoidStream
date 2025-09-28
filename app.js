// --- Supabase Client Setup ---
// In a real project, these would be in a secure environment file.
const SUPABASE_URL = 'https://kkfmxgtiihyfwuwfqiju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm14Z3RpaWh5Znd1d2ZxaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjA4ODQsImV4cCI6MjA3NDYzNjg4NH0.B6hz3pw-SSiBKZ899zWPN9MRJ_wLucSc4IycpEzTMFY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const postInput = document.getElementById('post-input');
const submitButton = document.getElementById('submit-post');
const feed = document.getElementById('feed');

// --- Functions ---

/**
 * Fetches all posts from the database and renders them.
 */
async function fetchPosts() {
    let { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
    } else {
        renderPosts(posts);
    }
}

/**
 * Renders an array of post objects to the DOM.
 * @param {Array} posts - The array of posts to render.
 */
function renderPosts(posts) {
    feed.innerHTML = ''; // Clears existing feed
    for (const post of posts) {
        const postEl = document.createElement('div');
        postEl.classList.add('post');

        const content = document.createElement('p');
        content.classList.add('post-content');
        content.textContent = post.content;
        
        const footer = document.createElement('div');
        footer.classList.add('post-footer');
        
        const ttlSpan = document.createElement('span');
        ttlSpan.classList.add('ttl');
        
        // Calculates and updates the TTL countdown
        const createdAt = new Date(post.created_at);
        const expiresAt = createdAt.getTime() + (24 * 60 * 60 * 1000);

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = expiresAt - now;

            if (distance < 0) {
                ttlSpan.textContent = 'EXPIRED';
                // Optionally removes the element from the DOM
                if(postEl.parentNode) {
                   postEl.parentNode.removeChild(postEl);
                }
                clearInterval(timerInterval);
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            ttlSpan.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };

        const timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call
        
        footer.innerHTML = `// time-to-live: `;
        footer.appendChild(ttlSpan);
        
        postEl.appendChild(content);
        postEl.appendChild(footer);
        feed.appendChild(postEl);
    }
}

/**
 * Submits a new post to the database.
 */
async function addPost() {
    const content = postInput.value.trim();
    if (content.length > 0) {
        const { data, error } = await supabase
            .from('posts')
            .insert([{ content: content }]);
        
        if (error) {
            console.error('Error adding post:', error);
        } else {
            postInput.value = ''; // Clears input on success
        }
    }
}

// --- Event Listeners and Initializers ---

// Submit post when button is clicked
submitButton.addEventListener('click', addPost);

// Listen for real-time changes (new posts)
supabase.channel('custom-all-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
    console.log('Change received!', payload);
    fetchPosts(); // Re-fetch all posts to update the feed
  })
  .subscribe();

// Initial fetch of posts when the page loads
fetchPosts();

// Note on Auto-Deletion:
// In Supabase, this is handled by a scheduled Edge Function.
// 1. Create a database function `delete_old_posts()`:
//    CREATE FUNCTION delete_old_posts() RETURNS void AS $$
//    DELETE FROM posts WHERE created_at < now() - interval '24 hours';
//    $$ LANGUAGE sql;
// 2. Create an Edge Function that calls this database function.
// 3. Schedule the Edge Function to run periodically (e.g., every hour) using a cron job.
