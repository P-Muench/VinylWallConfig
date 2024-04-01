import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LightProbeHelper} from 'three/addons/helpers/LightProbeHelper.js';
import {LightProbeGenerator} from 'three/addons/lights/LightProbeGenerator.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const ALBUM_WIDTH = 30
const ALBUM_DEPTH = 1
const ALBUM_PADDING_HOR = ALBUM_WIDTH * .1
const ALBUM_PADDING_VERT = ALBUM_WIDTH * .1
const SHELF_HEIGHT = 2
const SHELF_DEPTH = 15;
const SHELF_ANGLE = -3.14 / 12;
const FOV = 25;

const TEXTURE_CACHE = {};

function loadJSON(path, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                success(JSON.parse(xhr.responseText));
            } else {
                error(xhr);
            }
        }
    };
    xhr.open('GET', path, true);
    xhr.send();
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

class ShelfRenderer {

    constructor(canvas) {
        this.canvas = canvas;
        this.raycaster = new THREE.Raycaster();
        this.currentlyHoveredOver = null;
        this.shelfJSON = {};

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
        this.renderer.setClearColor(0xffffff, 1);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this.scene = new THREE.Scene(this.canvas);

        this.clear();
        this.canvas.addEventListener('mousemove', this.onMove.bind(this))
        this.canvas.addEventListener('click', this.onClick.bind(this))
    }

    get shelfId() {
        return this.shelfJSON["shelf_id"]
    }

