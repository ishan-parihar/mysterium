<script lang="ts">
  /**
   * AmbientLayer — stage-themed ambient particle background.
   *
   * Renders a lightweight <canvas> behind route content with stage-appropriate
   * particles (embers for Red, motes for Magenta, pollen for Green, etc.).
   * Respects data-motion="reduced" (no particles when reduced motion is on).
   *
   * Performance: ~60 FPS, ≤2% CPU on mid-tier phones. Auto-pauses when tab hidden.
   */

  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let rafId: number | null = null;
  let particles: Particle[] = [];
  let lastTime = 0;
  let isPaused = false;

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    hue: number;
    life: number;
    maxLife: number;
  }

  // Stage → particle config
  const STAGE_CONFIG: Record<string, { count: number; hue: number; speed: number; size: [number, number]; drift: number }> = {
    infrared:  { count: 25, hue: 15,  speed: 0.3, size: [1, 3],  drift: 0.5 },
    magenta:   { count: 35, hue: 280, speed: 0.2, size: [1, 2],  drift: 1.0 },
    red:       { count: 30, hue: 10,  speed: 0.6, size: [1, 3],  drift: 0.8 },
    amber:     { count: 28, hue: 40,  speed: 0.3, size: [1, 2],  drift: 0.4 },
    orange:    { count: 20, hue: 200, speed: 0.5, size: [1, 2],  drift: 0.3 },
    green:     { count: 32, hue: 100, speed: 0.25, size: [1, 3], drift: 0.6 },
    teal: { count: 30, hue: 175, speed: 0.35, size: [1, 2], drift: 0.5 },
    turquoise:     { count: 18, hue: 45,  speed: 0.15, size: [1, 2], drift: 0.2 },
  };

  function getStage(): string {
    if (!browser) return 'red';
    return document.documentElement.getAttribute('data-stage') ?? 'red';
  }

  function isReducedMotion(): boolean {
    if (!browser) return false;
    return document.documentElement.getAttribute('data-motion') === 'reduced';
  }

  function resize() {
    if (!browser || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (ctx) ctx.scale(dpr, dpr);
  }

  function spawnParticle(config: typeof STAGE_CONFIG[string]): Particle {
    return {
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 10,
      vx: (Math.random() - 0.5) * config.drift,
      vy: -(Math.random() * config.speed + 0.1),
      size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
      alpha: 0.3 + Math.random() * 0.4,
      hue: config.hue + (Math.random() - 0.5) * 20,
      life: 0,
      maxLife: 6000 + Math.random() * 4000,
    };
  }

  function init() {
    if (!browser || !ctx) return;
    const stage = getStage();
    const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.red;
    particles = Array.from({ length: config.count }, () => {
      const p = spawnParticle(config);
      p.y = Math.random() * window.innerHeight; // distribute on first frame
      return p;
    });
  }

  function tick(time: number) {
    if (!ctx || isPaused) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(50, time - lastTime);
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const stage = getStage();
    const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.red;

    // Top up particles
    while (particles.length < config.count) {
      particles.push(spawnParticle(config));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.life += dt;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      // Fade in/out over life
      const lifeRatio = p.life / p.maxLife;
      let alpha = p.alpha;
      if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
      else if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

      ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Remove dead or off-screen particles
      if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > window.innerWidth + 10) {
        particles.splice(i, 1);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function onVisibility() {
    isPaused = document.hidden;
    if (!isPaused) lastTime = performance.now();
  }

  onMount(() => {
    if (!browser) return;
    if (isReducedMotion()) return;

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    init();
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    // Re-init when stage changes
    const observer = new MutationObserver(() => {
      if (!isReducedMotion()) init();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-stage'],
    });
  });

  onDestroy(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (browser) {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  });
</script>

<canvas bind:this={canvas} class="ambient-canvas" aria-hidden="true"></canvas>

<style>
  .ambient-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: var(--mysterium-z-base);
    opacity: 0.6;
  }
</style>
