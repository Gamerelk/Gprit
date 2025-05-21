//-------------------------
// Coordinates System & Camera Control
//-------------------------

// Camera Viewing Distance
const NEAR = 0.1;
const FAR = 1000;

// Create Scene
const Scene = new THREE.Scene();

// Get Window Maximum Width & Height
const WINDOW_WIDTH = innerWidth;
const WINDOW_HEIGHT = innerHeight;

// Create Renderer & Set Size To Window Size
const Renderer = new THREE.WebGLRenderer();
Renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);

// Create Camera
const Camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, NEAR, FAR);

// Add Renderer To Document
const Main = document.getElementById('main');
Main.appendChild(Renderer.domElement);

// Create A Grid Helper (XY Plane)
const GridHelper = new THREE.GridHelper(10000, 10000);
Scene.add(GridHelper);

// Create An Axes Helper (X, Y, Z Axes)
const AxesHelper = new THREE.AxesHelper(10000);
Scene.add(AxesHelper);

// Orbit Values
let Radius = 10;
let Theta = Math.PI / 4; // Horizontal Angle (Y Axis)
let Phi = Math.PI / 4;   // Vertical Angle (X Axis)

// Update Camera Position From Spherical Coordinates
function UpdateCameraPosition() {

    const PhiClamped = Math.max(0.01, Math.min(Math.PI - 0.01, Phi));
    Camera.position.x = Radius * Math.sin(PhiClamped) * Math.sin(Theta);
    Camera.position.y = Radius * Math.cos(PhiClamped);
    Camera.position.z = Radius * Math.sin(PhiClamped) * Math.cos(Theta);
    Camera.lookAt(0, 0, 0);
}

UpdateCameraPosition();

// Mouse Control
let IsDragging = false;
let PreviousMousePosition = { x: 0, y: 0 };
let IsTransformActive = false; // Flag To Check If Transform Controls Are Active

Renderer.domElement.addEventListener("mousedown", (Event) => {

    // Only Allow Camera Rotation If Transform Controls Are Not Active
    if (Event.button === 2 && !IsTransformActive) {

        IsDragging = true;
        PreviousMousePosition = { x: Event.clientX, y: Event.clientY };
    }
});

Renderer.domElement.addEventListener("mouseup", () => {
    IsDragging = false;
});

Renderer.domElement.addEventListener("mousemove", (Event) => {

    if (!IsDragging || IsTransformActive) return;

    const DeltaMove = {
        x: Event.clientX - PreviousMousePosition.x,
        y: Event.clientY - PreviousMousePosition.y,
    };

    // Default Rotation Speed
    const ROTATESPEED = 0.005;

    Theta -= DeltaMove.x * ROTATESPEED;
    Phi -= DeltaMove.y * ROTATESPEED;

    UpdateCameraPosition();

    PreviousMousePosition = {
        x: Event.clientX,
        y: Event.clientY,
    };
});

Renderer.domElement.addEventListener("mouseleave", () => {
    IsDragging = false;
});

// Zoom With Scroll Wheel
Renderer.domElement.addEventListener("wheel", (Event) => {

    // Only Allow Zoom If Transform Controls Are Not Active
    if (IsTransformActive) return;

    Event.preventDefault();

    // Default Zoom Intensity & Delta
    const ZOOMINTENSITY = 0.5;
    const DELTA = Event.deltaY > 0 ? 1 : -1;

    // Use A Scaling Factor That Decreases As Radius Approaches 1
    const ZoomFactor = ZOOMINTENSITY * Math.max(0.1, (Radius - 1) / 10);
    Radius += DELTA * ZoomFactor;

    // Clamp The Radius To Stay Above A Minimum Distance
    Radius = Math.max(1.1, Radius);

    UpdateCameraPosition();
}, { passive: false });

// Initialize Transform Controls
const TransformControls = new THREE.TransformControls(Camera, Renderer.domElement);
Scene.add(TransformControls);

// Handle Transform Controls Events
TransformControls.addEventListener('dragging-changed', (Event) => {
    IsTransformActive = Event.value;
});

