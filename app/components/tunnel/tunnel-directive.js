/* global respond, THREE, RuttEtraShader, famous, Scene,  $rootScope, $state */
var s;

// Rotate an object around an arbitrary axis in object space
var rotObjectMatrix,rotWorldMatrix;
function rotateAroundObjectAxis(object, axis, radians) {
    rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);
    object.matrix.multiply(rotObjectMatrix);
    object.rotation.setFromRotationMatrix(object.matrix);
}


// Rotate an object around an arbitrary axis in world space
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
    rotWorldMatrix.multiply(object.matrix);                // pre-multiply
    object.matrix = rotWorldMatrix;
    object.rotation.setFromRotationMatrix(object.matrix);
}
Scene.prototype.drawTexture = function(img, opacity) {
    this.texture.c.save();
    this.texture.c.globalAlpha = opacity;
    this.texture.c.drawImage(img, 0, 0, this.texture.canvas.width, this.texture.canvas.height);
    this.texture.c.restore();
};

Scene.prototype.animateTextures = function(index, duration, curve){
    var that = this;
    var Transitionable = famous.transitions.Transitionable;
    var Easing = famous.transitions.Easing;

    that.texture.in = index;
    that.texture.fadeIn = new Transitionable(0);
    that.texture.fadeOut = new Transitionable(1);

    if(duration===undefined){
      duration = 1000;
    }

    if(curve===undefined){
      curve = Easing.inOutCubic;
    }

    that.texture.fadeIn.set(1,{duration: duration, curve: curve},function(){
      that.texture.inTransition = false;
      that.texture.out = index;
    });
    that.texture.fadeOut.set(0,{duration: duration, curve: curve},function(){
      that.texture.inTransition = false;
    });

    that.texture.inTransition = true;
};


Scene.prototype.initTextures = function(src){

  var that = this;
  var Easing = famous.transitions.Easing;

  this.texture = {};
  this.texture.images = [];

  this.texture.out = 0;
  this.texture.in = 1;
  this.texture.currentFade = 0;

  // if(document.getElementById('texture-canvas')){
  //   document.body.removeChild(that.texture.canvas);
  //   document.body.removeChild(that.texture.img);
  // }

  this.texture.canvas = document.createElement('canvas');
  this.texture.canvas.id = "texture-canvas";
  this.texture.canvas.setAttribute("width",window.innerWidth);
  this.texture.canvas.setAttribute("height",window.innerHeight);
  this.texture.canvas.style.display = "none";
  //this.texture.canvas.style.left="10000px";
  window.addEventListener("orientationchange", function() {
        that.texture.canvas.setAttribute("width",window.innerWidth);
        that.texture.canvas.setAttribute("height",window.innerHeight);
        //this.texture.canvas.style.left="10000px";
  });
  //console.log(this.texture.canvas);
  document.body.appendChild(this.texture.canvas);

  this.texture.img = document.createElement('img');
  this.texture.img.id = "texture-image";
  document.body.appendChild(that.texture.img);

  this.texture.img.crossOrigin = 'anonymous';
  this.texture.c = that.texture.canvas.getContext('2d');


  for (var i = 0; i < that.options.texture.length; i++) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = that.options.texture[i];
    that.texture.images.push(img);
    // if(i === that.texture.in ){
    //   initTexture(img,"in");
    // }
    // if(i === that.texture.out ){
    //   initTexture(img,"out");
    // }

  }

  return that.texture.canvas;

};

