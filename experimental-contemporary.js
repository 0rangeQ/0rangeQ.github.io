const staticParallaxList = []
const observer = new IntersectionObserver(
  handleIntersections,
  { threshold: [0.7] })

let gradientStart = {
  hue: 258,
  saturation: 100,
  lightness: 10,
}

let gradientEnd = {
  hue: 290,
  saturation: 48,
  lightness: 12,
}

initialize()
function initialize () {
  const slideParallaxList =
    document.querySelectorAll('.slide-parallax')
  const observerTargets =
    document.querySelectorAll('.shade-in-shadow')

  for (const e of slideParallaxList) {
    const scrollString = getComputedStyle(e)
                          .getPropertyValue('--parallax-scroll')
                          || '100px' // In case script loads before CSS
    const parsedEntry = {
      element: e,
      shift: parseFloat(
              scrollString
              .trim()
              .match(/\d*/)[0]),
      units: scrollString
              .trim()
              .match(/[\D]+/)[0]
    }

    staticParallaxList.push(parsedEntry)
  }

  for (const e of observerTargets) {
    observer.observe(e)
  }

  window.addEventListener('resize', drawZigzag)
  drawZigzag()

  requestAnimationFrame(animateParallax)

  // debug
  document.querySelector('#gradient-start').value = HSLToHex(
    gradientStart.hue,
    gradientStart.saturation,
    gradientStart.lightness,
  )
  document.querySelector('#gradient-end').value = HSLToHex(
    gradientEnd.hue,
    gradientEnd.saturation,
    gradientEnd.lightness,
  )

  document.querySelector('#gradient-start').addEventListener('input',
    handleGradientPick)
  document.querySelector('#gradient-end').addEventListener('input',
    handleGradientPick)
}

function handleGradientPick () {
  const startHex = document.querySelector('#gradient-start').value
  const endHex = document.querySelector('#gradient-end').value
  gradientStart = hexToHSL(startHex)
  gradientEnd = hexToHSL(endHex)

  requestAnimationFrame(drawZigzag)
}

// debug
function HSLToHex(h,s,l) {
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0,
      g = 0, 
      b = 0; 

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  // Having obtained RGB, convert channels to hex
  r = Math.round((r + m) * 255).toString(16);
  g = Math.round((g + m) * 255).toString(16);
  b = Math.round((b + m) * 255).toString(16);

  // Prepend 0s, if necessary
  if (r.length == 1)
    r = "0" + r;
  if (g.length == 1)
    g = "0" + g;
  if (b.length == 1)
    b = "0" + b;

  return "#" + r + g + b;
}

// debug
function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (H.length == 4) {
    r = "0x" + H[1] + H[1];
    g = "0x" + H[2] + H[2];
    b = "0x" + H[3] + H[3];
  } else if (H.length == 7) {
    r = "0x" + H[1] + H[2];
    g = "0x" + H[3] + H[4];
    b = "0x" + H[5] + H[6];
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

  if (delta == 0)
    h = 0;
  else if (cmax == r)
    h = ((g - b) / delta) % 6;
  else if (cmax == g)
    h = (b - r) / delta + 2;
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0)
    h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return {hue: h, saturation: s, lightness: l}
}


function drawZigzag () {
  const canvas = document.getElementById('project-canvas')
  const ctx = canvas.getContext('2d')
  const realWidth = canvas.offsetWidth
  const realHeight = canvas.offsetHeight
  const points = []

  canvas.width = realWidth;
  canvas.height = realHeight;
  
  const canvasRect = canvas.getBoundingClientRect()
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasRect.height)

  gradient.addColorStop(0,
    `hsl(${gradientStart.hue} `
    + `${gradientStart.saturation}% `
    + `${gradientStart.lightness}%)`)
  gradient.addColorStop(1,
    `hsl(${gradientEnd.hue} `
    + `${gradientEnd.saturation}% `
    + `${gradientEnd.lightness}%)`)

  ctx.strokeStyle = gradient
  ctx.lineWidth = 75

  const images = document.querySelectorAll('.project-container img')

  if (!images.length) { return }

  ctx.beginPath()

  let currentPoint = relativeCenter(images[0])
  let displacement = canvasRect.width > 500
                      ? 40
                      : 0
  currentPoint[0] += displacement

  ctx.moveTo(...currentPoint)

  for (const img of images) {
    currentPoint = relativeCenter(img)
    currentPoint[0] += displacement // Reduce horizontal scale of zig-zag
    displacement *= -1

    ctx.lineTo(...currentPoint)
    points.push({x: currentPoint[0], y: currentPoint[1]})
  }

  ctx.stroke()

  // debug -- color from pick?
  const colors = []
  for (const point of points) {
    const imageData = ctx.getImageData(point.x, point.y, 1, 1).data
    colors.push(imageData)
  }

  updateShadowColors2(colors)

  function relativeCenter (element) {
    const rect = element.getBoundingClientRect()

    return [rect.left + rect.width / 2 - canvasRect.left,
            rect.top + rect.height / 2 - canvasRect.top]
  }
}

