const staticParallaxList = []
const observer = new IntersectionObserver(
  handleIntersections,
  { threshold: [0.7] })

let gradientStart = {
  hue: 193,
  saturation: 33,
  lightness: 11,
}

let gradientEnd = {
  hue: 289,
  saturation: 71,
  lightness: 13,
}

function debounce(callback, delay = 200) {
  return () => {
    clearTimeout(debounce.tid)
    debounce.tid = setTimeout(callback, delay)
  }
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
                          || '100px' // Safari may load script before CSS
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

  window.addEventListener('resize',
    debounce(() => requestAnimationFrame(drawZigzag)))
  drawZigzag()

  requestAnimationFrame(animateParallax)

  // debug
  document.querySelector('#gradient-start').value = HSLtoHex(
    gradientStart.hue,
    gradientStart.saturation,
    gradientStart.lightness,
  )
  document.querySelector('#gradient-end').value = HSLtoHex(
    gradientEnd.hue,
    gradientEnd.saturation,
    gradientEnd.lightness,
  )

  document.querySelector('#gradient-start').addEventListener('input',
    handleGradientPick)
  document.querySelector('#gradient-end').addEventListener('input',
    handleGradientPick)
  document.querySelector('#shadow-multiplier').addEventListener('input',
    handleGradientPick)
  document.querySelector('#shadow-multiplier-text').textContent =
    document.querySelector('#shadow-multiplier').value
}

function handleGradientPick () {
  const startHex = document.querySelector('#gradient-start').value
  const endHex = document.querySelector('#gradient-end').value
  document.querySelector('#shadow-multiplier-text').textContent =
    document.querySelector('#shadow-multiplier').value

  ;({
    h: gradientStart.hue,
    s: gradientStart.saturation,
    l: gradientStart.lightness,
  } = hexToHSL(startHex))

  ;({
    h: gradientEnd.hue,
    s: gradientEnd.saturation,
    l: gradientEnd.lightness,
  } = hexToHSL(endHex))

  requestAnimationFrame(drawZigzag)
}

function HSLtoHex(h,s,l) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c/2
  let r = 0
  let g = 0 
  let b = 0 

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  // Construct hexadecimal string:
  r = Math.round((r + m) * 255).toString(16)
  g = Math.round((g + m) * 255).toString(16)
  b = Math.round((b + m) * 255).toString(16)

  if (r.length == 1)
    r = '0' + r
  if (g.length == 1)
    g = '0' + g
  if (b.length == 1)
    b = '0' + b

  return '#' + r + g + b
}

function hexToHSL(H) {
  let r = 0, g = 0, b = 0
  
  r = ('0x' + H[1] + H[2]) / 255
  g = ('0x' + H[3] + H[4]) / 255
  b = ('0x' + H[5] + H[6]) / 255

  const cmin = Math.min(r,g,b)
  const cmax = Math.max(r,g,b)
  const delta = cmax - cmin

  let h = 0, s = 0, l = 0

  if (delta == 0)
    h = 0
  else if (cmax == r)
    h = ((g - b) / delta) % 6
  else if (cmax == g)
    h = (b - r) / delta + 2
  else
    h = (r - g) / delta + 4

  h = Math.round(h * 60)

  if (h < 0)
    h += 360

  l = (cmax + cmin) / 2
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  s = +(s * 100).toFixed(2)
  l = +(l * 100).toFixed(2)

  return {h, s, l}
}

function drawZigzag () {
  // Create a secondary canvas for color-pick matching.
  // NOTE: For performance reasons, we do not read from the main canvas.
  // Readback causes significant performance issues,
  // c.f. https://issues.chromium.org/issues/41350217#comment12 and others.
  if (!drawZigzag.secondaryCanvas) {
    drawZigzag.secondaryCanvas = document.createElement('canvas')
    drawZigzag.secondaryCanvas.height = 1
  }

  const canvas = document.getElementById('project-canvas')
  const ctx = canvas.getContext('2d')
  const realWidth = canvas.offsetWidth
  const realHeight = canvas.offsetHeight
  const points = []

  canvas.width = realWidth
  canvas.height = realHeight
  
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
    displacement *= -1 // Alternate sides

    ctx.lineTo(...currentPoint)
    points.push({x: currentPoint[0], y: currentPoint[1]})
  }

  ctx.stroke()

  // Pick from the secondary canvas to match color values:
  const secondaryCtx = drawZigzag.secondaryCanvas.getContext('2d')
  drawZigzag.secondaryCanvas.width = points.length

  secondaryCtx.clearRect(0, 0, points.length, 1)
  for (let i = 0; i < points.length; i++) {
    secondaryCtx.drawImage(ctx.canvas,
      points[i].x, points[i].y, 1, 1,
      i, 0, 1, 1,
    )
  }

  const imageData = secondaryCtx.getImageData(0, 0, points.length, 1).data
  const colors = []

  for(let i = 0; i < imageData.length; i += 4) {
    colors.push([imageData[i],imageData[i+1],imageData[i+2],imageData[i+3]])
  }

  updateShadowColors(colors)

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