// Handle Transform Mode Switching
const TransformModes = ['translate', 'rotate', 'scale'];
let CurrentModeIndex = 0;

document.addEventListener('keydown', (Event) => {

    // Spacebar To cycle Through Transform Modes
    if (Event.code === 'Space' && TransformControls.object) {
        Event.preventDefault();
        CurrentModeIndex = (CurrentModeIndex + 1) % TransformModes.length;
        TransformControls.setMode(TransformModes[CurrentModeIndex]);
    }

    // Escape Key To Detach Controls
    if (Event.code === 'Escape') {
        TransformControls.detach();
    }
});

// Render Loop
function Animate() {

    requestAnimationFrame(Animate);
    Renderer.render(Scene, Camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {

    const NewWidth = window.innerWidth;
    const NewHeight = window.innerHeight;
    
    Camera.aspect = NewWidth / NewHeight;
    Camera.updateProjectionMatrix();
    
    Renderer.setSize(NewWidth, NewHeight);
});

Animate();

//-------------------------
// Sprite Configuration & Code
//-------------------------

const FileInput = document.getElementById('imageFileInput');
const PreviewImage = document.getElementById('previewImage');

// Array To Store All Sprites For Selection
const Sprites = [];
let SelectedSprite = null;
let UserTexture = null;

//-------------------------
// Texture Filtering Section
//-------------------------

// Add Texture Filtering Options
const TextureFilters = {

    'Nearest Neighbor': {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
    },
    'Bilinear': {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    },
    'Trilinear': {
        minFilter: THREE.LinearMipMapLinearFilter,
        magFilter: THREE.LinearFilter
    }
};

// Default Filter
let CurrentFilterType = 'Bilinear';

// Function to apply texture filtering to a texture
function ApplyTextureFilter(Texture, FilterType) {

    const Filter = TextureFilters[FilterType];
    
    if (Filter) {

        Texture.minFilter = Filter.minFilter;
        Texture.magFilter = Filter.magFilter;
        
        // If Using Mipmaps With Trilinear Filtering
        if (FilterType === 'Trilinear') {
            Texture.generateMipmaps = true;
        } else {
            Texture.generateMipmaps = false;
        }
        
        Texture.needsUpdate = true;
    }
}

// Update The File Input Handler To Apply The Selected Filter To New Textures
FileInput.addEventListener('change', (Event) => {

    const File = Event.target.files[0];

    if (!File) return;

    const Url = URL.createObjectURL(File);

    // Set Preview Image Src And Show It
    PreviewImage.src = Url;
    PreviewImage.style.display = 'block';

    new THREE.TextureLoader().load(Url, (Texture) => {

        if (UserTexture) UserTexture.dispose();

        UserTexture = Texture;
        
        // Apply Selected Filter
        ApplyTextureFilter(UserTexture, CurrentFilterType);
        
        URL.revokeObjectURL(Url);

        console.log('User texture loaded with filter:', CurrentFilterType);
    });
});

// Update Filtering For Selected Sprite
document.getElementById('applyFilterBtn').addEventListener('click', () => {

    const FilterSelect = document.getElementById('filterSelect');
    CurrentFilterType = FilterSelect.value;
    
    // Apply To Current Texture If It Exists
    if (UserTexture) {
        ApplyTextureFilter(UserTexture, CurrentFilterType);
    }
    
    // Apply To Selected Sprite If It Exists
    if (SelectedSprite && SelectedSprite.userData.visiblePlane) {

        const Material = SelectedSprite.userData.visiblePlane.material;
        
        if (Material && Material.map) {
            ApplyTextureFilter(Material.map, CurrentFilterType);
        }
    }
});

function CreatePlaneSprite() {

    if (!UserTexture) {
        alert('Please upload an image first!');
        return null;
    }

    // Create A Group To Hold Both The Visible Sprite And Invisible Selection Helper
    const SpriteGroup = new THREE.Group();
    
    // Size 5x5 Units For The Visible Sprite
    const Geometry = new THREE.PlaneGeometry(5, 5);
    
    // Clone The Texture To Avoid Sharing It Between Sprites
    const TextureClone = UserTexture.clone();
    
    // Apply the selected filter to the cloned texture
    ApplyTextureFilter(TextureClone, CurrentFilterType);
    
    const Material = new THREE.MeshBasicMaterial({map: TextureClone, transparent: true, side: THREE.DoubleSide});
    
    const Plane = new THREE.Mesh(Geometry, Material);
    
    // Add The Visible Sprite To The Group
    SpriteGroup.add(Plane);
    
    // Create A Slightly Larger Invisible Box For Easier Selection (20% Larger)
    const SelectionGeometry = new THREE.BoxGeometry(6, 6, 0.5);
    const SelectionMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0.0, depthWrite: false});

    const SelectionBox = new THREE.Mesh(SelectionGeometry, SelectionMaterial);
    
    // Add The Selection Helper To The Group
    SpriteGroup.add(SelectionBox);
    
    // Position The Group At The Origin
    SpriteGroup.position.set(0, 0, 0);
    
    // Mark The Group As A Sprite For Selection
    SpriteGroup.userData.isSprite = true;
    
    // Reference To The Actual Visible Plane For Texture Updates If Needed
    SpriteGroup.userData.visiblePlane = Plane;
    
    // Store The Current Filter Type
    SpriteGroup.userData.filterType = CurrentFilterType;
    
    return SpriteGroup;
}

