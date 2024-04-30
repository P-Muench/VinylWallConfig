import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
import {MapControls} from 'three/addons/controls/MapControls.js';


const ALBUM_WIDTH = 30
const ALBUM_DEPTH = 1
const ALBUM_PADDING_HOR = ALBUM_WIDTH * .15
const ALBUM_PADDING_VERT = ALBUM_WIDTH * .1
const SHELF_HEIGHT = 3
const SHELF_DEPTH = 15;
const SHELF_ANGLE = -3.14 / 12;
const FOV = 54.4;  // 35mm
const FOV_ALBUMPICKER = 20;

const TEXTURE_CACHE = {};

var mouseDown = [-1, -1];

export function loadJSON(path, success, error) {
    fetch(path, {
            method: "GET"
        })
            .then((response) => response.json())
            .then((json) => {
                console.log(json);
                success(json);
            });
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== window.devicePixelRatio * width || canvas.height !== window.devicePixelRatio * height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

export class ShelfRenderer {

    constructor(canvas, onShelfspotClick=null) {
        this.canvas = canvas;
        this.raycaster = new THREE.Raycaster();
        this.currentlyHoveredOver = null;
        this.shelfJSON = {};

        this.onShelfSpotClick = onShelfspotClick;

        this.isPaused = false;

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
        this.renderer.setClearColor(0xffffff);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // this.renderer.format = THREE.RGBAFormat
        // this.renderer.outputEncoding = THREE.sRGBEncoding
        this.renderer.physicallyCorrectLights = true
        // this.renderer.toneMappingExposure = 1.1

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this.scene = new THREE.Scene(this.canvas);

        this.backgroundGroup = new THREE.Group();
        this.clear();
        this.canvas.addEventListener('mousemove', this.onMove.bind(this))
        this.canvas.addEventListener('click', this.onClick.bind(this))
        this.canvas.addEventListener('touch', this.onTouch.bind(this))
    }

    get shelfId() {
        return this.shelfJSON["shelf_id"]
    }

    clear() {
        this.scene.clear()
        this.loadBackground();

        this.shelfspots = new Set();
        this.temporaryShelfs = new Set();

        this.viewableGeometries = new THREE.Group();
        this.scene.add(this.viewableGeometries)

        this.boundingSphere = null;

        this.initializeCamera();
        this.initializeControls(this.canvas);

        this.initializeLights();
    }

    initializeLights() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
        hemiLight.position.set(50, -36, 20)
        this.scene.add(hemiLight);

        // const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
        // this.scene.add(hemiLightHelper);

        // const light = new THREE.DirectionalLight(0xfff5f6, 1.2);
        // light.castShadow = true
        // light.position.set(50, 20, 60);
        // light.target.position.set(50, -40, 0)
        // light.shadow.mapSize.width = 512; // default
        // light.shadow.mapSize.height = 512; // default
        // light.shadow.camera.near = 0.5; // default
        // light.shadow.camera.far = 1000; // default
        // light.shadow.camera.left=-100;
        // light.shadow.camera.right=100;
        // light.shadow.camera.top=100;
        // light.shadow.camera.bottom=-100;

        const light = new THREE.PointLight(0xfff5f6, 2, 1000, 0);
        // THREE.Color()
        // light.color.a
        light.castShadow = true
        light.position.set(20, 50, 200);
        // light.target.position.set(50, -40, 0)
        light.shadow.mapSize.width = 1024 * 4; // default
        light.shadow.mapSize.height = 1024 * 4; // default
        light.shadow.camera.near = 0.5; // default
        light.shadow.camera.far = 1000; // default
        // console.log(light.shadow.camera.fov)
        // light.shadow.camera.fov = 45
        // light.shadow.camera.left=-100;
        // light.shadow.camera.right=100;
        // light.shadow.camera.top=100;
        // light.shadow.camera.bottom=-100;
        this.spotlight = light;
        this.scene.add(light);

        // const helper = new THREE.CameraHelper( light.shadow.camera );
        // this.scene.add( helper );
        //
        // const lightHelper = new THREE.PointLightHelper(light, 10, 0xff0000);
        // this.scene.add(lightHelper)
    }

    loadBackground() {
        console.log(this.backgroundGroup.children.length)
        if (this.backgroundGroup.children.length === 0) {
            const loader = new GLTFLoader();
            loader.load(
                // resource URL
                '/static/configurator/assets/monstera.glb',
                // called when the resource is loaded
                function (gltf) {
                    const monsti = gltf.scene.children[0];
                    const bb = new THREE.Box3();
                    bb.setFromObject(monsti);
                    const center = new THREE.Vector3();
                    bb.getCenter(center)
                    let bsphere = bb.getBoundingSphere(new THREE.Sphere(center));
                    // this.scene.add(monsti);
                    this.backgroundGroup.add(monsti)
                    const scale = bsphere.radius * 2 * 60;
                    monsti.scale.copy(new THREE.Vector3(scale, scale, scale))
                    monsti.position.copy(new THREE.Vector3(140, -150, 40))
                    monsti.children[0].children[0].children[0].children[0].castShadow = true
                    monsti.children[0].children[0].children[1].children[0].castShadow = true
                }.bind(this),
                // called while loading is progressing
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                // called when loading has errors
                function (error) {
                    console.log('An error happened');
                    console.log(error)
                }
            );

            const couchloader = new GLTFLoader();
            couchloader.load(
                // resource URL
                '/static/configurator/assets/sofa.glb',
                // called when the resource is loaded
                function (gltf) {
                    const couch = gltf.scene.children[0];
                    // this.scene.add(couch);
                    this.backgroundGroup.add(couch)
                    const scale = 2.5
                    couch.scale.copy(new THREE.Vector3(scale, scale, scale))
                    couch.position.copy(new THREE.Vector3(0, -190, 50))
                    couch.rotateZ(Math.PI / 2)
                    couch.children[0].children[0].castShadow = true
                }.bind(this),
                // called while loading is progressing
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                // called when loading has errors
                function (error) {
                    console.log('An error happened');
                    console.log(error)
                }
            );

            const geometry = new THREE.BoxGeometry(1000, 1000, .1);
            const material = new THREE.MeshStandardMaterial({color: 0xeeeeee});
            const wallpaperMesh = new THREE.Mesh(geometry, material);
            wallpaperMesh.translateZ(-0.05)
            wallpaperMesh.receiveShadow = true
            // this.scene.add(wallpaperMesh);
            this.backgroundGroup.add(wallpaperMesh)
            const wallpaperTextureLoader = new THREE.TextureLoader();
            const wallpaperDispTextureLoader = new THREE.TextureLoader();
            const wallpaperNormTextureLoader = new THREE.TextureLoader();
            const wallpaper_texture_indicator = "__WALLPAPER";
            if (TEXTURE_CACHE[wallpaper_texture_indicator] !== undefined) {
                wallpaperMesh.material.copy(TEXTURE_CACHE[wallpaper_texture_indicator]);
            } else {
                const textureUrl = "/static/configurator/imgs/Wallpaper_Woodchip_001_basecolor.jpg";
                const aoTextureURL = "/static/configurator/imgs/Wallpaper_Woodchip_001_ambientOcclusion.jpg";
                const normTextureURL = "/static/configurator/imgs/Wallpaper_Woodchip_001_normal.jpg";
                wallpaperTextureLoader.load(
                    // resource URL
                    textureUrl,
                    // onLoad callback
                    function (textureMap) {
                        // in this example we create the material when the texture is loaded
                        // textureMap.colorSpace = THREE.SRGBColorSpace
                        textureMap.wrapS = THREE.RepeatWrapping;
                        textureMap.wrapT = THREE.RepeatWrapping;
                        wallpaperNormTextureLoader.load(normTextureURL,
                            function (normTexture) {
                                // normTexture.colorSpace = THREE.SRGBColorSpace
                                normTexture.wrapS = THREE.RepeatWrapping;
                                normTexture.wrapT = THREE.RepeatWrapping;
                                wallpaperDispTextureLoader.load(
                                    // resource URL
                                    aoTextureURL,
                                    // onLoad callback
                                    function (aoTexture) {
                                        // in this example we create the material when the texture is loaded
                                        // aoTexture.colorSpace = THREE.SRGBColorSpace
                                        aoTexture.wrapS = THREE.RepeatWrapping;
                                        aoTexture.wrapT = THREE.RepeatWrapping;
                                        const shelfMaterial = new THREE.MeshStandardMaterial({
                                            map: textureMap,
                                            aoMap: aoTexture,
                                            normalMap: normTexture
                                        });
                                        const repeat = 14;
                                        shelfMaterial.map.repeat.copy(new THREE.Vector2(repeat, repeat))
                                        shelfMaterial.aoMap.repeat.copy(new THREE.Vector2(repeat, repeat))
                                        shelfMaterial.normalMap.repeat.copy(new THREE.Vector2(repeat, repeat))
                                        console.log(shelfMaterial)
                                        wallpaperMesh.material = shelfMaterial;
                                        TEXTURE_CACHE[wallpaper_texture_indicator] = shelfMaterial
                                    },
                                    // onProgress callback currently not supported
                                    undefined, function (err) {
                                        console.log(err)
                                    }
                                );
                            }.bind(this))
                    },
                    // onProgress callback currently not supported
                    undefined, function (err) {
                        console.log(err)
                    }
                );
            }

        } else {
            console.log("already loaded")
        }
        this.scene.add(this.backgroundGroup)
    }


    addViewableGroup(viewableGroup) {
        this.viewableGeometries.add(viewableGroup);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    initializeControls(canvas) {
    }

    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
        this.camera.lookAt(0, 0, 0)
        this.scene.add(this.camera)
    }

    resizeScene() {
        console.log("Resize")
        const bb = new THREE.Box3();
        bb.setFromObject(this.viewableGeometries);
        const minX = bb.min.x
        const minY = bb.min.y
        const maxX = bb.max.x
        const maxY = bb.max.y

        function tan(deg) {
            return Math.tan(deg * Math.PI / 180);
        }

        const vert_fov = this.camera.fov;
        const hor_fov = (2 * Math.atan(this.camera.aspect * tan(vert_fov / 2)) * 180 / Math.PI);
        const dist = Math.max(((maxX - minX) / 2) / tan(hor_fov / 2),
            ((maxY - minY) / 2) / tan(vert_fov / 2)) * 1.1;
        this.camera.position.x = (maxX + minX) / 2;
        this.camera.position.y = (maxY + minY) / 2;
        this.camera.position.z = dist * 1.2;
        this.camera.userData.originalPosition = new THREE.Vector3().copy(this.camera.position)
        this.camera.lookAt(this.boundingSphere.center)
        // this.spotlight.shadow.camera.updateProjectionMatrix ()
    }

    loadFromJson(shelfJSON) {
        this.clear()
        this.shelfJSON = shelfJSON
        for (let i = 0; i < shelfJSON["spot_matrix"].length; i++) {
            let shelfspot = new ShelfSpot(shelfJSON["spot_matrix"][i]);

            if (this.onShelfSpotClick !== null) {
                shelfspot.setOnAlbumClick(this.onShelfSpotClick(shelfspot))
            }

            this.shelfspots.add(shelfspot);
            this.scene.add(shelfspot);
            this.addViewableGroup(shelfspot);
        }
        // this.addDebugGUI();
        this.finalizeScene()
    }

    addDebugGUI() {
        const gui = new GUI()
        const cubeFolder = gui.addFolder('Light')
        cubeFolder.add(this.spotlight, 'intensity', 0, Math.PI * 2)
        cubeFolder.add(this.spotlight.position, 'x', 0, 100)
        cubeFolder.add(this.spotlight.position, 'y', -50, 100)
        cubeFolder.add(this.spotlight.position, 'z', 0, 1000)
        // cubeFolder.add(cube.rotation, 'y', 0, Math.PI * 2)
        // cubeFolder.add(cube.rotation, 'z', 0, Math.PI * 2)
        cubeFolder.open()
    }

    toggleEditMode() {
        if (this.temporaryShelfs.size == 0) {
            let spDict = {}
            this.shelfspots.forEach((spot) => {
                spDict[[spot.row, spot.col]] = spot;
                spot.setOnShelfClick((() => {
                    this.fetchAndReload("/shelf/remove/", {
                        "row_id": spot.row,
                        "shelf_id": this.shelfId,
                        "col_id": spot.col
                    }, this.toggleEditMode.bind(this))
                }))
            })
            this.shelfspots.forEach((spot) => {
                [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((t) => {
                    const row_delta = t[0];
                    const col_delta = t[1];
                    const new_index = [spot.row + row_delta, spot.col + col_delta];
                    if (spDict[new_index] === undefined) {
                        let shelfspot = new ShelfSpot({
                            "row": spot.row + row_delta,
                            "col": spot.col + col_delta
                        }, false);

                        shelfspot.setOnShelfClick((() => {
                            this.fetchAndReload("/shelf/add/", {
                                "row_id": new_index[0],
                                "shelf_id": this.shelfId,
                                "col_id": new_index[1]
                            }, this.toggleEditMode.bind(this))
                        }))

                        shelfspot.shelfMesh.material.transparent = true;
                        shelfspot.shelfMesh.material.opacity = .6;

                        this.temporaryShelfs.add(shelfspot);
                        this.scene.add(shelfspot);
                        this.addViewableGroup(shelfspot);
                        spDict[new_index] = shelfspot
                    }
                })
                spDict[[spot.row, spot.col]] = spot;
            })
        } else {
            this.shelfspots.forEach((spot) => {
                spot.removeOnShelfClick();
            })
            this.temporaryShelfs.forEach((shelfspot) => {

                this.scene.remove(shelfspot);
                this.viewableGeometries.remove(shelfspot);
            })
            this.temporaryShelfs.clear();
        }
        this.resizeScene()
    }

    finalizeScene() {
        this.boundingSphere = this.getViewableBoundingSphere()
        if (this.boundingSphere !== null) {
            this.camera.lookAt(this.boundingSphere.center);
            // this.controls.target.copy(this.boundingSphere.center)
            this.spotlight.lookAt(this.boundingSphere.center)
        }

        resizeRendererToDisplaySize(this.renderer)
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.resizeScene();
        this.spotlight.shadow.camera.lookAt(this.boundingSphere.center)
        this.renderer.shadowMap.autoUpdate = false
        this.renderer.shadowMap.needsUpdate = true
        this.camera.updateProjectionMatrix();
        // this.controls.update()
        this.renderer.render(this.scene, this.camera);
        // setTimeout(this.generatePointLights.bind(this), 1000)

        this.animate()
    }

    getViewableBoundingSphere() {
        if (this.viewableGeometries.children.length > 0) {
            const bb = new THREE.Box3();
            bb.setFromObject(this.viewableGeometries);
            const center = new THREE.Vector3();
            bb.getCenter(center)
            let bsphere = bb.getBoundingSphere(new THREE.Sphere(center));
            // let geo = new THREE.SphereGeometry(bsphere.radius, 32, 32)
            // let sMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
            //     color: 0xff0000,
            //     opacity: .2,
            //     transparent: true
            // }))
            // sMesh.position.copy(bsphere.center)
            // this.scene.add(sMesh)
            return bsphere
        }
        return null
    }

    onTouch(event) {
        event.preventDefault();
        event.clientX = event.touches[0].clientX;
        event.clientY = event.touches[0].clientY;
        this.onMove(event);
        this.onClick(event);
    }

    onClick(event) {
        if (this.currentlyHoveredOver && this.currentlyHoveredOver.onclick !== undefined) this.currentlyHoveredOver.onclick(event);
    }

    onMove(event) {
        var rect = event.target.getBoundingClientRect();
          var x = (event.clientX - rect.left) / this.canvas.clientWidth * 2 - 1; //x position within the element.
          var y = - (event.clientY - rect.top) / this.canvas.clientHeight * 2 + 1;  //y position within the element.

        const pointer = new THREE.Vector2();
        pointer.x = x;
        pointer.y = y;
        const originalPosition = this.camera.userData.originalPosition;

        const leeWay = 3
        // const transform = function(p) {return Math.sign(p) * Math.sqrt(Math.abs(p))}
        const transform = function (p) {
            return p
        }
        const newPos = new THREE.Vector3(
            originalPosition.x + transform(pointer.x) * leeWay,
            originalPosition.y + transform(pointer.y) * leeWay,
            originalPosition.z)
        this.camera.position.copy(newPos)
        this.camera.lookAt(this.boundingSphere.center)
        // console.log(newPos)
        // console.log(pointer)
        this.raycaster.setFromCamera(pointer, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length > 0 && intersects[0].object.onclick !== undefined) {
            document.body.style.cursor = 'pointer';
            if (this.currentlyHoveredOver !== intersects[0].object) {

                if (this.currentlyHoveredOver) this.currentlyHoveredOver.material.emissive.setHex(this.currentlyHoveredOver.userData.currentHex);

                this.currentlyHoveredOver = intersects[0].object;
                this.currentlyHoveredOver.userData.currentHex = this.currentlyHoveredOver.material.emissive.getHex();
                this.currentlyHoveredOver.material.emissive.setHex(0x888888);
            }

        } else {
            document.body.style.cursor = 'auto';
            if (this.currentlyHoveredOver) this.currentlyHoveredOver.material.emissive.setHex(this.currentlyHoveredOver.userData.currentHex);
            this.currentlyHoveredOver = null;
        }
    }

    fetchAndReload(url, data, postF = () => {}) {
        fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
            .then((response) => response.json())
            .then((json) => {
                console.log(json);
                this.loadFromJson(json);
                postF()
            });
    }

    generatePointLights() {
        this.render();

        this.shelfspots.forEach((shelf) => {
            const shelfmesh = shelf.shelfMesh
            let pos = shelfmesh.position;
            const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(64, {
                generateMipmaps: true,
                minFilter: THREE.LinearMipmapLinearFilter,
            });
            let cubeCamera = new THREE.CubeCamera(.001, 50, cubeRenderTarget);

            cubeCamera.position.set(pos.x, pos.y + 2.5, pos.z - 2)
            // console.log(pos)
            // // cubeCamera
            // for (let i = 0; i < cubeCamera.children.length; i++) {
            //     let childCam = cubeCamera.children[i];
            //     this.scene.add(new THREE.CameraHelper(childCam))
            // }
            this.scene.add(cubeCamera)
            // probe
            let lightProbe = new THREE.LightProbe();
            lightProbe.intensity = 1

            lightProbe.position.copy(cubeCamera.position)
            this.scene.add(lightProbe);
            //
            // shelfmesh.visible = false
            cubeCamera.update(this.renderer, this.scene);
            // shelfmesh.visible = true

            lightProbe.copy(LightProbeGenerator.fromCubeRenderTarget(this.renderer, cubeRenderTarget));
            lightProbe.position.copy(cubeCamera.position)
            // lightProbe.rotateX(- Math.PI / 4)
            lightProbe.intensity = .2
            // lightProbe.castShadow=true
            this.scene.add(new LightProbeHelper(lightProbe, 1.5));

            // shelfmesh.material.envMap = cubeRenderTarget.texture;

            // const chromeMaterial = new THREE.MeshStandardMaterial(
            //     { envMap: cubeRenderTarget.texture, } );
            // const car = new THREE.Mesh( new THREE.SphereGeometry(1, 10, 10), chromeMaterial );
            // car.position.copy(cubeCamera.position)
            // this.scene.add( car );
            this.render()
        })

    }

    animate() {
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }

    render() {
        if (!this.isPaused) {
            if (resizeRendererToDisplaySize(this.renderer)) {
                this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
                this.resizeScene();
                this.camera.updateProjectionMatrix();
            }
            this.renderer.render(this.scene, this.camera);
        }
    }
}


class ShelfSpot extends THREE.Group {
    constructor(jsonData, drawAlbum = true, drawShelf = true) {
        super();
        this.jsonData = jsonData
        this.album = new Playable({});
        this.shelfMesh = new THREE.Mesh();
        this.#init(drawAlbum, drawShelf)
    }

    get row() {
        return this.jsonData["row"]
    }

    get col() {
        return this.jsonData["col"]
    }

    setOnAlbumClick(f) {
        this.album.mesh.onclick = f
    }

    setOnShelfClick(f) {
        this.shelfMesh.onclick = f
    }

    removeOnShelfClick() {
        this.shelfMesh.onclick = undefined
    }

    removeOnAlbumClick() {
        this.album.mesh.onclick = undefined
    }

    #init(drawAlbum, drawShelf) {

        const albumX = (2 * ALBUM_PADDING_HOR + ALBUM_WIDTH) * this.col;
        const albumY = -(ALBUM_PADDING_VERT + Math.cos(SHELF_ANGLE) * ALBUM_WIDTH + SHELF_HEIGHT) * this.row;

        let albumMesh
        let album
        if (drawAlbum) {
            album = new Playable(this.jsonData["playable"])
            albumMesh = album.mesh
            albumMesh.position.set(albumX, albumY, ALBUM_DEPTH / 2 - Math.sin(SHELF_ANGLE) * ALBUM_WIDTH / 2)
        }

        let shelfMesh
        if (drawShelf) {
            shelfMesh = makeShelf();

            const shelfX = albumX;
            const shelfY = albumY - (Math.cos(SHELF_ANGLE) * ALBUM_WIDTH / 2 + SHELF_HEIGHT / 2);
            const shelfZ = (SHELF_DEPTH / 2)
            shelfMesh.position.set(shelfX, shelfY, shelfZ)
        }

        if (drawShelf) {
            this.add(shelfMesh)
            this.shelfMesh = shelfMesh;
        }
        if (drawAlbum) {
            this.album = album;
            this.add(albumMesh);
        }
    }
}