    clear() {
        this.scene.clear()
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
        // this.scene.add(hemiLight);

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
        light.castShadow = true
        light.position.set(50, 20, 60);
        // light.target.position.set(50, -40, 0)
        light.shadow.mapSize.width = 512; // default
        light.shadow.mapSize.height = 512; // default
        light.shadow.camera.near = 0.5; // default
        light.shadow.camera.far = 1000; // default
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

    addViewableGroup(viewableGroup) {
        this.viewableGeometries.add(viewableGroup);
    }


    initializeControls(canvas) {
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.minDistance = 1;
        this.controls.maxDistance = 1000;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
    }

    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1000);
        this.camera.position.z = 80;
        this.camera.position.y = 0;
        this.camera.position.x = 0;
        this.camera.lookAt(0, 0, 0)
        this.scene.add(this.camera)
    }

    resizeScene() {
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
        this.camera.position.z = dist;
    }

    loadFromJson(shelfJSON) {
        this.clear()

        this.shelfJSON = shelfJSON
        for (let i = 0; i < shelfJSON["spot_matrix"].length; i++) {
            let shelfspot = new ShelfSpot(shelfJSON["spot_matrix"][i]);

            shelfspot.setOnAlbumClick((() => {
                // this.fetchAndReload("/shelf/add/", {
                //     "row_id": 1,
                //     "shelf_id": this.shelfId,
                //     "col_id": 1
                // })
            }))

            this.shelfspots.add(shelfspot);
            this.scene.add(shelfspot);
            this.addViewableGroup(shelfspot);
        }
        this.addDebugGUI();
        this.finalizeScene()
    }

    addDebugGUI(){
        const gui = new GUI()
        const cubeFolder = gui.addFolder('Light')
        cubeFolder.add(this.spotlight, 'intensity', 0, Math.PI * 2)
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
                    console.log(new_index)
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
            this.controls.target.copy(this.boundingSphere.center)
            this.spotlight.lookAt(this.boundingSphere.center)
        }

        resizeRendererToDisplaySize(this.renderer)
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.resizeScene();
        this.camera.updateProjectionMatrix();
        this.controls.update()
        this.renderer.render(this.scene, this.camera);
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

    onClick(event) {
        if (this.currentlyHoveredOver && this.currentlyHoveredOver.onclick !== undefined) this.currentlyHoveredOver.onclick(event);
    }

    onMove(event) {
        const pointer = new THREE.Vector2();
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
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

    fetchAndReload(url, data, postF) {
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

        // [new THREE.Vector3(0, -12, 0),
        // new THREE.Vector3(30, 0, -10),
        // // new THREE.Vector3(20, -20, 20),
        // // new THREE.Vector3(20, -40, 20),
        // //     new THREE.Vector3(50, -20, 20),
        // //     new THREE.Vector3(20, 0, 20),
        // ]
        this.scene.userData.shelves.forEach((shelfmesh) => {
            let pos = shelfmesh.position;
            const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(64);
            let cubeCamera = new THREE.CubeCamera(.1, 50, cubeRenderTarget);

            cubeCamera.position.set(pos.x, pos.y, pos.z)
            // console.log(pos)
            // // cubeCamera
            // for (let i = 0; i < cubeCamera.children.length; i++) {
            //     let childCam = cubeCamera.children[i];
            //     this.scene.add(new THREE.CameraHelper(childCam))
            // }
            // this.scene.add(cubeCamera)
            // probe
            let lightProbe = new THREE.LightProbe();
            lightProbe.intensity = .2

            lightProbe.position.copy(pos)
            // this.scene.add(lightProbe);
            //
            // shelfmesh.visible = false
            // cubeCamera.update(this.renderer, this.scene);
            // shelfmesh.visible = true

            // lightProbe.copy(LightProbeGenerator.fromCubeRenderTarget(this.renderer, cubeRenderTarget));
            // lightProbe.position.copy(pos)
            // lightProbe.intensity=2
            // lightProbe.castShadow=true
            // this.scene.add(new LightProbeHelper(lightProbe, 5));

            // shelfmesh.material.envMap = cubeRenderTarget.texture;
            // const chromeMaterial = new THREE.MeshStandardMaterial(
            //     { color: 0xffffff, envMap: cubeRenderTarget.texture, } );
            // const car = new THREE.Mesh( new THREE.BoxGeometry(36, 3, 20), chromeMaterial );
            // car.position.copy(pos)
            // this.scene.add( car );
            this.render()
        })

    }

    animate() {
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }

    render() {
        if (resizeRendererToDisplaySize(this.renderer)) {
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.resizeScene();
            this.camera.updateProjectionMatrix();
        }
        this.renderer.render(this.scene, this.camera);
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

    #init(drawAlbum, drawShelf) {

        const albumX = (2 * ALBUM_PADDING_HOR + ALBUM_WIDTH) * this.col;
        const albumY = -(ALBUM_PADDING_VERT + Math.cos(SHELF_ANGLE) * ALBUM_WIDTH + SHELF_HEIGHT) * this.row;

        let albumMesh
        let album
        if (drawAlbum) {
            album = new Playable(this.jsonData["playable"])
            albumMesh = album.mesh
            albumMesh.position.set(albumX, albumY, ALBUM_DEPTH / 2)
        }

        let shelfMesh
        if (drawShelf) {
            shelfMesh = makeShelf();

            const shelfX = albumX;
            const shelfY = albumY - (Math.cos(SHELF_ANGLE) * ALBUM_WIDTH / 2 + SHELF_HEIGHT / 2);
            const shelfZ = (+Math.sin(SHELF_ANGLE) * ALBUM_WIDTH / 2 + SHELF_DEPTH / 2)
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

    get imgUrl() {
        return this.jsonData["image_url"]
    }

    #init() {
        let albumGeometry = new THREE.BoxGeometry(ALBUM_WIDTH, ALBUM_WIDTH, ALBUM_DEPTH);

        const albumMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 1, 0.75, THREE.SRGBColorSpace),
            roughness: 0.5, metalness: 0, flatShading: true
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
                        // in this example we create the material when the texture is loaded
                        const textureMaterial = new THREE.MeshStandardMaterial({
                            map: texture,
                            roughness: 0.7,
                            metalness: 0
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
                shelfMesh.material.map = textureMap;
                shelfDispTextureLoader.load(
                    // resource URL
                    aoTextureURL,
                    // onLoad callback
                    function (aoTexture) {
                        // in this example we create the material when the texture is loaded
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

const button = document.getElementById("editButton")
for (let i = 0; i < document.getElementsByClassName("ShelfCanvas").length; i++) {
    let el = document.getElementsByClassName("ShelfCanvas").item(i);
    let sr = new ShelfRenderer(el);
    loadJSON("/three_shelf_json/" + el.id.substring(11), (data) => {
        sr.loadFromJson.bind(sr)(data);
        button.addEventListener("click", sr.toggleEditMode.bind(sr))
    }, console.log);
}