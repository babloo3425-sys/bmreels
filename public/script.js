// ================= BASE =================
const BASE_URL = "https://bmreels.onrender.com";
console.log("USING BASE URL:", BASE_URL);

let currentVideoId = null;
let commentsData = {};
let currentCommentBtn = null;
let offset = 0;
let isLoading = false;
let currentUser = null;

const container = document.getElementById("reelsContainer");
const overlay = document.getElementById("commentOverlay");
const panel = document.getElementById("commentPanel");

// ================= LOGIN =================
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const loginInput = document.getElementById("loginInput");
  const loginBox = document.getElementById("loginBox");

  const savedUser = localStorage.getItem("bm_user");

  if (savedUser) {
    currentUser = savedUser;
    loginBox.classList.add("hide");
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const val = loginInput.value.trim();
      if (!val) {
        alert("Enter username");
        return;
      }

      localStorage.setItem("bm_user", val);
      currentUser = val;
      loginBox.classList.add("hide");
    });
  }
});

// ================= LOAD VIDEOS =================
async function loadVideos() {
  if (isLoading) return;
  isLoading = true;

  const res = await fetch(`${BASE_URL}/api/videos?offset=${offset}`);
  const data = await res.json();

  const resC = await fetch(`${BASE_URL}/api/comments`);
  commentsData = await resC.json();

  const likesRes = await fetch(`${BASE_URL}/api/likes`);
  const likesData = await likesRes.json();

  if (data.length === 0) {
    console.log("No more videos");
    isLoading = true;
    return;
  }

  data.forEach(video => {
    const cleanUsername = video.username.replace("@", "").trim();
    const div = document.createElement("div");
    div.className = "reel";

    div.innerHTML = `
      <video src="${BASE_URL}${video.url}" loop muted playsinline></video>
      <div class="centerHeart">❤️</div>

      <div class="info">
        <div class="userRow">
          <img src="https://i.pravatar.cc/40" class="avatar">
          <span class="username">@${cleanUsername}</span>
          <span class="follow">Follow</span>
        </div>
        <p>${video.caption}</p>
      </div>

      <div class="musicBar">
        🎵 Original Audio - ${video.username}
      </div>

      <div class="actions">
        <div class="actionItem likeBtn">
          ❤️ <span>${video.likes || 0}</span>
        </div>

        <div class="actionItem commentBtnIcon">
          💬 <span>${(video.comments || []).length}</span>
        </div>

        <button class="muteBtn">🔇</button>

        <div class="actionItem deleteBtn">🗑️</div>
      </div>
    `;

    const videoEl = div.querySelector("video");
    const likeBtn = div.querySelector(".likeBtn");
    const likeCount = likeBtn.querySelector("span");
    const deleteBtn = div.querySelector(".deleteBtn");
    const muteBtn = div.querySelector(".muteBtn");

    // ===== MUTE =====
    videoEl.muted = true;
    muteBtn.addEventListener("click", () => {
      videoEl.muted = !videoEl.muted;
      muteBtn.textContent = videoEl.muted ? "🔇" : "🔊";
    });

    // ===== LIKE =====
    let liked = false;

    likeBtn.addEventListener("click", async () => {
      const url = liked ? "unlike" : "like";

      const res = await fetch(`${BASE_URL}/api/${url}/${video._id}`, {
        method: "POST"
      });

      const data = await res.json();
      likeCount.textContent = data.likes;

      liked = !liked;
    });

    // ===== DELETE =====
    if (video.username !== currentUser) {
      deleteBtn.style.display = "none";
    }

    deleteBtn.addEventListener("click", async () => {
      const res = await fetch(`${BASE_URL}/api/delete-video/${video._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
      });

      const data = await res.json();
      if (data.success) div.remove();
    });

    // ===== COMMENT PANEL =====
    const commentBtn = div.querySelector(".commentBtnIcon");
    const commentList = document.getElementById("commentList");

    commentBtn.addEventListener("click", () => {
      panel.classList.add("show");
      overlay.classList.add("show");

      currentVideoId = video._id;
      currentCommentBtn = commentBtn.querySelector("span");

      commentList.innerHTML = "";

      const comments = video.comments || [];

      comments.forEach(c => {
        const d = document.createElement("div");
        d.textContent = c;
        commentList.appendChild(d);
      });

      currentCommentBtn.textContent = comments.length;
    });

    container.appendChild(div);
  });

  offset += data.length;
  isLoading = false;
}

// ================= SCROLL =================
container.addEventListener("scroll", () => {
  const reels = document.querySelectorAll(".reel");
  const center = window.innerHeight / 2;

  reels.forEach(reel => {
    const rect = reel.getBoundingClientRect();
    const video = reel.querySelector("video");

    const reelCenter = rect.top + rect.height / 2;

    if (Math.abs(center - reelCenter) < rect.height / 2) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  });

  if (
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - 50
  ) {
    loadVideos();
  }
});

// ================= COMMENT POST =================
const commentInput = document.getElementById("commentInput");
const commentPost = document.getElementById("commentPost");
const commentList = document.getElementById("commentList");

commentPost.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  const res = await fetch(`${BASE_URL}/api/comment/${currentVideoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  const div = document.createElement("div");
  div.textContent = text;
  commentList.appendChild(div);

  currentCommentBtn.textContent = data.length;
  commentInput.value = "";
});

// ================= UPLOAD =================
const uploadBtn = document.getElementById("uploadBtn");
const videoUpload = document.getElementById("videoUpload");
const captionInput = document.getElementById("captionInput");

if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    const file = videoUpload.files[0];

    if (!file) {
      alert("Video select karo pehle");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    formData.append("caption", captionInput.value);
    formData.append("username", currentUser);

    try {
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        uploadBox.classList.remove("show");

        videoUpload.value = "";
        captionInput.value = "";

        offset = 0;
        container.innerHTML = "";

        await loadVideos();
      }

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
    }
  });
}

// ================= INIT =================
loadVideos();