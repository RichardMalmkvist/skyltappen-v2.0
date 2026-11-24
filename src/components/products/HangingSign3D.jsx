import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {hangingFaceTexture} from './hangingFaceTexture';
import {hangingSign3DLayout} from '../../data/hangingSign3D';
import {hangingFaceAppearance} from '../../data/additionalHangingArticles';

function disposeModel(model) {
  const geometries = new Set(), materials = new Set();
  model.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of [].concat(node.material || [])) materials.add(material);
  });
  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
}

function createModel(base, layout, textures) {
  const model = new THREE.Group();
  const wireMaterial = new THREE.MeshLambertMaterial({color:0x999999});
  function addWires(length, center) {
    const geometry = new THREE.CylinderGeometry(.00045,.00045,length,8);
    for (const x of [-layout.anchor, layout.anchor]) {
      const wire = new THREE.Mesh(geometry, wireMaterial);
      wire.position.set(x, center, 0);
      model.add(wire);
    }
  }
  addWires(layout.suspension, (layout.height - layout.suspension) / 2);
  layout.panels.forEach(({product, size, center}, index) => {
    const width = size.width / 1000, height = size.height / 1000;
    const panel = new THREE.Group();
    panel.position.y = center;
    model.add(panel);
    const geometry = base.clone().scale(width,height/.093,1);
    geometry.computeVertexNormals();
    const body = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
      color:0xffffff, emissive:0xffffff, emissiveIntensity:.12, side:THREE.DoubleSide
    }));
    panel.add(body);
    const faceGeometry = new THREE.PlaneGeometry(width,height);
    for (const [side, texture] of textures[index].entries()) {
      const face = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
        color:0xfafafa, map:texture, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4
      }));
      face.position.z = side === 0 ? .00165 : -.00165;
      face.rotation.y = side === 0 ? 0 : Math.PI;
      panel.add(face);
    }
    if (!hangingFaceAppearance(product).isGreen && !hangingFaceAppearance(product,true).isGreen) {
      const endGeometry = new THREE.BoxGeometry(.004,height,.0032);
      const endMaterial = new THREE.MeshBasicMaterial({color:0x111111});
      for (const x of [-width/2+.002,width/2-.002]) {
        const cap = new THREE.Mesh(endGeometry,endMaterial);
        cap.position.x = x;
        panel.add(cap);
      }
    }
    if (index < layout.panels.length - 1 && layout.gap > 0) {
      addWires(layout.gap, center - (height + layout.gap) / 2);
    }
  });
  return model;
}

