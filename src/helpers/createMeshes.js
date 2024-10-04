import * as BABYLON from '@babylonjs/core';

function createMeshesFromConfig(scene, configurations, supported) {
    const meshes = {};
    const animationGroup = new BABYLON.AnimationGroup("meshAnimations");

    const meshBuilders = {
        sphere: BABYLON.MeshBuilder.CreateSphere,
        torus: BABYLON.MeshBuilder.CreateTorus,
        box: BABYLON.MeshBuilder.CreateBox,
        cylinder: BABYLON.MeshBuilder.CreateCylinder,
        plane: BABYLON.MeshBuilder.CreatePlane,
        ground: BABYLON.MeshBuilder.CreateGround,
        disc: BABYLON.MeshBuilder.CreateDisc,
        lines: BABYLON.MeshBuilder.CreateLines,
        dashedLines: BABYLON.MeshBuilder.CreateDashedLines,
        ribbon: BABYLON.MeshBuilder.CreateRibbon,
        tube: BABYLON.MeshBuilder.CreateTube,
        polyhedron: BABYLON.MeshBuilder.CreatePolyhedron,
        icosphere: BABYLON.MeshBuilder.CreateIcoSphere,
        lathe: BABYLON.MeshBuilder.CreateLathe
    };

    const colorMap = {
        red: new BABYLON.Color3(1, 0, 0),
        green: new BABYLON.Color3(0, 1, 0),
        blue: new BABYLON.Color3(0, 0, 1),
        yellow: new BABYLON.Color3(1, 1, 0),
        cyan: new BABYLON.Color3(0, 1, 1),
        magenta: new BABYLON.Color3(1, 0, 1),
        white: new BABYLON.Color3(1, 1, 1),
        black: new BABYLON.Color3(0, 0, 0),
        brown: new BABYLON.Color3(0.6, 0.4, 0.2),
        orange: new BABYLON.Color3(1, 0.65, 0),
        purple: new BABYLON.Color3(0.5, 0, 0.5),
        pink: new BABYLON.Color3(1, 0.75, 0.8),
        gray: new BABYLON.Color3(0.5, 0.5, 0.5),
        lightGray: new BABYLON.Color3(0.75, 0.75, 0.75),
        darkGray: new BABYLON.Color3(0.25, 0.25, 0.25),
        lightBlue: new BABYLON.Color3(0.68, 0.85, 0.9),
        lightGreen: new BABYLON.Color3(0.56, 0.93, 0.56),
        darkGreen: new BABYLON.Color3(0, 0.39, 0),
        darkBlue: new BABYLON.Color3(0, 0, 0.55),
        gold: new BABYLON.Color3(1, 0.84, 0),
        silver: new BABYLON.Color3(0.75, 0.75, 0.75),
        bronze: new BABYLON.Color3(0.8, 0.5, 0.2),
        turquoise: new BABYLON.Color3(0.25, 0.88, 0.82),
        lavender: new BABYLON.Color3(0.9, 0.9, 0.98),
        beige: new BABYLON.Color3(0.96, 0.96, 0.86)
    };

    for (const [key, config] of Object.entries(configurations)) {
        try {
            // Convert mesh type to lowercase for case-insensitive matching
            const meshType = config.type.toLowerCase();
            const builder = meshBuilders[meshType];
            if (!builder) {
                console.warn(`Unsupported mesh type: ${config.type}`);
                continue;
            }

            const mesh = builder(config.name, { ...config.options, updatable: true }, scene);

            // Position, rotation, and scaling
            if(supported){
                config.position[2] += 1;
                mesh.position = new BABYLON.Vector3(...(config.position || [0, 0, 0]));
                mesh.rotation = new BABYLON.Vector3(...(config.rotation || [0, 0, 0]).map(deg => deg * Math.PI / 180));
                const scalar = 0.2;
                config.scaling[0] *= scalar;
                config.scaling[1] *= scalar;
                config.scaling[2] *= scalar;
                mesh.scaling = new BABYLON.Vector3(...(config.scaling || [1, 1, 1]));


            }
            else{
            mesh.position = new BABYLON.Vector3(...(config.position || [0, 0, 0]));
            mesh.rotation = new BABYLON.Vector3(...(config.rotation || [0, 0, 0]).map(deg => deg * Math.PI / 180));
            mesh.scaling = new BABYLON.Vector3(...(config.scaling || [1, 1, 1]));
            }

            // Animation
            console.log("mesh: ", mesh.name, "animation: ", config.animation)
            if(config.animation){
                var frameRate = 10;
                var yRot = new BABYLON.Animation("yRot", "rotation.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

                var keyFramesR = []; 
            
                keyFramesR.push({
                    frame: 0,
                    value: 0
                });
            
                keyFramesR.push({
                    frame: frameRate,
                    value: Math.PI
                });
            
                keyFramesR.push({
                    frame: 2 * frameRate,
                    value: 2 * Math.PI
                });
            
            
                yRot.setKeys(keyFramesR);
            
                animationGroup.addTargetedAnimation(yRot, mesh);
                console.log("Applied rotation to:", mesh.name);
            }




            // Material
            if (config.material) {
                mesh.material = config.material;
            } else {
                const material = new BABYLON.StandardMaterial(config.name + "Material", scene);
                if (typeof config.color === 'string') {
                    const colorLower = config.color.toLowerCase();
                    if (colorMap[colorLower]) {
                        material.diffuseColor = colorMap[colorLower];
                    } else {
                        console.warn(`Invalid color: ${config.color}. Using default color.`);
                        material.diffuseColor = new BABYLON.Color3(1, 1, 1); // White
                    }
                } else {
                    material.diffuseColor = new BABYLON.Color3(1, 1, 1); // White
                }
                material.specularColor = new BABYLON.Color3(1, 1, 1);
                material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                mesh.material = material;
            }

            // Physics
            if (config.physics !== false) {
                const impostorType = `${meshType.charAt(0).toUpperCase() + meshType.slice(1)}Impostor`;
                if (BABYLON.PhysicsImpostor[impostorType]) {
                    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
                        mesh, 
                        BABYLON.PhysicsImpostor[impostorType],
                        { mass: config.mass || 1, restitution: config.restitution || 0.9 },
                        scene
                    );
                } else {
                    console.warn(`No physics impostor found for mesh type: ${config.type}`);
                }
            }

            // Additional properties
            mesh.receiveShadows = config.receiveShadows !== false;
            mesh.checkCollisions = config.checkCollisions !== false;

            meshes[key] = mesh;
        } catch (error) {
            console.error(`Error creating mesh ${key}:`, error);
        }
    }

    return { meshes, animationGroup };
}