(function( define ) {
  "use strict";
  /**
   * Register the Controller class with RequireJS
   */
  define([

    ],
    function (

    ){

      var SectionDirective = function( States, $famous, $rootScope, $state, $http ){
            // Returns Directive Creation Object
            var Engine              = $famous['famous/core/Engine'],
            EventHandler            = $famous['famous/core/EventHandler'],
            Transitionable          = $famous['famous/transitions/Transitionable'],
            Transform               = $famous['famous/core/Transform'],
            TransitionableTransform = $famous['famous/transitions/TransitionableTransform'],
            Easing                  = $famous['famous/transitions/Easing'],
            Timer                   = $famous['famous/utilities/Timer'],
            GenericSync             = $famous["famous/inputs/GenericSync"],
            MouseSync               = $famous["famous/inputs/MouseSync"],
            TouchSync               = $famous["famous/inputs/TouchSync"],
            ScrollSync              = $famous["famous/inputs/ScrollSync"];

            var delta = [0,0];
            var fDelta = [0,0];
            var transform = 100;
            var fTransform = 0;
            var masterLimit = 6;
            var vignetteHeight = window.innerHeight * 2;
            var camTrans = new Transitionable([0, 0, 20]);


            var SelfObsessionTexture = function() {

              var that = this;
              var options = this.options;

              console.log(this.options);

              this.videoInput = document.getElementById('video');


              console.log(this.videoInput);

              navigator.getUserMedia = navigator.getUserMedia ||
                                       navigator.webkitGetUserMedia ||
                                       navigator.mozGetUserMedia ||
                                       navigator.msGetUserMedia;
              console.log(navigator.getUserMedia);
              if (navigator.getUserMedia) {

                navigator.getUserMedia({
                  video: true,
                  audio: false
                }, function(stream) {
                  //on webcam enabled
                  console.log(stream);
                  if (navigator.mozGetUserMedia) {
                    //that.videoInput.mozSrcObject = stream;
                  } else {
                    that.videoStream = stream;

                    that.videoObject = window.webkitURL.createObjectURL(stream);
                    that.videoInput.src = that.videoObject;

                    that.faceTexture = new THREE.Texture(that.videoInput);
                    that.faceTexture.minFilter = THREE.LinearFilter;
                    that.faceTexture.magFilter = THREE.LinearFilter;
                    that.faceTexture.format = THREE.RGBFormat;
                    that.faceTexture.generateMipmaps = true;

                    that.faceOptions = {
                        scale : 0.75,
                        multiplier :2.0,
                        displace : 6.0,
                        origin : [0,0,100],
                        opacity : 1.0
                    };

                    that.faceGeometry = new THREE.PlaneBufferGeometry(256,256,256,256);

                    that.faceMaterial = new THREE.ShaderMaterial({
                      uniforms: {
                        "tDiffuse": {
                          type: "t",
                          value: that.faceTexture
                        },
                        "multiplier": {
                          type: "f",
                          value: that.faceOptions.multiplier
                        },
                        "displace": {
                          type: "f",
                          value: that.faceOptions.displace
                        },
                        "opacity": {
                          type: "f",
                          value: that.faceOptions.opacity
                        },
                        "originX": {
                          type: "f",
                          value: that.faceOptions.origin[0]
                        },
                        "originY": {
                          type: "f",
                          value: that.faceOptions.origin[1]
                        },
                        "originZ": {
                          type: "f",
                          value: that.faceOptions.origin[2]
                        }
                      },
                      vertexShader: THREE.RuttEtraShader.vertexShader,
                      fragmentShader: THREE.RuttEtraShader.fragmentShader,
                      depthWrite: true,
                      depthTest: true,
                      wireframe: true,
                      transparent: true,
                      overdraw: false
                    });
                    that.faceMaterial.wireframe = true;


                    that.faceMesh = new THREE.Mesh(that.faceGeometry,that.faceMaterial);
                    that.faceMesh.scale.x = that.faceMesh.scale.y = that.faceOptions.scale;
                    that.faceMesh.position.set(0,0,0);
                    var xAxis = new THREE.Vector3(1,0,0);
                    rotateAroundWorldAxis(that.faceMesh, xAxis, Math.PI / 180);


                    console.log(that.faceMesh);
                    that.scene.add(that.faceMesh);

                    //that.options.texture = new THREE.Texture(that.videoInput);
                  }


                }, function(error) {
                  console.log('Unable to capture WebCam. Please reload the page or try with Google Chrome.');
                });
              }



              options.texture.minFilter = THREE.LinearFilter;
              options.texture.magFilter = THREE.LinearFilter;
              options.texture.format = THREE.RGBFormat;
              options.texture.generateMipmaps = true;

              this.canvas = $famous.find('.background-canvas')[0].renderNode;
              this.scene = new THREE.Scene();
              this.renderer = new THREE.WebGLRenderer({antialias:true});
              this.camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 100000 );
              this.geometry = options.geometry || new THREE.PlaneBufferGeometry(120,120,120,120);
              this.material = new THREE.ShaderMaterial({
                uniforms: {
                  "tDiffuse": {
                    type: "t",
                    value: options.texture
                  },
                  "multiplier": {
                    type: "f",
                    value: options.multiplier
                  },
                  "displace": {
                    type: "f",
                    value: options.displace
                  },
                  "opacity": {
                    type: "f",
                    value: options.opacity
                  },
                  "originX": {
                    type: "f",
                    value: options.origin[0]
                  },
                  "originY": {
                    type: "f",
                    value: options.origin[1]
                  },
                  "originZ": {
                    type: "f",
                    value: options.origin[2]
                  }
                },
                vertexShader: THREE.RuttEtraShader.vertexShader,
                fragmentShader: THREE.RuttEtraShader.fragmentShader,
                depthWrite: true,
                depthTest: true,
                wireframe: options.wireframe,
                transparent: false,
                overdraw: false
              });
              this.mesh = new THREE.Mesh(that.geometry,that.material);
              this.fill = new THREE.AmbientLight(0xffffff);
              this.key = new THREE.SpotLight(0xffffff);
              this.back = new THREE.AmbientLight(0xffffff);
              this.composer = new THREE.EffectComposer(that.renderer);
              this.renderModel = new THREE.RenderPass(that.scene, that.camera);
              this.effectHue = new THREE.ShaderPass(THREE.HueSaturationShader);


              // sync

              GenericSync.register({
                  mouse : MouseSync,
                  touch : TouchSync
              });

              this.sync = new GenericSync(['mouse', 'touch']);
              Engine.pipe(that.sync);

              //camera

              //this.camera.position.y = -33;
              //this.camera.position.z = 100;
              this.camera.position.x = 0;
              this.camera.position.y = -45;
              this.camera.position.z = -100;
              this.camera.lookAt(that.scene.position);

              //lighting

              this.fill.position.set(0, 0, 0).normalize();
              this.scene.add(that.fill);

              this.key.position.set(0, -45, -200).normalize();
              this.key.target = that.scene;

              this.key.intensity = 5000;
              this.key.castShadow = true;
              this.scene.add(that.key);

              this.back.position.set(0, 0, -200).normalize();
              this.back.target = that.mesh;

              this.back.intensity = 5000;
              this.back.castShadow = true;
              this.scene.add(that.back);


              // geometry

              this.geometry.dynamic = true;
              this.geometry.verticesNeedUpdate = true;
              this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = options.scale;
              this.mesh.position.z = 20;
              this.mesh.rotation.x = -90;
              this.mesh.doubleSided = true;
              this.mesh.position.y = 0;
              this.mesh.position.z = 45;
              //this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = options.scale;

              this.material.renderToScreen = true;
              //this.material.uniforms.originZ.value = options.origin[2];

              this.scene.add(that.mesh);

              // events

              this.sync.on("start", function(data) {
                 that.material.uniforms.originX.value = data.position[0] * 0.5;
                 that.material.uniforms.originY.value = data.position[1] * -0.5;
              });

              this.sync.on("update", function(data) {
                 that.material.uniforms.originX.value = data.position[0] * 0.5;
                 that.material.uniforms.originY.value = data.position[1] * -0.5;
              });

              this.sync.on("end", function(data) {
                 that.material.uniforms.originX.value = data.position[0] * 0.5;
                 that.material.uniforms.originY.value = data.position[1] * -0.5;
              });

              // postprocessing

              this.composer.addPass(that.renderModel);
              //effectBloom.renderToScreen = true;
              //composer.addPass(effectBloom);
              this.effectHue.renderToScreen = true;
              this.effectHue.uniforms.hue.value = options.hue;
              this.effectHue.uniforms.saturation.value = options.saturation;
              this.composer.addPass(that.effectHue);

              this.renderer.autoClear = false;
              this.renderer.setSize( window.innerWidth, window.innerHeight );
              this.canvas._currentTarget.childNodes[0].appendChild( that.renderer.domElement );

              this.render(function(){
                 that.composer.render();
                 that.renderer.render( that.scene, that.camera );
                 that.camera.position.x = camTrans.get()[0];
                 that.camera.position.y = camTrans.get()[1];
                 that.camera.position.z = camTrans.get()[2];

                 that.camera.lookAt(that.scene.position);

                 that.options.texture.needsUpdate = true;

                 if(that.texture.inTransition === true){
                   that.drawTexture(that.texture.images[that.texture.in], that.texture.fadeIn.get());
                   that.drawTexture(that.texture.images[that.texture.out], that.texture.fadeOut.get());
                 }

                 if (that.videoInput.readyState === that.videoInput.HAVE_ENOUGH_DATA) {
                    that.videoInput.play();
                   if (that.faceTexture) {
                    that.faceTexture.needsUpdate = true;

                   }
                   if (that.faceMaterial) {
                    that.faceGeometry.dynamic = true;
                    that.faceGeometry.verticesNeedUpdate = true;
                    that.faceMaterial.renderToScreen = true;
                    that.faceMaterial.uniforms.displace.value = that.faceOptions.displace;
                    that.faceMaterial.uniforms.multiplier.value = that.faceOptions.multiplier;
                    that.faceMaterial.uniforms.opacity.value = parseFloat(that.faceOptions.opacity);
                    that.faceMaterial.uniforms.originX.value = parseFloat(that.faceOptions.origin[0]);
                    that.faceMaterial.uniforms.originY.value = parseFloat(that.faceOptions.origin[1]);
                    that.faceMaterial.uniforms.originZ.value = parseFloat(that.faceOptions.origin[2]);
                   }
                    that.material.uniforms.displace.value = that.options.displace;
                    that.material.uniforms.multiplier.value = that.options.multiplier;
                    that.material.uniforms.opacity.value = parseFloat(that.options.opacity);
                    that.material.uniforms.originX.value = parseFloat(that.options.origin[0]);
                    that.material.uniforms.originY.value = parseFloat(that.options.origin[1]);
                    that.material.uniforms.originZ.value = parseFloat(that.options.origin[2]);
                 }
              });


            };

            var scene;

            return {
              restrict: "AE",
              require:"ngModel",
              templateUrl: "./components/tunnel/tunnel.html",
              scope:true,
              link: {
                pre: function(scope, iElem, iAttrs, controller) {

                },
                post: function(scope, iElem, iAttrs, controller) {

                  scope.masterIndex = 0;
                  scope.masterLimit = 4;

                  scope.zoom = false;

                 // var dotNav = document.querySelector('.dot-nav');

                  // add perspective to the container group
                  var group = $famous.find('.section-controller')[0].renderNode._container;
                  group.classList.add('depth');

                  var initCanvas = function(textures){
                    /* begin scene */
                    scene = new Scene({
                        scale : 1.0,
                        multiplier : 2.0,
                        displace : 6.0,
                        origin : [0,0,-120],
                        opacity : 0.6,
                        hue : 0.0,
                        bloom : 3.5,
                        saturation : 0.5,
                        wireframe : true,
                        geometry: new THREE.CylinderGeometry(64,64,120,64,64,true,false),
                        //texture : THREE.ImageUtils.loadTexture('assets/the-sky-is-burning.jpg')
                        texture : textures
                    },$famous.find('.background-canvas')[0].renderNode, true);

                    window.scene = scene;


                    Scene.prototype.init = SelfObsessionTexture;

                    var tex = scene.initTextures(scene.options.texture[0]);
                    scene.options.texture = new THREE.Texture(tex);

                    inT(scope.masterIndex);
                    setTimeout(function(){

                      scene.animateTextures(scope.masterIndex,1000,Easing.outElastic);


                    },300);




                  };


                  var canvas = $famous.find('.background-canvas')[0].renderNode;
                  canvas.on('deploy',function(){
                    console.log(iAttrs);


                    var textures = [];

                    if(iAttrs.canvas !== 'false'){
                      scope.canvasOpacity = 1.0;
                      initCanvas(scope.textures);
                    }
                    else{
                      scope.canvasOpacity = 0.8;
                      initCanvas(scope.textures);
                    }


                  });

                  // defaults
                  scope.content = {
                    grid:{
                      options: {
                       dimensions:[2,3]
                      }
                    },
                    scroll:{
                      speedLimit: 1,
                      paginated:true,
                      clipSize: window.innerHeight
                    },
                    canvas:{
                      size:[window.innerWidth,window.innerHeight]
                    },
                    section:{
                      size: [window.innerWidth,window.innerHeight],
                      position: [0,0,0],
                      elements:{
                        copy:{
                          scale:[],
                          align:[],
                          origin:[]
                        },
                        fore:{
                          scale:{},
                          align:{},
                          opacity: 1.0
                        },
                        back:{
                          scale:[],
                          opacity: 0.75
                        },
                        source:{
                          scale:[],
                          opacity: 1.0
                        },
                        contributor:{
                          scale:[],
                          opacity: 0.75
                        }
                      },
                      copy:{
                        opacity:0.0
                      },
                      icons: {
                        size:[256, 256],
                        scale: [1.0,1.0]
                      },
                      background:{
                        position: [0,0,0]
                      },
                      scrollButton:{
                        rotate: 0,
                        display: 0
                      },
                      swipeButton:{
                        rotate: (Math.PI/180)*180,
                        display: 0
                      },
                      forwardButton:{
                        rotate: (Math.PI/180)*90,
                        display: 0
                      },
                      backButton:{
                        rotate: (Math.PI/180)*-90,
                        display: 1,
                        show: false
                      },
                      scrollview:{
                        options:{
                          direction:'x'
                        }
                      },
                      parentLayout:{
                        options:{
                          direction: 0
                        },
                        size:[window.innerWidth/1.5,160]
                      },
                      childLayout:{
                        options:{
                          direction: 0
                        },
                        size:[320,360],
                        child:{
                          size:[320,120]
                        }
                      },
                      done:{
                        display: 1
                      }
                    },
                    vignette:{
                      size:[undefined,vignetteHeight]
                    }
                  };

                  scope.transition = true;

                  var alignElements = function(){
                      scope.content.section.elements.copy.align = scope.vignettes[scope.masterIndex].copy.align[respond.state];
                      scope.content.section.elements.copy.origin = scope.vignettes[scope.masterIndex].copy.origin[respond.state];
                    for(var ind=0;ind<scope.vignettes[scope.masterIndex].elements.length;ind++){
                      //console.log(scope.vignettes[scope.masterIndex].copy.align[respond.state]);
                      scope.content.section.elements.fore.align[ind] = scope.vignettes[scope.masterIndex].elements[ind].align[respond.state];
                      scope.content.section.elements.fore.scale[ind] = scope.vignettes[scope.masterIndex].elements[ind].scale[respond.state];
                    }
                  };

                  var resetVignette = function(){

                    scope.content.section.size = [window.innerWidth,window.innerHeight];
                    vignetteHeight = window.innerHeight * 2;
                    scope.content.vignette.size = [window.innerWidth, vignetteHeight];

                    if(scope.vignettes){
                      alignElements();
                    }
                    transform = 150;

                  };

                  scope.p = [];
                  scope.d = [];
                  scope.c = [];
                  scope.o = [];
                  scope.op = [];
                  scope.i = [];


                  var offset = 0;

                  var transportCamera = function(){
                    if(scope.masterIndex===0){
                      camTrans.set([0, -45, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===1){
                      camTrans.set([0, -25, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===2){
                      camTrans.set([0, -45, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===3){
                      camTrans.set([0, -25, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===4){
                      camTrans.set([0, -45, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===5){
                      camTrans.set([0, -25, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                    if(scope.masterIndex===6){
                      camTrans.set([0, -45, -100],{duration: 2000, curve: Easing.inOutCubic});
                    }
                  };

                  var inT = function(tIndex,v){

                      scope.content.section.scrollButton.display = 0;
                      scope.op[tIndex].set(0);
                      scope.c[tIndex].set(0);
                      scope.p[tIndex].setTranslate([0,0,0]);
                      scope.i[tIndex].setTranslate([0,0,0]);
                      scope.op[tIndex].set(1,{duration: 10});
                      scope.c[tIndex].set(1,{duration: 500});

                      if(scene){
                          scene.animateTextures(tIndex+1,1500,Easing.inOutQuart);
                          transportCamera();
                      }

                      scope.p[tIndex].setTranslate([0,0,0],{duration:800},function(){
                        scope.p[tIndex].setTranslate([0,0,0],{duration:400},function(){
                          scope.transition = false;
                        });
                      });

                      if(s!==undefined){

                          s.setPreset(tIndex);

                      }

                  };

                  var outT = function(tIndex,v){

                    scope.c[tIndex].set(0,{duration:300},function(){
                      resetVignette();
                    });
                    scope.p[tIndex].setTranslate([0,0,0],{duration:3000},function(){

                      for(var vo=0; vo<scope.vignettes.length; vo++){
                        if(vo!==scope.masterIndex){
                          scope.p[vo].setTranslate([0,0,0],{duration:10});
                        }
                      }
                    });

                  };

                  var backT = function(tIndex,v){
                    scope.content.section.scrollButton.display = 0;

                    scope.c[tIndex].set(0,{duration:500},function(){
                      resetVignette();
                    });

                    scope.op[tIndex].set(0,{duration:500});
                    scope.p[tIndex].setTranslate([0,0,0],{duration:2000},function(){
                      scope.transition = false;

                      for(var bo=0; bo<scope.vignettes.length; bo++){
                        if(bo!==scope.masterIndex){
                          scope.p[bo].setTranslate([0,0,0],{duration:10});
                        }
                      }

                    });

                  };

                  var fromT = function(tIndex,v){

                    scope.op[tIndex].set(0);
                    scope.c[tIndex].set(0);
                    scope.p[tIndex].setTranslate([0,0,0]);
                    scope.op[tIndex].set(1,{duration: 10});
                    scope.c[tIndex].set(1,{duration: 500});

                    if(scene){

                       scene.animateTextures(tIndex+1,1500,Easing.inOutQuart);
                       transportCamera();
                    }
                    scope.p[tIndex].setTranslate([0,0,0],{duration:1200},function(){

                      scope.p[tIndex].setTranslate([0,0,0],{duration:400},function(){
                        scope.transition = false;
                      });
                    });
                    if(s!==undefined){
                      s.setPreset(tIndex);
                    }

                  };

                  scope.draggableOptions = {
                    xRange: [0,0],
                    yRange: [-240, 120]
                  };


                  for(var index=0; index<=masterLimit; index++){
                  //setup transitionables for vignette 1
                    scope.o[index] = new Array(64);
                    scope.op[index] = new Transitionable(0);
                    scope.p[index] = new TransitionableTransform();
                    scope.d[index] = new EventHandler();
                    scope.i[index] = new TransitionableTransform();
                    scope.c[index] = new Transitionable(0);
                    //scope.o[index] = new Transitionable(0);
                    //console.log(inT);
                    //console.log(outT);
                  }


                  scope.mobile = function(){
                    scope.content.section.icons.scale = [0.45,0.45];
                    scope.content.section.icons.size = [80,80];
                    //scope.content.section.elements.copy.align =  [0.2,0.1];
                    //scope.content.section.elements.copy.origin =  [0.0,0.0];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[4],true];
                    scope.content.section.elements.copy.scale = [0.8,0.8];
                    //scope.content.section.elements.fore.scale = [0.3,0.3];
                    scope.content.section.elements.back.scale = [0.15,0.15];
                    scope.content.section.elements.source.scale = [0.5,0.5];
                    scope.content.section.elements.contributor.scale = [0.33,0.33];
                    scope.content.section.childLayout.size = [280,312];
                    scope.content.section.childLayout.child.size = [280,110];
                    if(respond.device === 'desktop'){
                      scope.content.section.parentLayout.scale = [1.0,1.0];
                    }
                    else{
                      scope.content.section.parentLayout.scale = [0.9,0.9];
                    }
                  };

                  scope.phablet = function(){
                    scope.content.section.icons.scale = [0.425,0.425];
                    scope.content.section.icons.size = [80,80];
                    //scope.content.section.elements.copy.align =  [0.2,0.2];
                    //scope.content.section.elements.copy.origin =  [0.0,0.0];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[4],true];
                    scope.content.section.elements.copy.scale = [0.8,0.8];
                    //scope.content.section.elements.fore.scale = [0.4,0.4];
                    scope.content.section.elements.back.scale = [0.3,0.3];
                    scope.content.section.elements.source.scale = [0.66,0.66];
                    scope.content.section.elements.contributor.scale = [0.425,0.425];
                    scope.content.section.childLayout.size = [280,312];
                    scope.content.section.childLayout.child.size = [280,110];
                    if(respond.device === 'desktop'){
                      scope.content.section.parentLayout.scale = [1.0,1.0];
                    }
                    else{
                      scope.content.section.parentLayout.scale = [1.0,1.0];
                    }
                  };

                  scope.tablet = function(){
                    scope.content.section.icons.scale = [0.45,0.45];
                    scope.content.section.icons.size = [100,100];
                    //scope.content.section.elements.copy.align =  [0.3,0.5];
                    //scope.content.section.elements.copy.origin =  [0.0,0.0];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[8],true];
                    scope.content.section.elements.copy.scale = [0.85,0.85];
                    //scope.content.section.elements.fore.scale = [0.55,0.55];
                    scope.content.section.elements.back.scale = [0.3,0.3];
                    scope.content.section.elements.source.scale = [0.9,0.9];
                    scope.content.section.elements.contributor.scale = [0.66,0.66];
                    scope.content.section.childLayout.size = [280,360];
                    scope.content.section.childLayout.child.size = [280,110];
                    scope.content.section.parentLayout.scale = [1.0,1.0];
                  };

                  scope.small = function(){
                    scope.content.section.icons.scale = [0.5,0.5];
                    scope.content.section.icons.size = [128,128];
                    //scope.content.section.elements.copy.align =  [0.5,0.3];
                    //scope.content.section.elements.copy.origin =  [0.5,0.5];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[8],true];
                    scope.content.section.elements.copy.scale = [1.0,1.0];
                    //scope.content.section.elements.fore.scale = [0.75,0.75];
                    scope.content.section.elements.back.scale = [0.5,0.5];
                    scope.content.section.elements.source.scale = [0.9,0.9];
                    scope.content.section.elements.contributor.scale = [0.66,0.66];
                    scope.content.section.childLayout.size = [280,360];
                    scope.content.section.childLayout.child.size = [280,110];
                    scope.content.section.parentLayout.scale = [1.0,1.0];
                  };

                  scope.medium = function(){
                    scope.content.section.icons.scale = [0.75,0.75];
                    scope.content.section.icons.size = [200,200];
                    //scope.content.section.elements.copy.align =  [0.5,0.3];
                    //scope.content.section.elements.copy.origin =  [0.5,0.5];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[8],true];
                    scope.content.section.elements.copy.scale = [1.0,1.0];
                    //scope.content.section.elements.fore.scale = [0.8,0.8];
                    scope.content.section.elements.back.scale = [0.6,0.6];
                    scope.content.section.elements.source.scale = [1.15,1.15];
                    scope.content.section.elements.contributor.scale = [0.75,0.75];
                    scope.content.section.childLayout.size = [280,360];
                    scope.content.section.childLayout.child.size = [280,110];
                    scope.content.section.parentLayout.scale = [1.0,1.0];
                  };

                  scope.large = function(){
                    scope.content.section.icons.scale = [1.0,1.0];
                    scope.content.section.icons.size = [256,256];
                    //scope.content.section.elements.copy.align =  [0.5,0.5];
                    //scope.content.section.elements.copy.origin =  [0.5,0.5];
                    scope.content.section.elements.copy.size =  [respond.grid.colSpan[6],true];
                    scope.content.section.elements.copy.scale = [1.0,1.0];
                    //scope.content.section.elements.fore.scale = [0.8,0.8];
                    scope.content.section.elements.back.scale = [0.5,0.5];
                    scope.content.section.elements.source.scale = [1.15,1.15];
                    scope.content.section.elements.contributor.scale = [0.75,0.75];
                    scope.content.section.childLayout.size = [280,360];
                    scope.content.section.childLayout.child.size = [280,110];
                    scope.content.section.parentLayout.scale = [1.0,1.0];


                  };

                  scope.ultrahd = function(){
                    scope.large();
                  };

                  // tracks mouse and touch movements so they can be synced with cursors
                  GenericSync.register({
                    "mouse": MouseSync,
                    "touch": TouchSync,
                    "scroll": ScrollSync
                  });

                  // syncs mouse and touch movement with scrubber cursor
                  var sync = new GenericSync(
                    ["mouse", "touch", "scroll"]
                  );

                  Engine.pipe(sync);

                  scope.nextVignette = function(){
                   // console.log('trigger next vignette');
                    scope.transition = true;
                    //dotNav.children[scope.masterIndex].className = "dot";
                    outT(scope.masterIndex,scope.vignettes);
                    scope.masterIndex++;
                    //dotNav.children[scope.masterIndex].className = "dot active";
                    setTimeout(function(){
                      inT(scope.masterIndex,scope.vignettes);
                    },500);

                    scope.zoom = true;
                    if(!scope.$$phase){
                      scope.$apply();
                    }
                  };
                  scope.lastVignette = function(){
                   // console.log('trigger last vignette');
                    scope.transition = true;
                    //dotNav.children[scope.masterIndex].className = "dot";
                    backT(scope.masterIndex,scope.vignettes);
                    scope.masterIndex--;
                    //dotNav.children[scope.masterIndex].className = "dot active";
                    fromT(scope.masterIndex,scope.vignettes);
                    scope.zoom = true;
                    if(!scope.$$phase){
                      scope.$apply();
                    }
                  };



                  sync.on("update", function(data) {
                      //update++;
                      //position = data.position;
                      delta = data.delta;


                      if(scope.transition === false){

                        if(delta[1] < -30){
                          if(scope.masterIndex < masterLimit - 1){
                           scope.nextVignette();
                          }
                        }
                        else if(delta[1] > 30){
                          if(scope.masterIndex > 0){
                           scope.lastVignette();
                          }
                        }
                        else if (delta[1] < 0){
                          //console.log('increase',transform);
                          transform = transform + 1;
                          //transform = ;
                          scope.transition = true;

                          scope.p[scope.masterIndex].setTranslate([0,0,(transform/2)],{duration:500, curve:Easing.outElastic},function(){
                            scope.transition = false;
                            scope.zoom = false;

                          });
                        }
                        else if (delta[1] > 0){
                          // console.log('decrease',transform);
                          transform = transform - 1;
                          scope.transition = true;

                          scope.p[scope.masterIndex].setTranslate([0,0,(transform/2)],{duration:500, curve:Easing.outElastic},function(){
                            scope.transition = false;
                            scope.zoom = false;
                          });
                        }

                        //console.log(delta);

                      } // end if transition === false
                  });

                  window.addEventListener('stateChange',function(){

                    scope.content.section.parentLayout.size = [window.innerWidth/1.5,140];
                    scene.renderer.setSize( window.innerWidth, window.innerHeight );
                    resetVignette();
                    scope.state = respond.state;
                    console.log(respond.state);
                      scope.removeElements();

                  });



                  $http.get('./models/index.json').then(function(res){


                    States.stateChange(scope);
                    resetVignette();
                    alignElements();
                    inT(scope.masterIndex,scope.vignettes);
                    //console.log('content loaded from event');
                    for(var index=0;index<scope.vignettes.length;index++){
                       if(index!==scope.masterIndex){
                         outT(index,scope.vignettes);
                         //console.log(index);
                       }
                    }
                    scope.removeElements();

                  });



                  scope.removeElements = function(){
                    if(respond.state !== 'tablet' && respond.state !== 'phablet' &&  respond.state !== 'mobile'){
                      return true;
                    }else{
                      return false;
                    }
                  };


                  controller.$render = function(){

                      masterLimit = scope.vignettes.length;

                  };


                  $rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {

                    //lastState = from.name.split('.');
                    //currentState = to.name.split('.');

                    console.log(from.url,to.url);
                    if(from.url === '/login' && to.url === '/feed'){
                      scope.transition = false;
                    }
                    else{
                      scope.transition = true;
                      scope.navTransitionOpacity = 0;
                      camTrans.set([0, 0, 1000],{duration: 2000, curve: Easing.inOutCubic});
                    }

                  });


                },
              }
            };
          }; // End Directive def


      // If Using Angular Dep Injection
      return [ "States", "$famous", "$rootScope", "$state", "$http", SectionDirective ];
    } // end require function
  ); // end define call

}( define ));
