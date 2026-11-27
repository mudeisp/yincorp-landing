import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const editions = {
  travertino: { face: '#3b3936', wire: '#9c6636', shadow: 0.32 },
  obsidian: { face: '#c4beb2', wire: '#e7bc7c', shadow: 0.48 },
  wireframe: { face: '#c4beb2', wire: '#e7bc7c', shadow: 0 },
};
const depth = 0.067;
const clamp = THREE.MathUtils.clamp;
const ease = (time, start, end) => THREE.MathUtils.smoothstep(time, start, end);

function studio(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.19, 0.17, 0.15);
  const panels = [
    [[-1.9, 2.3, 3.8], [6.4, 2.2], [5.1, 4.6, 3.9]],
    [[1.3, -1.1, 3], [5, 0.42], [3.4, 3.1, 2.7]],
    [[3.7, 0.3, 1.5], [1.5, 5], [2.2, 2.4, 2.65]],
    [[-4, 0, -1], [2.5, 4], [1.4, 1.1, 0.8]],
  ];
  for (const [position, size, color] of panels) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(...size),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), side: THREE.DoubleSide }),
    );
    panel.position.set(...position);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(room, 0.034, 0.1, 15);
  } finally {
    generator.dispose();
    for (const panel of room.children) {
      panel.geometry.dispose();
      panel.material.dispose();
    }
  }
}

