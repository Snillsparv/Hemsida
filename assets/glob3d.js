/* glob3d — jonasgeografis handritade värld som lätt WebGL-glob.
   Ingen tredjepartskod: en fragment-shader ray-tracear sfären och läser
   mercator-texturen (assets/img/glob-textur.webp, bakad ur konst-tilesen).
   Dra för att snurra (tröghet), autorotation vid stiltje, piltangenter
   när globen har fokus. Utan WebGL behålls den statiska bilden. */
(function () {
  'use strict';
  var wrap = document.getElementById('glob3d');
  if (!wrap) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var startad = false;

  function starta() {
    if (startad) return;
    startad = true;

    var canvas = document.createElement('canvas');
    canvas.className = 'glob3dyta';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Jordglob där varje land är ett handritat konstverk — dra för att snurra');
    canvas.tabIndex = 0;
    var gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true })
          || canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return;                       // ingen WebGL: bilden ligger kvar
    var drv = gl.getExtension('OES_standard_derivatives');

    var VS = 'attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,0.,1.);}';
    var FS =
      (drv ? '#extension GL_OES_standard_derivatives : enable\n' : '') +
      'precision mediump float;varying vec2 vP;' +
      'uniform sampler2D uTex;uniform float uYaw;uniform float uPitch;uniform float uPx;uniform float uGrepp;' +
      'const float R=0.84;' +
      'void main(){' +
      '  float r=length(vP);' +
      '  vec3 acc=vec3(0.373,0.698,1.0);' +
      '  float halo=1.0-smoothstep(R,R*1.19,r);' +
      '  vec4 col=vec4(0.0);' +
      '  if(r<R+uPx){' +
      '    float z=sqrt(max(R*R-dot(vP,vP),0.0));' +
      '    vec3 n=vec3(vP,z)/R;' +
      '    float cp=cos(uPitch),sp=sin(uPitch);' +
      '    vec3 m=vec3(n.x,n.y*cp-n.z*sp,n.y*sp+n.z*cp);' +
      '    float cy=cos(uYaw),sy=sin(uYaw);' +
      '    vec3 d=vec3(m.x*cy+m.z*sy,m.y,-m.x*sy+m.z*cy);' +
      '    float lat=asin(clamp(d.y,-0.9999,0.9999));' +
      '    float lon=atan(d.x,d.z);' +
      '    float u=lon/6.2831853+0.5;' +
      '    float v=0.5-log(tan(0.7853982+lat*0.5))/6.2831853;' +
      '    float vv=clamp(v,0.002,0.998);' +
      (drv
        ? '    float u2=fract(u+0.5);' +
          '    vec3 tA=texture2D(uTex,vec2(u,vv)).rgb;' +
          '    vec3 tB=texture2D(uTex,vec2(u2-0.5,vv)).rgb;' +
          '    vec3 tex=(fwidth(u)<fwidth(u2))?tA:tB;'
        : '    vec3 tex=texture2D(uTex,vec2(u,vv)).rgb;') +
      '    vec3 L=normalize(vec3(-0.35,0.42,0.83));' +
      '    float diff=max(dot(n,L),0.0);' +
      '    vec3 c=tex*(0.5+0.58*diff);' +
      '    c+=acc*smoothstep(0.78,1.0,r/R)*(0.2+0.14*uGrepp);' +   // inre atmosfär, starkare i grepp
      '    float edge=1.0-smoothstep(R-uPx*1.6,R+uPx*0.4,r);' +
      '    col=vec4(c,1.0)*edge;' +
      '  }' +
      '  vec4 hc=vec4(acc,1.0)*halo*halo*(0.34+0.2*uGrepp);' +
      '  gl_FragColor=col+hc*(1.0-col.a);' +
      '}';

    function shader(typ, src) {
      var s = gl.createShader(typ);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aP = gl.getAttribLocation(prog, 'aP');
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    var uYaw = gl.getUniformLocation(prog, 'uYaw'),
        uPitch = gl.getUniformLocation(prog, 'uPitch'),
        uPx = gl.getUniformLocation(prog, 'uPx'),
        uGrepp = gl.getUniformLocation(prog, 'uGrepp');
    gl.clearColor(0, 0, 0, 0);

    var yaw = 0.28, pitch = -0.55;         // startvy: Europa/Afrika i blickfånget
    var vYaw = 0, vPitch = 0;              // tröghet
    var drar = false, senast = 0, sistaRor = 0;
    var lage = 0, startP = null;           // 0 = obestämt (touch), 1 = roterar, -1 = sidan skrollar
    var aktiv = false, grepp = 0;          // greppläge: globen äger alla svep tills man släpper
    var hint = document.querySelector('.globhint');
    var hintText = hint ? hint.textContent : '';
    function sattAktiv(pa) {
      if (aktiv === pa) return;
      aktiv = pa;
      canvas.style.touchAction = pa ? 'none' : 'pan-y';
      var pv = wrap.closest('.pvis');
      if (pv) pv.classList.toggle('grepp', pa);
      if (hint) hint.textContent = pa ? 'R\u00f6r utanf\u00f6r globen f\u00f6r att sl\u00e4ppa' : hintText;
    }
    document.addEventListener('pointerdown', function (e) {
      if (aktiv && e.target !== canvas) sattAktiv(false);
    }, true);
    // avsiktlig skrollning släpper greppet: mushjul på desktop, svep utanför
    // globen fångas av pointerdown-lyssnaren ovan (scroll-händelser är för
    // opålitliga — mjukscroll och momentum skulle släppa i förtid)
    addEventListener('wheel', function () { if (aktiv && !drar) sattAktiv(false); }, { passive: true });
    var synlig = false, ritad = false, texKlar = false;

    var tex = gl.createTexture();
    var bild = new Image();
    bild.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bild);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, drv ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (drv) gl.generateMipmap(gl.TEXTURE_2D);
      var ani = gl.getExtension('EXT_texture_filter_anisotropic')
             || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
      if (ani) gl.texParameterf(gl.TEXTURE_2D, ani.TEXTURE_MAX_ANISOTROPY_EXT,
                                Math.min(4, gl.getParameter(ani.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      texKlar = true;
      wrap.classList.add('glob3d-klar');
      var pvis = wrap.closest('.pvis');
      if (pvis) pvis.classList.add('glob3d-klar');
      canvas.style.opacity = '1';
      rita();
    };
    bild.src = 'assets/img/glob-textur.webp';

    function passa() {
      var b = wrap.getBoundingClientRect();
      var dpr = Math.min(devicePixelRatio || 1, 2);
      var px = Math.max(2, Math.round(b.width * dpr));
      if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
      gl.viewport(0, 0, px, px);
      gl.uniform1f(uPx, 2.5 / px);
    }

    function rita() {
      if (!texKlar) return;
      passa();
      gl.uniform1f(uYaw, yaw);
      gl.uniform1f(uPitch, pitch);
      gl.uniform1f(uGrepp, grepp);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ritad = true;
    }

    function klampa() { pitch = Math.max(-1.25, Math.min(1.25, pitch)); }

    function tick(ts) {
      requestAnimationFrame(tick);
      if (!synlig || !texKlar) return;
      var ror = false;
      var mal = aktiv ? 1 : 0;
      if (Math.abs(mal - grepp) > 0.004) { grepp += (mal - grepp) * 0.14; ror = true; }
      else grepp = mal;
      if (aktiv && !drar && performance.now() - sistaRor > 6000) sattAktiv(false);
      if (!drar) {
        if (Math.abs(vYaw) > 0.00004 || Math.abs(vPitch) > 0.00004) {
          yaw += vYaw; pitch += vPitch; klampa();
          vYaw *= 0.94; vPitch *= 0.94;
          ror = true;
        } else if (!reduced && ts - sistaRor > 3200) {
          yaw += 0.0016;                    // lugn autorotation
          ror = true;
        }
      }
      if (ror || !ritad) rita();
    }
    requestAnimationFrame(tick);

    canvas.addEventListener('pointerdown', function (e) {
      drar = true; senast = ts0(e); startP = ts0(e); sistaRor = performance.now();
      lage = (e.pointerType === 'touch' && !aktiv) ? 0 : 1;
      if (lage === 1) sattAktiv(true);
      vYaw = vPitch = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (lage === 1) e.preventDefault();
    });
    function ts0(e) { return { x: e.clientX, y: e.clientY }; }
    canvas.addEventListener('pointermove', function (e) {
      if (!drar) return;
      if (lage === 0) {                    // touch: vänta in riktningen
        var ax = Math.abs(e.clientX - startP.x), ay = Math.abs(e.clientY - startP.y);
        if (ax < 7 && ay < 7) return;      // dödzon
        lage = (ax > ay * 1.15) ? 1 : -1;  // sidledes → snurra, lodrätt → låt sidan skrolla
        senast = ts0(e);
        if (lage !== 1) return;
        sattAktiv(true);
      }
      if (lage !== 1) return;
      var w = canvas.getBoundingClientRect().width;
      var dx = (e.clientX - senast.x) / (w * 0.42);
      var dy = (e.clientY - senast.y) / (w * 0.42);
      senast = ts0(e);
      yaw -= dx; pitch -= dy; klampa();    // ytan följer fingret, även i höjdled
      vYaw = -dx * 0.55; vPitch = -dy * 0.55;
      sistaRor = performance.now();
      rita();
    });
    function slapp() { drar = false; lage = 0; sistaRor = performance.now(); }
    canvas.addEventListener('pointerup', slapp);
    canvas.addEventListener('pointercancel', slapp);
    canvas.addEventListener('keydown', function (e) {
      var steg = 0.09;
      if (e.key === 'ArrowLeft') { yaw += steg; }
      else if (e.key === 'ArrowRight') { yaw -= steg; }
      else if (e.key === 'ArrowUp') { pitch += steg; }
      else if (e.key === 'ArrowDown') { pitch -= steg; }
      else return;
      klampa(); sistaRor = performance.now(); rita();
      e.preventDefault();
    });
    addEventListener('resize', function () { if (synlig) rita(); });

    var io2 = new IntersectionObserver(function (en) {
      synlig = en[0].isIntersecting;
      if (synlig) rita();
    }, { rootMargin: '120px' });
    io2.observe(canvas);

    wrap.appendChild(canvas);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { starta(); io.disconnect(); }
    }, { rootMargin: '600px' });
    io.observe(wrap);
  } else starta();
})();
