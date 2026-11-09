// post.js — cheap soft focus + lamp bloom, done after the normal (tone-mapped) render:
// copy the frame to a texture, downsample twice (1/4, 1/8), then draw mix(sharp, blurred, focus) + bloom.
import * as THREE from 'three';
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DOWN = `uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tex, vUv + texel*vec2(-1.0,-1.0)) + texture2D(tex, vUv + texel*vec2(1.0,-1.0)) + texture2D(tex, vUv + texel*vec2(-1.0,1.0)) + texture2D(tex, vUv + texel*vec2(1.0,1.0)); gl_FragColor = c * 0.25; }`;
const COMP = `uniform sampler2D tSharp; uniform sampler2D tBlur; uniform sampler2D tBlur2; uniform float focus; uniform float bloom; uniform float thr; varying vec2 vUv;
  void main(){ vec3 s = texture2D(tSharp, vUv).rgb; vec3 b = texture2D(tBlur, vUv).rgb; vec3 b2 = texture2D(tBlur2, vUv).rgb;
    vec3 c = mix(s, mix(b, b2, 0.5), focus);
    vec3 g = max(b2 - vec3(thr), 0.0) + 0.5 * max(b - vec3(thr), 0.0);
    c += g * bloom; gl_FragColor = vec4(c, 1.0); }`;
export function makePost(renderer, W, H) {
  const full = new THREE.FramebufferTexture(W, H); full.minFilter = full.magFilter = THREE.LinearFilter;
  const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const rtA = new THREE.WebGLRenderTarget(W / 4, H / 4, opt), rtB = new THREE.WebGLRenderTarget(W / 8, H / 8, opt);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const sc = new THREE.Scene(); sc.add(quad); quad.frustumCulled = false;
  const down = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, texel: { value: new THREE.Vector2() } }, vertexShader: VS, fragmentShader: DOWN, depthTest: false, depthWrite: false });
  const comp = new THREE.ShaderMaterial({ uniforms: { tSharp: { value: full }, tBlur: { value: rtA.texture }, tBlur2: { value: rtB.texture }, focus: { value: 0 }, bloom: { value: 0 }, thr: { value: 0.88 } }, vertexShader: VS, fragmentShader: COMP, depthTest: false, depthWrite: false });
  const v0 = new THREE.Vector2(0, 0);
  return function post(focus, bloom) {
    if (focus < 0.01 && bloom < 0.01) return;
    renderer.copyFramebufferToTexture(full, v0);
    const ac = renderer.autoClear; renderer.autoClear = false;
    quad.material = down; down.uniforms.tex.value = full; down.uniforms.texel.value.set(1.5 / W, 1.5 / H); renderer.setRenderTarget(rtA); renderer.render(sc, cam);
    down.uniforms.tex.value = rtA.texture; down.uniforms.texel.value.set(1.5 / (W / 4), 1.5 / (H / 4)); renderer.setRenderTarget(rtB); renderer.render(sc, cam);
    renderer.setRenderTarget(null); quad.material = comp; comp.uniforms.focus.value = focus; comp.uniforms.bloom.value = bloom; renderer.render(sc, cam);
    renderer.autoClear = ac;
  };
}
