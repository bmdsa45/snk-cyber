class Snake {
    constructor() {
        this.reset();
    }

    reset() {
        this.position = [{ x: 10, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.grew = false;
    }

    update() {
        this.direction = this.nextDirection;
        const head = { x: this.position[0].x + this.direction.x, y: this.position[0].y + this.direction.y };
        this.position.unshift(head);
        if (!this.grew) {
            this.position.pop();
        }
        this.grew = false;
    }

    grow() {
        this.grew = true;
    }

    checkCollision(width, height, obstacles) {
        const head = this.position[0];
        
        // Colisión con bordes
        if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
            return true;
        }
        
        // Optimización: Usar Set para colisiones
        const collisionKey = `${head.x},${head.y}`;
        const bodySet = new Set(this.position.slice(1).map(p => `${p.x},${p.y}`));
        const obstacleSet = new Set(obstacles.map(obs => `${obs.x},${obs.y}`));
        
        return bodySet.has(collisionKey) || obstacleSet.has(collisionKey);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = Math.floor(this.canvas.width / 20);
        this.height = Math.floor(this.canvas.height / 20);
        this.snake = new Snake();
        this.startButton = document.getElementById('start-btn');
        this.restartButtonSide = document.getElementById('restart-btn-side');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        
        this.initializeGameState();
        this.initializeStyles();
        this.initializeAudio();
        this.setupEventListeners();
        this.food = this.generateFood();
        this.draw();
        this.updateRankingDisplay();
    }

    initializeGameState() {
        this.lastRenderTime = 0;
        this.frameCount = 0;
        this.fpsInterval = 1000 / 20;
        this.gameSpeed = -4;
        this.level = 1;
        this.score = 0;
        this.gridSize = 20;
        this.isGameOver = false;
        this.isRunning = false;
        this.obstacles = [];
        this.highScores = JSON.parse(localStorage.getItem('highScores')) || [];
        this.autoPlayEnabled = false;
        this.autoPlayDelay = 100;
        this.neonColors = [
            '#00ff9d',
            '#ff0066',
            '#00ffff',
            '#ff00ff'
        ];
        this.currentColorIndex = 0;
        this.pulseEffect = 0;
        this.pulseDirection = 1;
    }

    initializeStyles() {
        this.colors = {
            snake: this.neonColors[0],
            food: this.neonColors[1],
            obstacle: this.neonColors[2],
            background: '#000000'
        };
        
        this.effects = {
            glow: 15,
            fadeSpeed: 0.5,
            pulseSpeed: 0.1,
            maxPulse: 20
        };
    }

    toggleAutoPlay() {
        this.autoPlayEnabled = !this.autoPlayEnabled;
        if (this.autoPlayEnabled) {
            this.autoPlayLoop();
        }
    }

    autoPlayLoop() {
        if (!this.autoPlayEnabled || !this.isRunning) return;

        const head = this.snake.position[0];
        const food = this.food;
        
        // Algoritmo de pathfinding simple
        let newDirection = { x: 0, y: 0 };
        
        if (Math.abs(food.x - head.x) > Math.abs(food.y - head.y)) {
            newDirection.x = food.x > head.x ? 1 : -1;
        } else {
            newDirection.y = food.y > head.y ? 1 : -1;
        }

        // Evitar colisiones
        const nextPos = {
            x: head.x + newDirection.x,
            y: head.y + newDirection.y
        };

        if (this.wouldCollide(nextPos)) {
            // Buscar dirección alternativa
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (let dir of directions) {
                const testPos = {
                    x: head.x + dir.x,
                    y: head.y + dir.y
                };
                if (!this.wouldCollide(testPos)) {
                    newDirection = dir;
                    break;
                }
            }
        }

        this.snake.nextDirection = newDirection;
        setTimeout(() => this.autoPlayLoop(), this.autoPlayDelay);
    }

    wouldCollide(position) {
        return position.x < 0 || 
               position.x >= this.width || 
               position.y < 0 || 
               position.y >= this.height ||
               this.obstacles.some(obs => obs.x === position.x && obs.y === position.y) ||
               this.snake.position.slice(1).some(segment => 
                   segment.x === position.x && segment.y === position.y
               );
    }

    update() {
        if (this.snake.checkCollision(this.width, this.height, this.obstacles)) {
            this.gameOver();
            return;
        }

        this.snake.update();
        
        // Actualizar efectos visuales
        this.pulseEffect += this.effects.pulseSpeed * this.pulseDirection;
        if (this.pulseEffect >= this.effects.maxPulse || this.pulseEffect <= 0) {
            this.pulseDirection *= -1;
        }
        
        // Cambiar colores gradualmente
        if (this.frameCount % 60 === 0) {
            this.currentColorIndex = (this.currentColorIndex + 1) % this.neonColors.length;
            this.colors.snake = this.neonColors[this.currentColorIndex];
        }

        this.frameCount++;
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButtonSide.addEventListener('click', () => this.restart());
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
            this.startGame();
        });
        document.getElementById('auto-play-btn').addEventListener('click', () => this.toggleAutoPlay());
    }

    generateFood() {
        while (true) {
            const food = {
                x: Math.floor(Math.random() * this.width),
                y: Math.floor(Math.random() * this.height)
            };
            
            const isColliding = this.snake.position.some(segment => 
                segment.x === food.x && segment.y === food.y) ||
                this.obstacles.some(obs => obs.x === food.x && obs.y === food.y);
            
            if (!isColliding) {
                return food;
            }
        }
    }

    handleKeyPress(event) {
        if (!this.isRunning) return;
        
        const keyDirections = {
            'ArrowUp': { x: 0, y: -1 },
            'ArrowDown': { x: 0, y: 1 },
            'ArrowLeft': { x: -1, y: 0 },
            'ArrowRight': { x: 1, y: 0 }
        };

        const newDirection = keyDirections[event.key];
        if (newDirection) {
            const isOpposite = this.snake.direction.x === -newDirection.x && 
                            this.snake.direction.y === -newDirection.y;
            if (!isOpposite) {
                this.snake.nextDirection = newDirection;
            }
        }
    }

    draw() {
        // Usar requestAnimationFrame para optimizar el renderizado
        requestAnimationFrame(() => {
            // Limpiar el canvas con efecto de fade
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Aplicar efectos de brillo global
            this.ctx.shadowBlur = this.effects.glow;
            this.ctx.lineWidth = 2;
            
            // Dibujar elementos con orden correcto
            this.drawGrid();
            this.drawBackgroundEffects();
            this.drawObstacles();
            this.drawFood();
            this.drawSnake();
        });
    }

    drawSnake() {
        this.ctx.shadowColor = this.colors.snake;
        this.ctx.shadowBlur = this.effects.glow * 1.5; // Aumentar el brillo de la serpiente
        
        this.snake.position.forEach((segment, index) => {
            const brightness = 1 - (index / this.snake.position.length) * this.effects.fadeSpeed;
            this.ctx.fillStyle = `rgba(0, 255, 157, ${brightness})`;
            
            // Añadir efecto de pulso a la cabeza
            const isHead = index === 0;
            const pulseSize = isHead ? Math.sin(Date.now() / 200) * 2 : 0;
            
            this.ctx.beginPath();
            this.ctx.roundRect(
                segment.x * this.gridSize + 1,
                segment.y * this.gridSize + 1,
                this.gridSize - 2 + pulseSize,
                this.gridSize - 2 + pulseSize,
                isHead ? 8 : 4 // Cabeza más redondeada
            );
            this.ctx.fill();
        });
    }

    drawFood() {
        this.ctx.shadowColor = this.colors.food;
        this.ctx.shadowBlur = this.effects.glow * 2;
        this.ctx.fillStyle = this.colors.food;
        
        // Efecto de pulso mejorado para la comida
        const pulse = Math.sin(Date.now() / 300) * 3;
        
        this.ctx.beginPath();
        this.ctx.arc(
            (this.food.x + 0.5) * this.gridSize,
            (this.food.y + 0.5) * this.gridSize,
            (this.gridSize / 2 - 2) + pulse,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    drawGrid() {
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
        this.ctx.lineWidth = 0.5;
        
        // Efecto de pulso para el grid
        const gridPulse = Math.sin(Date.now() / 1000) * 0.02;
        
        for (let i = 0; i <= this.width; i++) {
            const x = i * this.gridSize + gridPulse;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let i = 0; i <= this.height; i++) {
            const y = i * this.gridSize + gridPulse;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawBackgroundEffects() {
        // Reducir número de partículas para mejor rendimiento
        const maxParticles = 3;
        
        // Reutilizar objeto para evitar creación de nuevos objetos
        const particle = { x: 0, y: 0, size: 0 };
        
        for (let i = 0; i < maxParticles; i++) {
            particle.x = Math.random() * this.canvas.width;
            particle.y = Math.random() * this.canvas.height;
            particle.size = Math.random() * 1.5;
            
            this.ctx.fillStyle = this.neonColors[i % this.neonColors.length];
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

    createDestroySound() {

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            600, this.audioContext.currentTime + 0.2
        );
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01, this.audioContext.currentTime + 0.2
        );
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    // Close Game class
    // Close Game class
    // Close Game class
    // Close Game class
    drawObstacles() {
        this.ctx.shadowColor = this.colors.obstacle;
        this.ctx.shadowBlur = this.effects.glow;
        this.ctx.fillStyle = this.colors.obstacle;
        
        this.obstacles.forEach(obstacle => {
            this.ctx.beginPath();
            this.ctx.roundRect(
                obstacle.x * this.gridSize + 1,
                obstacle.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2,
                4
            );
            this.ctx.fill();
        });
    }
    // Game loop methods
    startGame() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.gameLoop();
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        window.requestAnimationFrame(this.gameLoop.bind(this));

        const elapsed = currentTime - this.lastRenderTime;
        if (elapsed < this.fpsInterval) return;

        this.lastRenderTime = currentTime;
        this.update();
        this.draw();
    }

    gameOver() {
        this.isRunning = false;
        this.isGameOver = true;
        this.createDestroySound();
        this.updateHighScores();
        this.gameOverElement.style.display = 'flex';
        this.finalScoreElement.textContent = this.score;
    }

    restart() {
        this.snake.reset();
        this.initializeGameState();
        this.food = this.generateFood();
        this.gameOverElement.style.display = 'none';
        this.updateRankingDisplay();
    }

    updateHighScores() {
        this.highScores.push({
            score: this.score,
            date: new Date().toLocaleDateString()
        });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 5);
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
        this.updateRankingDisplay();
    }

    updateRankingDisplay() {
        const rankingList = document.getElementById('ranking-list');
        rankingList.innerHTML = '';
        this.highScores.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. Score: ${score.score} - ${score.date}`;
            rankingList.appendChild(li);
        });
    }
    // Game class closing bracket
} // End of Game class

// Inicializar el juego (una sola vez)
const game = new Game();
