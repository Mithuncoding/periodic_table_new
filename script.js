document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        learnLevel: localStorage.getItem('learnLevel') || 'beginner',
        currentFilter: 'all',
        favorites: JSON.parse(localStorage.getItem('favorites')) || [],
        gridRendered: false,
        temperature: 298 // Kelvin (Room Temp)
    };

    // --- DOM Elements ---
    const periodicGrid = document.getElementById('periodicGrid');
    const lanthanoidsGrid = document.getElementById('lanthanoidsGrid');
    const actinoidsGrid = document.getElementById('actinoidsGrid');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.nav-btn'); // Renamed class
    
    // Note: learnLevel removed from quick nav for simplicity as requested ("nothing in the way")
    // We can keep it in state or bring it back in a menu later. 
    // const learnSelect = document.getElementById('learnLevel'); 

    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const modal = document.getElementById('elementModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const atomCanvas = document.getElementById('atomCanvas');

    // --- Initialization ---
    init();

    function init() {
        renderTable();
        // Re-select inputs here to be safe if DOM changed (though scripts usually run after)
        const sInput = document.getElementById('searchInput');
        if(sInput) {
             setupSearch(sInput);
        }
        setupEventListeners();
        setupScientificControls();
        setupSpotlight();
    }

    function setupSearch(input) {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.element-card');
            
            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const symbol = (card.dataset.symbol || '').toLowerCase();
                const num = (card.dataset.number || '').toString();
                
                // Allow searching by exact number matching or partial text
                // Also searching by 'gold' should find Au
                if(term === '' || name.includes(term) || symbol.includes(term) || num.startsWith(term)) {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                    card.style.filter = 'none';
                    card.style.pointerEvents = 'all';
                } else {
                    card.style.opacity = '0.05';
                    card.style.transform = 'scale(0.8)';
                    card.style.filter = 'grayscale(100%) blur(2px)';
                    card.style.pointerEvents = 'none';
                }
            });
        });
    }

    function setupSpotlight() {
        document.addEventListener('mousemove', (e) => {
            const grid = document.getElementById('periodicGrid');
            if (!grid) return;
            
            // Optimization: Only update if mouse is near grid? 
            // Or just update all cards relative to mouse?
            // Better performance: Use single listener on container and update locally.
            // But CSS radial-gradient expects local coords.
            
            // For 'God-Tier' effect, we want the spotlight to move across cards.
            // We can update the Grid container's CSS vars, and cards use that? No, better per card for local effect?
            // Actually, the best current tech is:
            // cards.forEach... is slow.
            // Instead, on 'mousemove' over the grid, we update vars.
            
           const cards = document.querySelectorAll('.element-card');
           cards.forEach(card => {
               const rect = card.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const y = e.clientY - rect.top;
               
               card.style.setProperty('--mouse-x', `${x}px`);
               card.style.setProperty('--mouse-y', `${y}px`);
           });
        });
    }

    function setupMenu() {
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('menuOverlay');
        const closeBtn = document.getElementById('closeMenuBtn');

        if(hamburger) {
            hamburger.addEventListener('click', () => {
                overlay.classList.remove('hidden');
            });
        }
        
        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.classList.add('hidden');
            });
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                overlay.classList.add('hidden');
            }
        });
    }

    // --- Rendering ---
    function renderTable() {
        if (state.gridRendered) return;

        // Use fullElementList from elements.js (which combines rich + basic data)
        const allElements = typeof fullElementList !== 'undefined' ? fullElementList : elements;

        allElements.forEach(el => {
            const card = createElementCard(el);
            
            // Layout Logic
            if (isLanthanoid(el.number)) {
                lanthanoidsGrid.appendChild(card);
            } else if (isActinoid(el.number)) {
                actinoidsGrid.appendChild(card);
            } else {
                // Main Grid Positioning
                // CSS Grid is 1-based.
                // Group -> Column, Period -> Row
                card.style.gridColumn = el.group;
                card.style.gridRow = el.period;
                periodicGrid.appendChild(card);
            }
        });

        // Add placeholders for the gap in the main table to visually guide (57-71, 89-103)
        // Actually, CSS grid handles gaps fine if we just don't place items there.
        
        state.gridRendered = true;
    }

    function createElementCard(el) {
        const div = document.createElement('div');
        div.className = `element-card cat-${getCategoryClass(el.category)}`;
        div.dataset.number = el.number;
        div.dataset.name = el.name.toLowerCase();
        div.dataset.symbol = el.symbol.toLowerCase();
        div.dataset.category = el.category;
        
        // Inline color style if available for specific neon glow
        if (el.color) {
            div.style.color = el.color;
            div.style.borderColor = el.color;
            div.style.boxShadow = `inset 0 0 10px ${el.color}20`;
        }

        div.innerHTML = `
            <span class="element-number">${el.number}</span>
            <span class="element-symbol">${el.symbol}</span>
            <span class="element-name">${el.name}</span>
        `;

        // Make Draggable for Builder (Desktop)
        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('symbol', el.symbol);
            e.dataTransfer.setData('number', el.number);
        });

        // Click handler - smart behavior
        div.addEventListener('click', (e) => {
            // If Lab mode is active, add to mix instead of opening modal
            const builderPanel = document.querySelector('.builder-panel');
            const isLabOpen = builderPanel && !builderPanel.classList.contains('hidden');
            
            if (isLabOpen && typeof addAtomToMix === 'function') {
                addAtomToMix(el.symbol);
                // Provide visual feedback
                div.style.transform = 'scale(0.9)';
                setTimeout(() => div.style.transform = '', 150);
                e.stopPropagation();
            } else {
                openModal(el);
            }
        });
        
        // Smart Grouping Hover
        div.addEventListener('mouseenter', () => highlightFamily(el.group, el.period));
        div.addEventListener('mouseleave', clearHighlight);

        return div;
    }

    function highlightFamily(group, period) {
        document.querySelectorAll('.element-card').forEach(card => {
            const cGroup = parseInt(card.style.gridColumn);
            const cPeriod = parseInt(card.style.gridRow);
            const isRelated = (cGroup === group || cPeriod === period) && group !== 0; // Check group/period match
            
            if (isRelated) {
                card.classList.add('highlight-group');
            } else {
                card.classList.add('highlight-dim');
            }
        });
    }

    function clearHighlight() {
        document.querySelectorAll('.element-card').forEach(card => {
            card.classList.remove('highlight-group');
            card.classList.remove('highlight-dim');
        });
    }

    function getCategoryClass(cat) {
        if (!cat) return 'unknown';
        return cat.replace(/\s+/g, '-').toLowerCase();
    }

    function isLanthanoid(num) {
        return num >= 57 && num <= 71;
    }

    function isActinoid(num) {
        return num >= 89 && num <= 103;
    }

    // --- Scientific Controls ---
    function setupScientificControls() {
        tempSlider.addEventListener('input', (e) => {
            const temp = parseInt(e.target.value);
            state.temperature = temp;
            tempValue.innerText = `${temp} K`;
            updateElementStates(temp);
        });
    }

    function updateElementStates(temp) {
        const allCards = document.querySelectorAll('.element-card');
        const elementsMap = (typeof fullElementList !== 'undefined' ? fullElementList : elements);
        
        allCards.forEach(card => {
            const num = parseInt(card.dataset.number);
            const data = elementsMap.find(e => e.number === num);
            
            // Default melting points if missing (Simulated for visuals)
            // Most metals melt > 1000K, Gases boil < 300K
            const melt = data.melt || (data.phase === 'Gas' ? 50 : 1000);
            const boil = data.boil || (data.phase === 'Gas' ? 100 : 3000);

            card.classList.remove('melted', 'boiled');
            
            if (temp >= boil) {
                card.classList.add('boiled'); // Gas
            } else if (temp >= melt) {
                card.classList.add('melted'); // Liquid
            }
            // else Solid (default)
        });

        // Update status text colors
        const indicators = document.querySelector('.state-indicators');
        if(indicators) {
             // Reset
            indicators.children[0].className = 'state-solid';
            indicators.children[1].className = 'state-liquid';
            indicators.children[2].className = 'state-gas';
            
            if (temp < 100) indicators.children[0].classList.add('is-solid');
            // Simplified logic for indicator visualization
        }
    }

    // --- Temperature Heatmap Logic ---
    // (Consolidated with lines 22 & 160)
    
    // We already have tempSlider listener in setupScientificControls (line 159)
    // We just need to make sure updatePhases or updateElementStates is consistent.
    // updateElementStates (line 168) seems to do the job of updatePhases.
    // So we can remove this redundant block entirely.


    // --- Audio Logic ---
    function speakElementName(name) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop overlap
            const utterance = new SpeechSynthesisUtterance(name);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- Interactions ---
    function setupEventListeners() {
        // Search
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.element-card').forEach(card => {
                    const name = card.dataset.name;
                    const symbol = card.dataset.symbol;
                    const num = card.dataset.number;
                    
                    if(name.includes(term) || symbol.includes(term) || num.includes(term)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }

        // Filters
        if(filterBtns) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from others
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const cat = btn.dataset.category;
                    state.currentFilter = cat;

                    document.querySelectorAll('.element-card').forEach(card => {
                        const match = cat === 'all' || card.dataset.category === cat;
                        card.style.opacity = match ? '1' : '0.1';
                        // Keep opacity logic simpler for filters, but can also use filter/grayscale
                        card.style.transform = match ? 'scale(1)' : 'scale(0.8)';
                        card.style.pointerEvents = match ? 'all' : 'none';
                    });
                });
            });
        }
    } 
    
    // --- BUILDER LAB LOGIC ---
    const builderPanel = document.getElementById('compoundPanel');
    const toggleBuilderBtn = document.getElementById('toggleBuilder');
    const closeBuilderBtn = document.getElementById('closeBuilder');
    const dropZone = document.getElementById('dropZone');
    const atomContainer = document.getElementById('atomContainer');
    const mixBtn = document.getElementById('mixBuilder');
    const clearBtn = document.getElementById('clearBuilder');
    const resultDisplay = document.getElementById('compoundResult');
    
    let currentRecipe = {}; // { H: 2, O: 1 }

    if(toggleBuilderBtn) {
        toggleBuilderBtn.addEventListener('click', () => {
            builderPanel.classList.toggle('hidden');
        });
    }
    if(closeBuilderBtn) {
        closeBuilderBtn.addEventListener('click', () => {
            builderPanel.classList.add('hidden');
        });
    }

    // Drag & Drop
    // Make elements draggable
    // We need to update createElementCard to make them draggable=true.
    // Since I can't easily edit createElementCard without replacing huge block, 
    // let's do a bulk update on init or observe.
    // Or just add a mouse-down handler on global grid that checks for card?
    
    // Better: Update createElementCard in next step.
    
    // Drop Logic

    function addAtomToMix(symbol, category) {
        // Logic
        currentRecipe[symbol] = (currentRecipe[symbol] || 0) + 1;
        
        // Visual
        const atom = document.createElement('div');
        atom.className = 'mini-atom';
        atom.innerText = symbol;
        
        // Dynamic color based on category class if we can get it, else default
        // We can pass category from drag start? 
        // For now, simple style:
        atom.style.background = 'var(--accent-blue)';
        atom.style.animation = 'popIn 0.3s ease-out forwards';
        
        atomContainer.appendChild(atom);
        
        // Hide placeholder
        document.querySelector('.placeholder-text').style.display = 'none';
        
        // Reset result text
        resultDisplay.innerText = "Ready to Mix...";
        resultDisplay.style.color = "rgba(255,255,255,0.5)";
    }

    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentRecipe = {};
            atomContainer.innerHTML = '';
            document.querySelector('.placeholder-text').style.display = 'block';
            resultDisplay.innerText = "H₂O";
            resultDisplay.style.color = "#fff";
        });
    }

    if(mixBtn) {
        mixBtn.addEventListener('click', () => {
             // Use compounds.js helper
             if (typeof checkCompound === 'function') {
                 const result = checkCompound(currentRecipe);
                 if (result) {
                     resultDisplay.innerText = `${result.name} (${result.formula})`;
                     resultDisplay.style.color = "#4ade80"; // Bright Green
                     resultDisplay.style.textShadow = "0 0 10px rgba(74, 222, 128, 0.5)";
                     
                     // Animation on container
                     atomContainer.style.transform = "scale(1.1)";
                     setTimeout(() => atomContainer.style.transform = "scale(1)", 200);
                 } else {
                     resultDisplay.innerText = "Unknown Compound";
                     resultDisplay.style.color = "#f87171"; // Red
                     resultDisplay.style.textShadow = "none";
                 }
             } else {
                 console.error("compounds.js not loaded");
                 resultDisplay.innerText = "System Error";
             }
        });
    }
    
    // Drag & Drop Listeners
    if(dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const symbol = e.dataTransfer.getData('symbol');
            if(symbol) {
                addAtomToMix(symbol);
            }
        });
    }



    // --- Interactions ---
    function setupEventListeners() {
        // Search
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.element-card').forEach(card => {
                    const match = card.dataset.name.includes(query) || 
                                  card.dataset.symbol.includes(query) || 
                                  card.dataset.number === query;
                    
                    card.style.opacity = match ? '1' : '0.1';
                    card.style.filter = match ? 'none' : 'grayscale(100%)';
                    card.style.pointerEvents = match ? 'all' : 'none';
                });
            });
        }

        // Filters
        if(filterBtns) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from others
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const cat = btn.dataset.category;
                    state.currentFilter = cat;

                    document.querySelectorAll('.element-card').forEach(card => {
                        const match = cat === 'all' || card.dataset.category === cat;
                        card.style.opacity = match ? '1' : '0.1';
                        // Keep opacity logic simpler for filters, but can also use filter/grayscale
                        card.style.transform = match ? 'scale(1)' : 'scale(0.8)';
                        card.style.pointerEvents = match ? 'all' : 'none';
                    });
                });
            });
        }

        // Modal
        if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if(modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            // 3D Tilt Effect
            modal.addEventListener('mousemove', (e) => {
                const content = modal.querySelector('.modal-content');
                if(!content) return;
                
                const rect = content.getBoundingClientRect();
                const x = e.clientX - rect.left; // x position within the element
                const y = e.clientY - rect.top;  // y position within the element
                
                // Calculate rotation (center is 0)
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Max rotation degrees
                const maxRot = 5; 
                
                const rotateX = ((y - centerY) / centerY) * -maxRot; // Invert Y for tilt
                const rotateY = ((x - centerX) / centerX) * maxRot;

                content.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            modal.addEventListener('mouseleave', () => {
                 const content = modal.querySelector('.modal-content');
                 if(content) content.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // --- Cursor Effect ---
    function setupCursorEffect() {
        document.addEventListener('mousemove', (e) => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    }

    // --- TRUE 3D ATOM ENGINE ---
    let atomEngine = null;

    class Atom3DEngine {
        constructor(canvas, elementData) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.element = elementData;
            this.particles = [];
            this.width = canvas.parentElement.offsetWidth;
            this.height = canvas.parentElement.offsetHeight;
            this.camera = { x: 0, y: 0, z: 400 };
            this.rotation = { x: 0, y: 0 };
            
            // Physics configs
            this.shells = elementData.shells || [];
            this.baseRadius = 50;
            this.shellSpacing = 35;
            
            this.init();
            this.animate();
        }

        init() {
            // Set canvas size for HDPI
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.ctx.scale(dpr, dpr);
            
            // Create electrons
            this.shells.forEach((count, shellIndex) => {
                const radius = this.baseRadius + (shellIndex * this.shellSpacing);
                const speed = 0.02 - (shellIndex * 0.002); // Outer shells slower
                
                // Distribute electrons on sphere/rings
                for (let i = 0; i < count; i++) {
                    // Random orbit axis for "cloud" look, or structured for Bohr look
                    // Let's go with styled Bohr-Sommerfeld (tilted rings)
                    // We distribute rings based on electron count to look nice
                    const ringTiltX = Math.random() * Math.PI * 2;
                    const ringTiltY = Math.random() * Math.PI * 2;
                    
                    // Or simpler: uniformly distribute points on a sphere
                    // But we want "Shells".
                    
                    // Approach: Each shell has electrons. We'll give them random 3D orbits within that shell radius.
                    this.particles.push({
                        x: 0, y: 0, z: 0,
                        shellRadius: radius,
                        angle: (i / count) * Math.PI * 2, // Start angle
                        orbitSpeed: speed,
                        orbitTilt: { 
                             x: (Math.random() - 0.5) * Math.PI, 
                             y: (Math.random() - 0.5) * Math.PI 
                        },
                        size: 3, // Electron size
                        color: '#ffffff'
                    });
                }
            });
            
            // Interaction
            this.canvas.parentElement.addEventListener('mousemove', (e) => {
                 // Simple camera rotation based on mouse
                 const rect = this.canvas.getBoundingClientRect();
                 const x = (e.clientX - rect.left) / rect.width;
                 const y = (e.clientY - rect.top) / rect.height;
                 
                 this.rotation.y = (x - 0.5) * 2; // -1 to 1
                 this.rotation.x = (y - 0.5) * 2;
            });
        }

        project(x, y, z) {
            // 3D Projection Formula
            // Apply rotation matrices first
            // Rotate Y
            const cosY = Math.cos(this.rotation.y);
            const sinY = Math.sin(this.rotation.y);
            let x1 = x * cosY - z * sinY;
            let z1 = z * cosY + x * sinY;
            
            // Rotate X
            const cosX = Math.cos(this.rotation.x);
            const sinX = Math.sin(this.rotation.x);
            let y1 = y * cosX - z1 * sinX;
            let z2 = z1 * cosX + y * sinX;

            // Perspective
            const scale = 500 / (500 + z2 + this.camera.z);
            return {
                x: (x1 * scale) + (this.width / 2),
                y: (y1 * scale) + (this.height / 2),
                scale: scale,
                z: z2 // Keep Z for sorting depth
            };
        }

        animate() {
            if(!this.canvas.isConnected) return; // Stop if removed from DOM
            
            this.ctx.clearRect(0, 0, this.width, this.height);
            
            // Draw Nucleus
            const nProj = this.project(0, 0, 0);
            const nColor = getCategoryColor(this.element.category);
            this.ctx.beginPath();
            this.ctx.arc(nProj.x, nProj.y, 8 * nProj.scale, 0, Math.PI * 2);
            this.ctx.fillStyle = nColor;
            this.ctx.shadowBlur = 20 * nProj.scale;
            this.ctx.shadowColor = nColor;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // Reset

            // Sort particles by Z for correct depth buffering (painter's algorithm)
            // We need to calculate their positions first
            this.particles.forEach(p => {
                // Orbital mechanics
                p.angle += p.orbitSpeed;
                
                // Calculate 3D position in orbit
                // x = r * cos(a), y = r * sin(a)
                // But tilted in 3D
                const ox = p.shellRadius * Math.cos(p.angle);
                const oy = p.shellRadius * Math.sin(p.angle);
                const oz = 0; // Flat orbit before tilt
                
                // Apply Orbit Tilt
                // Rotate around X, then Y
                const cx = Math.cos(p.orbitTilt.x), sx = Math.sin(p.orbitTilt.x);
                const cy = Math.cos(p.orbitTilt.y), sy = Math.sin(p.orbitTilt.y);
                
                let y2 = oy * cx - oz * sx;
                let z2 = oz * cx + oy * sx;
                
                p.x = ox * cy - z2 * sy;
                p.y = y2;
                p.z = z2 * cy + ox * sy;
                
                // Project
                p.proj = this.project(p.x, p.y, p.z);
            });
            
            // Sort by depth (z) - furthest first
            this.particles.sort((a, b) => b.proj.z - a.proj.z);
            
            // Draw Electrons (and trails later if needed)
            this.particles.forEach(p => {
                // If behind nucleus (and very close), maybe hide? 
                // But sorted rendering handles occlusion naturally if nucleus is drawn in order.
                // We drew nucleus first, so we should draw particles. 
                // Wait, nucleus is at (0,0,0). Electrons cycle behind and front.
                // We need to insert nucleus into the sort order?
                // Simpler: Draw background electrons, then nucleus, then foreground electrons.
                
                const isInFront = p.proj.z < 0; // Z is depth relative to center
                
                // Actually with current projection z2, negative is closer?
                // Perspective division was (500 + z), so larger Z is further away.
                // If we want correct occlusion, we should treat nucleus as a particle at 0,0,0
            });
            
            // Re-draw approach: Mixed list
            const renderList = [...this.particles.map(p => ({type: 'e', ...p})), {type: 'n', proj: nProj, z: 0}];
            renderList.sort((a, b) => b.proj.z - a.proj.z); // Standard painters algo
            
            renderList.forEach(obj => {
                if (obj.type === 'n') {
                    // Nucleus
                    this.ctx.beginPath();
                    this.ctx.arc(obj.proj.x, obj.proj.y, 10 * obj.proj.scale, 0, Math.PI * 2);
                    this.ctx.fillStyle = nColor;
                     // Inner core glow
                    const grad = this.ctx.createRadialGradient(obj.proj.x, obj.proj.y, 0, obj.proj.x, obj.proj.y, 10 * obj.proj.scale);
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(1, nColor);
                    this.ctx.fillStyle = grad;
                    
                    this.ctx.shadowBlur = 25 * obj.proj.scale;
                    this.ctx.shadowColor = nColor;
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                } else {
                    // Electron
                    this.ctx.beginPath();
                    this.ctx.arc(obj.proj.x, obj.proj.y, obj.size * obj.proj.scale, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.shadowBlur = 5 * obj.proj.scale;
                    this.ctx.shadowColor = '#fff';
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                    
                    // Draw faint trail ring? 
                    // Drawing generic ring is hard in sorted list. 
                    // Let's keep it clean particles for now.
                }
            });

            requestAnimationFrame(() => this.animate());
        }
    }

    function renderAtom3D(el) {
        // Wrapper to init engine
        const canvas = document.getElementById('atomCanvas');
        // Need to replace the div with a canvas if it's not one, or cleared.
        // Actually style.css defines #atomCanvas as a generic container or canvas?
        // HTML has <div id="atomCanvas"></div>. We should replace it with <canvas> inside.
        
        // Check if we need to setup canvas
        let c = canvas.querySelector('canvas');
        if (!c) {
            canvas.innerHTML = ''; // Clear old DOM atoms
            c = document.createElement('canvas');
            c.style.width = '100%';
            c.style.height = '100%';
            canvas.appendChild(c);
        }
        
        atomEngine = new Atom3DEngine(c, el);
    }


    function getCategoryColor(cat) {
       // Helper to map category to color hex for canvas usage
       const colors = {
           'alkali metal': '#eab308',
           'alkaline earth metal': '#f97316',
           'transition metal': '#94a3b8',
           'lanthanide': '#ec4899',
           'actinide': '#d946ef',
           'metalloid': '#22d3ee',
           'reactive nonmetal': '#4ade80',
           'noble gas': '#6366f1',
           'post-transition metal': '#22d3ee'
       };
       return colors[cat] || '#fff';
    }

    function openModal(el) {
        modal.dataset.currentId = el.number;
        modal.classList.remove('hidden');
        renderAtom3D(el);
        updateModalContent(el);
        
        // Reset tilt on open for clean entry
        const content = modal.querySelector('.modal-content');
        if(content) {
            content.style.transform = 'perspective(1000px) RotateX(20deg)'; // Start tilted slightly
            setTimeout(() => {
                content.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'; // Snap to center
            }, 50);
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
        atomCanvas.innerHTML = ''; // Stop animations
        modal.dataset.currentId = '';
    }

    function updateModalContent(el) {
        // Elements from basic data might not have summaries
        const safeDesc = el.summary ? el.summary[state.learnLevel] : 
                        `No specific ${state.learnLevel} description available for ${el.name} yet.`;
        
        // Add Audio Button next to name
        const nameHeader = document.getElementById('modalName');
        nameHeader.innerHTML = `${el.name} <button class="audio-btn" onclick="speakElementName('${el.name}')" title="Pronounce">🔊</button>`;
        // Note: inline onclick needs function in global scope or attached. 
        // Since this is inside DOMContentLoaded, random function won't be global.
        // We need to attach listener cleanly or expose function.
        // Better:
        const btn = nameHeader.querySelector('.audio-btn');
        if(btn) btn.onclick = (e) => { e.stopPropagation(); speakElementName(el.name); };

        document.getElementById('modalNumber').innerText = `No. ${el.number}`;
        document.getElementById('modalSymbol').innerText = el.symbol;
        document.getElementById('modalMass').innerText = el.atomic_mass + ' u';
        document.getElementById('modalDesc').innerText = safeDesc;
        
        // Extended Data Injection
        const metaContainer = document.querySelector('.element-meta');
        // Clear old extra spans if any to prevent duplicates on re-open (simple check)
        const densitySpan = document.getElementById('modalDensity');
        if(!densitySpan && el.density) { 
             const d = document.createElement('span');
             d.id = 'modalDensity';
             d.className = 'element-number'; // reuse style
             d.style.background = 'rgba(59, 130, 246, 0.2)';
             d.innerText = `Density: ${el.density}`;
             metaContainer.appendChild(d);
        } else if (densitySpan) {
             densitySpan.innerText = `Density: ${el.density || 'Unknown'}`;
        }
        
        document.getElementById('modalShells').innerText = el.shells ? el.shells.join(', ') : '-';
        document.getElementById('modalConfig').innerText = el.electron_configuration || '-';

        // Lists
        const usesList = document.getElementById('modalUses');
        usesList.innerHTML = '';
        
        // Add Discovery Info to Uses/Stats area or new card?
        // Let's add a "Discovery" card dynamically if not present
        let discCard = document.getElementById('discoveryCard');
        if(!discCard) {
            discCard = document.createElement('div');
            discCard.id = 'discoveryCard';
            discCard.className = 'info-card';
            discCard.innerHTML = `<h3>Discovery</h3><p id="modalDiscovery"></p>`;
            document.querySelector('.info-grid').appendChild(discCard);
        }
        document.getElementById('modalDiscovery').innerText = `Discovered by ${el.discovered_by || 'Unknown'} in ${el.year || 'Unknown'}`;

        if (el.uses) {
            el.uses.forEach(use => {
                const li = document.createElement('li');
                li.innerText = use;
                usesList.appendChild(li);
            });
        } else {
            usesList.innerHTML = '<li>More research needed...</li>';
        }

        document.getElementById('modalFact').innerText = el.fun_fact || "Scientists are still learning about this element!";

        // Quiz
        setupQuiz(el);
    }

    // --- Game Logic ---
    const gameBtn = document.getElementById('gameBtn');
    const gameModal = document.getElementById('gameModal');
    const closeGameBtn = document.getElementById('closeGame');
    let currentScore = 0;
    
    // Initial High Score Load
    document.getElementById('highScore').innerText = localStorage.getItem('highScore') || 0;

    if (gameBtn) gameBtn.addEventListener('click', startGame);
    if (closeGameBtn) closeGameBtn.addEventListener('click', () => gameModal.classList.add('hidden'));

    function startGame() {
        gameModal.classList.remove('hidden');
        nextGameRound();
    }

    function nextGameRound() {
        const feedback = document.getElementById('gameFeedback');
        feedback.innerText = '';
        
        // Pick random element that has detailed data (category, or fun fact)
        // Filter out placeholders
        const validElements = elements.length > 0 ? elements : fullElementList.filter(e => !e.placeholder);
        
        const target = validElements[Math.floor(Math.random() * validElements.length)];
        
        // Generate Clue
        // Priority: Fun Fact -> Summary -> Uses
        let clue = "";
        if (target.fun_fact) clue = target.fun_fact;
        else if (target.summary && target.summary.beginner) clue = target.summary.beginner;
        else clue = `I am a ${target.category} found in group ${target.group}.`;

        // Sometimes the fun fact names the element, so let's obfsucate
        const nameRegex = new RegExp(target.name, 'gi');
        clue = clue.replace(nameRegex, "___");
        
        document.getElementById('gameClue').innerText = clue;

        // Generate Options (1 Correct + 3 Wrong)
        const options = [target];
        while(options.length < 4) {
            const wrong = validElements[Math.floor(Math.random() * validElements.length)];
            if (!options.includes(wrong) && wrong !== target) {
                options.push(wrong);
            }
        }
        
        // Shuffle
        options.sort(() => Math.random() - 0.5);

        const optsContainer = document.getElementById('gameOptions');
        optsContainer.innerHTML = '';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = opt.name;
            btn.style.fontSize = '1.2rem';
            btn.style.padding = '10px 20px';
            
            btn.onclick = () => {
                if (opt === target) {
                    feedback.innerText = "CORRECT! +10 Points";
                    feedback.style.color = "#0aff68";
                    currentScore += 10;
                    document.getElementById('gameScore').innerText = currentScore;
                    const hs = parseInt(localStorage.getItem('highScore') || 0);
                    if (currentScore > hs) {
                        localStorage.setItem('highScore', currentScore);
                        document.getElementById('highScore').innerText = currentScore;
                    }
                    setTimeout(nextGameRound, 1000);
                } else {
                    feedback.innerText = `WRONG! It was ${target.name}. Game Over.`;
                    feedback.style.color = "#ff3e3e";
                    currentScore = 0;
                    document.getElementById('gameScore').innerText = 0;
                    // Disable buttons
                    Array.from(optsContainer.children).forEach(b => b.disabled = true);
                    setTimeout(() => {
                         // Restart or close?
                         feedback.innerText += " Restarting...";
                         setTimeout(nextGameRound, 2000);
                    }, 2000);
                }
            };
            optsContainer.appendChild(btn);
        });
    }


    function setupQuiz(el) {
        const qContainer = document.querySelector('.quiz-section');
        const qText = document.getElementById('quizQuestion');
        const qOpts = document.getElementById('quizOptions');
        qOpts.innerHTML = '';

        if (!el.quiz) {
            qContainer.style.display = 'none';
            return;
        }

        qContainer.style.display = 'block';
        qText.innerText = el.quiz.question;

        el.quiz.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn'; // reuse style
            btn.innerText = opt;
            btn.style.margin = '5px';
            btn.onclick = () => {
                if (idx === el.quiz.answer) {
                    btn.style.borderColor = '#0aff68';
                    btn.style.color = '#0aff68';
                    btn.innerText += " ✅ Correct!";
                    // Save score logic here
                } else {
                    btn.style.borderColor = '#ff3e3e';
                    btn.style.color = '#ff3e3e';
                    btn.innerText += " ❌ Try again";
                }
            };
            qOpts.appendChild(btn);
        });
    }
});