function material(color, metalness, roughness, reveal, gold) {
  const surface = new THREE.MeshPhysicalMaterial({
    color, metalness, roughness, clearcoat: gold ? 0.22 : 0.13,
    clearcoatRoughness: 0.34, anisotropy: gold ? 0.45 : 0.06,
    anisotropyRotation: Math.PI * 0.48, envMapIntensity: 0.95,
  });
  surface.onBeforeCompile = (shader) => {
    shader.uniforms.reveal = reveal;
    shader.vertexShader = 'varying vec3 logoPoint;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nlogoPoint = position;',
    );
    shader.fragmentShader = 'varying vec3 logoPoint; uniform float reveal;\n' +
      shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
        #include <clipping_planes_fragment>
        if (logoPoint.x > reveal) discard;
      `).replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        float metallicGrain = sin(logoPoint.y * 910.0 + sin(logoPoint.x * 147.0) * 0.65);
        float grainVisibility = 1.0 - smoothstep(0.2, 2.2, fwidth(logoPoint.y * 910.0));
        roughnessFactor += metallicGrain * grainVisibility * ${gold ? '0.078' : '0.025'};
      `).replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float sweep = exp(-pow((logoPoint.x - reveal + 0.023) * 27.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.67, 0.32) * sweep * 0.85;
      `);
  };
  surface.customProgramCacheKey = () => gold ? 'brushed-gold' : 'satin-graphite';
  return surface;
}

function makeShadow(outline, offsets) {
  const image = document.createElement('canvas');
  image.width = 768;
  image.height = 320;
  const context = image.getContext('2d');
  context.shadowColor = '#271b12';
  context.shadowBlur = 15;
  context.shadowOffsetX = image.width + 4;
  context.shadowOffsetY = 8;
  outline.glyphs.forEach(([, path], index) => {
    context.setTransform(245, 0, 0, 245, 384 + offsets[index] * 245 - image.width, 162);
    context.fill(new Path2D(path));
  });
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createLogoScene(canvas, outline, tracking) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'low-power',
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const logo = new THREE.Group();
  scene.add(logo);
  const reveal = { value: 3 };
  const gold = material('#b89a5b', 0.91, 0.29, reveal, true);
  const graphite = material(editions.travertino.face, 0.44, 0.46, reveal, false);
  const wire = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
  const origin = new THREE.LineBasicMaterial({ color: '#bf884b' });
  const meshes = new THREE.Group();
  const wires = new THREE.Group();
  const disposables = [gold, graphite, wire, origin];
  let environment;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const resource of disposables) resource.dispose();
    environment?.dispose();
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  };

  try {
    environment = studio(renderer);
    scene.environment = environment.texture;
    const spotlight = new THREE.DirectionalLight('#ffe5c5', 2.15);
    spotlight.position.set(-2, 3, 4);
    const fill = new THREE.DirectionalLight('#e9efff', 0.95);
    fill.position.set(2, -1, 3);
    scene.add(spotlight, fill);
    const width = outline.advance + tracking * outline.glyphs.length;
    const offsets = outline.glyphs.map(([x], index) => x + tracking * index - width / 2);
    const shadowTexture = makeShadow(outline, offsets);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false,
    });
    const shadowGeometry = new THREE.PlaneGeometry(768 / 245, 320 / 245);
    disposables.push(shadowTexture, shadowGeometry, shadowMaterial);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.set(0.028, 2 / 245 - 0.027, -0.083);
    const sweepGeometry = new THREE.PlaneGeometry(0.16, 0.84);
    const sweepMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { opacity: { value: 0 } },
      vertexShader: `
        varying vec2 uvPoint;
        void main() {
          uvPoint = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 uvPoint;
        uniform float opacity;
        void main() {
          float center = abs(uvPoint.x - 0.5);
          float profile = exp(-center * 14.0) * (1.0 - smoothstep(0.26, 0.5, center));
          float taper = pow(sin(uvPoint.y * 3.14159), 2.0);
          gl_FragColor = vec4(1.0, 0.76, 0.43, profile * taper * opacity);
        }
      `,
    });
    const beam = new THREE.Mesh(sweepGeometry, sweepMaterial);
    beam.position.set(0, 0.19, 0.051);
    disposables.push(sweepGeometry, sweepMaterial);
    logo.add(shadow, meshes, wires, beam);
    const trace = [];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg">' +
      outline.glyphs.map(([, path]) => '<path d="' + path + '"/>').join('') + '</svg>';
    new SVGLoader().parse(svg).paths.forEach((path, index) => {
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth, curveSegments: 10, bevelEnabled: true, bevelSize: 0.0034,
          bevelThickness: 0.0055, bevelSegments: 2,
        });
        geometry.rotateX(Math.PI);
        geometry.translate(offsets[index], 0, depth / 2);
        const edges = new THREE.EdgesGeometry(geometry, 23);
        disposables.push(geometry, edges);
        meshes.add(new THREE.Mesh(geometry, index ? graphite : gold));
        const lines = new THREE.LineSegments(edges, wire);
        wires.add(lines);
        if (index !== 0) continue;
        for (const contour of [shape, ...shape.holes]) {
          const points = contour.getSpacedPoints(110).map((point) =>
            new THREE.Vector3(point.x + offsets[index], -point.y, depth / 2 + 0.008),
          );
          const contourGeometry = new THREE.BufferGeometry().setFromPoints(points);
          disposables.push(contourGeometry);
          const line = new THREE.Line(contourGeometry, origin);
          trace.push({ line, count: points.length });
          logo.add(line);
        }
      }
    });
    if (meshes.children.length < 7) throw new Error('Incomplete wordmark geometry');
    let cssWidth, cssHeight, dpr, currentEdition = editions.travertino;

    return {
      setEdition(name) {
        if (!Object.hasOwn(editions, name)) return false;
        currentEdition = editions[name];
        graphite.color.set(currentEdition.face);
        wire.color.set(currentEdition.wire);
        return true;
      },

      render({ width, height, pixelsPerEm, baseline, x, y, time, pointer, intensity, dock, quality }) {
        if (width !== cssWidth || height !== cssHeight || dpr !== quality) {
          dpr = quality;
          cssWidth = width;
          cssHeight = height;
          renderer.setPixelRatio(dpr);
          renderer.setSize(width, height, false);
        }
        camera.left = -width / (2 * pixelsPerEm);
        camera.right = -camera.left;
        camera.top = height / (2 * pixelsPerEm);
        camera.bottom = -camera.top;
        camera.position.z = 4;
        camera.near = 0.1;
        camera.far = 10;
        camera.updateProjectionMatrix();

        const sweep = ease(time, 2.05, 3.9);
        const wireOnly = currentEdition === editions.wireframe;
        const orbit = Math.sin(Math.PI * ease(time, 0.8, 4.75));
        const motion = intensity * (1 - 0.85 * dock);
        const signature = ease(time, 3.8, 4.8);
        logo.rotation.set((pointer.y * 0.11 - orbit * 0.115) * motion,
          (pointer.x * 0.19 + orbit * 0.245) * motion, 0);
        const zoom = 1 - 0.055 * (1 - signature) * motion;
        logo.scale.setScalar(zoom);
        logo.position.set(x + pointer.x * motion * 0.021, baseline + y - pointer.y * motion * 0.014, 0);
        scene.environmentRotation.y = (pointer.x * 0.65 + Math.sin(time * 0.43) * 0.09) * motion;
        spotlight.position.x = -2 + 1.7 * pointer.x * motion;
        trace.forEach(({ line, count }) => {
          line.visible = time < 1.42;
          line.geometry.setDrawRange(0, Math.floor(count * ease(time, 0.05, 1.23)));
        });
        meshes.visible = !wireOnly && sweep > 0;
        reveal.value = sweep >= 1 ? 4 : THREE.MathUtils.lerp(-1.4, 1.4, sweep);
        beam.visible = !wireOnly && sweep > 0 && sweep < 1;
        beam.position.x = reveal.value;
        sweepMaterial.uniforms.opacity.value = 0.63 * Math.sin(Math.PI * sweep);
        wires.visible = time >= 0.82 && (wireOnly || sweep < 1);
        wires.scale.z = 0.08 + 0.92 * ease(time, 0.85, 2.12);
        wire.opacity = ease(time, 0.82, 1.9) * (wireOnly ? 0.85 : 0.64 * (1 - sweep));
        shadow.visible = !wireOnly && sweep > 0;
        shadowMaterial.opacity = currentEdition.shadow * sweep * (1 - dock * 0.76);
        renderer.render(scene, camera);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