class Playable {
    constructor(jsonData) {
        this.jsonData = jsonData
        this.mesh = null
        this.#init()
    }

    get name() {
        return this.jsonData["name"]
    }

    get id() {
        return this.jsonData["id"]
    }

    get imgUrl() {
        return this.jsonData["image_url"]
    }

    #init() {
        let albumGeometry = new THREE.BoxGeometry(ALBUM_WIDTH, ALBUM_WIDTH, ALBUM_DEPTH);

        const albumMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(1, 1, 1, THREE.SRGBColorSpace),
            roughness: 0.5,
            metalness: 0,
            flatShading: true
        });

        let albumMesh = new THREE.Mesh(albumGeometry, albumMaterial);

        albumMesh.rotateX(SHELF_ANGLE)
        albumMesh.castShadow = true

        const albumTextureLoader = new THREE.TextureLoader();
        // load a resource
        if (this.imgUrl != null && this.imgUrl !== "") {
            if (TEXTURE_CACHE[this.imgUrl] !== undefined) {
                albumMesh.material.copy(TEXTURE_CACHE[this.imgUrl]);
            } else {
                albumTextureLoader.load(
                    // resource URL
                    this.imgUrl,
                    // onLoad callback
                    function (texture) {
                        texture.colorSpace = THREE.SRGBColorSpace
                        // in this example we create the material when the texture is loaded
                        const textureMaterial = new THREE.MeshStandardMaterial({
                            map: texture,
                            roughness: 0.4,
                            metalness: 0,
                            flatShading: true,
                        });
                        albumMesh.material = textureMaterial;
                        TEXTURE_CACHE[this.imgUrl] = textureMaterial;
                    }.bind(this),
                    // onProgress callback currently not supported
                    undefined, function (err) {
                        console.log(err)
                    }
                );
            }
        }

        this.mesh = albumMesh;
    }
}

