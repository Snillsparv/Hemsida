/* Lättvikts-jordglob i ren canvas (ortografisk projektion).
   Data: assets/globe-data.json  { dots: [[lng,lat],...], outlines: [[[lng,lat],...],...] }
   Användning:
     const globe = await JonasGlobe.create(canvas, 'assets/globe-data.json', { ... });
   Alternativ (data redan laddad):
     const globe = new JonasGlobe(canvas, data, opts);
*/
(function () {
  'use strict';

  const DEG = Math.PI / 180;

  class JonasGlobe {
    constructor(canvas, data, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = data;
      this.o = Object.assign({
        mode: 'dots',            // 'dots' | 'lines' | 'both'
        dotColor: '#39d98a',
        dotSize: 1.6,            // radie i px vid 600px glob
        lineColor: 'rgba(57,217,138,.55)',
        lineWidth: 1,
        graticule: 'rgba(120,160,255,.10)', // '' för att stänga av
        rim: 'rgba(90,150,255,.28)',        // atmosfärsglöd, '' för av
        sphereFill: '',          // t.ex. 'rgba(8,18,34,.9)' – fyllnad bakom prickarna
        marker: { lat: 57.71, lng: 11.97 }, // Göteborg – null för av
        markerColor: '#ffd166',
        speed: 0.05,             // grader per frame (60fps ≈ 3°/s)
        tilt: -18,               // startlutning (grader)
        lambda: 20,              // startrotation (grader) – Europa mot betraktaren
        interactive: true,
        idleResume: 2500,        // ms innan autorotation återupptas efter drag
      }, opts);

      this.lambda = this.o.lambda;
      this.phi = this.o.tilt;
      this._dragging = false;
      this._lastInteract = 0;
      this._raf = 0;
      this._destroyed = false;

      this._resize = this._resize.bind(this);
      this._frame = this._frame.bind(this);
      window.addEventListener('resize', this._resize);
      this._resize();
      if (this.o.interactive) this._bindPointer();
      this._raf = requestAnimationFrame(this._frame);
    }

    static async create(canvas, url, opts) {
      // __GLOBE_DATA_JSON sätts när datan är inbäddad direkt i sidan (t.ex. förhandsvisningar)
      const data = window.__GLOBE_DATA_JSON || await (await fetch(url)).json();
      return new JonasGlobe(canvas, data, opts);
    }

    destroy() {
      this._destroyed = true;
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._resize);
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.max(80, Math.min(rect.width, rect.height) || rect.width);
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.dpr = dpr;
      this.cx = this.canvas.width / 2;
      this.cy = this.canvas.height / 2;
      this.R = (Math.min(this.canvas.width, this.canvas.height) / 2) * 0.92;
    }

    _bindPointer() {
      const c = this.canvas;
      c.style.touchAction = 'pan-y';
      c.style.cursor = 'grab';
      let px = 0, py = 0;
      const down = (e) => {
        this._dragging = true;
        c.style.cursor = 'grabbing';
        const p = e.touches ? e.touches[0] : e;
        px = p.clientX; py = p.clientY;
        this._lastInteract = performance.now();
      };
      const move = (e) => {
        if (!this._dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - px, dy = p.clientY - py;
        px = p.clientX; py = p.clientY;
        const scale = 0.35 * (600 / (this.R / this.dpr * 2 || 600));
        this.lambda -= dx * scale;
        this.phi += dy * scale;
        this.phi = Math.max(-75, Math.min(75, this.phi));
        this._lastInteract = performance.now();
        if (e.cancelable && e.touches) e.preventDefault();
      };
      const up = () => {
        this._dragging = false;
        c.style.cursor = 'grab';
        this._lastInteract = performance.now();
      };
      c.addEventListener('mousedown', down);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      c.addEventListener('touchstart', down, { passive: true });
      c.addEventListener('touchmove', move, { passive: false });
      c.addEventListener('touchend', up);
    }

    // projicera [lng,lat] -> {x,y,vis}
    _proj(lng, lat, sinP, cosP, l0) {
      const φ = lat * DEG, λ = (lng - l0) * DEG;
      const cosφ = Math.cos(φ), sinφ = Math.sin(φ);
      const cosc = sinP * sinφ + cosP * cosφ * Math.cos(λ);
      return {
        x: this.cx + this.R * cosφ * Math.sin(λ),
        y: this.cy - this.R * (cosP * sinφ - sinP * cosφ * Math.cos(λ)),
        v: cosc > 0,
        c: cosc,
      };
    }

    _frame(t) {
      if (this._destroyed) return;
      if (!this._dragging && (t - this._lastInteract) > this.o.idleResume) {
        this.lambda += this.o.speed * 1.2;
      }
      this._draw();
      this._raf = requestAnimationFrame(this._frame);
    }

    _draw() {
      const { ctx } = this;
      const w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      const sinP = Math.sin(-this.phi * DEG), cosP = Math.cos(-this.phi * DEG);
      const l0 = this.lambda;

      // sfärbakgrund + rim
      if (this.o.sphereFill) {
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.R, 0, 7);
        ctx.fillStyle = this.o.sphereFill;
        ctx.fill();
      }
      if (this.o.rim) {
        const g = ctx.createRadialGradient(this.cx, this.cy, this.R * 0.86, this.cx, this.cy, this.R * 1.04);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.82, this.o.rim);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.R * 1.04, 0, 7);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // gradnät
      if (this.o.graticule) {
        ctx.strokeStyle = this.o.graticule;
        ctx.lineWidth = 1 * this.dpr;
        for (let lat = -60; lat <= 60; lat += 30) this._arc(lat, sinP, cosP, l0, true);
        for (let lng = -180; lng < 180; lng += 30) this._arc(lng, sinP, cosP, l0, false);
      }

      // konturer
      if (this.o.mode !== 'dots') {
        ctx.strokeStyle = this.o.lineColor;
        ctx.lineWidth = this.o.lineWidth * this.dpr;
        for (const line of this.data.outlines) {
          ctx.beginPath();
          let pen = false;
          for (const [lng, lat] of line) {
            const p = this._proj(lng, lat, sinP, cosP, l0);
            if (p.v) {
              if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
              pen = true;
            } else pen = false;
          }
          ctx.stroke();
        }
      }

      // prickar
      if (this.o.mode !== 'lines') {
        ctx.fillStyle = this.o.dotColor;
        const r = this.o.dotSize * (this.R / 300);
        for (const [lng, lat] of this.data.dots) {
          const p = this._proj(lng, lat, sinP, cosP, l0);
          if (!p.v) continue;
          const rr = r * (0.55 + 0.45 * p.c); // mindre nära horisonten
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr, 0, 7);
          ctx.fill();
        }
      }

      // markör (Göteborg)
      if (this.o.marker) {
        const m = this._proj(this.o.marker.lng, this.o.marker.lat, sinP, cosP, l0);
        if (m.v) {
          const pulse = (performance.now() % 1600) / 1600;
          ctx.strokeStyle = this.o.markerColor;
          ctx.globalAlpha = 1 - pulse;
          ctx.lineWidth = 1.5 * this.dpr;
          ctx.beginPath();
          ctx.arc(m.x, m.y, (4 + pulse * 14) * this.dpr, 0, 7);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = this.o.markerColor;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 3 * this.dpr, 0, 7);
          ctx.fill();
        }
      }
    }

    // hjälpare: rita en breddgrad (isLat=true, v = latitud) eller meridian (v = longitud)
    _arc(v, sinP, cosP, l0, isLat) {
      const { ctx } = this;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= 180; i++) {
        const lng = isLat ? -180 + i * 2 : v;
        const lat = isLat ? v : -90 + i;
        const p = this._proj(lng, lat, sinP, cosP, l0);
        if (p.v) {
          if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    }
  }

  window.JonasGlobe = JonasGlobe;
})();
