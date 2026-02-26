(function() {
  function hexToRgb(e) {
    var a = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    e = e.replace(a, function(e2, a2, t2, i) {
      return a2 + a2 + t2 + t2 + i + i;
    });
    var t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
    return t ? { r: parseInt(t[1], 16), g: parseInt(t[2], 16), b: parseInt(t[3], 16) } : null;
  }
  function clamp(e, a, t) {
    return Math.min(Math.max(e, a), t);
  }
  function isInArray(e, a) {
    return a.indexOf(e) > -1;
  }
  var pJS = function(e, a) {
    var t = document.querySelector("#" + e + " > .particles-js-canvas-el");
    this.pJS = { canvas: { el: t, w: t.offsetWidth, h: t.offsetHeight }, particles: { number: { value: 400, density: { enable: true, value_area: 800 } }, color: { value: "#fff" }, shape: { type: "circle", stroke: { width: 0, color: "#ff0000" }, polygon: { nb_sides: 5 }, image: { src: "", width: 100, height: 100 } }, opacity: { value: 1, random: false, anim: { enable: false, speed: 2, opacity_min: 0, sync: false } }, size: { value: 20, random: false, anim: { enable: false, speed: 20, size_min: 0, sync: false } }, line_linked: { enable: true, distance: 100, color: "#fff", opacity: 1, width: 1 }, move: { enable: true, speed: 2, direction: "none", random: false, straight: false, out_mode: "out", bounce: false, attract: { enable: false, rotateX: 3e3, rotateY: 3e3 } }, array: [] }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true }, modes: { grab: { distance: 100, line_linked: { opacity: 1 } }, bubble: { distance: 200, size: 80, duration: 0.4 }, repulse: { distance: 200, duration: 0.4 }, push: { particles_nb: 4 }, remove: { particles_nb: 2 } }, mouse: {} }, retina_detect: false, fn: { interact: {}, modes: {}, vendors: {} }, tmp: {} };
    var i = this.pJS;
    a && Object.deepExtend(i, a), i.tmp.obj = { size_value: i.particles.size.value, size_anim_speed: i.particles.size.anim.speed, move_speed: i.particles.move.speed, line_linked_distance: i.particles.line_linked.distance, line_linked_width: i.particles.line_linked.width, mode_grab_distance: i.interactivity.modes.grab.distance, mode_bubble_distance: i.interactivity.modes.bubble.distance, mode_bubble_size: i.interactivity.modes.bubble.size, mode_repulse_distance: i.interactivity.modes.repulse.distance }, i.fn.retinaInit = function() {
      i.retina_detect && window.devicePixelRatio > 1 ? (i.canvas.pxratio = window.devicePixelRatio, i.tmp.retina = true) : (i.canvas.pxratio = 1, i.tmp.retina = false), i.canvas.w = i.canvas.el.offsetWidth * i.canvas.pxratio, i.canvas.h = i.canvas.el.offsetHeight * i.canvas.pxratio, i.particles.size.value = i.tmp.obj.size_value * i.canvas.pxratio, i.particles.size.anim.speed = i.tmp.obj.size_anim_speed * i.canvas.pxratio, i.particles.move.speed = i.tmp.obj.move_speed * i.canvas.pxratio, i.particles.line_linked.distance = i.tmp.obj.line_linked_distance * i.canvas.pxratio, i.interactivity.modes.grab.distance = i.tmp.obj.mode_grab_distance * i.canvas.pxratio, i.interactivity.modes.bubble.distance = i.tmp.obj.mode_bubble_distance * i.canvas.pxratio, i.particles.line_linked.width = i.tmp.obj.line_linked_width * i.canvas.pxratio, i.interactivity.modes.bubble.size = i.tmp.obj.mode_bubble_size * i.canvas.pxratio, i.interactivity.modes.repulse.distance = i.tmp.obj.mode_repulse_distance * i.canvas.pxratio;
    }, i.fn.canvasInit = function() {
      i.canvas.ctx = i.canvas.el.getContext("2d");
    }, i.fn.canvasSize = function() {
      i.canvas.el.width = i.canvas.w, i.canvas.el.height = i.canvas.h, i && i.interactivity.events.resize && window.addEventListener("resize", function() {
        i.canvas.w = i.canvas.el.offsetWidth, i.canvas.h = i.canvas.el.offsetHeight, i.tmp.retina && (i.canvas.w *= i.canvas.pxratio, i.canvas.h *= i.canvas.pxratio), i.canvas.el.width = i.canvas.w, i.canvas.el.height = i.canvas.h, i.particles.move.enable || (i.fn.particlesEmpty(), i.fn.particlesCreate(), i.fn.particlesDraw(), i.fn.vendors.densityAutoParticles()), i.fn.vendors.densityAutoParticles();
      });
    }, i.fn.canvasPaint = function() {
      i.canvas.ctx.fillRect(0, 0, i.canvas.w, i.canvas.h);
    }, i.fn.canvasClear = function() {
      i.canvas.ctx.clearRect(0, 0, i.canvas.w, i.canvas.h);
    }, i.fn.particle = function(e2, a2, t2) {
      if (this.radius = (i.particles.size.random ? Math.random() : 1) * i.particles.size.value, i.particles.size.anim.enable && (this.size_status = false, this.vs = i.particles.size.anim.speed / 100, i.particles.size.anim.sync || (this.vs = this.vs * Math.random())), this.x = t2 ? t2.x : Math.random() * i.canvas.w, this.y = t2 ? t2.y : Math.random() * i.canvas.h, this.x > i.canvas.w - 2 * this.radius ? this.x = this.x - this.radius : this.x < 2 * this.radius && (this.x = this.x + this.radius), this.y > i.canvas.h - 2 * this.radius ? this.y = this.y - this.radius : this.y < 2 * this.radius && (this.y = this.y + this.radius), i.particles.move.bounce && i.fn.vendors.checkOverlap(this, t2), this.color = {}, "object" == typeof e2.value) if (e2.value instanceof Array) {
        var s = e2.value[Math.floor(Math.random() * i.particles.color.value.length)];
        this.color.rgb = hexToRgb(s);
      } else void 0 != e2.value.r && void 0 != e2.value.g && void 0 != e2.value.b && (this.color.rgb = { r: e2.value.r, g: e2.value.g, b: e2.value.b }), void 0 != e2.value.h && void 0 != e2.value.s && void 0 != e2.value.l && (this.color.hsl = { h: e2.value.h, s: e2.value.s, l: e2.value.l });
      else "random" == e2.value ? this.color.rgb = { r: Math.floor(256 * Math.random()) + 0, g: Math.floor(256 * Math.random()) + 0, b: Math.floor(256 * Math.random()) + 0 } : "string" == typeof e2.value && (this.color = e2, this.color.rgb = hexToRgb(this.color.value));
      this.opacity = (i.particles.opacity.random ? Math.random() : 1) * i.particles.opacity.value, i.particles.opacity.anim.enable && (this.opacity_status = false, this.vo = i.particles.opacity.anim.speed / 100, i.particles.opacity.anim.sync || (this.vo = this.vo * Math.random()));
      var n = {};
      switch (i.particles.move.direction) {
        case "top":
          n = { x: 0, y: -1 };
          break;
        case "top-right":
          n = { x: 0.5, y: -0.5 };
          break;
        case "right":
          n = { x: 1, y: -0 };
          break;
        case "bottom-right":
          n = { x: 0.5, y: 0.5 };
          break;
        case "bottom":
          n = { x: 0, y: 1 };
          break;
        case "bottom-left":
          n = { x: -0.5, y: 1 };
          break;
        case "left":
          n = { x: -1, y: 0 };
          break;
        case "top-left":
          n = { x: -0.5, y: -0.5 };
          break;
        default:
          n = { x: 0, y: 0 };
      }
      i.particles.move.straight ? (this.vx = n.x, this.vy = n.y, i.particles.move.random && (this.vx = this.vx * Math.random(), this.vy = this.vy * Math.random())) : (this.vx = n.x + Math.random() - 0.5, this.vy = n.y + Math.random() - 0.5), this.vx_i = this.vx, this.vy_i = this.vy;
      var r = i.particles.shape.type;
      if ("object" == typeof r) {
        if (r instanceof Array) {
          var c = r[Math.floor(Math.random() * r.length)];
          this.shape = c;
        }
      } else this.shape = r;
      if ("image" == this.shape) {
        var o = i.particles.shape;
        this.img = { src: o.image.src, ratio: o.image.width / o.image.height }, this.img.ratio || (this.img.ratio = 1), "svg" == i.tmp.img_type && void 0 != i.tmp.source_svg && (i.fn.vendors.createSvgImg(this), i.tmp.pushing && (this.img.loaded = false));
      }
    }, i.fn.particle.prototype.draw = function() {
      function e2() {
        i.canvas.ctx.drawImage(r, a2.x - t2, a2.y - t2, 2 * t2, 2 * t2 / a2.img.ratio);
      }
      var a2 = this;
      if (void 0 != a2.radius_bubble) var t2 = a2.radius_bubble;
      else var t2 = a2.radius;
      if (void 0 != a2.opacity_bubble) var s = a2.opacity_bubble;
      else var s = a2.opacity;
      if (a2.color.rgb) var n = "rgba(" + a2.color.rgb.r + "," + a2.color.rgb.g + "," + a2.color.rgb.b + "," + s + ")";
      else var n = "hsla(" + a2.color.hsl.h + "," + a2.color.hsl.s + "%," + a2.color.hsl.l + "%," + s + ")";
      switch (i.canvas.ctx.fillStyle = n, i.canvas.ctx.beginPath(), a2.shape) {
        case "circle":
          i.canvas.ctx.arc(a2.x, a2.y, t2, 0, 2 * Math.PI, false);
          break;
        case "edge":
          i.canvas.ctx.rect(a2.x - t2, a2.y - t2, 2 * t2, 2 * t2);
          break;
        case "triangle":
          i.fn.vendors.drawShape(i.canvas.ctx, a2.x - t2, a2.y + t2 / 1.66, 2 * t2, 3, 2);
          break;
        case "polygon":
          i.fn.vendors.drawShape(i.canvas.ctx, a2.x - t2 / (i.particles.shape.polygon.nb_sides / 3.5), a2.y - t2 / 0.76, 2.66 * t2 / (i.particles.shape.polygon.nb_sides / 3), i.particles.shape.polygon.nb_sides, 1);
          break;
        case "star":
          i.fn.vendors.drawShape(i.canvas.ctx, a2.x - 2 * t2 / (i.particles.shape.polygon.nb_sides / 4), a2.y - t2 / 1.52, 2 * t2 * 2.66 / (i.particles.shape.polygon.nb_sides / 3), i.particles.shape.polygon.nb_sides, 2);
          break;
        case "image":
          if ("svg" == i.tmp.img_type) var r = a2.img.obj;
          else var r = i.tmp.img_obj;
          r && e2();
      }
      i.canvas.ctx.closePath(), i.particles.shape.stroke.width > 0 && (i.canvas.ctx.strokeStyle = i.particles.shape.stroke.color, i.canvas.ctx.lineWidth = i.particles.shape.stroke.width, i.canvas.ctx.stroke()), i.canvas.ctx.fill();
    }, i.fn.particlesCreate = function() {
      for (var e2 = 0; e2 < i.particles.number.value; e2++) i.particles.array.push(new i.fn.particle(i.particles.color, i.particles.opacity.value));
    }, i.fn.particlesUpdate = function() {
      for (var e2 = 0; e2 < i.particles.array.length; e2++) {
        var a2 = i.particles.array[e2];
        if (i.particles.move.enable) {
          var t2 = i.particles.move.speed / 2;
          a2.x += a2.vx * t2, a2.y += a2.vy * t2;
        }
        if (i.particles.opacity.anim.enable && (1 == a2.opacity_status ? (a2.opacity >= i.particles.opacity.value && (a2.opacity_status = false), a2.opacity += a2.vo) : (a2.opacity <= i.particles.opacity.anim.opacity_min && (a2.opacity_status = true), a2.opacity -= a2.vo), a2.opacity < 0 && (a2.opacity = 0)), i.particles.size.anim.enable && (1 == a2.size_status ? (a2.radius >= i.particles.size.value && (a2.size_status = false), a2.radius += a2.vs) : (a2.radius <= i.particles.size.anim.size_min && (a2.size_status = true), a2.radius -= a2.vs), a2.radius < 0 && (a2.radius = 0)), "bounce" == i.particles.move.out_mode) var s = { x_left: a2.radius, x_right: i.canvas.w, y_top: a2.radius, y_bottom: i.canvas.h };
        else var s = { x_left: -a2.radius, x_right: i.canvas.w + a2.radius, y_top: -a2.radius, y_bottom: i.canvas.h + a2.radius };
        switch (a2.x - a2.radius > i.canvas.w ? (a2.x = s.x_left, a2.y = Math.random() * i.canvas.h) : a2.x + a2.radius < 0 && (a2.x = s.x_right, a2.y = Math.random() * i.canvas.h), a2.y - a2.radius > i.canvas.h ? (a2.y = s.y_top, a2.x = Math.random() * i.canvas.w) : a2.y + a2.radius < 0 && (a2.y = s.y_bottom, a2.x = Math.random() * i.canvas.w), i.particles.move.out_mode) {
          case "bounce":
            a2.x + a2.radius > i.canvas.w ? a2.vx = -a2.vx : a2.x - a2.radius < 0 && (a2.vx = -a2.vx), a2.y + a2.radius > i.canvas.h ? a2.vy = -a2.vy : a2.y - a2.radius < 0 && (a2.vy = -a2.vy);
        }
        if (isInArray("grab", i.interactivity.events.onhover.mode) && i.fn.modes.grabParticle(a2), (isInArray("bubble", i.interactivity.events.onhover.mode) || isInArray("bubble", i.interactivity.events.onclick.mode)) && i.fn.modes.bubbleParticle(a2), (isInArray("repulse", i.interactivity.events.onhover.mode) || isInArray("repulse", i.interactivity.events.onclick.mode)) && i.fn.modes.repulseParticle(a2), i.particles.line_linked.enable || i.particles.move.attract.enable) for (var n = e2 + 1; n < i.particles.array.length; n++) {
          var r = i.particles.array[n];
          i.particles.line_linked.enable && i.fn.interact.linkParticles(a2, r), i.particles.move.attract.enable && i.fn.interact.attractParticles(a2, r), i.particles.move.bounce && i.fn.interact.bounceParticles(a2, r);
        }
      }
    }, i.fn.particlesDraw = function() {
      i.canvas.ctx.clearRect(0, 0, i.canvas.w, i.canvas.h), i.fn.particlesUpdate();
      for (var e2 = 0; e2 < i.particles.array.length; e2++) {
        var a2 = i.particles.array[e2];
        a2.draw();
      }
    }, i.fn.particlesEmpty = function() {
      i.particles.array = [];
    }, i.fn.particlesRefresh = function() {
      cancelRequestAnimFrame(i.fn.checkAnimFrame), cancelRequestAnimFrame(i.fn.drawAnimFrame), i.tmp.source_svg = void 0, i.tmp.img_obj = void 0, i.tmp.count_svg = 0, i.fn.particlesEmpty(), i.fn.canvasClear(), i.fn.vendors.start();
    }, i.fn.interact.linkParticles = function(e2, a2) {
      var t2 = e2.x - a2.x, s = e2.y - a2.y, n = Math.sqrt(t2 * t2 + s * s);
      if (n <= i.particles.line_linked.distance) {
        var r = i.particles.line_linked.opacity - n / (1 / i.particles.line_linked.opacity) / i.particles.line_linked.distance;
        if (r > 0) {
          var c = i.particles.line_linked.color_rgb_line;
          i.canvas.ctx.strokeStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + r + ")", i.canvas.ctx.lineWidth = i.particles.line_linked.width, i.canvas.ctx.beginPath(), i.canvas.ctx.moveTo(e2.x, e2.y), i.canvas.ctx.lineTo(a2.x, a2.y), i.canvas.ctx.stroke(), i.canvas.ctx.closePath();
        }
      }
    }, i.fn.interact.attractParticles = function(e2, a2) {
      var t2 = e2.x - a2.x, s = e2.y - a2.y, n = Math.sqrt(t2 * t2 + s * s);
      if (n <= i.particles.line_linked.distance) {
        var r = t2 / (1e3 * i.particles.move.attract.rotateX), c = s / (1e3 * i.particles.move.attract.rotateY);
        e2.vx -= r, e2.vy -= c, a2.vx += r, a2.vy += c;
      }
    }, i.fn.interact.bounceParticles = function(e2, a2) {
      var t2 = e2.x - a2.x, i2 = e2.y - a2.y, s = Math.sqrt(t2 * t2 + i2 * i2), n = e2.radius + a2.radius;
      n >= s && (e2.vx = -e2.vx, e2.vy = -e2.vy, a2.vx = -a2.vx, a2.vy = -a2.vy);
    }, i.fn.modes.pushParticles = function(e2, a2) {
      i.tmp.pushing = true;
      for (var t2 = 0; e2 > t2; t2++) i.particles.array.push(new i.fn.particle(i.particles.color, i.particles.opacity.value, { x: a2 ? a2.pos_x : Math.random() * i.canvas.w, y: a2 ? a2.pos_y : Math.random() * i.canvas.h })), t2 == e2 - 1 && (i.particles.move.enable || i.fn.particlesDraw(), i.tmp.pushing = false);
    }, i.fn.modes.removeParticles = function(e2) {
      i.particles.array.splice(0, e2), i.particles.move.enable || i.fn.particlesDraw();
    }, i.fn.modes.bubbleParticle = function(e2) {
      function a2() {
        e2.opacity_bubble = e2.opacity, e2.radius_bubble = e2.radius;
      }
      function t2(a3, t3, s2, n2, c2) {
        if (a3 != t3) if (i.tmp.bubble_duration_end) {
          if (void 0 != s2) {
            var o2 = n2 - p * (n2 - a3) / i.interactivity.modes.bubble.duration, l2 = a3 - o2;
            d = a3 + l2, "size" == c2 && (e2.radius_bubble = d), "opacity" == c2 && (e2.opacity_bubble = d);
          }
        } else if (r <= i.interactivity.modes.bubble.distance) {
          if (void 0 != s2) var v2 = s2;
          else var v2 = n2;
          if (v2 != a3) {
            var d = n2 - p * (n2 - a3) / i.interactivity.modes.bubble.duration;
            "size" == c2 && (e2.radius_bubble = d), "opacity" == c2 && (e2.opacity_bubble = d);
          }
        } else "size" == c2 && (e2.radius_bubble = void 0), "opacity" == c2 && (e2.opacity_bubble = void 0);
      }
      if (i.interactivity.events.onhover.enable && isInArray("bubble", i.interactivity.events.onhover.mode)) {
        var s = e2.x - i.interactivity.mouse.pos_x, n = e2.y - i.interactivity.mouse.pos_y, r = Math.sqrt(s * s + n * n), c = 1 - r / i.interactivity.modes.bubble.distance;
        if (r <= i.interactivity.modes.bubble.distance) {
          if (c >= 0 && "mousemove" == i.interactivity.status) {
            if (i.interactivity.modes.bubble.size != i.particles.size.value) if (i.interactivity.modes.bubble.size > i.particles.size.value) {
              var o = e2.radius + i.interactivity.modes.bubble.size * c;
              o >= 0 && (e2.radius_bubble = o);
            } else {
              var l = e2.radius - i.interactivity.modes.bubble.size, o = e2.radius - l * c;
              o > 0 ? e2.radius_bubble = o : e2.radius_bubble = 0;
            }
            if (i.interactivity.modes.bubble.opacity != i.particles.opacity.value) if (i.interactivity.modes.bubble.opacity > i.particles.opacity.value) {
              var v = i.interactivity.modes.bubble.opacity * c;
              v > e2.opacity && v <= i.interactivity.modes.bubble.opacity && (e2.opacity_bubble = v);
            } else {
              var v = e2.opacity - (i.particles.opacity.value - i.interactivity.modes.bubble.opacity) * c;
              v < e2.opacity && v >= i.interactivity.modes.bubble.opacity && (e2.opacity_bubble = v);
            }
          }
        } else a2();
        "mouseleave" == i.interactivity.status && a2();
      } else if (i.interactivity.events.onclick.enable && isInArray("bubble", i.interactivity.events.onclick.mode)) {
        if (i.tmp.bubble_clicking) {
          var s = e2.x - i.interactivity.mouse.click_pos_x, n = e2.y - i.interactivity.mouse.click_pos_y, r = Math.sqrt(s * s + n * n), p = ((/* @__PURE__ */ new Date()).getTime() - i.interactivity.mouse.click_time) / 1e3;
          p > i.interactivity.modes.bubble.duration && (i.tmp.bubble_duration_end = true), p > 2 * i.interactivity.modes.bubble.duration && (i.tmp.bubble_clicking = false, i.tmp.bubble_duration_end = false);
        }
        i.tmp.bubble_clicking && (t2(i.interactivity.modes.bubble.size, i.particles.size.value, e2.radius_bubble, e2.radius, "size"), t2(i.interactivity.modes.bubble.opacity, i.particles.opacity.value, e2.opacity_bubble, e2.opacity, "opacity"));
      }
    }, i.fn.modes.repulseParticle = function(e2) {
      function a2() {
        var a3 = Math.atan2(d, p);
        if (e2.vx = u * Math.cos(a3), e2.vy = u * Math.sin(a3), "bounce" == i.particles.move.out_mode) {
          var t3 = { x: e2.x + e2.vx, y: e2.y + e2.vy };
          t3.x + e2.radius > i.canvas.w ? e2.vx = -e2.vx : t3.x - e2.radius < 0 && (e2.vx = -e2.vx), t3.y + e2.radius > i.canvas.h ? e2.vy = -e2.vy : t3.y - e2.radius < 0 && (e2.vy = -e2.vy);
        }
      }
      if (i.interactivity.events.onhover.enable && isInArray("repulse", i.interactivity.events.onhover.mode) && "mousemove" == i.interactivity.status) {
        var t2 = e2.x - i.interactivity.mouse.pos_x, s = e2.y - i.interactivity.mouse.pos_y, n = Math.sqrt(t2 * t2 + s * s), r = { x: t2 / n, y: s / n }, c = i.interactivity.modes.repulse.distance, o = 100, l = clamp(1 / c * (-1 * Math.pow(n / c, 2) + 1) * c * o, 0, 50), v = { x: e2.x + r.x * l, y: e2.y + r.y * l };
        "bounce" == i.particles.move.out_mode ? (v.x - e2.radius > 0 && v.x + e2.radius < i.canvas.w && (e2.x = v.x), v.y - e2.radius > 0 && v.y + e2.radius < i.canvas.h && (e2.y = v.y)) : (e2.x = v.x, e2.y = v.y);
      } else if (i.interactivity.events.onclick.enable && isInArray("repulse", i.interactivity.events.onclick.mode)) if (i.tmp.repulse_finish || (i.tmp.repulse_count++, i.tmp.repulse_count == i.particles.array.length && (i.tmp.repulse_finish = true)), i.tmp.repulse_clicking) {
        var c = Math.pow(i.interactivity.modes.repulse.distance / 6, 3), p = i.interactivity.mouse.click_pos_x - e2.x, d = i.interactivity.mouse.click_pos_y - e2.y, m = p * p + d * d, u = -c / m * 1;
        c >= m && a2();
      } else 0 == i.tmp.repulse_clicking && (e2.vx = e2.vx_i, e2.vy = e2.vy_i);
    }, i.fn.modes.grabParticle = function(e2) {
      if (i.interactivity.events.onhover.enable && "mousemove" == i.interactivity.status) {
        var a2 = e2.x - i.interactivity.mouse.pos_x, t2 = e2.y - i.interactivity.mouse.pos_y, s = Math.sqrt(a2 * a2 + t2 * t2);
        if (s <= i.interactivity.modes.grab.distance) {
          var n = i.interactivity.modes.grab.line_linked.opacity - s / (1 / i.interactivity.modes.grab.line_linked.opacity) / i.interactivity.modes.grab.distance;
          if (n > 0) {
            var r = i.particles.line_linked.color_rgb_line;
            i.canvas.ctx.strokeStyle = "rgba(" + r.r + "," + r.g + "," + r.b + "," + n + ")", i.canvas.ctx.lineWidth = i.particles.line_linked.width, i.canvas.ctx.beginPath(), i.canvas.ctx.moveTo(e2.x, e2.y), i.canvas.ctx.lineTo(i.interactivity.mouse.pos_x, i.interactivity.mouse.pos_y), i.canvas.ctx.stroke(), i.canvas.ctx.closePath();
          }
        }
      }
    }, i.fn.vendors.eventsListeners = function() {
      "window" == i.interactivity.detect_on ? i.interactivity.el = window : i.interactivity.el = i.canvas.el, (i.interactivity.events.onhover.enable || i.interactivity.events.onclick.enable) && (i.interactivity.el.addEventListener("mousemove", function(e2) {
        if (i.interactivity.el == window) var a2 = e2.clientX, t2 = e2.clientY;
        else var a2 = e2.offsetX || e2.clientX, t2 = e2.offsetY || e2.clientY;
        i.interactivity.mouse.pos_x = a2, i.interactivity.mouse.pos_y = t2, i.tmp.retina && (i.interactivity.mouse.pos_x *= i.canvas.pxratio, i.interactivity.mouse.pos_y *= i.canvas.pxratio), i.interactivity.status = "mousemove";
      }), i.interactivity.el.addEventListener("mouseleave", function(e2) {
        i.interactivity.mouse.pos_x = null, i.interactivity.mouse.pos_y = null, i.interactivity.status = "mouseleave";
      })), i.interactivity.events.onclick.enable && i.interactivity.el.addEventListener("click", function() {
        if (i.interactivity.mouse.click_pos_x = i.interactivity.mouse.pos_x, i.interactivity.mouse.click_pos_y = i.interactivity.mouse.pos_y, i.interactivity.mouse.click_time = (/* @__PURE__ */ new Date()).getTime(), i.interactivity.events.onclick.enable) switch (i.interactivity.events.onclick.mode) {
          case "push":
            i.particles.move.enable ? i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb, i.interactivity.mouse) : 1 == i.interactivity.modes.push.particles_nb ? i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb, i.interactivity.mouse) : i.interactivity.modes.push.particles_nb > 1 && i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb);
            break;
          case "remove":
            i.fn.modes.removeParticles(i.interactivity.modes.remove.particles_nb);
            break;
          case "bubble":
            i.tmp.bubble_clicking = true;
            break;
          case "repulse":
            i.tmp.repulse_clicking = true, i.tmp.repulse_count = 0, i.tmp.repulse_finish = false, setTimeout(function() {
              i.tmp.repulse_clicking = false;
            }, 1e3 * i.interactivity.modes.repulse.duration);
        }
      });
    }, i.fn.vendors.densityAutoParticles = function() {
      if (i.particles.number.density.enable) {
        var e2 = i.canvas.el.width * i.canvas.el.height / 1e3;
        i.tmp.retina && (e2 /= 2 * i.canvas.pxratio);
        var a2 = e2 * i.particles.number.value / i.particles.number.density.value_area, t2 = i.particles.array.length - a2;
        0 > t2 ? i.fn.modes.pushParticles(Math.abs(t2)) : i.fn.modes.removeParticles(t2);
      }
    }, i.fn.vendors.checkOverlap = function(e2, a2) {
      for (var t2 = 0; t2 < i.particles.array.length; t2++) {
        var s = i.particles.array[t2], n = e2.x - s.x, r = e2.y - s.y, c = Math.sqrt(n * n + r * r);
        c <= e2.radius + s.radius && (e2.x = a2 ? a2.x : Math.random() * i.canvas.w, e2.y = a2 ? a2.y : Math.random() * i.canvas.h, i.fn.vendors.checkOverlap(e2));
      }
    }, i.fn.vendors.createSvgImg = function(e2) {
      var a2 = i.tmp.source_svg, t2 = /#([0-9A-F]{3,6})/gi, s = a2.replace(t2, function(a3, t3, i2, s2) {
        if (e2.color.rgb) var n2 = "rgba(" + e2.color.rgb.r + "," + e2.color.rgb.g + "," + e2.color.rgb.b + "," + e2.opacity + ")";
        else var n2 = "hsla(" + e2.color.hsl.h + "," + e2.color.hsl.s + "%," + e2.color.hsl.l + "%," + e2.opacity + ")";
        return n2;
      }), n = new Blob([s], { type: "image/svg+xml;charset=utf-8" }), r = window.URL || window.webkitURL || window, c = r.createObjectURL(n), o = new Image();
      o.addEventListener("load", function() {
        e2.img.obj = o, e2.img.loaded = true, r.revokeObjectURL(c), i.tmp.count_svg++;
      }), o.src = c;
    }, i.fn.vendors.destroypJS = function() {
      cancelAnimationFrame(i.fn.drawAnimFrame), t.remove(), pJSDom = null;
    }, i.fn.vendors.drawShape = function(e2, a2, t2, i2, s, n) {
      var r = s * n, c = s / n, o = 180 * (c - 2) / c, l = Math.PI - Math.PI * o / 180;
      e2.save(), e2.beginPath(), e2.translate(a2, t2), e2.moveTo(0, 0);
      for (var v = 0; r > v; v++) e2.lineTo(i2, 0), e2.translate(i2, 0), e2.rotate(l);
      e2.fill(), e2.restore();
    }, i.fn.vendors.exportImg = function() {
      window.open(i.canvas.el.toDataURL("image/png"), "_blank");
    }, i.fn.vendors.loadImg = function(e2) {
      if (i.tmp.img_error = void 0, "" != i.particles.shape.image.src) if ("svg" == e2) {
        var a2 = new XMLHttpRequest();
        a2.open("GET", i.particles.shape.image.src), a2.onreadystatechange = function(e3) {
          4 == a2.readyState && (200 == a2.status ? (i.tmp.source_svg = e3.currentTarget.response, i.fn.vendors.checkBeforeDraw()) : (console.log("Error pJS - Image not found"), i.tmp.img_error = true));
        }, a2.send();
      } else {
        var t2 = new Image();
        t2.addEventListener("load", function() {
          i.tmp.img_obj = t2, i.fn.vendors.checkBeforeDraw();
        }), t2.src = i.particles.shape.image.src;
      }
      else console.log("Error pJS - No image.src"), i.tmp.img_error = true;
    }, i.fn.vendors.draw = function() {
      "image" == i.particles.shape.type ? "svg" == i.tmp.img_type ? i.tmp.count_svg >= i.particles.number.value ? (i.fn.particlesDraw(), i.particles.move.enable ? i.fn.drawAnimFrame = requestAnimFrame(i.fn.vendors.draw) : cancelRequestAnimFrame(i.fn.drawAnimFrame)) : i.tmp.img_error || (i.fn.drawAnimFrame = requestAnimFrame(i.fn.vendors.draw)) : void 0 != i.tmp.img_obj ? (i.fn.particlesDraw(), i.particles.move.enable ? i.fn.drawAnimFrame = requestAnimFrame(i.fn.vendors.draw) : cancelRequestAnimFrame(i.fn.drawAnimFrame)) : i.tmp.img_error || (i.fn.drawAnimFrame = requestAnimFrame(i.fn.vendors.draw)) : (i.fn.particlesDraw(), i.particles.move.enable ? i.fn.drawAnimFrame = requestAnimFrame(i.fn.vendors.draw) : cancelRequestAnimFrame(i.fn.drawAnimFrame));
    }, i.fn.vendors.checkBeforeDraw = function() {
      "image" == i.particles.shape.type ? "svg" == i.tmp.img_type && void 0 == i.tmp.source_svg ? i.tmp.checkAnimFrame = requestAnimFrame(check) : (cancelRequestAnimFrame(i.tmp.checkAnimFrame), i.tmp.img_error || (i.fn.vendors.init(), i.fn.vendors.draw())) : (i.fn.vendors.init(), i.fn.vendors.draw());
    }, i.fn.vendors.init = function() {
      i.fn.retinaInit(), i.fn.canvasInit(), i.fn.canvasSize(), i.fn.canvasPaint(), i.fn.particlesCreate(), i.fn.vendors.densityAutoParticles(), i.particles.line_linked.color_rgb_line = hexToRgb(i.particles.line_linked.color);
    }, i.fn.vendors.start = function() {
      isInArray("image", i.particles.shape.type) ? (i.tmp.img_type = i.particles.shape.image.src.substr(i.particles.shape.image.src.length - 3), i.fn.vendors.loadImg(i.tmp.img_type)) : i.fn.vendors.checkBeforeDraw();
    }, i.fn.vendors.eventsListeners(), i.fn.vendors.start();
  };
  Object.deepExtend = function(e, a) {
    for (var t in a) a[t] && a[t].constructor && a[t].constructor === Object ? (e[t] = e[t] || {}, arguments.callee(e[t], a[t])) : e[t] = a[t];
    return e;
  }, window.requestAnimFrame = (function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(e) {
      window.setTimeout(e, 1e3 / 60);
    };
  })(), window.cancelRequestAnimFrame = (function() {
    return window.cancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame || clearTimeout;
  })(), window.pJSDom = [], window.particlesJS = function(e, a) {
    "string" != typeof e && (a = e, e = "particles-js"), e || (e = "particles-js");
    var t = document.getElementById(e), i = "particles-js-canvas-el", s = t.getElementsByClassName(i);
    if (s.length) for (; s.length > 0; ) t.removeChild(s[0]);
    var n = document.createElement("canvas");
    n.className = i, n.style.width = "100%", n.style.height = "100%";
    var r = document.getElementById(e).appendChild(n);
    null != r && pJSDom.push(new pJS(e, a));
  }, window.particlesJS.load = function(e, a, t) {
    var i = new XMLHttpRequest();
    i.open("GET", a), i.onreadystatechange = function(a2) {
      if (4 == i.readyState) if (200 == i.status) {
        var s = JSON.parse(a2.currentTarget.response);
        window.particlesJS(e, s), t && t();
      } else console.log("Error pJS - XMLHttpRequest status: " + i.status), console.log("Error pJS - File config not found");
    }, i.send();
  };
})();
