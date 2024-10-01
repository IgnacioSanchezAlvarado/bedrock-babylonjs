import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { callBedrockAPI } from './helpers/bedrockApi.js';
import { createMeshesFromConfig, updateMeshConfig, disposeAllMeshes } from './helpers/createMeshes.js';

const initialMeshConfigurations = {
  object1: {
    type: 'sphere',
    name: 'greenSphere',
    options: {
      diameter: 2,
      segments: 32
    },
    color: 'Green',
    position: [0, 5, 0],
    rotation: [0, 45, 0],
    scaling: [1, 1, 1]
  },
  object2: {
    type: 'torus',
    name: 'redTorus',
    options: {
      diameter: 5,
      thickness: 1,
      tessellation: 32
    },
    color: 'Red',
    position: [0, 8, 0],
    rotation: [0, 0, 0],
    scaling: [1.2, 1.2, 1.2]
  }
};

const BabylonScene = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const meshConfigurationsRef = useRef(initialMeshConfigurations);
  const [, forceUpdate] = useState();

  const createScene = useCallback(async function() {
    const scene = new BABYLON.Scene(engineRef.current);
    sceneRef.current = scene;

    const camera = new BABYLON.ArcRotateCamera("camera", 0, 1.2, 40, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvasRef.current, true);
    camera.inputs.addMouseWheel();

    const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(5, 5, -5), scene);
    new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 0, 0), scene);
    new BABYLON.ShadowGenerator(1024, light);

    createMeshesFromConfig(scene, meshConfigurationsRef.current);

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
            createMeshesFromConfig(scene, meshConfigurationsRef.current);
            input1.text = "";
            forceUpdate({});  // Force a re-render
          })
          .catch(error => {
            console.error("Error calling Bedrock API:", error);
          });
      }
    });

    await scene.createDefaultXRExperienceAsync({
      floorMeshes: [ground],
      uiOptions: {
        sessionMode: "immersive-ar",
        referenceSpaceType: "local-floor",
      },
    });

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