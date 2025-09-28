body {
    background-color: #0d0d0d;
    color: #39FF14;
    font-family: 'Fira Code', monospace;
    margin: 0;
    padding: 2rem;
    overflow-x: hidden;
}

.scanlines {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0) 0,
        rgba(0, 0, 0, 0) 2px,
        rgba(255, 255, 255, 0.05) 3px,
        rgba(255, 255, 255, 0.05) 4px
    );
    pointer-events: none;
    animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0% { opacity: 0.2; }
  50% { opacity: 0.5; }
  100% { opacity: 0.2; }
}

.container {
    max-width: 700px;
    margin: auto;
    border: 1px solid #39FF14;
    padding: 20px;
    box-shadow: 0 0 15px #39FF14;
}

h1 {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 0;
    position: relative;
    text-shadow: 0 0 5px #39FF14;
}

/* Glitch Effect */
h1::after, h1::before {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
h1::before {
    left: 2px;
    text-shadow: -1px 0 red;
    animation: glitch-anim-1 2s infinite linear alternate-reverse;
}
h1::after {
    left: -2px;
    text-shadow: -1px 0 blue;
    animation: glitch-anim-2 2s infinite linear alternate-reverse;
}

@keyframes glitch-anim-1 { 0% { clip: rect(24px, 9999px, 9px, 0); } 100% { clip: rect(92px, 9999px, 98px, 0); } }
@keyframes glitch-anim-2 { 0% { clip: rect(65px, 9999px, 119px, 0); } 100% { clip: rect(10px, 9999px, 5px, 0); } }


header p {
    text-align: center;
    margin-top: 5px;
    color: #a0a0a0;
}

.input-area {
    display: flex;
    flex-direction: column;
    margin-top: 2rem;
}

textarea {
    background-color: #1a1a1a;
    border: 1px solid #39FF14;
    color: #39FF14;
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    padding: 10px;
    resize: vertical;
    min-height: 80px;
}

textarea:focus {
    outline: none;
    box-shadow: 0 0 10px #39FF14;
}

button {
    background-color: #39FF14;
    color: #0d0d0d;
    border: none;
    padding: 10px;
    font-family: 'Fira Code', monospace;
    font-weight: bold;
    cursor: pointer;
    margin-top: 10px;
    transition: background-color 0.2s, color 0.2s;
}

button:hover {
    background-color: #0d0d0d;
    color: #39FF14;
    border: 1px solid #39FF14;
}

.feed {
    margin-top: 2rem;
}

.post {
    border: 1px dashed #444;
    padding: 15px;
    margin-bottom: 15px;
}

.post-content {
    white-space: pre-wrap; /* a good practice for user content */
    word-wrap: break-word;
}

.post-footer {
    text-align: right;
    font-size: 0.8rem;
    color: #a0a0a0;
    margin-top: 10px;
}

.ttl {
    color: #39FF14;
}
