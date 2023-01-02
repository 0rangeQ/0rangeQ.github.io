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

document.addEventListener('DOMContentLoaded', () => {
  safariTest.innerHTML += '<br>DOMContentLoaded triggered'
})

function initialize () {
  safariTest.innerHTML += '<br>initialize() executing'
  const slideParallaxList =
    document.querySelectorAll('.slide-parallax')
  const observerTargets =
    document.querySelectorAll('.shade-in-shadow')

  for (const e of slideParallaxList) {
    const parsedEntry = {
      element: e,
      shift: parseFloat(
              getComputedStyle(e).getPropertyValue('--parallax-scroll')
              .trim()
              .match(/\d*/)[0]),
      units: getComputedStyle(e).getPropertyValue('--parallax-scroll')
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
