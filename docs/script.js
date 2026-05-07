// ── Sidebar Toggle (Mobile) ─────────────────────
const menuToggle = document.getElementById('menuToggle')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('sidebarOverlay')

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open')
  overlay.classList.toggle('active')
})

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open')
  overlay.classList.remove('active')
})

// Close sidebar on link click (mobile)
document.querySelectorAll('.sidebar-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        sidebar.classList.remove('open')
        overlay.classList.remove('active')
      }, 80)
    }
  })
})

// ── Search ──────────────────────────────────────
const searchInput = document.getElementById('searchInput')

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim()
  const links = document.querySelectorAll('.sidebar-link')

  links.forEach((link) => {
    const text = link.textContent.toLowerCase()
    const section = link.closest('.sidebar-section')
    if (query === '') {
      link.style.display = ''
      if (section) section.style.display = ''
    } else if (text.includes(query)) {
      link.style.display = ''
      if (section) section.style.display = ''
    } else {
      link.style.display = 'none'
    }
  })
})

// ── Active Link on Scroll ───────────────────────
const sections = document.querySelectorAll('.endpoint-section')
const navLinks = document.querySelectorAll('.sidebar-link')

const observerOptions = {
  root: null,
  rootMargin: '-80px 0px -40% 0px',
  threshold: 0,
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.id
      navLinks.forEach((link) => {
        link.classList.remove('active')
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active')
        }
      })
    }
  })
}, observerOptions)

sections.forEach((section) => observer.observe(section))

// ── Copy Button ─────────────────────────────────
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = btn.closest('.code-block').querySelector('pre').textContent
    navigator.clipboard.writeText(code).then(() => {
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => (btn.textContent = orig), 1500)
    })
  })
})

// ── Wrap Tables for Responsive Scroll ───────────
document.querySelectorAll('.param-table, .error-table').forEach((table) => {
  if (!table.parentElement.classList.contains('table-wrapper')) {
    const wrapper = document.createElement('div')
    wrapper.classList.add('table-wrapper')
    table.parentNode.insertBefore(wrapper, table)
    wrapper.appendChild(table)
  }
})

// ── Download Markdown ───────────────────────────
document.getElementById('downloadMd').addEventListener('click', (e) => {
  e.preventDefault()
  const link = document.createElement('a')
  link.href = 'api.md'
  link.download = 'TDARAB-API-Documentation.md'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
})
