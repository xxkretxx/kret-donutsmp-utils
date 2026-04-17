// ============================================================
// Particle background — subtle layer on top of aurora gradient
// Dust particles + soft pink lines that react to cursor
// ============================================================
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MAX_DIST = 160;
  const MOUSE_RADIUS = 240;
  const BASE_SPEED = 0.18;

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
    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(80, Math.max(28, Math.floor(area / 18000)));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * BASE_SPEED * DPR,
        vy: (Math.random() - 0.5) * BASE_SPEED * DPR,
        r: (Math.random() * 1.3 + 0.5) * DPR
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    const maxDist = MAX_DIST * DPR;
    const mr = MOUSE_RADIUS * DPR;
    const mx = MOUSE.x !== null ? MOUSE.x * DPR : null;
    const my = MOUSE.y !== null ? MOUSE.y * DPR : null;

    // ---------- Connecting lines (subtle) ----------
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < maxDist * maxDist) {
          const d = Math.sqrt(d2);
          const alpha = 1 - d / maxDist;

          // Boost brightness/pinkness if near mouse
          let pinkBoost = 0;
          if (mx !== null) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const md = Math.hypot(midX - mx, midY - my);
            if (md < mr) pinkBoost = 1 - md / mr;
          }

          if (pinkBoost > 0.05) {
            const r = 255;
            const g = Math.round(180 - pinkBoost * 135);
            const b2 = Math.round(220 - pinkBoost * 70);
            ctx.strokeStyle = `rgba(${r},${g},${b2},${alpha * (0.18 + pinkBoost * 0.55)})`;
            ctx.lineWidth = DPR * (0.8 + pinkBoost * 0.7);
          } else {
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.09})`;
            ctx.lineWidth = DPR * 0.7;
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // ---------- Mouse tether ----------
    if (mx !== null) {
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < mr) {
          const alpha = 1 - d / mr;
          ctx.strokeStyle = `rgba(255, 45, 146, ${alpha * 0.6})`;
          ctx.lineWidth = DPR * (0.8 + alpha * 0.8);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.stroke();

          // Gentle attraction/repulsion
          const force = alpha * 0.25;
          p.vx += (dx / (d + 0.001)) * force;
          p.vy += (dy / (d + 0.001)) * force;
        }
      }

      // Soft pink halo at cursor
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 0.55);
      grad.addColorStop(0, 'rgba(255, 45, 146, 0.14)');
      grad.addColorStop(0.5, 'rgba(176, 71, 255, 0.05)');
      grad.addColorStop(1, 'rgba(255, 45, 146, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---------- Particles ----------
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.975;
      p.vy *= 0.975;

      const target = BASE_SPEED * DPR * 0.7;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed < target * 0.4) {
        p.vx += (Math.random() - 0.5) * 0.04;
        p.vy += (Math.random() - 0.5) * 0.04;
      }

      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      let near = 0;
      if (mx !== null) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < mr) near = 1 - d / mr;
      }

      if (near > 0.05) {
        const g = Math.round(255 - near * 210);
        const b = Math.round(255 - near * 109);
        ctx.fillStyle = `rgba(255,${g},${b},${0.8 + near * 0.2})`;
        ctx.shadowColor = 'rgba(255, 45, 146, 0.8)';
        ctx.shadowBlur = near * 14 * DPR;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + near * 0.7), 0, Math.PI * 2);
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
