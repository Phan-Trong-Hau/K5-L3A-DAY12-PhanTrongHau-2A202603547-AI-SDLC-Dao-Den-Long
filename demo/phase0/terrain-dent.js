import * as THREE from 'three'

export const stompRadius = 3.3
const maxDepth = 0.42
const recoveryTicks = 145

export function createTerrainDent(scenery, grass, clearing) {
  const cut = { value: new THREE.Vector4(0, 0, 0, 0) }
  const geometry = new THREE.PlaneGeometry(2, 2, 30, 30)
  geometry.rotateX(-Math.PI / 2)
  const vertices = geometry.attributes.position
  const clearingOffset = { value: new THREE.Vector2() }
  const onBase = { value: 1 }
  const patchRadius = { value: stompRadius }
  const crackReach = { value: 0 }
  const depthUniform = { value: 0 }
  const clearingTint = { value: new THREE.Color(clearing) }
  const material = new THREE.MeshLambertMaterial({ color: grass })
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { clearingOffset, onBase, depthUniform, clearingTint, patchRadius, crackReach })
    shader.vertexShader = 'varying vec2 dentPosition;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ndentPosition = position.xz;',
    )
    shader.fragmentShader = `
      varying vec2 dentPosition;
      uniform vec3 clearingTint;
      uniform vec2 clearingOffset;
      uniform float onBase, depthUniform, patchRadius, crackReach;

      float crackJitter(float index, float segment) {
        return fract(sin(index * 37.91 + segment * 94.23) * 17231.128) - 0.5;
      }
      float crackMask(vec2 point, float range) {
        float sector = (atan(point.y, point.x) + 3.14159265) * 1.27323954;
        float index = floor(sector + 0.5);
        float axis = fract(sector + 0.5) - 0.5;
        float segment = range * 17.0;
        float offset = mix(crackJitter(index, floor(segment)),
          crackJitter(index, floor(segment) + 1.0), fract(segment)) * 0.48;
        float lengthLimit = (0.67 + 0.27 * (0.5 + crackJitter(index, 9.0))) * crackReach;
        float seam = abs(axis - offset) * max(range, 0.12);
        float branch = abs(axis - offset - (range - 0.25) * (mod(index, 2.0) * 2.0 - 1.0)) * range;
        float main = 1.0 - smoothstep(0.013, 0.027, seam);
        float fork = (1.0 - smoothstep(0.008, 0.018, branch)) *
          smoothstep(0.25, 0.37, range) * (1.0 - smoothstep(lengthLimit * 0.76, lengthLimit * 0.9, range));
        return max(main, fork) * smoothstep(0.06, 0.14, range) *
          (1.0 - smoothstep(lengthLimit * 0.88, lengthLimit, range));
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float ring = length(dentPosition);
      if (ring > 1.0) discard;
      vec2 sandPosition = dentPosition * patchRadius + clearingOffset;
      if (onBase > 0.5 && length(sandPosition) < 5.0) diffuseColor.rgb = clearingTint;
      diffuseColor.rgb *= 1.0 - 0.46 * depthUniform * (1.0 - smoothstep(0.1, 1.0, ring));
      float crack = crackMask(dentPosition, ring);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.032, 0.013, 0.012),
        crack * depthUniform * 0.91);
    `)
  }

  const patch = new THREE.Mesh(geometry, material)
  patch.name = 'stomp-terrain-dent'
  patch.visible = false
  scenery.add(patch)
  let started = -Infinity
  let fullDepth = maxDepth

  return {
    cutSurface(surfaceMaterial, heightBand = 0.095) {
      surfaceMaterial.onBeforeCompile = shader => {
        shader.uniforms.stompCut = cut
        shader.uniforms.stompCutHeight = { value: heightBand }
        shader.vertexShader = 'varying vec3 originalGround;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec4 groundVertex = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            groundVertex = instanceMatrix * groundVertex;
          #endif
          originalGround = (modelMatrix * groundVertex).xyz;
          `,
        )
        shader.fragmentShader = 'varying vec3 originalGround; uniform vec4 stompCut; uniform float stompCutHeight;\n' +
          shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
            #include <clipping_planes_fragment>
            if (stompCut.w > 0.0 && abs(originalGround.y - stompCut.y) < stompCutHeight &&
                distance(originalGround.xz, stompCut.xz) < stompCut.w) discard;
          `)
      }
    },
    start(x, y, z, center, size, tick, reducedMotion) {
      started = tick
      fullDepth = maxDepth * (reducedMotion ? 0.55 : 1)
      clearingOffset.value.set(x - center, z)
      onBase.value = y < 0.02 ? 1 : 0
      patch.position.set(x, y + 0.008, z)
      patch.scale.set(size, 1, size)
      patchRadius.value = size
      cut.value.set(x, y, z, size)
    },
    update(tick) {
      const age = tick - started
      patch.visible = age >= 0 && age < recoveryTicks
      if (!patch.visible) {
        cut.value.w = 0
        return
      }
      const strength = Math.min(1, (age + 1) / 5) * (1 - (age / recoveryTicks) ** 1.8)
      depthUniform.value = strength
      crackReach.value = THREE.MathUtils.clamp((age + 1) / 15, 0.18, 1)
      for (let index = 0; index < vertices.count; index++) {
        const x = vertices.getX(index)
        const z = vertices.getZ(index)
        const shell = Math.min(1, Math.hypot(x, z))
        const angle = Math.atan2(z, x)
        const facet = 1 + Math.sin(angle * 5) * shell * 0.24
        vertices.setY(index, -fullDepth * strength * facet * (1 - shell * shell) ** 2)
      }
      vertices.needsUpdate = true
      geometry.computeVertexNormals()
    },
  }
}