function updateMeshConfig(originalConfig, updatedConfig) {
    const newConfig = {};
    for (const [key, value] of Object.entries(updatedConfig)) {
      newConfig[key] = {...originalConfig[key], ...value};
    }
    return newConfig;
  }

  function disposeAllMeshes(scene) {
    // Create a copy of the meshes array to avoid modifying while iterating
    const meshesToDispose = scene.meshes.filter(mesh => mesh.name !== 'ground');
    
    const errors = [];
    meshesToDispose.forEach(mesh => {
        try {
            // Check for additional references
            if (mesh.references && mesh.references.length > 0) {
                console.warn(`Mesh ${mesh.name} has additional references. Disposing anyway.`);
            }
            mesh.dispose();
        } catch (error) {
            errors.push(`Error disposing ${mesh.name}: ${error.message}`);
        }
    });

    // Log any errors that occurred during disposal
    if (errors.length > 0) {
        console.error("Errors occurred during mesh disposal:", errors);
    }

    // Verify disposal
    const remainingMeshes = scene.meshes.filter(mesh => mesh.name !== 'ground');
    if (remainingMeshes.length > 0) {
        console.warn("Some meshes were not disposed:", remainingMeshes.map(mesh => mesh.name));
    }
}

export { createMeshesFromConfig, updateMeshConfig, disposeAllMeshes };