document.getElementById('addSpriteBtn').addEventListener('click', () => {

    const PlaneSprite = CreatePlaneSprite();

    if (PlaneSprite) {
        Scene.add(PlaneSprite);
        Sprites.push(PlaneSprite);
        
        // Automatically Select The Newly Added Sprite
        SelectSprite(PlaneSprite);
    }
});

// Raycaster For Mouse Selection
const Raycaster = new THREE.Raycaster();
const Mouse = new THREE.Vector2();

// Add Event Listener For Sprite Selection
Renderer.domElement.addEventListener('click', (Event) => {

    // Check If Right-Click Or If Transform Is Active
    if (Event.button === 2 || IsTransformActive) return;
    
    // Calculate Mouse Position In Normalized Device Coordinates (-1 To +1)
    Mouse.x = (Event.clientX / WINDOW_WIDTH) * 2 - 1;
    Mouse.y = -(Event.clientY / WINDOW_HEIGHT) * 2 + 1;
    
    // Update The Picking Ray With The Camera And Mouse Position
    Raycaster.setFromCamera(Mouse, Camera);
    
    // Calculate Objects Intersecting The Picking Ray, Include Children For Group Detection
    const Intersects = Raycaster.intersectObjects(Scene.children, true);
    
    // Find The First Intersected Object That Belongs To A Sprite Group
    let SpriteToSelect = null;
    
    for (let i = 0; i < Intersects.length; i++) {

        // Check If This Object Is Part Of A Sprite Group
        let Parent = Intersects[i].object;
        
        // Traverse Up To Find The Top-Level Parent
        while (Parent.parent && Parent.parent !== Scene) {
            Parent = Parent.parent;
        }
        
        // If The Top Parent Is A Sprite Group, Select It
        if (Parent.userData && Parent.userData.isSprite) {
            SpriteToSelect = Parent;
            break;
        }
    }
    
    if (SpriteToSelect) {
        // Select The Sprite Group
        SelectSprite(SpriteToSelect);
    } else {
        // Deselect If Clicked On Empty Space
        DeselectCurrentSprite();
    }
});

// Add Visual Feedback For The Currently Selected Sprite
function SelectSprite(Sprite) {

    // If There Was A Previously Selected Sprite, Remove Any Selection Indicator
    if (SelectedSprite && SelectedSprite.userData.selectionOutline) {

        SelectedSprite.remove(SelectedSprite.userData.selectionOutline);
        delete SelectedSprite.userData.selectionOutline;
    }
    
    SelectedSprite = Sprite;
    TransformControls.attach(Sprite);
    TransformControls.setMode(TransformModes[CurrentModeIndex]);
    
    // Create A Visible Outline To Show Which Sprite Is Selected
    const VisiblePlane = Sprite.userData.visiblePlane;
    const OutlineGeometry = new THREE.EdgesGeometry(VisiblePlane.geometry);
    const OutlineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const OutlineMesh = new THREE.LineSegments(OutlineGeometry, OutlineMaterial);
    
    // Position The Outline Just In Front Of The Sprite To Avoid Z-Fighting
    OutlineMesh.position.z = 0.01;
    
    // Add The Outline To The Sprite And Store A Reference
    Sprite.add(OutlineMesh);
    Sprite.userData.selectionOutline = OutlineMesh;
}