function makeShelf() {
    let shelfGeometry = new THREE.BoxGeometry(ALBUM_WIDTH + 2 * ALBUM_PADDING_HOR, SHELF_HEIGHT, SHELF_DEPTH);

    const shelfMaterial = new THREE.MeshStandardMaterial({});

    let shelfMesh = new THREE.Mesh(shelfGeometry, shelfMaterial);

    shelfMesh.receiveShadow = true
    shelfMesh.castShadow = true

    const shelfTextureLoader = new THREE.TextureLoader();
    const shelfDispTextureLoader = new THREE.TextureLoader();
    const shelf_texture_indicator = "__SHELF";
    if (TEXTURE_CACHE[shelf_texture_indicator] !== undefined) {
        shelfMesh.material.copy(TEXTURE_CACHE[shelf_texture_indicator]);
    } else {
        const textureUrl = "/static/configurator/imgs/oak_veneer_01_diff_4k_2.jpg";
        const aoTextureURL = "/static/configurator/imgs/oak_veneer_01_ao_4k_3.jpg";
        shelfTextureLoader.load(
            // resource URL
            textureUrl,
            // onLoad callback
            function (textureMap) {
                // in this example we create the material when the texture is loaded
                textureMap.colorSpace = THREE.SRGBColorSpace
                shelfMesh.material.map = textureMap;
                shelfDispTextureLoader.load(
                    // resource URL
                    aoTextureURL,
                    // onLoad callback
                    function (aoTexture) {
                        // in this example we create the material when the texture is loaded
                        aoTexture.colorSpace = THREE.SRGBColorSpace
                        const shelfMaterial = new THREE.MeshStandardMaterial({map: textureMap, aoMap: aoTexture});
                        shelfMesh.material = shelfMaterial;
                        TEXTURE_CACHE[shelf_texture_indicator] = shelfMaterial
                    },
                    // onProgress callback currently not supported
                    undefined, function (err) {
                        console.log(err)
                    }
                );
            },
            // onProgress callback currently not supported
            undefined, function (err) {
                console.log(err)
            }
        );
    }
    return shelfMesh;
}

