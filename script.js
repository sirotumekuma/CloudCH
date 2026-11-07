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

  const announcementList = document.querySelector("#announcement-list");
  const announcementStatus = document.querySelector("#announcement-status");
  if (announcementList && announcementStatus) {
    const isValidDate = (date) => {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      return !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
    };

    const isValidAnnouncement = (announcement) => {
      if (!announcement || typeof announcement !== "object") return false;
      if (["category", "title", "content"].some((key) =>
        typeof announcement[key] !== "string" || !announcement[key].trim()
      )) return false;
      if (announcement.date !== undefined && !isValidDate(announcement.date)) return false;
      if (announcement.url !== undefined) {
        if (typeof announcement.url !== "string") return false;
        try {
          const url = new URL(announcement.url, window.location.href);
          if (url.protocol !== "http:" && url.protocol !== "https:") return false;
        } catch {
          return false;
        }
      }
      return announcement.linkText === undefined || typeof announcement.linkText === "string";
    };

    const renderAnnouncements = (announcements) => {
      announcementList.replaceChildren();
      announcements.forEach((announcement) => {
        const item = document.createElement("li");
        const card = document.createElement("article");
        card.className = "announcement-card";

        const category = document.createElement("span");
        category.className = "announcement-category";
        category.textContent = announcement.category;
        card.append(category);

        const body = document.createElement("div");
        if (announcement.date) {
          const date = document.createElement("time");
          date.className = "announcement-date";
          date.dateTime = announcement.date;
          date.textContent = new Date(`${announcement.date}T00:00:00`).toLocaleDateString("ja-JP");
          body.append(date);
        }
        const title = document.createElement("h3");
        title.textContent = announcement.title;
        body.append(title);
        const content = document.createElement("p");
        content.textContent = announcement.content;
        body.append(content);
        card.append(body);

        if (announcement.url) {
          const link = document.createElement("a");
          link.className = "text-link announcement-link";
          link.href = announcement.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.append(document.createTextNode(`${announcement.linkText || "詳しく見る"} `));
          const arrow = document.createElement("span");
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "↗";
          link.append(arrow);
          card.append(link);
        }
        item.append(card);
        announcementList.append(item);
      });
      announcementList.setAttribute("aria-busy", "false");
      announcementStatus.textContent = announcements.length ? "" : "現在、お知らせはありません。";
    };

    fetch("announcements.json")
      .then((response) => {
        if (!response.ok) throw new Error(`お知らせ一覧の取得に失敗しました: HTTP ${response.status}`);
        return response.json();
      })
      .then((announcements) => {
        if (!Array.isArray(announcements)) throw new TypeError("お知らせ一覧の形式が正しくありません");
        const validAnnouncements = announcements.filter(isValidAnnouncement);
        if (validAnnouncements.length !== announcements.length) {
          console.error("一部のお知らせを形式不正のため除外しました。");
        }
        renderAnnouncements(validAnnouncements);
      })
      .catch((error) => {
        announcementList.setAttribute("aria-busy", "false");
        announcementStatus.textContent = "お知らせを読み込めませんでした。時間をおいて再度ご確認ください。";
        console.error("お知らせ一覧を読み込めません。", error);
      });
  }

  const youtubeApiKey = config.youtubeApiKey;
  const fetchYouTube = async (resource, parameters) => {
    const query = new URLSearchParams({ ...parameters, key: youtubeApiKey });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/${resource}?${query}`);
    if (!response.ok) throw new Error(`YouTube API request failed: HTTP ${response.status}`);
    return response.json();
  };

  const subscriberCount = document.querySelector("#youtube-subscriber-count");
  if (subscriberCount) {
    if (!youtubeApiKey) {
      subscriberCount.textContent = "APIキー未設定";
    } else {
      fetchYouTube("channels", {
        part: "statistics",
        id: config.channelId
      })
        .then((data) => {
          const count = data.items?.[0]?.statistics?.subscriberCount;
          subscriberCount.textContent = count
            ? `${Number(count).toLocaleString("ja-JP")}人`
            : "非公開";
        })
        .catch((error) => {
          subscriberCount.textContent = "取得できません";
          console.error("YouTubeの登録者数を取得できません。", error);
        });
    }
  }

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