export default function HangingSign3D({sourceRef,form,product,onUnavailable}) {
  const host = useRef(null), shadow = useRef(null), api = useRef(null), failure = useRef(onUnavailable);
  failure.current = onUnavailable;
  const [loaded,setLoaded] = useState(false), [panelCount,setPanelCount] = useState(0);

  useEffect(() => {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32,1,.01,100);
    const container = host.current, abort = new AbortController();
    let renderer, controls, observer, base, model, layout, bounds, frame = 0;
    let fittedDistance = 0;
    function schedule() {
      if (abort.signal.aborted || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const moving = controls.update();
        if (model) {
          renderer.render(scene,camera);
          renderer.domElement.style.visibility = 'visible';
          const points = [];
          for (const x of [bounds.min.x,bounds.max.x]) {
            for (const y of [bounds.min.y,bounds.max.y]) {
              for (const z of [bounds.min.z,bounds.max.z]) points.push(new THREE.Vector3(x,y,z).project(camera));
            }
          }
          const w = container.clientWidth, h = container.clientHeight;
          const left = (Math.min(...points.map(p=>p.x))+1)*w/2;
          const right = (Math.max(...points.map(p=>p.x))+1)*w/2;
          const bottom = (1-Math.min(...points.map(p=>p.y)))*h/2;
          Object.assign(shadow.current.style,{left:(left+right)/2+'px',top:Math.min(bottom+52,h-34)+'px',width:(right-left)*.65+'px',opacity:'.12'});
        }
        if (moving) schedule();
      });
    }
    function fit(reset = false) {
      if (!layout) return;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const distance = Math.max(layout.width / camera.aspect, layout.height) / (2*tan*.68);
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      if (reset || !fittedDistance) {
        camera.position.set(.12,.12,1).setLength(distance);
      } else {
        camera.position.multiplyScalar(distance / fittedDistance);
      }
      controls.maxDistance = Math.max(8, distance * 3);
      camera.far = Math.max(100, controls.maxDistance * 2);
      camera.updateProjectionMatrix();
      fittedDistance = distance;
      controls.update();
      controls.enableDamping = damping;
      schedule();
    }
    function handleKey(event) {
      if (event.key === 'Home') {
        event.preventDefault();
        fit(true);
      } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const orbit = new THREE.Spherical().setFromVector3(camera.position);
        orbit.theta += event.key === 'ArrowLeft' ? -.12 : event.key === 'ArrowRight' ? .12 : 0;
        orbit.phi += event.key === 'ArrowUp' ? -.12 : event.key === 'ArrowDown' ? .12 : 0;
        camera.position.setFromSpherical(orbit.makeSafe());
        controls.update();
        schedule();
      }
    }
    async function start() {
      try {
        renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0xffffff,0);
        renderer.domElement.style.visibility = 'hidden';
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute('aria-label','3D-vy av pendlade skyltar. Dra för att rotera, nyp för att zooma. Home återställer vyn.');
        renderer.domElement.addEventListener('keydown',handleKey);
        container.append(renderer.domElement);
        controls = new OrbitControls(camera,renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = .12;
        controls.minDistance = .4;
        controls.addEventListener('change',schedule);
        scene.add(new THREE.AmbientLight(0xffffff,2.3));
        const light = new THREE.DirectionalLight(0xffffff,.16);
        light.position.set(-1,2,3);
        scene.add(light);

        const resize = () => {
          const {width,height} = container.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width,height,false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          fit(true);
        };
        observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();

        const response = await fetch((process.env.PUBLIC_URL||'')+'/models/hanging-1000x93.glb',{signal:abort.signal});
        if (!response.ok) throw new Error('Modellen kunde inte hämtas.');
        const {scene: imported} = await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
        imported.updateMatrixWorld(true);
        let mesh;
        imported.traverse(node=>{ if (node.isMesh) mesh = node; });
        if (mesh) base = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).translate(-.5,-.0465,-.0015);
        disposeModel(imported);
        if (abort.signal.aborted) {
          base?.dispose();
          return;
        }
        if (!base) throw new Error('Den pendlade skyltens geometri saknas.');
        api.current = {
          reset: () => fit(true),
          update(nextLayout, textures) {
            const next = createModel(base, nextLayout, textures);
            const needsFit = layout?.width !== nextLayout.width || layout?.height !== nextLayout.height;
            if (model) {
              scene.remove(model);
              disposeModel(model);
            }
            model = next;
            layout = nextLayout;
            scene.add(model);
            bounds = new THREE.Box3().setFromObject(model);
            if (needsFit) fit();
            else schedule();
            setPanelCount(layout.panels.length);
          }
        };
        setLoaded(true);
      } catch (error) {
        if (!abort.signal.aborted) failure.current?.();
      }
    }
    start();
    return () => {
      abort.abort();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      controls?.dispose();
      if (model) disposeModel(model);
      base?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const abort = new AbortController();
    const {signal} = abort;
    async function update() {
      try {
        const layout = hangingSign3DLayout(product, form);
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (signal.aborted) return;
        const source = sourceRef.current;
        const stacked = layout.panels.length > 1;
        const results = await Promise.allSettled(layout.panels.flatMap(({product, size}, index) =>
          ['front','back'].map(side => {
            const part = '[data-hanging-stack-part="' + (index + 1) + '"]';
            const faceSource = stacked ? source?.querySelector('[data-hanging-stack-face="' + side + '"] ' + part) : source;
            const appearance = hangingFaceAppearance(product, side === 'back');
            return hangingFaceTexture(faceSource,side,{
              signal, widthMm:size.width, heightMm:size.height, background:appearance.background, showEndStrips:!appearance.isGreen
            });
          })
        ));
        const textures = results.map(result => result.value);
        if (signal.aborted || !api.current || results.some(result => result.status === 'rejected')) {
          textures.forEach(texture => texture?.dispose());
          if (!signal.aborted) failure.current?.();
          return;
        }
        api.current.update(layout, layout.panels.map((_, index) => textures.slice(index * 2, index * 2 + 2)));
      } catch (error) {
        if (!signal.aborted) failure.current?.();
      }
    }
    update();
    return () => abort.abort();
  }, [loaded,sourceRef,form,product]);

  return <div className="jsf-door-3d" data-hanging-sign-3d={product.articleNumber} data-hanging-panels={panelCount || undefined}>
    <div ref={shadow} className="jsf-door-3d-shadow" aria-hidden="true"/>
    <div ref={host} className="jsf-door-3d-canvas"/>
    {panelCount ? <button type="button" className="jsf-door-3d-reset" onClick={()=>api.current?.reset()}>Återställ vy</button>
      : <p role="status" className="jsf-door-3d-status">Laddar 3D-vyn…</p>}
  </div>;
}
