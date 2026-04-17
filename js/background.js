// ============================================
// Animated particle network background
// White dots + connecting lines with subtle pink tint
// ============================================
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];
  const COUNT_BASE = 70; // will scale with screen size
  const MAX_DIST = 140;  // max distance for connecting lines
  const MOUSE = { x: null, y: null, r: 180 };

  function resize() {
    W = canvas.width = window.innerWidth * window.devicePixelRatio;
    H = canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(1, 1);
    initParticles();
  }

  function initParticles() {
    const count = Math.min(
      COUNT_BASE,
      Math.floor((window.innerWidth * window.innerHeight) / 18000)
    );
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4 * window.devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.4 * window.devicePixelRatio,
        r: (Math.random() * 1.5 + 0.5) * window.devicePixelRatio
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    const maxDist = MAX_DIST * window.devicePixelRatio;

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < maxDist) {
          const alpha = 1 - d / maxDist;
          // Mostly white, tinted slightly pink near mouse
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Mouse attract lines + nudge
    if (MOUSE.x !== null) {
      const mr = MOUSE.r * window.devicePixelRatio;
      const mx = MOUSE.x * window.devicePixelRatio;
      const my = MOUSE.y * window.devicePixelRatio;
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < mr) {
          const alpha = 1 - d / mr;
          ctx.strokeStyle = `rgba(255, 45, 146, ${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
          // gentle repulsion
          const force = (1 - d / mr) * 0.3;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
    }

    // Move + draw particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      // friction so mouse boost dies down
      p.vx *= 0.98;
      p.vy *= 0.98;
      // Re-normalize to a baseline drift
      const baseline = 0.3 * window.devicePixelRatio;
      if (Math.abs(p.vx) < baseline * 0.5) p.vx += (Math.random() - 0.5) * 0.02;
      if (Math.abs(p.vy) < baseline * 0.5) p.vy += (Math.random() - 0.5) * 0.02;

      // wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => { MOUSE.x = e.clientX; MOUSE.y = e.clientY; });
  window.addEventListener('mouseout', () => { MOUSE.x = null; MOUSE.y = null; });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) { MOUSE.x = t.clientX; MOUSE.y = t.clientY; }
  }, { passive: true });
  window.addEventListener('touchend', () => { MOUSE.x = null; MOUSE.y = null; });

  resize();
  requestAnimationFrame(step);
})();
