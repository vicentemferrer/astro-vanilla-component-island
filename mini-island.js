class MiniIsland extends HTMLElement {
  static tagName = 'mini-island'
  static attributes = {
    dataIsland: 'data-island'
  }

  async connectedCallback() {
    await this.hydrate()
  }

  async hydrate() {
    const conditions = []

    const conditionAttributesMap = Conditions.getConditions(this)

    for (const condition in conditionAttributesMap) {
      const conditionFn = Conditions.map[condition]

      if (conditionFn) {
        const conditionPromise = conditionFn(conditionAttributesMap[condition], this)
        conditions.push(conditionPromise)
      }
    }

    await Promise.all(conditions)

    const relevantChildTemplates = this.getTemplates()

    this.replaceTemplates(relevantChildTemplates)
  }

  getTemplates() {
    return this.querySelectorAll(`template[${MiniIsland.attributes.dataIsland}]`)
  }

  replaceTemplates(templates) {
    for (const node of templates) {
      node.replaceWith(node.content)
    }
  }
}

class Conditions {
  static map = {
    idle: Conditions.waitForIdle,
    visible: Conditions.waitForVisible,
    media: Conditions.waitForMedia
  }

  static waitForIdle() {
    const onLoad = new Promise((resolve) => {
      if (document.readyState !== "complete") {
        window.addEventListener('load', () => {
          resolve()
        }, { once: true })
      } else {
        resolve()
      }
    })

    const onIdle = new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          resolve()
        })
      } else {
        resolve()
      }
    })

    return Promise.all([onIdle, onLoad])
  }

  static waitForVisible(noop, el) {
    if (!("IntersectionObserver" in window)) {
      return
    }

    return new Promise((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        const [entry] = entries

        if (entry.isIntersecting) {
          observer.unobserve(entry.target)
          resolve()
        }
      })

      observer.observe(el)
    })
  }

  static waitForMedia(query) {
    let queryList = {
      matches: true
    }

    if (query && 'matchMedia' in window) {
      queryList = window.matchMedia(query)
    }

    if (queryList.matches) {
      return
    }

    return new Promise((resolve) => {
      queryList.addListener((e) => {
        if (e.matches) {
          resolve()
        }
      })
    })
  }

  static hasConditions(node) {
    const conditionAttributesMap = Conditions.getConditions(node)

    return Object.keys(conditionAttributesMap).length > 0
  }

  static getConditions(node) {
    const result = {}

    for (const condition of Object.keys(Conditions.map)) {
      if (node.hasAttribute(`client:${condition}`)) {
        result[condition] = node.getAttribute(`client:${condition}`)
      }
    }

    return result
  }
}

if ('customElements' in window) {
  window.customElements.define(MiniIsland.tagName, MiniIsland)
} else {
  console.error('Island cannot be initiated because Window.customElements is unavailable.')
}