function handleIntersections (entries) {
  for (const e of entries) {
    if (e.isIntersecting) {
        e.target.classList.add('shadow-reveal')
    } else {
      e.target.classList.remove('shadow-reveal')
    }
  }
}

function lerpGradient(t) {
  let startHue = gradientStart.hue
  if(gradientEnd.hue - gradientStart.hue > 180) {
    startHue = 360 + startHue
  }
  return {
    hue: startHue * (1-t) + gradientEnd.hue * t,
    saturation: gradientStart.saturation * (1-t) + gradientEnd.saturation * t,
    lightness: gradientStart.lightness * (1-t) + gradientEnd.lightness * t,
  }
}

function lerpGradientRGB(t) {
  let startHue = gradientStart.hue
  if(gradientEnd.hue - gradientStart.hue > 180) {
    startHue = 360 + startHue
  }

  const startRGB = HSLToRGB(startHue,
    gradientStart.saturation, gradientStart.lightness)
  const endRGB = HSLToRGB(gradientEnd.hue,
    gradientEnd.saturation, gradientEnd.lightness)

  return {
    r: startRGB.r * (1-t) + endRGB.r * t,
    g: startRGB.g * (1-t) + endRGB.g * t,
    b: startRGB.b * (1-t) + endRGB.b * t,
  }
}

function HSLToRGB(h,s,l) {
  // Must be fractions of 1
  s /= 100
  l /= 100

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0,
      g = 0,
      b = 0

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;  
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return {r,g,b}
}

function RGBToHSL(r,g,b) {
  r /= 255;
  g /= 255;
  b /= 255;

  // Find greatest and smallest channel values
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

      if (delta == 0)
        h = 0;
      // Red is max
      else if (cmax == r)
        h = ((g - b) / delta) % 6;
      // Green is max
      else if (cmax == g)
        h = (b - r) / delta + 2;
      // Blue is max
      else
        h = (r - g) / delta + 4;
    
      h = Math.round(h * 60);
        
      // Make negative hues positive behind 360°
      if (h < 0)
          h += 360;
      l = (cmax + cmin) / 2;

      // Calculate saturation
      s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        
      // Multiply l and s by 100
      s = +(s * 100).toFixed(1);
      l = +(l * 100).toFixed(1);

  return {h, s, l}
}

function updateShadowColors2 (colors) {
  const images = [...document.querySelectorAll('.project-container li img')]
  const shadows = [...document.querySelectorAll('.image-shadow')]

  let index = 0
  for(const color of colors) {
    const hsl = RGBToHSL(color[0],color[1],color[2])

    shadows[index].style.setProperty('--fade-shadow-color',
      `rgb(${color[0] / 2}, ${color[1] / 2}, ${color[2] / 2})`)
    shadows[index].style.setProperty('--reveal-shadow-color',
      `hsl(${hsl.h} ${hsl.s}% ${hsl.l * 1.1}%)`)
    images[index].style.setProperty('--border-color',
      `hsl(${hsl.h} ${hsl.s/2 + 15}% ${hsl.l/2 + 25}%)`)

    index++
  }
}

function updateShadowColors () {
  const images = [...document.querySelectorAll('.project-container li img')]
  const shadows = [...document.querySelectorAll('.image-shadow')]
  const firstShadowTop = shadows[0].getBoundingClientRect().top
  const lastShadowTop = shadows[shadows.length - 1].getBoundingClientRect().top
  const shadowRange = lastShadowTop - firstShadowTop

  console.log('shadow range:',shadowRange)

  for(let index = 0; index < shadows.length; index++) {
    const shadow = shadows[index]
    const shadowTop = shadow.getBoundingClientRect().top
    const t = (shadowTop - firstShadowTop) / shadowRange
    const hsl = lerpGradient(t)
    const rgb = lerpGradientRGB(t)

    shadow.style.setProperty('--fade-shadow-color',
      `rgb(${rgb.r / 2}, ${rgb.g / 2}, ${rgb.b / 2})`)
    shadow.style.setProperty('--reveal-shadow-color',
      `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)
    images[index].style.setProperty('--border-color',
      `hsl(${hsl.hue} ${20 + hsl.saturation / 2}% ${23 + hsl.lightness / 2}%)`)
  }
}

function animateParallax () {
    for (const e of staticParallaxList) {
      // Compute progress scalar (0 ... 1.0) for element scroll
      // 0.0 -> top of element just reached bottom of viewport
      // 1.0 -> bottom of element just reached top of viewport
      const rect = e.element.getBoundingClientRect()
      const s = rect.bottom / (window.innerHeight + rect.height)
      const yMove = (-(0.5-s) * e.shift)
      e.element.style['transform'] = 
        `translate(0px, ${yMove}${e.units})`
    }

  requestAnimationFrame(animateParallax)
}
