const BASE_URL = "https://bmreels.onrender.com";
console.log("USING BASE URL:", BASE_URL);

const overlay = document.getElementById("commentOverlay");
const panel = document.getElementById("commentPanel");

let currentVideoId = null;
let commentsData = {};
let currentCommentBtn = null;
let offset = 0;
let isLoading = false;
let currentUser = null;

// ================= LOGIN =================
document.addEventListener("DOMContentLoaded", () => {

  const loginBtn = document.getElementById("loginBtn");
  const loginInput = document.getElementById("loginInput");
  const loginBox = document.getElementById("loginBox");

  // ✅ AUTO LOGIN
  const savedUser = localStorage.getItem("bm_user");

  if (savedUser) {
    currentUser = savedUser;
    loginBox.classList.add("hide");
  }

  // ✅ LOGIN CLICK
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {

      const val = loginInput.value.trim();

      if (!val) {
        alert("Enter username");
        return;
      }

      localStorage.setItem("bm_user", val);
      currentUser = val;

      console.log("LOGIN SAVED:", val);

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

  const dpCache = {}; // ⚠️ हर load में reset (ठीक है अभी)

  const resC = await fetch(`${BASE_URL}/api/comments`);
  const commentsDataFromServer = await resC.json();
  commentsData = commentsDataFromServer;

  const likesRes = await fetch(`${BASE_URL}/api/likes`);
  const likesData = await likesRes.json();

  const container = document.getElementById("reelsContainer");

  if (data.length === 0) {
    console.log("No more videos");
    isLoading = true; // stop future calls
    return;
  }

  data.forEach(video => {
    console.log("VIDEO USER:", video.username);
    console.log("DP KEY:", "dp_" + video.username);

    const cleanUsername = video.username.replace("@", "").trim();
    const div = document.createElement("div");
    div.className = "reel";

   // 🔥 FINAL FIX
    div.style.display = "block";
    div.style.height = "100vh";

    // ❌ BUG FIX: extra ; हटाया गया
    div.innerHTML = `
      <video src="${BASE_URL}${video.url}" loop muted playsinline autoplay></video>
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
        
        <div class="actionItem">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2">
            <path d="M12 21s-6.7-4.35-10-8.28C-1.4 8.24 1.42 3 6 3c2.04 0 3.2 1.24 4 2.09C10.8 4.24 11.96 3 14 3c4.58 0 7.4 5.24 4 9.72C18.7 16.65 12 21 12 21z"/>
          </svg>
          <span>${video.likes || 0}</span>
        </div>

        <div class="actionItem commentBtnIcon">
          💬
          <span>${(video.comments || []).length}</span>
        </div>
   
        <button class="muteBtn">🔇</button>
   
        <div class="actionItem deleteBtn">
          🗑️
        </div>

        <div class="actionItem">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z"/>
          </svg>
        </div>

      </div>
    `;

const avatar = div.querySelector(".avatar");

// ================= DP CACHE =================
// ✅ cache check
if (dpCache[video.username]) {
  avatar.src = dpCache[video.username];
} else {
  fetch(`${BASE_URL}/api/user/${video.username}`) // ❌ पहले relative था → fix किया
    .then(res => res.json())
    .then(data => {
      if (data.dp) {
        dpCache[video.username] = data.dp; // save cache
        avatar.src = data.dp;
      }
    })
    .catch(err => console.log("DP LOAD ERROR:", err)); // ✅ safety
}

// ================= PROFILE CLICK =================
const usernameEl = div.querySelector(".username");

usernameEl.onclick = () => {
  window.location.href = `/profile.html?user=${video.username}`;
};

// ================= VIDEO + MUTE =================
const muteBtn = div.querySelector(".muteBtn");
const videoEl = div.querySelector("video");

// ❌ duplicate src set avoid (PART 1 में already है)
// videoEl.src = `${BASE_URL}${video.url}`;

videoEl.muted = true;

muteBtn.addEventListener("click", () => {
  videoEl.muted = !videoEl.muted;
  muteBtn.textContent = videoEl.muted ? "🔇" : "🔊";
});

// ================= DELETE =================
const deleteBtn = div.querySelector(".deleteBtn");

// 🔐 show only if owner
if (video.username !== currentUser) {
  deleteBtn.style.display = "none";
}

deleteBtn.addEventListener("click", async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/delete-video/${video._id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: currentUser })
    });

    const data = await res.json();

    if (data.success) {
      div.remove();
    } else {
      alert("Not allowed");
    }

  } catch (err) {
    console.log("DELETE ERROR:", err);
  }
});

