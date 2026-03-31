// username URL se lo
const params = new URLSearchParams(window.location.search);
const username = params.get("user");

console.log("PROFILE USER:", username);

const usernameEl = document.getElementById("username");
const countEl = document.getElementById("videoCount");
const videosBox = document.getElementById("profileVideos");

async function loadProfile() {
  const res = await fetch(`/api/profile/${username}`);
  const data = await res.json();

  usernameEl.innerText = "@" + data.username;
  countEl.innerText = "Videos: " + data.totalVideos;

  videosBox.innerHTML = "";

  data.videos.forEach(video => {
    const v = document.createElement("video");
    v.src = video.url;
    v.controls = true;
    v.style.width = "200px";
    v.style.margin = "5px";

    videosBox.appendChild(v);
  });
}

loadProfile()

const followBtn = document.getElementById("followBtn");

// current user
const currentUser = localStorage.getItem("bm_user");

if (currentUser === username) {
  followBtn.style.display = "none";
}

// 👇 follow status load
async function checkFollow() {
  const res = await fetch(`/api/follow-status?follower=${currentUser}&following=${username}`);
  const data = await res.json();

  followBtn.innerText = data.following ? "Following" : "Follow";
}

// 👇 follow toggle
followBtn.onclick = async () => {
  const res = await fetch("/api/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      follower: currentUser,
      following: username
    })
  });

  const data = await res.json();

  followBtn.innerText = data.following ? "Following" : "Follow";
  loadFollowers();
};

checkFollow();

const followersEl = document.getElementById("followersCount");

async function loadFollowers() {
  const res = await fetch(`/api/followers/${username}`);
  const data = await res.json();

  followersEl.innerText = "Followers: " + data.followers;
}

// profile pic element
const profilePic = document.getElementById("profilePic");

// load dp
async function loadDP() {
  const res = await fetch(`/api/user/${username}`);
  const data = await res.json();

  if (data.dp) {
    profilePic.src = data.dp;
  }
}

loadDP();

const dpInput = document.getElementById("dpInput");

// click on image → open file
profilePic.onclick = () => {
  dpInput.click();
};

// file select
dpInput.addEventListener("change", () => {
  const file = dpInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target.result;

    img.onload = async function () {
      const canvas = document.createElement("canvas");
      const size = 200;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);

      const compressed = canvas.toDataURL("image/jpeg", 0.7);

      // ✅ SAVE TO SERVER
      await fetch("/api/upload-dp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          dp: compressed
        })
      });

      profilePic.src = compressed;
    };
  };

  reader.readAsDataURL(file);
});