export class AlbumPicker {

    constructor(canvas, loader = null, callbackAlbumClick = (id) => {
    }) {
        this.canvas = canvas;
        this.loader = loader;
        this.callbackAlbumClick = callbackAlbumClick

        this.raycaster = new THREE.Raycaster();
        this.currentlyHoveredOver = null;

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
        this.renderer.setClearColor(0x111111);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.physicallyCorrectLights = true

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this.scene = new THREE.Scene(this.canvas);

        this.clear();
        this.canvas.addEventListener('mousemove', this.onMove.bind(this))
        this.canvas.addEventListener('mousedown', (event) => {
            mouseDown = [event.clientX, event.clientY]
        })
        this.canvas.addEventListener('mouseup', this.onClick.bind(this))

        this.__remove = null;
        this.isExpanding = false;
        this.currentPage = 1;
        this.maxPage = 1;
        this.url = ""
        this.updatePixelRatio();
    }

    clear() {
        this.scene.clear()
        this.albums = new Set();

        this.initializeCamera();
        this.initializeControls(this.canvas);

        this.initializeLights();
    }

    initializeLights() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 3);
        hemiLight.position.set(50, -36, 20)
        this.scene.add(hemiLight);
    }

    loadBackground() {

    }

    initializeControls(canvas) {
        this.controls = new MapControls(this.camera, this.renderer.domElement);

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;
        this.controls.screenSpacePanning = true;
        this.controls.panSpeed = 1.8
    }

    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(FOV_ALBUMPICKER, 1, 0.1, 500);
        this.camera.lookAt(0, ALBUM_WIDTH / 2, 0)
        this.camera.position.setZ(130)
        this.scene.add(this.camera)
    }

    loadFromJson(shelfJSON, url) {
        this.clear()
        this.isExpanding = false;
        this.url = url
        this.addFromJson(shelfJSON)
    }

    addFromJson(shelfJSON) {
        this.currentPage = shelfJSON["page"]
        this.maxPage = shelfJSON["max_page"]
        const albumList = shelfJSON["album_list"]
        for (let i = 0; i < albumList.length; i++) {
            let album = new Playable(albumList[i]);

            album.mesh.onclick = () => {
                this.callbackAlbumClick(album.id)
            }
            album.mesh.position.x = (ALBUM_WIDTH * 4 / 5) * this.albums.size;
            album.mesh.rotateX(-SHELF_ANGLE)
            // album.mesh.position.y = - (ALBUM_WIDTH / 3);
            this.albums.add(album);
            this.scene.add(album.mesh);
        }
        this.finalizeScene()
    }

    finalizeScene() {
        resizeRendererToDisplaySize(this.renderer)
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
        this.animate()
    }

    onClick(event) {
        if (mouseDown[0] === event.clientX && mouseDown[1] === event.clientY) {
            if (this.currentlyHoveredOver && this.currentlyHoveredOver.onclick !== undefined) this.currentlyHoveredOver.onclick(event);
        }
        mouseDown = [-1, -1]
    }

    onMove(event) {
                var rect = event.target.getBoundingClientRect();
          var x = (event.clientX - rect.left) / this.canvas.clientWidth * 2 - 1; //x position within the element.
          var y = - (event.clientY - rect.top) / this.canvas.clientHeight * 2 + 1;  //y position within the element.
          // console.log("Left? : " + x + " ; Top? : " + y + ".");

        const pointer = new THREE.Vector2();
        pointer.x = x;
        pointer.y = y;
        this.raycaster.setFromCamera(pointer, this.camera);
        console.log(pointer)

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length > 0 && intersects[0].object.onclick !== undefined) {
            document.body.style.cursor = 'pointer';
            if (this.currentlyHoveredOver !== intersects[0].object) {

                if (this.currentlyHoveredOver) this.currentlyHoveredOver.material.emissive.setHex(this.currentlyHoveredOver.userData.currentHex);

                this.currentlyHoveredOver = intersects[0].object;
                this.currentlyHoveredOver.userData.currentHex = this.currentlyHoveredOver.material.emissive.getHex();
                this.currentlyHoveredOver.material.emissive.setHex(0x888888);
            }

        } else {
            document.body.style.cursor = 'auto';
            if (this.currentlyHoveredOver) this.currentlyHoveredOver.material.emissive.setHex(this.currentlyHoveredOver.userData.currentHex);
            this.currentlyHoveredOver = null;
        }
    }

    updateAlbums() {
        this.albums.forEach((album) => {
            const deltaZ = 18
            let x = album.mesh.position.x - this.camera.position.x

            album.mesh.position.setZ(
                deltaZ * Math.pow(Math.E, -1.5 / ALBUM_WIDTH * (Math.abs(x)))
            )

            if (Math.abs(x) > ALBUM_WIDTH / 2) {
                album.mesh.rotation.y = (-Math.sign(x) * Math.sin(Math.PI / 4) ** 2) * Math.PI / 2 * 1.3
            } else {
                album.mesh.rotation.y = (-Math.sign(x) * Math.sin(x * (Math.PI / 2) / ALBUM_WIDTH) ** 2) * Math.PI / 2 * 1.3
            }

        })
    }

    triggerExpand() {
        this.isExpanding = true;

        if (this.url !== "") {
            this.loader?.on()
            loadJSON(this.url + "&page=" + (this.currentPage + 1),
                (data) => {
                    this.addFromJson.bind(this)(data);
                    this.loader?.off()
                    if (this.currentPage <= this.maxPage) {
                        this.isExpanding = false  // not yet at the end
                    }
                },);
        }
    }

    animate() {
        this.render();
        this.controls.update();
        this.controls.target.setY(0)
        this.camera.position.setY(0);

        const upper_limit = (ALBUM_WIDTH * 4 / 5) * (this.albums.size - 1);
        const newX = Math.min(Math.max(this.camera.position.x, 0), upper_limit)
        if (this.camera.position.x >= upper_limit - ALBUM_WIDTH && !this.isExpanding) {
            this.triggerExpand()
        }
        this.controls.target.setX(newX)
        this.camera.position.setX(newX);
        this.updateAlbums()

        requestAnimationFrame(this.animate.bind(this));
    }

    render() {
        if (resizeRendererToDisplaySize(this.renderer)) {
            console.log("needResize")
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
        }
        this.renderer.render(this.scene, this.camera);
    }

    updatePixelRatio = () => {
        if (this.__remove != null) {
            this.__remove();
        }
        let mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
        let media = matchMedia(mqString);
        media.addListener(this.updatePixelRatio);
        this.__remove = function () {
            media.removeListener(this.updatePixelRatio)
        };

        console.log("devicePixelRatio: " + window.devicePixelRatio);
        console.log(window.devicePixelRatio)
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

}

