   // ================= BASE CONFIG =================
   const BASE_URL = "https://bmreels.onrender.com";
   console.log("USING BASE URL:", BASE_URL);

   // ================= GLOBAL STATE =================
   const overlay = document.getElementById("commentOverlay");
   const panel = document.getElementById("commentPanel");
   const commentList = document.getElementById("commentList");

   let currentVideoId = null;
   let commentsData = {};
   let currentCommentBtn = null;
   let offset = 0;
   let isLoading = false;
   let currentUser = null;

   // ================= LOGIN SYSTEM =================
   document.addEventListener("DOMContentLoaded", () => {

   const loginBtn = document.getElementById("loginBtn");
   const loginInput = document.getElementById("loginInput");
   const loginBox = document.getElementById("loginBox");
   const logoutBtn = document.getElementById("logoutBtn"); // BM UPDATE: moved here for clean structure


   // ================= AUTO LOGIN =================
   const savedUser = localStorage.getItem("bm_user");

    if (savedUser) {
    currentUser = savedUser;

    // BM UPDATE: safe check (avoid null error)
    if (loginBox) {
      loginBox.classList.add("hide");
    }

    console.log("AUTO LOGIN:", savedUser);
   }


   // ================= LOGIN BUTTON =================
   if (loginBtn) {
    loginBtn.addEventListener("click", () => {

      const val = loginInput.value.trim();

      if (!val) {
        alert("Enter username");
        return;
      }

      // BM UPDATE: normalize username (future-safe)
      const cleanUser = val.toLowerCase();

      localStorage.setItem("bm_user", cleanUser);
      currentUser = cleanUser;

      console.log("LOGIN SAVED:", cleanUser);

      if (loginBox) {
        loginBox.classList.add("hide");
      }

      // BM UPDATE: reload to sync UI
      window.location.reload();
    });
   }


    // ================= LOGOUT =================
    if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {

      localStorage.removeItem("bm_user"); // BM FIX: consistent key
      currentUser = null;

       console.log("LOGOUT SUCCESS");

       window.location.reload();
     });
    
    }

   });
    // ================= LOAD VIDEOS =================
    async function loadVideos() {

    // BM FIX: prevent duplicate calls
   if (isLoading) return;
   isLoading = true;
   // ================= FETCH DATA =================
    const res = await fetch(`${BASE_URL}/api/videos?offset=${offset}`);
    const data = await res.json();

    // ================= USER LIKES FETCH (SAFE) =================
let userLikes = [];

if (currentUser) {
  try {

    const resLikes = await fetch(`${BASE_URL}/api/user-likes/${currentUser}`);

    // 👇 पहले text लो
    const text = await resLikes.text();

    // 👇 check करो JSON है या नहीं
    if (!text.startsWith("{")) {
      console.log("NOT JSON RESPONSE:", text);
      userLikes = [];
    } else {
      const dataLikes = JSON.parse(text);
      userLikes = dataLikes.liked || [];
    }

  } catch (err) {
    console.log("USER LIKES ERROR:", err);
  }
}

    const container = document.getElementById("reelsContainer");

    // BM FIX: safe check
    if (!data.data || data.data.length === 0) {
      console.log("No more videos");
      isLoading = false;
      return;
    }

    // ================= DP CACHE =================
    // BM UPDATE: moved outside loop (better performance)
    const dpCache = {};

    // ================= LOOP VIDEOS =================
    data.data.forEach(video => {

      const cleanUsername = video.username.replace("@", "").trim();

      const div = document.createElement("div");
      div.className = "reel";

      // BM FIX: layout stability
      div.style.display = "block";
      div.style.height = "100vh";

      // ================= REEL HTML =================
      div.innerHTML = `
        <video src="${video.url}" autoplay loop muted playsinline preload="metadata"></video>
        
        <div class="centerHeart">❤️</div>
    
        <div class="info">
          <div class="userRow">
            <img src="https://i.pravatar.cc/40" class="avatar">
            <span class="username">@${cleanUsername}</span>
            <span class="follow">Follow</span>
          </div>
    
          <p>${video.caption || ""}</p>
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

      // ================= AVATAR LOAD =================
      const avatar = div.querySelector(".avatar");

      if (dpCache[video.username]) {
        avatar.src = dpCache[video.username];
      } else {
        fetch(`${BASE_URL}/api/user/${video.username}`)
          .then(res => res.json())
          .then(data => {
            if (data.dp) {
              dpCache[video.username] = data.dp;
              avatar.src = data.dp;
            }
          })
          .catch(err => console.log("DP LOAD ERROR:", err));
      }

      // ================= PROFILE CLICK =================
      const usernameEl = div.querySelector(".username");

      usernameEl.onclick = () => {
        // BM UPDATE: encode सुरक्षित
        window.location.href = `/profile.html?user=${encodeURIComponent(video.username)}`;
      };

      // ================= VIDEO + MUTE =================
      const muteBtn = div.querySelector(".muteBtn");
      const videoEl = div.querySelector("video");

      videoEl.muted = true;

      muteBtn.addEventListener("click", () => {
        videoEl.muted = !videoEl.muted;
        muteBtn.textContent = videoEl.muted ? "🔇" : "🔊";
      });

      // ================= DELETE =================
      const deleteBtn = div.querySelector(".deleteBtn");

      // BM FIX: only owner can see
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

   // BM FIX: avoid duplicate declaration (agar upar already hai to ye safe hai)
   const commentPanelEl = document.getElementById("commentPanel");
   const commentOverlayEl = document.getElementById("commentOverlay");

   const commentBtn = div.querySelector(".commentBtnIcon");
   const commentCountSpan = commentBtn?.querySelector("span");

    // BM FIX: ensure exist
   if (commentBtn) {

   commentBtn.addEventListener("click", () => {

    // BM UPDATE: safe check
    if (!commentPanelEl || !commentOverlayEl) return;

    commentPanelEl.classList.add("show");
    commentOverlayEl.classList.add("show");

    // ================= CURRENT VIDEO TRACK =================
    currentVideoId = video._id;
    currentCommentBtn = commentCountSpan;

    if (!commentList) return;

    commentList.innerHTML = "";

    const comments = video.comments || [];

    // BM FIX: count sync
    if (currentCommentBtn) {
      currentCommentBtn.textContent = comments.length;
    }

    // ================= RENDER COMMENTS =================
    comments.forEach(c => {

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";

      const text = document.createElement("span");
      text.textContent = c;

      const del = document.createElement("button");
      del.textContent = "❌";
      del.style.background = "none";
      del.style.border = "none";
      del.style.cursor = "pointer";

      row.appendChild(text);
      row.appendChild(del);
      commentList.appendChild(row);

      // ================= DELETE COMMENT =================
      del.addEventListener("click", async () => {

        row.remove();

        try {
          const res = await fetch(`${BASE_URL}/api/delete-comment/${currentVideoId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: c })
          });

          const data = await res.json();

          // BM FIX: sync UI after delete
          video.comments = data;

          if (currentCommentBtn) {
            currentCommentBtn.textContent = data.length;
          }

        } catch (err) {
          console.log("COMMENT DELETE ERROR:", err);
        }

      });

    });

  });

}
   // ================= LIKE SYSTEM =================

   // BM FIX: better selector (target only like svg)
   const likeBtn = div.querySelector(".actionItem:first-child svg");
   const likeCount = likeBtn?.parentElement?.querySelector("span");

   const heart = div.querySelector(".centerHeart");
   const shareBtn = div.querySelector(".shareBtn");
   
   // ================= INITIAL LIKE STATE =================
   let liked = userLikes.includes(video._id);

  if (liked) {
  likeBtn.setAttribute("fill", "red");
  likeBtn.setAttribute("stroke", "red");
 }
   // ================= DOUBLE TAP LIKE =================
   videoEl.addEventListener("dblclick", () => {

   if (!heart) return;

   // ❤️ animation
   heart.classList.remove("show");
   void heart.offsetWidth;
   heart.classList.add("show");

   setTimeout(() => {
    heart.classList.remove("show");
  }, 600);

   // BM FIX: prevent duplicate like
   if (!liked) {
    likeBtn?.dispatchEvent(new Event("click"));
  }

});

   // ================= SHARE =================
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


