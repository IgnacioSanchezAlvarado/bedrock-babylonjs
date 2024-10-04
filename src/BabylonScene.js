import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { callBedrockAPI } from './helpers/bedrockApi.js';
import { createMeshesFromConfig, updateMeshConfig, disposeAllMeshes } from './helpers/createMeshes.js';
import { sendAudioToAPI } from './helpers/AudioRecording.js';

const initialMeshConfigurations = {
  object1: {
    type: 'box',
    name: 'brownbox',
    options: {
      diameter: 1,
      segments: 32
    },
    color: 'brown',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scaling: [1, 1, 1],
    animation: true
  },
  object2: {
    type: 'torus',
    name: 'redTorus',
    options: {
      diameter: 4,
      thickness: 1,
      tessellation: 32
    },
    color: 'Red',
    position: [0, 2, 0],
    rotation: [0, 0, 0],
    scaling: [1, 1, 1],
    animation: false
  }
};

const BabylonScene = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const meshConfigurationsRef = useRef(initialMeshConfigurations);
  const [, forceUpdate] = useState();
  const [xr, setXR] = useState(null);
  const [xrInput, setXRInput] = useState(null);

  const createScene = useCallback(async function() {
    const scene = new BABYLON.Scene(engineRef.current);
    sceneRef.current = scene;

    const supported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
    if (!supported) {
      console.log("AR is not supported on this device");
      // ar not available, session not supported
      const camera = new BABYLON.ArcRotateCamera("camera", 0, 1.2, 40, new BABYLON.Vector3(0, 0, 0), scene);
      camera.attachControl(canvasRef.current, true);
      camera.inputs.addMouseWheel();
      // Ground
      const ground = BABYLON.MeshBuilder.CreateGround('ground', {width: 20, height: 20}, scene);
      ground.position = new BABYLON.Vector3(0, -1, 0);
      ground.receiveShadows = true;

      // GUI
      const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
      const input1 = new GUI.InputText("Input");
      input1.width = "700px";
      input1.maxWidth = 0.2;
      input1.height = "40px";
      input1.placeholderText = "Type here...";
      input1.color = "white";
      input1.background = "grey";
      input1.top = "35%"; 
      input1.left = "0%";
      advancedTexture.addControl(input1);

      // Add event listener for Enter key
      input1.onKeyboardEventProcessedObservable.add((eventData) => {
        if (eventData.key === "Enter") {
          const meshConfigString = JSON.stringify(meshConfigurationsRef.current, null, 2);
          callBedrockAPI(input1.text, meshConfigString)
            .then(response => {
              console.log(response);
              const updatedConfig = JSON.parse(response);
              meshConfigurationsRef.current = updateMeshConfig(meshConfigurationsRef.current, updatedConfig);
              disposeAllMeshes(scene);
              const { meshes, animationGroup } = createMeshesFromConfig(scene, meshConfigurationsRef.current);
              animationGroup.play(true);
              input1.text = "";
              forceUpdate({});  // Force a re-render
            })
            .catch(error => {
              console.error("Error calling Bedrock API:", error);
            });
        }
      });
    }

    const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(5, 5, -5), scene);
    new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 0, 0), scene);
    new BABYLON.ShadowGenerator(1024, light);

    const { meshes, animationGroup } = createMeshesFromConfig(scene, meshConfigurationsRef.current);
    animationGroup.play(true);

    if(supported){
      try {
        const xrExperience = await scene.createDefaultXRExperienceAsync({
          uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor",
          },
        });
        setXR(xrExperience);

        const featuresManager = xrExperience.baseExperience.featuresManager;

        //pop-up panel
        const manager = new BABYLON.GUI.GUI3DManager(scene);

        const panel = new BABYLON.GUI.HolographicSlate("popup");
        panel.width = "30cm";
        panel.height = "20cm";
        panel.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        panel.position = new BABYLON.Vector3(0, 1.5, 1);
        manager.addControl(panel);
        panel.isVisible = true; // Hide initially

        const stackPanel = new BABYLON.GUI.StackPanel3D();
        panel.content = stackPanel;

        const text = new BABYLON.GUI.TextBlock();
        text.text = "This is a pop-up message!";
        text.color = "white";
        text.fontSize = 24;
        stackPanel.addControl(text);
        
        const button = new BABYLON.GUI.Button3D("dismissButton");
        const buttonText = new BABYLON.GUI.TextBlock();
        buttonText.text = "Got it!";
        buttonText.color = "white";
        buttonText.fontSize = 16;
        button.content = buttonText;
        stackPanel.addControl(button);

        button.onPointerUpObservable.add(() => {
          panel.dispose();
        });
        

        setXRInput(xrExperience.input);

        //Setting up audio recording
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;

        async function setupAudioRecording() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
              audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              sendAudioToAPI(audioBlob).then(response => {
              console.log(response);    
              const meshConfigString = JSON.stringify(meshConfigurationsRef.current, null, 2);
              callBedrockAPI(response, meshConfigString)
                .then(response => {
                  console.log(response);
                  const updatedConfig = JSON.parse(response);
                  meshConfigurationsRef.current = updateMeshConfig(meshConfigurationsRef.current, updatedConfig);
                  disposeAllMeshes(scene);
                  const { meshes, animationGroup } = createMeshesFromConfig(scene, meshConfigurationsRef.current);
                  animationGroup.play(true);
                  forceUpdate({});  // Force a re-render
                })
                .catch(error => {
                  console.error("Error calling Bedrock API:", error);
                });});
              const audioUrl = URL.createObjectURL(audioBlob);
              console.log("Audio recording finished:", audioUrl);
              audioChunks = [];
            };
          } catch (error) {
            console.error("Error setting up audio recording:", error);
          }
        }

        //checking path
        //console.log("Current script path:", document.currentScript.src);
        console.log("Current script path:", document.currentScript ? document.currentScript.src : "Unable to determine");
        console.log("Base URL:", document.baseURI);

        // setting up sound play
        const audioStartSrc = process.env.PUBLIC_URL + '/start.mp3';
        const audioStopSrc = process.env.PUBLIC_URL + '/stop.mp3';
        var startRecordingSound = new BABYLON.Sound("startRecording", audioStartSrc, scene);
        var stopRecordingSound = new BABYLON.Sound("stopRecording", audioStopSrc, scene);

        await setupAudioRecording();

        // Adding input controls
        xrExperience.input.onControllerAddedObservable.add((controller) => {
          console.log("Controller added:", controller.handedness);
          
          controller.onMotionControllerInitObservable.add((motionController) => {
            console.log("Motion controller initialized:", motionController.handedness);
            
            const mainComponent = motionController.getMainComponent();
            
            if (mainComponent) {
              console.log("Main component found for", motionController.handedness, "controller");
              
              mainComponent.onButtonStateChangedObservable.add((component) => {
                if (component.changes.pressed) {
                  if (component.pressed) {
                    console.log(motionController.handedness, "trigger pressed");
                    if (!isRecording) {
                      console.log("Starting recording");
                      if (startRecordingSound) {
                        startRecordingSound.play();
                      } else {
                        console.error("Start recording sound not available");
                      }
                      if (mediaRecorder) {
                        mediaRecorder.start();
                      } else {
                        console.error("Media recorder not available");
                      }
                      isRecording = true;
                    }
                  } else {
                    console.log(motionController.handedness, "trigger released");
                    if (isRecording) {
                      console.log("Stopping recording");
                      if (stopRecordingSound) {
                        stopRecordingSound.play();
                      } else {
                        console.error("Stop recording sound not available");
                      }
                      if (mediaRecorder) {
                        mediaRecorder.stop();
                      } else {
                        console.error("Media recorder not available");
                      }
                      isRecording = false;
                    }
                  }
                }
              });
            } else {
              console.error("No main component found for", motionController.handedness, "controller");
            }
          });
        });
      } catch (error) {
        console.error("Error initializing WebXR:", error);
      }
    }
    return scene;
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new BABYLON.Engine(canvasRef.current, true);
      
      createScene().then(() => {
        const renderLoop = () => {
          if (sceneRef.current) {
            sceneRef.current.render();
          }
        };
        engineRef.current.runRenderLoop(renderLoop);
      });

      const handleResize = () => {
        if (engineRef.current) {
          engineRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (engineRef.current) {
          engineRef.current.stopRenderLoop();
          engineRef.current.dispose();
        }
        if (sceneRef.current) {
          sceneRef.current.dispose();
        }
      };
    }
  }, [createScene]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default BabylonScene;