function lerpGradientRGB(t) {
  let startHue = gradientStart.hue
  if(gradientEnd.hue - gradientStart.hue > 180) {
    startHue = 360 + startHue
  }

  const startRGB = HSLtoRGB(startHue,
    gradientStart.saturation, gradientStart.lightness)
  const endRGB = HSLtoRGB(gradientEnd.hue,
    gradientEnd.saturation, gradientEnd.lightness)

  return {
    r: startRGB.r * (1-t) + endRGB.r * t,
    g: startRGB.g * (1-t) + endRGB.g * t,
    b: startRGB.b * (1-t) + endRGB.b * t,
  }
}

function HSLtoRGB(h,s,l) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c/2

  let r = 0, g = 0, b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return {r,g,b}
}

function RGBtoHSL(r,g,b) {
  r /= 255
  g /= 255
  b /= 255

  const cmin = Math.min(r,g,b)
  const cmax = Math.max(r,g,b)
  const delta = cmax - cmin
  let h = 0, s = 0, l = 0

  if (delta == 0) {
    h = 0
  }
  else if (cmax == r) {
    h = ((g - b) / delta) % 6
  }
  else if (cmax == g) {
    h = (b - r) / delta + 2
  }
  else {
    h = (r - g) / delta + 4
  }

  h = Math.round(h * 60)
    
  if (h < 0) {
    h += 360
  }

  l = (cmax + cmin) / 2

  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    
  s = +(s * 100).toFixed(2)
  l = +(l * 100).toFixed(2)

  return {h, s, l}
}

function updateShadowColors (colors) {
  const images = [...document.querySelectorAll('.project-container li img')]
  const shadows = [...document.querySelectorAll('.image-shadow')]
  const shadowMultiplier = document.querySelector('#shadow-multiplier').value

  let index = 0
  for(const color of colors) {
    const hsl = RGBtoHSL(color[0],color[1],color[2])

    shadows[index].style.setProperty('--fade-shadow-color',
      `hsl(${hsl.h} ${hsl.s * 0.5}% ${hsl.l * shadowMultiplier * 0.5}%)`)
    shadows[index].style.setProperty('--reveal-shadow-color',
      `hsl(${hsl.h} ${hsl.s}% ${hsl.l * shadowMultiplier}%)`)
    images[index].style.setProperty('--border-color',
      `hsl(${hsl.h} ${hsl.s/2 + 15}% ${hsl.l/2 + 25}%)`)

    index++
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

initModal()
function initModal () {
  document.addEventListener('click', event => {
    if(!event.target.closest('.modal')) {
      closeModal()
    }
  })

  const modal = document.querySelector('#modal-dialog')

  for(const a of document.querySelectorAll('.project-container a')) {
    const li = a.closest('li')
    const template = li.querySelector('template')

    // Skip over modal candidates which do not have a template defined:
    if (!template) {
      continue
    }

    // Otherwise, attach modal dialogs as a progressive enhancement:
    a.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()

      clearTimeout(initModal.clearId)

      const bounds = event.target.getBoundingClientRect()
      const xCenter = innerWidth / 2
      const yCenter = innerHeight / 2
      
      modal.style.top = bounds.top + 0.5 * bounds.height + 'px'
      modal.style.left = bounds.left + 0.5 * bounds.width + 'px'
      modal.style.width = '0px'
      modal.style.height = '0px'
      modal.style.display = 'unset'
      modal.style.opacity = 0

      requestAnimationFrame(() => {
        modal.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        modal.style.left = xCenter + 'px'
        modal.style.top = yCenter + 'px'
        modal.style.width = 'var(--modal-width)'
        modal.style.height = 'var(--modal-height)'
        modal.style.opacity = 1
      })

      modal.innerHTML = ''

      initModal.clearId = setTimeout(() => {
        const clone = template.content.cloneNode(true)
        const closeBox = document.createElement('button')
        const modalContent = document.createElement('div')

        closeBox.classList.add('modal-close')
        closeBox.addEventListener('click', closeModal)

        modalContent.classList.add('modal-content')
        modalContent.append(clone)

        modal.append(closeBox)
        modal.append(modalContent)

      }, 500)
    })

  }
}

function closeModal () {
  const modal = document.querySelector('#modal-dialog')
  modal.style.display = 'none'
  modal.style.transition = 'none'
}