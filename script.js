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

function createSimulationFamily(family, manifest, grippersById) {
  const section = document.createElement('section');
  section.className = 'simulation-family';

  const header = document.createElement('header');
  header.className = 'simulation-family-header';

  const kicker = document.createElement('p');
  kicker.className = 'simulation-family-kicker';
  kicker.textContent = family.kicker;

  const title = document.createElement('h4');
  title.textContent = family.title;

  const subtitle = document.createElement('p');
  subtitle.textContent = family.subtitle;
  header.append(kicker, title, subtitle);

  const scroll = document.createElement('div');
  scroll.className = 'simulation-matrix-scroll';

  const matrix = document.createElement('div');
  matrix.className = 'simulation-matrix';
  matrix.style.setProperty('--arm-count', String(family.arms.length));
  matrix.style.setProperty('--matrix-min-width', family.arms.length >= 4 ? '820px' : '650px');
  matrix.setAttribute('role', 'table');
  matrix.setAttribute('aria-label', `${family.name} arm and gripper matrix`);

  const corner = document.createElement('div');
  corner.className = 'simulation-corner';
  corner.textContent = 'Gripper variant';
  matrix.append(corner);

  family.arms.forEach((arm) => {
    const armLabel = document.createElement('div');
    armLabel.className = 'simulation-arm-label';
    armLabel.textContent = arm.label;
    armLabel.setAttribute('role', 'columnheader');
    matrix.append(armLabel);
  });

  family.grippers.forEach((gripperId) => {
    const gripper = grippersById.get(gripperId);
    if (!gripper) return;

    const rowLabel = document.createElement('div');
    rowLabel.className = 'simulation-gripper-label';
    rowLabel.setAttribute('role', 'rowheader');

    const gripperName = document.createElement('strong');
    gripperName.textContent = gripper.label;

    const gripperDescription = document.createElement('small');
    gripperDescription.textContent = gripper.description;
    rowLabel.append(gripperName, gripperDescription);
    matrix.append(rowLabel);

    family.arms.forEach((arm) => {
      const figure = document.createElement('figure');
      figure.className = 'simulation-cell';
      figure.setAttribute('role', 'cell');

      const image = document.createElement('img');
      image.className = 'simulation-gif';
      const suffix = gripperId === 'default' ? '' : `-${gripperId}`;
      image.src = `${manifest.basePath}/${arm.id}${suffix}.gif?v=${manifest.version}`;
      image.alt = `${arm.label} with ${gripper.label} performing StackCube`;
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.append(image);
      matrix.append(figure);
    });
  });

  scroll.append(matrix);
  section.append(header, scroll);
  return section;
}

async function initializeSimulationGallery() {
  if (!simulationGallery) return;

  try {
    const response = await fetch('assets/simulation-gifs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Simulation manifest unavailable');
    const manifest = await response.json();
    const families = Array.isArray(manifest.families) ? manifest.families : [];
    const grippers = Array.isArray(manifest.grippers) ? manifest.grippers : [];
    if (!families.length || !grippers.length) throw new Error('Simulation manifest is empty');

    const grippersById = new Map(grippers.map((gripper) => [gripper.id, gripper]));
    simulationGallery.replaceChildren(
      ...families.map((family) => createSimulationFamily(family, manifest, grippersById)),
    );
  } catch {
    simulationGallery.innerHTML = '<p class="simulation-loading">Simulation demos are temporarily unavailable.</p>';
  }
}

initializeSimulationGallery();