// Function To Deselect The Current Sprite
function DeselectCurrentSprite() {

    // Only Detach Transform Controls If There Was A Selected Sprite
    if (SelectedSprite) {
        TransformControls.detach();
        
        // Remove Selection Outline When Deselecting
        if (SelectedSprite.userData.selectionOutline) {

            SelectedSprite.remove(SelectedSprite.userData.selectionOutline);
            delete SelectedSprite.userData.selectionOutline;
        }
        
        SelectedSprite = null;
    }
}

// Function To Display Delete Confirmation
function ShowDeleteConfirmation() {

    if (confirm("Would you wish to delete this sprite?")) {
        DeleteSelectedSprite();
    }
}

// Function To Delete The Selected Sprite
function DeleteSelectedSprite() {

    if (SelectedSprite) {

        // Remove Selection Outline If It Exists
        if (SelectedSprite.userData.selectionOutline) {
            SelectedSprite.remove(SelectedSprite.userData.selectionOutline);
        }
        
        // Remove From Scene And Array
        Scene.remove(SelectedSprite);
        const Index = Sprites.indexOf(SelectedSprite);

        if (Index > -1) {
            Sprites.splice(Index, 1);
        }

        TransformControls.detach();
        SelectedSprite = null;
    }
}

// Prevent Context Menu On Right-Click
Renderer.domElement.addEventListener('contextmenu', (Event) => {
    Event.preventDefault();
});

// Handle Keyboard Shortcuts
document.addEventListener('keydown', (Event) => {

    // Spacebar To Cycle Through Transform Modes
    if (Event.code === 'Space' && TransformControls.object) {

        Event.preventDefault();
        CurrentModeIndex = (CurrentModeIndex + 1) % TransformModes.length;
        TransformControls.setMode(TransformModes[CurrentModeIndex]);
    }

    // Escape Key To Detach Controls
    if (Event.code === 'Escape') {
        DeselectCurrentSprite();
    }

    // Delete Key To Remove Selected Sprite With Confirmation
    if ((Event.code === 'Delete' || Event.code === 'Backspace') && SelectedSprite) {
        Event.preventDefault();
        ShowDeleteConfirmation();
    }

    // 'Tab' Key To Cycle Through Available Sprites
    if (Event.code === 'Tab') {

        // Prevent Tabbing Out Of Yhe Window
        Event.preventDefault();
        
        if (Sprites.length > 0) {
            let NextIndex = 0;
            
            // Find The Index Of The Currently Selected Sprite
            if (SelectedSprite) {
                const CurrentIndex = Sprites.indexOf(SelectedSprite);
                NextIndex = (CurrentIndex + 1) % Sprites.length;
            }
            
            // Select The Next Sprite
            SelectSprite(Sprites[NextIndex]);
        }
    }
});

// Add Event Listeners For Control Buttons
const ModeButtons = [
    { Id: 'translateBtn', Mode: 'translate', Index: 0 },
    { Id: 'rotateBtn', Mode: 'rotate', Index: 1 },
    { Id: 'scaleBtn', Mode: 'scale', Index: 2 }
];

ModeButtons.forEach(({ Id, Mode, Index }) => {

    document.getElementById(Id).addEventListener('click', () => {

        if (TransformControls.object) {
            TransformControls.setMode(Mode);
            CurrentModeIndex = Index;
        }
    });
});

document.getElementById('deleteBtn').addEventListener('click', () => {
    
    if (SelectedSprite) {
        ShowDeleteConfirmation();
    }
});