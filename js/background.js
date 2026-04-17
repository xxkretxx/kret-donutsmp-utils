// ============================================
// Animated particle network background
// Thin white lines + pink glow near cursor
// ============================================
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MAX_DIST = 150;
  const MOUSE_RADIUS = 220;
  const BASE_SPEED = 0.22;

  let W, H, particles = [];
  const MOUSE = { x: null, y: null };

  function resize() {
    W = canvas.width = window.innerWidth * DPR;
    H = canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    initParticles();
  }

  function initParticles() {
    // Density scales with screen, capped
    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(95, Math.max(35, Math.floor(area / 14000)));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * BASE_SPEED * DPR,
        vy: (Math.random() - 0.5) * BASE_SPEED * DPR,
        r: (Math.random() * 1.2 + 0.4) * DPR,
        baseR: 0
      });
      particles[i].baseR = particles[i].r;
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    const maxDist = MAX_DIST * DPR;
    const mr = MOUSE_RADIUS * DPR;
    const mx = MOUSE.x !== null ? MOUSE.x * DPR : null;
    const my = MOUSE.y !== null ? MOUSE.y * DPR : null;

    // ---------- Connecting lines ----------
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < maxDist * maxDist) {
          const d = Math.sqrt(d2);
          const alpha = 1 - d / maxDist;

          // Pink boost if either endpoint is near the mouse
          let pinkBoost = 0;
          if (mx !== null) {
            const aDist = Math.hypot(a.x - mx, a.y - my);
            const bDist = Math.hypot(b.x - mx, b.y - my);
            const closest = Math.min(aDist, bDist);
            if (closest < mr) pinkBoost = 1 - closest / mr;
          }

          if (pinkBoost > 0.02) {
            // Blend white -> pink
            const r = Math.round(255);
            const g = Math.round(255 * (1 - pinkBoost * 0.82));
            const b2 = Math.round(255 * (1 - pinkBoost * 0.42));
            ctx.strokeStyle = `rgba(${r},${g},${b2},${alpha * (0.22 + pinkBoost * 0.5)})`;
            ctx.lineWidth = DPR * (1 + pinkBoost * 0.4);
          } else {
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.18})`;
            ctx.lineWidth = DPR;
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // ---------- Mouse tether lines ----------
    if (mx !== null) {
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < mr) {
          const alpha = 1 - d / mr;
          ctx.strokeStyle = `rgba(255, 45, 146, ${alpha * 0.55})`;
          ctx.lineWidth = DPR * (0.8 + alpha * 0.6);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.stroke();

          // Gentle repulsion so particles "bloom" out from cursor
          const force = alpha * 0.35;
          p.vx += (dx / (d + 0.001)) * force;
          p.vy += (dy / (d + 0.001)) * force;
        }
      }

      // Soft pink glow ring at cursor
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 0.6);
      grad.addColorStop(0, 'rgba(255, 45, 146, 0.18)');
      grad.addColorStop(1, 'rgba(255, 45, 146, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---------- Move + draw particles ----------
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      // friction damps mouse boost but keeps drift
      p.vx *= 0.97;
      p.vy *= 0.97;
      // keep a small baseline drift
      const target = BASE_SPEED * DPR * 0.8;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed < target * 0.4) {
        p.vx += (Math.random() - 0.5) * 0.04;
        p.vy += (Math.random() - 0.5) * 0.04;
      }

      // wrap around edges
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      // Brighten particles near mouse with a subtle pink tint
      let near = 0;
      if (mx !== null) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < mr) near = 1 - d / mr;
      }

      if (near > 0.05) {
        ctx.fillStyle = `rgba(255, ${Math.round(255 - near * 200)}, ${Math.round(255 - near * 110)}, ${0.7 + near * 0.3})`;
        // subtle halo
        ctx.shadowColor = 'rgba(255, 45, 146, 0.8)';
        ctx.shadowBlur = near * 10 * DPR;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.baseR * (1 + near * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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
