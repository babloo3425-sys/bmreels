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
      window.location.reload();
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
  const PEXELS_API_KEY = "5PIXPLLMZL8N0vDiYeA2bGX7FBvAVMK1Phw0sPODmzRGMkx0XQWCVe4K";

  if (!data.data || data.data.length === 0) {
  console.log("No more videos");
  isLoading = false;
  return;
}
  data.data.forEach(video => {
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
      
    <video src="${video.url}" autoplay loop muted playsinline preload="metadata"></video>
      
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
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <rect x="5" y="6" width="14" height="14" rx="2"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
</div>

        <div class="actionItem shareBtn">
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
const shareBtn = div.querySelector(".shareBtn");

 // ❌ BUG FIX: liked पहले use हो रहा था → पहले declare करो
 let liked = false;

 // ❤️ double tap animation
 videoEl.addEventListener("dblclick", () => {
  if (!heart) return;

  // ❤️ animation (same as before)
  heart.classList.remove("show");
  void heart.offsetWidth;
  heart.classList.add("show");

  setTimeout(() => {
    heart.classList.remove("show");
  }, 600);

   if (!liked) {
  likeBtn.dispatchEvent(new Event("click"));
  }
 });

  if (shareBtn) {
  shareBtn.addEventListener("click", async () => {

    const shareUrl = video.url;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "BMReels",
          text: "Watch this reel 🔥",
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied!");
      }

    } catch (err) {
      console.log("SHARE ERROR:", err);
    }

  });
 }

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

offset += data.data.length;
isLoading = false;

setupScrollVideo();
}

// ❌ FIX: इसे DOM ready के बाद चलाना चाहिए
document.addEventListener("DOMContentLoaded", () => {
  loadVideos();
});

   // ================= SCROLL VIDEO =================
function setupScrollVideo() {
  const container = document.getElementById("reelsContainer");
  const reels = container.querySelectorAll(".reel");

  function playVisible() {
  reels.forEach(reel => {
    const video = reel.querySelector("video");
    const rect = reel.getBoundingClientRect();

    // ❌ पुराना गलत condition
    // if (rect.top >= 0 && rect.top < window.innerHeight / 2)

    // ✅ नया सही condition
    if (
      rect.top < window.innerHeight * 0.8 &&
      rect.bottom > window.innerHeight * 0.2
    ) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
 }

  container.addEventListener("scroll", playVisible);
  
  playVisible();
 }


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
const wrapper = document.getElementById("previewWrapper");

const openUpload = document.getElementById("openUpload");
const uploadBox = document.getElementById("uploadBox");
const videoPreview = document.getElementById("videoPreview");
const closeBtn = document.getElementById("closePreview");
const uploadBtn = document.getElementById("uploadBtn");

// ❗ safety check
if (openUpload && uploadBox) {
  openUpload.addEventListener("click", () => {
    uploadBox.classList.toggle("show");
  });
}

// ================= VIDEO PREVIEW + UPLOAD =================
if (videoUpload) {
  videoUpload.addEventListener("change", async () => {

    const file = videoUpload.files[0];
    if (!file) return;

    // ❗ username safety
    if (!currentUser) {
      alert("Login required");
      return;
    }

    // ✅ PREVIEW
    const url = URL.createObjectURL(file);
    videoPreview.src = url;
    
    wrapper.style.display = "block";
    videoPreview.style.display = "block";

    closeBtn.addEventListener("click", () => {
    wrapper.style.display = "none";
    videoPreview.src = "";
   });

   try {
      // 🔥 Cloudinary upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "bmreels_preset");

      const res = await fetch("https://api.cloudinary.com/v1_1/dzbzbljod/video/upload", {
        method: "POST",
        body: formData
      });

      // ❗ response safety
      if (!res.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await res.json();
      console.log("CLOUD:", data);

      if (!data.secure_url) {
        alert("Upload failed");
        return;
      }

      // 🔥 DB save
      const saveRes = await fetch(`${BASE_URL}/api/save-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: data.secure_url,
          username: currentUser,
          caption: captionInput ? captionInput.value : ""
        })
      });

      if (!saveRes.ok) {
        throw new Error("DB save failed");
      }

      const saveData = await saveRes.json();
      console.log("DB:", saveData);

      // ✅ UI reset
      videoPreview.style.display = "none";
      videoPreview.src = "";

      if (captionInput) captionInput.value = "";
      if (usernameInput) usernameInput.value = "";

      if (uploadBox) uploadBox.classList.remove("show");

      // 🔥 reload reels
      offset = 0;

      const container = document.getElementById("reelsContainer");
      if (container) {
        container.innerHTML = "";
      }

      await loadVideos();

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      alert("Upload error, try again");
      videoPreview.style.display = "none";
    }

  });
}

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

// Video click play/pause 
document.addEventListener("click", function(e) {

  if (e.target.tagName === "VIDEO") {
    let video = e.target;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

});

