const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

document.querySelector('.copy-button')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;

  try {
    await navigator.clipboard.writeText(target.innerText);
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  } catch {
    button.textContent = 'Select text';
  }
});

document.getElementById('year').textContent = new Date().getFullYear();

const DEFAULT_DEMO_PLAYBACK_RATE = 1.5;
const demoGallery = document.querySelector('[data-demo-gallery]');
const simulationGallery = document.querySelector('[data-simulation-gallery]');

function configureDemoVideo(video, playbackRate) {
  const applyRate = () => {
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
  };

  applyRate();
  video.addEventListener('loadedmetadata', applyRate);
  video.addEventListener('play', applyRate);
}

function observeDemoVideos(demoVideos) {
  if (!('IntersectionObserver' in window) || !demoVideos.length) return;

  const demoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.35 });

  demoVideos.forEach((video) => demoObserver.observe(video));
}

function createDemoCard(item, index) {
  const card = document.createElement('article');
  card.className = 'demo-card';

  const videoShell = document.createElement('div');
  videoShell.className = 'demo-video-shell';

  const isGif = /\.gif(?:$|[?#])/i.test(item.src);
  let media;

  if (isGif) {
    media = document.createElement('img');
    media.className = 'demo-gif';
    media.src = item.src;
    media.alt = item.title || `Demo ${index + 1}`;
    media.loading = 'lazy';
    media.decoding = 'async';
  } else {
    media = document.createElement('video');
    media.className = 'demo-video';
    media.src = item.src;
    media.muted = true;
    media.loop = true;
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
    media.setAttribute('aria-label', item.title || `Demo ${index + 1}`);
    if (item.poster) media.poster = item.poster;
  }

  const meta = document.createElement('div');
  meta.className = 'demo-meta';

  const label = document.createElement('span');
  label.textContent = item.label || `Demo ${String(index + 1).padStart(2, '0')}`;

  const title = document.createElement('p');
  title.textContent = item.title || item.description || 'Robot demonstration';

  meta.append(label, title);
  videoShell.append(media);
  card.append(videoShell, meta);
  return card;
}

async function initializeDemoGallery() {
  if (!demoGallery) return;

  let playbackRate = DEFAULT_DEMO_PLAYBACK_RATE;
  let items = [];

  try {
    const response = await fetch('assets/demos.json', { cache: 'no-store' });
    if (response.ok) {
      const manifest = await response.json();
      const requestedRate = Number(manifest.playbackRate);
      if (Number.isFinite(requestedRate) && requestedRate > 0) {
        playbackRate = requestedRate;
      }
      if (Array.isArray(manifest.items)) {
        items = manifest.items.filter((item) => item && typeof item.src === 'string' && item.src.trim());
      }
    }
  } catch {
    // Keep the static placeholder cards when the manifest is unavailable.
  }

  if (items.length) {
    demoGallery.replaceChildren(...items.map((item, index) => createDemoCard(item, index)));
  }

  const demoVideos = Array.from(demoGallery.querySelectorAll('video.demo-video'));
  demoVideos.forEach((video) => configureDemoVideo(video, playbackRate));
  observeDemoVideos(demoVideos);
}

initializeDemoGallery();

function createSimulationVideo(src, viewLabel, robotLabel) {
  const shell = document.createElement('div');
  shell.className = 'simulation-view';
  shell.dataset.viewLabel = viewLabel;

  const video = document.createElement('video');
  video.className = 'simulation-video';
  video.dataset.src = src;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('aria-label', `${robotLabel} ${viewLabel}`);

  shell.append(video);
  return shell;
}

function createSimulationCard(item) {
  const card = document.createElement('article');
  card.className = 'simulation-card';

  const label = document.createElement('div');
  label.className = 'simulation-card-label';
  label.textContent = item.label;

  const views = document.createElement('div');
  views.className = 'simulation-views';
  views.append(
    createSimulationVideo(item.record, 'Record view', item.label),
    createSimulationVideo(item.teleop, 'Teleop view', item.label),
  );

  card.append(label, views);
  return card;
}

function loadSimulationVideo(video) {
  if (video.src || !video.dataset.src) return;
  video.src = video.dataset.src;
  video.load();
}

function observeSimulationVideos(videos) {
  if (!('IntersectionObserver' in window)) {
    videos.forEach((video) => {
      loadSimulationVideo(video);
      video.play().catch(() => {});
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        loadSimulationVideo(video);
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { rootMargin: '280px 0px', threshold: 0.05 });

  videos.forEach((video) => observer.observe(video));
}

async function initializeSimulationGallery() {
  if (!simulationGallery) return;

  try {
    const response = await fetch('assets/simulation-demos.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Simulation manifest unavailable');
    const manifest = await response.json();
    const items = Array.isArray(manifest.items)
      ? manifest.items.filter((item) => item?.label && item?.record && item?.teleop)
      : [];

    if (!items.length) throw new Error('Simulation manifest is empty');
    simulationGallery.replaceChildren(...items.map(createSimulationCard));
    observeSimulationVideos(Array.from(simulationGallery.querySelectorAll('.simulation-video')));
  } catch {
    simulationGallery.innerHTML = '<p class="simulation-loading">Simulation demos are temporarily unavailable.</p>';
  }
}

initializeSimulationGallery();
