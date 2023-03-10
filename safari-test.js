const staticParallaxList = []
const observer = new IntersectionObserver(
  handleIntersections,
  { threshold: [0.7] })
const log = console.log.bind(console)
console.clear()

const safariTest = document.getElementById('safari-test')
safariTest.innerHTML += '<br>Initial script execution'

if (document.readyState === 'loading') {
  safariTest.innerHTML += '<br>readyState was "loading"'
  document.addEventListener('load', initialize)
} else {
  safariTest.innerHTML += '<br>readyState was not "loading"'
  initialize()
}

function initialize () {
  try {
  safariTest.innerHTML += '<br>initialize() executing'
  const slideParallaxList =
    document.querySelectorAll('.slide-parallax')
  const observerTargets =
    document.querySelectorAll('.shade-in-shadow')

  safariTest.innerHTML += `<br>found ${slideParallaxList.length} parallax items`
  safariTest.innerHTML += `<br>found ${observerTargets.length} shade-in items`

  for (const e of slideParallaxList) {
    if (e) {
      safariTest.innerHTML += `<br> e was truthy`
      if (getComputedStyle(e)) {
        safariTest.innerHTML += `<br> getComputedStyle result was truthy`
        if (getComputedStyle(e).getPropertyValue('--parallax-scroll')) {
          safariTest.innerHTML += `<br>...getPropertyValue --parallax-scroll was truthy`
        } else {
          safariTest.innerHTML += `<br>...getPropertyValue --parallax-scroll was FALSY`
        }
      } else {
        safariTest.innerHTML += `<br> getComputedStyle result was FALSY`
      }
    } else {
      safariTest.innerHTML += `<br> e was FALSY`
    }

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

    safariTest.innerHTML += `<br>Pushing parallax element with: shift=${parsedEntry.shift}, units=${parsedEntry.units}`
    staticParallaxList.push(parsedEntry)
  }

  for (const e of observerTargets) {
    safariTest.innerHTML += '<br>Adding observer target...'
    observer.observe(e)
  }

  window.addEventListener('resize', drawZigzag)
  drawZigzag()

  requestAnimationFrame(animateParallax)

  } catch(e) {
    safariTest.innerHTML += `<br>Caught error: ` + e.message
  }
}

function drawZigzag () {
  safariTest.innerHTML += '<br>drawZigzag() called...'
  const canvas = document.getElementById('project-canvas')
  const ctx = canvas.getContext('2d')
  const realWidth = canvas.offsetWidth
  const realHeight = canvas.offsetHeight

  canvas.width = realWidth;
  canvas.height = realHeight;
  
  const canvasRect = canvas.getBoundingClientRect()
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasRect.height)
  gradient.addColorStop(0, 'rgba(10,10,20,0.15')
  gradient.addColorStop(1, 'rgba(40, 16, 61, 0.75)')

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
  }

  ctx.stroke()

  function relativeCenter (element) {
    const rect = element.getBoundingClientRect()

    return [rect.left + rect.width / 2 - canvasRect.left,
            rect.top + rect.height / 2 - canvasRect.top]
  }
}

function handleIntersections (entries, observer) {
  for (const e of entries) {
    if (e.isIntersecting) {
        e.target.classList.add('shadow-reveal')
    } else {
      e.target.classList.remove('shadow-reveal')
    }
  }
}

function animateParallax (timestamp) {
  // animateParallax.lastScrollY ??= scrollY

  // The commented optimization works, but negatively impacts
  // the smoothness of the animation deceleration.
  // if (animateParallax.lastScrollY !== scrollY) {
    for (const e of staticParallaxList) {
      // Compute progress scalar (0 ... 1.0) for element scroll
      // 0.0 -> top of element just reached bottom of viewport
      // 1.0 -> bottom of element just reached top of viewport
      const rect = e.element.getBoundingClientRect()
      const s = rect.bottom / (window.innerHeight + rect.height)
      // const yMove = (-(1-s) * shift)
      const yMove = (-(0.5-s) * e.shift)
      e.element.style['transform'] = 
        `translate(0px, ${yMove}${e.units})`
      //(-(1-s) * shift * rect.height) + 'px'
    }

  // animateParallax.lastScrollY = scrollY

  requestAnimationFrame(animateParallax)
}