// ================= COMMENT PANEL =================
const panel = document.getElementById("commentPanel");
const overlay = document.getElementById("commentOverlay");

const commentBtn = div.querySelector(".commentBtnIcon");
const commentCountSpan = commentBtn.querySelector("span");

// ⚠️ ensure commentList exist
const commentList = document.getElementById("commentList");

if (commentBtn) {

  commentBtn.addEventListener("click", () => {
    panel.classList.add("show");
    overlay.classList.add("show");

    // current video track
    currentVideoId = video._id;
    currentCommentBtn = commentCountSpan;

    // ❗ safety check
    if (!commentList) return;

    commentList.innerHTML = "";
    const comments = video.comments || [];

    // count fix
    currentCommentBtn.textContent = comments.length;

    comments.forEach(c => {

      const d = document.createElement("div");
      d.style.display = "flex";
      d.style.justifyContent = "space-between";

      const text = document.createElement("span");
      text.textContent = c;

      const del = document.createElement("button");
      del.textContent = "❌";
      del.style.background = "none";
      del.style.border = "none";
      del.style.cursor = "pointer";

      d.appendChild(text);
      d.appendChild(del);
      commentList.appendChild(d);

      del.addEventListener("click", async () => {
        d.remove();

        try {
          const res = await fetch(`${BASE_URL}/api/delete-comment/${currentVideoId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: c })
          });

          const data = await res.json();

          video.comments = data;
          currentCommentBtn.textContent = data.length;

        } catch (err) {
          console.log("COMMENT DELETE ERROR:", err);
        }
      });

    });

  });

}

// ================= LIKE SYSTEM =================
const likeBtn = div.querySelector(".actionItem svg");
const heart = videoEl.parentElement.querySelector(".centerHeart");

// ❌ BUG FIX: liked पहले use हो रहा था → पहले declare करो
let liked = false;

// ❤️ double tap animation
videoEl.addEventListener("dblclick", () => {
  if (!heart) return;

  heart.classList.remove("show");
  void heart.offsetWidth;
  heart.classList.add("show");

  // ❌ पहले global setTimeout था → यहाँ move किया (per video)
  setTimeout(() => {
    heart.classList.remove("show");
  }, 600);
});

// ❌ REMOVE किया (ये गलत था)
// if (!liked) {
//   likeBtn.dispatchEvent(new Event("click"));
// }

// ❌ FIX: सही like count selector
const likeCount = likeBtn.parentElement.querySelector("span");

// ================= LIKE CLICK =================
likeBtn.addEventListener("click", async () => {
  try {

    if (liked) {
      likeBtn.setAttribute("fill", "none");
      likeBtn.setAttribute("stroke", "white");
      liked = false;

      const res = await fetch(`${BASE_URL}/api/unlike/${video._id}`, {
        method: "POST"
      });

      const data = await res.json();
      likeCount.textContent = data.likes;

    } else {
      likeBtn.setAttribute("fill", "red");
      likeBtn.setAttribute("stroke", "red");
      liked = true;

      const res = await fetch(`${BASE_URL}/api/like/${video._id}`, {
        method: "POST"
      });

      const data = await res.json();
      likeCount.textContent = data.likes;
    }

    // animation
    likeBtn.classList.add("active");
    setTimeout(() => {
      likeBtn.classList.remove("active");
    }, 200);

  } catch (err) {
    console.log("LIKE ERROR:", err);
  }
});

 div.style.height = "100vh";
// ================= APPEND =================
container.appendChild(div);

}); // 🔥 forEach close

offset += data.length;
isLoading = false;
setupScrollVideo();
} // 🔥 loadVideos close

// ❌ FIX: इसे DOM ready के बाद चलाना चाहिए
document.addEventListener("DOMContentLoaded", () => {
  loadVideos();
});

   // ================= SCROLL VIDEO =================
function setupScrollVideo() {
  const container = document.getElementById("reelsContainer");

  container.addEventListener("scroll", () => {
    const reels = document.querySelectorAll(".reel");

    reels.forEach(reel => {
      const rect = reel.getBoundingClientRect();
      const video = reel.querySelector("video");

      // 🔥 अगर reel screen के center में है
      if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  });
}
// ================= INIT =================
// ❗ पहले videos load करो
loadVideos();

// ================= REMOVE DUPLICATE SCROLL =================
// ❌ ये पूरा block duplicate था → remove किया गया
/*
function handleScrollPlay() { ... }
container.addEventListener("scroll", handleScrollPlay);
window.addEventListener("load", handleScrollPlay);
setTimeout(handleScrollPlay, 100);
*/

// ================= OVERLAY CLOSE =================
if (overlay && panel) {
  overlay.addEventListener("click", () => {
    panel.classList.remove("show");
    overlay.classList.remove("show");
  });
}
// ================= COMMENTS POST =================
const commentInput = document.getElementById("commentInput");
const commentPost = document.getElementById("commentPost");
const commentList = document.getElementById("commentList");

// ❗ safety check (crash रोकने के लिए)
if (commentPost) {
  commentPost.addEventListener("click", async () => {
    const text = commentInput.value.trim();
    if (text === "") return;

    try {
      const res = await fetch(`${BASE_URL}/api/comment/${currentVideoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      // 👇 UI update
      const div = document.createElement("div");
      div.textContent = text;
      commentList.appendChild(div);

      // 👇 count update
      if (currentCommentBtn) {
        currentCommentBtn.textContent = data.length;
      }

      commentInput.value = "";

    } catch (err) {
      console.log("COMMENT POST ERROR:", err);
    }
  });
}

// ================= UPLOAD =================
const videoUpload = document.getElementById("videoUpload");
const captionInput = document.getElementById("captionInput");
const usernameInput = document.getElementById("usernameInput");

const openUpload = document.getElementById("openUpload");
const uploadBox = document.getElementById("uploadBox");
const videoPreview = document.getElementById("videoPreview");
const uploadBtn = document.getElementById("uploadBtn");

// ❗ safety check
if (openUpload && uploadBox) {
  openUpload.addEventListener("click", () => {
    uploadBox.classList.toggle("show");
  });
}

// ================= VIDEO PREVIEW =================
if (videoUpload) {
  videoUpload.addEventListener("change", () => {
    const file = videoUpload.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    videoPreview.src = url;
    videoPreview.style.display = "block";
  });
}

// ================= UPLOAD BUTTON =================
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

      // ❗ पहले text check (server error पकड़ने के लिए)
      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      let isSuccess = false;

      try {
        const data = JSON.parse(text);
        console.log("UPLOAD SUCCESS:", data);

        if (data.success) {
          isSuccess = true;
        }

      } catch (e) {
        console.log("NOT JSON RESPONSE");
      }

      if (isSuccess) {

        uploadBox.classList.remove("show");

        videoUpload.value = "";
        videoPreview.src = "";
        videoPreview.style.display = "none";
        captionInput.value = "";
        usernameInput.value = "";

        offset = 0;

        // ❗ container safety
        const container = document.getElementById("reelsContainer");
        if (container) {
          container.innerHTML = "";
        }

        await loadVideos();
      }

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
    }

  });

} // ✅ uploadBtn block close

// ================= INFINITE SCROLL =================
const container = document.getElementById("reelsContainer");

if (container) {
  container.addEventListener("scroll", () => {
    if (
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 50
    ) {
      loadVideos();
    }
  });
}