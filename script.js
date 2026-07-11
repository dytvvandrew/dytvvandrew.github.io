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

