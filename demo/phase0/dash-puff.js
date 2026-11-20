import * as THREE from 'three'

const lifetime = 33

export function createDashPuffEffect(scene) {
  const effects = new THREE.Group()
  effects.name = 'dash-puff-effects'
  scene.add(effects)

  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const slots = Array.from({ length: 4 }, () => {
    const root = new THREE.Group()
    const material = new THREE.MeshBasicMaterial({
      color: '#bdcf8b', transparent: true, depthWrite: false,
    })
    for (let index = 0; index < 4; index++) {
      root.add(new THREE.Mesh(geometry, material))
    }
    root.visible = false
    effects.add(root)
    return { root, material }
  })
  let next = 0

  return {
    emit(player, tick) {
      const slot = slots[next++ % slots.length]
      slot.root.position.set(player.x - player.dashX * 0.8, player.y + 0.68, player.z - player.dashZ * 0.8)
      slot.root.rotation.y = Math.atan2(player.dashX, player.dashZ)
      slot.started = tick
      slot.root.visible = true
    },
    update(tick) {
      for (const { root, material, started } of slots) {
        if (!root.visible) continue
        const progress = (tick - started) / lifetime
        root.visible = progress < 1
        if (!root.visible) continue
        material.opacity = 0.68 * (1 - progress) ** 1.5
        for (const [index, puff] of root.children.entries()) {
          const ripple = index - 1.5
          puff.position.set(ripple * (0.065 + progress * 0.2),
            progress * (0.46 + index * 0.10), -index * 0.15 - progress * (0.52 + index * 0.22))
          puff.scale.setScalar(0.13 + index * 0.037 + 0.42 * progress)
        }
      }
    },
    clear() {
      for (const { root } of slots) root.visible = false
      next = 0
    },
  }
}
