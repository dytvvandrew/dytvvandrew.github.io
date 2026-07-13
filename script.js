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

const PDFJS_VERSION = '5.7.284';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

async function initializePdfFigure() {
  const canvas = document.querySelector('[data-pdf-canvas]');
  const stage = document.querySelector('[data-pdf-figure]');
  if (!canvas || !stage) return;

  const statusText = stage.querySelector('.pdf-render-status p');

  try {
    const pdfjsLib = await import(`${PDFJS_BASE}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ url: canvas.dataset.pdfSource }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    let lastWidth = 0;
    let renderTask;

    const renderPage = async () => {
      const displayWidth = Math.round(stage.clientWidth);
      if (!displayWidth || displayWidth === lastWidth) return;
      lastWidth = displayWidth;

      if (renderTask) {
        renderTask.cancel();
      }

      const outputScale = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({
        scale: (displayWidth / baseViewport.width) * outputScale,
      });

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${viewport.height / outputScale}px`;

      const context = canvas.getContext('2d', { alpha: false });
      renderTask = page.render({ canvasContext: context, viewport });

      try {
        await renderTask.promise;
        stage.classList.add('is-ready');
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') throw error;
      } finally {
        renderTask = null;
      }
    };

    await renderPage();

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(() => { renderPage(); });
      });
      resizeObserver.observe(stage);
    }
  } catch {
    stage.classList.add('has-error');
    if (statusText) statusText.textContent = 'The PDF preview could not be rendered.';
  }
}

initializePdfFigure();

const DEFAULT_DEMO_PLAYBACK_RATE = 1.5;
const demoGallery = document.querySelector('[data-demo-gallery]');
const speedChip = document.querySelector('.speed-chip');

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

function createDemoCard(item, index, playbackRate) {
  const card = document.createElement('article');
  card.className = 'demo-card';

  const videoShell = document.createElement('div');
  videoShell.className = 'demo-video-shell';

  const video = document.createElement('video');
  video.className = 'demo-video';
  video.src = item.src;
  video.muted = true;
  video.loop = true;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', item.title || `Demo ${index + 1}`);
  if (item.poster) video.poster = item.poster;

  const speedBadge = document.createElement('span');
  speedBadge.className = 'demo-speed-badge';
  speedBadge.textContent = `${playbackRate}x`;

  const meta = document.createElement('div');
  meta.className = 'demo-meta';

  const label = document.createElement('span');
  label.textContent = item.label || `Demo ${String(index + 1).padStart(2, '0')}`;

  const title = document.createElement('p');
  title.textContent = item.title || item.description || 'Robot demonstration';

  meta.append(label, title);
  videoShell.append(video, speedBadge);
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

  if (speedChip) {
    speedChip.textContent = `${playbackRate}x playback`;
    speedChip.setAttribute('aria-label', `All demos play at ${playbackRate} times speed`);
  }

  if (items.length) {
    demoGallery.replaceChildren(...items.map((item, index) => createDemoCard(item, index, playbackRate)));
  }

  const demoVideos = Array.from(demoGallery.querySelectorAll('.demo-video'));
  demoVideos.forEach((video) => configureDemoVideo(video, playbackRate));
  observeDemoVideos(demoVideos);
}

initializeDemoGallery();