// ================= LIKE CLICK =================
  likeBtn.addEventListener("click", async () => {
  try {

    // 🔥 UI instant update (IMPORTANT)
    liked = !liked;

    if (liked) {
      likeBtn.setAttribute("fill", "red");
      likeBtn.setAttribute("stroke", "red");
    } else {
      likeBtn.setAttribute("fill", "none");
      likeBtn.setAttribute("stroke", "white");
    }

    // 🔥 backend call
    const res = await fetch(`${BASE_URL}/api/like/${video._id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: currentUser })
    });

    const data = await res.json();

    // 🔥 सही count update
    likeCount.textContent = data.likes;

  } catch (err) {
    console.log("LIKE ERROR:", err);
  }
});

// ================= FINAL APPEND =================
div.style.height = "100vh";
container.appendChild(div);

}); // 🔥 forEach close

// ================= PAGINATION =================
offset += data.data.length;
isLoading = false;

// BM UPDATE: ensure scroll system after load
setupScrollVideo();
}

// ================= INITIAL LOAD =================
document.addEventListener("DOMContentLoaded", () => {
  loadVideos();
});

// ================= SCROLL VIDEO =================
function setupScrollVideo() {

  const container = document.getElementById("reelsContainer");

  // BM FIX: dynamic reels (new load ke baad bhi kaam kare)
  function playVisible() {

    const reels = container.querySelectorAll(".reel");

    reels.forEach(reel => {

      const video = reel.querySelector("video");
      if (!video) return;

      const rect = reel.getBoundingClientRect();

      // BM IMPROVED: more stable visibility logic
      const isVisible =
        rect.top < window.innerHeight * 0.75 &&
        rect.bottom > window.innerHeight * 0.25;

      if (isVisible) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }

    });

  }

  // BM FIX: prevent multiple bindings
  container.removeEventListener("scroll", playVisible);
  container.addEventListener("scroll", playVisible);

  // BM UPDATE: initial trigger
  setTimeout(playVisible, 100);
}


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
if (commentPost) {

  commentPost.addEventListener("click", async () => {

    const text = commentInput?.value.trim();

    if (!text) return;

    // BM FIX: empty video guard
    if (!currentVideoId) {
      console.log("No video selected for comment");
      return;
    }

    try {

      const res = await fetch(`${BASE_URL}/api/comment/${currentVideoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      // ================= UI UPDATE =================
      const row = document.createElement("div");
      row.textContent = text;

      if (commentList) {
        commentList.appendChild(row);
      }

      // BM FIX: count sync
      if (currentCommentBtn) {
        currentCommentBtn.textContent = data.length;
      }

      // BM UPDATE: clear input
      commentInput.value = "";

    } catch (err) {
      console.log("COMMENT POST ERROR:", err);
    }

  });

}


// ================= UPLOAD SYSTEM =================
const videoUpload = document.getElementById("videoUpload");
const captionInput = document.getElementById("captionInput");
const usernameInput = document.getElementById("usernameInput");
const wrapper = document.getElementById("previewWrapper");

const openUpload = document.getElementById("openUpload");
const uploadBox = document.getElementById("uploadBox");
const videoPreview = document.getElementById("videoPreview");
const closeBtn = document.getElementById("closePreview");
const uploadBtn = document.getElementById("uploadBtn");


// ================= OPEN / CLOSE =================
if (openUpload && uploadBox) {
  openUpload.addEventListener("click", () => {
    uploadBox.classList.toggle("show");
  });
}

// BM UPDATE: close preview
if (closeBtn && uploadBox) {
  closeBtn.addEventListener("click", () => {
    uploadBox.classList.remove("show");

    // reset preview
    if (videoPreview) {
      videoPreview.src = "";
    }
  });
}

// ================= VIDEO PREVIEW =================
if (videoUpload && videoPreview) {

  videoUpload.addEventListener("change", () => {

    const file = videoUpload.files[0];
    if (!file) return;

    // BM FIX: preview URL
    const url = URL.createObjectURL(file);
    videoPreview.src = url;

    if (wrapper) {
      wrapper.style.display = "block";
    }

  });

}

// ================= UPLOAD CLICK =================
if (uploadBtn) {

  uploadBtn.addEventListener("click", async () => {

    const file = videoUpload?.files[0];
    const caption = captionInput?.value.trim();
    const username = currentUser || usernameInput?.value.trim();

    // BM FIX: validation
    if (!file || !username) {
      alert("Video & username required");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    formData.append("caption", caption || "");
    formData.append("username", username);

    try {

      uploadBtn.textContent = "Uploading...";

      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.success) {

        // BM UPDATE: reset UI
        uploadBox.classList.remove("show");
        videoPreview.src = "";
        captionInput.value = "";

        alert("Upload success 🚀");

        // BM FIX: reload feed
        offset = 0;
        document.getElementById("reelsContainer").innerHTML = "";
        loadVideos();

      } else {
        alert("Upload failed");
      }

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
    }

    uploadBtn.textContent = "Upload";

  });

}

// ================= VIDEO PREVIEW + UPLOAD =================

// BM FIX: prevent multiple event bindings
if (videoUpload && !videoUpload.dataset.bound) {
  videoUpload.dataset.bound = "true";

  videoUpload.addEventListener("change", async () => {

    const file = videoUpload.files[0];
    if (!file) return;

    // ================= USER CHECK =================
    if (!currentUser) {
      alert("Login required");
      return;
    }

    // ================= PREVIEW =================
    const url = URL.createObjectURL(file);
    videoPreview.src = url;

    if (wrapper) wrapper.style.display = "block";
    if (videoPreview) videoPreview.style.display = "block";

    // BM FIX: avoid multiple close listeners
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";

      closeBtn.addEventListener("click", () => {
        if (wrapper) wrapper.style.display = "none";
        if (videoPreview) videoPreview.src = "";
      });
    }

    try {

      // ================= CLOUDINARY UPLOAD =================
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "bmreels_preset");

      const res = await fetch("https://api.cloudinary.com/v1_1/dzbzbljod/video/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await res.json();
      console.log("CLOUD:", data);

      if (!data.secure_url) {
        alert("Upload failed");
        return;
      }

      // ================= SAVE TO DB =================
      const saveRes = await fetch(`${BASE_URL}/api/save-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: data.secure_url,
          username: currentUser,
          caption: captionInput?.value || ""
        })
      });

      if (!saveRes.ok) {
        throw new Error("DB save failed");
      }

      const saveData = await saveRes.json();
      console.log("DB:", saveData);

      // ================= UI RESET =================
      if (videoPreview) {
        videoPreview.style.display = "none";
        videoPreview.src = "";
      }

      if (wrapper) wrapper.style.display = "none";
      if (uploadBox) uploadBox.classList.remove("show");

      if (captionInput) captionInput.value = "";
      if (usernameInput) usernameInput.value = "";

      // ================= RELOAD FEED =================
      offset = 0;

      const container = document.getElementById("reelsContainer");
      if (container) {
        container.innerHTML = "";
      }

      await loadVideos();

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      alert("Upload error, try again");

      if (videoPreview) videoPreview.style.display = "none";
    }

  });
}


// ================= INFINITE SCROLL =================

const container = document.getElementById("reelsContainer");

if (container && !container.dataset.scrollBound) {
  container.dataset.scrollBound = "true";

  container.addEventListener("scroll", () => {

    // BM FIX: prevent multiple load calls
    if (isLoading) return;

    const nearBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 80; // BM UPDATE: थोड़ा buffer

    if (nearBottom) {
      loadVideos();
    }

  });
}


// ================= VIDEO PLAY/PAUSE CLICK =================

// BM FIX: prevent duplicate binding
if (!document.body.dataset.videoClickBound) {
  document.body.dataset.videoClickBound = "true";

  document.addEventListener("click", function(e) {

    if (e.target.tagName === "VIDEO") {

      const video = e.target;

      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }

    }

  });
}

// ================= MENU SYSTEM =================

const menuBtn = document.getElementById("menuBtn");
const menuBox = document.getElementById("menuBox");

// BM FIX: safe toggle + outside click close
if (menuBtn && menuBox) {

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // BM FIX: prevent auto close

    menuBox.style.display =
      menuBox.style.display === "block" ? "none" : "block";
  });

  // BM UPDATE: click outside → close menu
  document.addEventListener("click", (e) => {
    if (!menuBox.contains(e.target) && e.target !== menuBtn) {
      menuBox.style.display = "none";
    }
  });

}


// ================= NAVIGATION LINKS =================

// BM UPDATE: reusable navigation function
function goToPage(path) {
  window.location.href = path;
}


// 🔔 Notifications
const notifBtn = document.getElementById("notifBtn");
if (notifBtn) {
  notifBtn.addEventListener("click", () => {
    goToPage("notifications.html");
  });
}


// 📜 Terms
const termsBtn = document.getElementById("termsBtn");
if (termsBtn) {
  termsBtn.addEventListener("click", () => {
    goToPage("terms.html");
  });
}


// 📄 Licence
const licenceBtn = document.getElementById("licenceBtn");
if (licenceBtn) {
  licenceBtn.addEventListener("click", () => {
    goToPage("licence.html");
  });
}


// 🔒 Privacy
const privacyBtn = document.getElementById("privacyBtn");
if (privacyBtn) {
  privacyBtn.addEventListener("click", () => {
    goToPage("privacy.html");
  });
}


// ================= LOGOUT =================

// BM FIX: consistent key (bm_user use ho raha tha project me)
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("bm_user"); // BM FIX

    // BM UPDATE: clean redirect
    window.location.href = "index.html";
  });
}