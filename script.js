(() => {
  const config = window.CLOUDCH_CONFIG || {};
  const topTrack = document.querySelector("#marquee-top");
  const bottomTrack = document.querySelector("#marquee-bottom");
  const nav = document.querySelector("#site-nav");
  const menuToggle = document.querySelector(".menu-toggle");

  const setText = (selector, value) => {
    if (value) document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  };

  const setLink = (selector, url) => {
    document.querySelectorAll(selector).forEach((link) => {
      if (url) {
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.classList.remove("is-disabled");
        link.removeAttribute("aria-disabled");
      } else {
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.classList.add("is-disabled");
        link.setAttribute("aria-disabled", "true");
      }
    });
  };

  setText("[data-profile-bio]", config.profileBio);
  setText("[data-discord-description]", config.discordDescription);
  setText("[data-contact-copy]", config.contactText);
  setLink("[data-youtube-link]", config.youtubeUrl || config.channelUrl);
  setLink("[data-discord-link]", config.discordUrl);
  setLink("[data-twitch-link]", config.twitchUrl);
  setLink("[data-contact-link]", config.contactUrl || config.twitchUrl);
  document.querySelector("#current-year").textContent = new Date().getFullYear();

  const closeMenu = () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "メニューを開く");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
    nav.classList.toggle("is-open", isOpen);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const pageLinkGrid = document.querySelector(".page-link-grid");
  if (pageLinkGrid) {
    const pageLinkCards = pageLinkGrid.querySelectorAll(".page-link-card");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      pageLinkGrid.classList.add("has-scroll-reveal");
      let animationFrame = 0;
      let lastScrollY = window.scrollY;
      let scrollDirection = 1;

      const updateCardPositions = () => {
        animationFrame = 0;
        const viewportCenter = window.innerHeight / 2;
        const viewportWidth = window.innerWidth;

        pageLinkCards.forEach((card) => {
          const bounds = card.getBoundingClientRect();
          const cardCenter = bounds.top + bounds.height / 2;
          const distance = Math.abs(cardCenter - viewportCenter);
          const travelRange = viewportCenter + bounds.height / 2;
          let visibleProgress = Math.max(0, 1 - distance / travelRange);
          if (scrollDirection > 0 && cardCenter < viewportCenter) visibleProgress = 1;
          const direction = card.classList.contains("discord-link-card") ? 1 : -1;
          const offset = direction * (1 - visibleProgress) * (viewportWidth + bounds.width);

          card.style.setProperty("--scroll-offset", `${offset.toFixed(1)}px`);
          card.style.setProperty("--scroll-opacity", visibleProgress.toFixed(3));
        });
      };

      const queueCardUpdate = () => {
        if (animationFrame) return;
        animationFrame = window.requestAnimationFrame(updateCardPositions);
      };

      const scheduleCardUpdate = () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY !== lastScrollY) {
          scrollDirection = currentScrollY > lastScrollY ? 1 : -1;
          lastScrollY = currentScrollY;
        }
        queueCardUpdate();
      };

      window.addEventListener("scroll", scheduleCardUpdate, { passive: true });
      window.addEventListener("resize", queueCardUpdate);
      updateCardPositions();
    }
  }

  if (!topTrack || !bottomTrack) return;

  const placeholderVideo = { title: "動画を準備中です", thumbnail: "", url: "" };

  const createCard = (video, isDuplicate) => {
    const card = video.url ? document.createElement("a") : document.createElement("div");
    card.className = `marquee-card${video.thumbnail ? "" : " is-placeholder"}`;
    if (isDuplicate) {
      card.setAttribute("aria-hidden", "true");
      if (video.url) card.tabIndex = -1;
    }
    if (video.url) {
      card.href = video.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      if (!isDuplicate) card.setAttribute("aria-label", `${video.title}（YouTubeで開く）`);
    } else if (!isDuplicate) {
      card.setAttribute("aria-hidden", "true");
    }

    if (video.thumbnail) {
      const image = document.createElement("img");
      image.src = video.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      card.append(image);
      const title = document.createElement("span");
      title.className = "marquee-card-title";
      title.textContent = video.title;
      card.append(title);
    }
    return card;
  };

  const renderVideos = (videos) => {
    const items = videos.length ? videos : [placeholderVideo, placeholderVideo, placeholderVideo, placeholderVideo];
    [topTrack, bottomTrack].forEach((track) => {
      track.replaceChildren();
      items.forEach((video) => track.append(createCard(video, false)));
      items.forEach((video) => track.append(createCard(video, true)));
    });
  };

  renderVideos([]);
  fetch("videos.json")
    .then((response) => {
      if (!response.ok) throw new Error(`動画一覧の取得に失敗しました: HTTP ${response.status}`);
      return response.json();
    })
    .then((videos) => {
      if (!Array.isArray(videos)) throw new TypeError("動画一覧の形式が正しくありません");
      const validVideos = videos.filter((video) =>
        video && typeof video.title === "string" &&
        typeof video.thumbnail === "string" && typeof video.url === "string"
      );
      if (validVideos.length !== videos.length) console.error("一部の動画情報を形式不正のため除外しました。");
      renderVideos(validVideos);
    })
    .catch((error) => {
      console.error("動画一覧を読み込めません。予備表示を使用します。", error);
    });
})();
