$(document).ready(function() {
    // Éléments du jeu
    const $paddle1 = $('#paddle1');
    const $paddle2 = $('#paddle2');
    const $ball = $('#ball');
    const $gameArea = $('.game-area');
    const $startButton = $('#start-button');
    const $restartButton = $('#restart-button');
    const $scorePlayer1 = $('#score-player1');
    const $scorePlayer2 = $('#score-player2');
    const $gameModeSelect = $('#game-mode-select');
    const $gameOver = $('#game-over');
    const $player1Name = $('#player1-name');
    const $player2Name = $('#player2-name');
    const $boostLevel1 = $('#boost-level-1');
    const $boostLevel2 = $('#boost-level-2');
    const $boostLevel3 = $('#boost-level-3');
    const $timerDisplay = $('#timer-display');
    const $timer = $('#timer');
    const $currentMode = $('#current-mode');
    
    // Éléments des paramètres
    const $settingsButton = $('#settings-button');
    const $settingsPanel = $('#game-settings');
    const $closeSettingsButton = $('#close-settings');
    const $obstaclesToggle = $('#obstacles-toggle');
    const $multiballsToggle = $('#multiballs-toggle');
    const $paddle1Type = $('#paddle1-type');
    const $paddle2Type = $('#paddle2-type');
    const $obstaclesContainer = $('#obstacles-container');
    
    // Paramètres du jeu
    const gameAreaHeight = $gameArea.height();
    const gameAreaWidth = $gameArea.width();
    const standardPaddleHeight = 100;
    const fastPaddleHeight = 70;
    const largePaddleHeight = 130;
    const paddleWidth = 16;
    const ballSize = 20;
    
    // Paramètres des raquettes
    const standardPaddleSpeed = 12;
    const fastPaddleSpeed = 17;
    const largePaddleSpeed = 8;
    let paddle1Speed = standardPaddleSpeed;
    let paddle2Speed = standardPaddleSpeed;
    
    // Vitesses de la balle
    const baseSpeed = 7;
    const boostSpeed1 = 9;
    const boostSpeed2 = 12;
    const boostSpeed3 = 16;
    let ballSpeedX = baseSpeed;
    let ballSpeedY = 0;
    
    // Système de boost
    let currentBoostLevel = 0;
    let consecutiveMiddleHits = 0;
    const accelerationZoneSize = 30;
    let accelerationZoneStart = (standardPaddleHeight - accelerationZoneSize) / 2;
    let accelerationZoneEnd = accelerationZoneStart + accelerationZoneSize;
    
    // Mode chrono
    const gameTimeInSeconds = 60;
    let remainingTime = gameTimeInSeconds;
    let timerInterval;
    let gameStartTime = Date.now();
    
    // Multi-balles
    let ballsHit = 0;
    const ballsNeededForMultiball = 8;
    let activeBalls = [];
    let ballCounter = 0;
    
    // Obstacles
    let obstacles = [];
    const maxObstacles = 2;
    
    // Score
    let scorePlayer1 = 0;
    let scorePlayer2 = 0;
    
    // Mode de jeu
    let gameMode = "infinite";
    let obstaclesEnabled = false;
    let multiballsEnabled = false;
    let paddle1TypeSelected = "normal";
    let paddle2TypeSelected = "normal";
    
    // État du jeu
    let gameRunning = false;
    let gameOver = false;
    
    // Touches appuyées
    let keysPressed = {};
    
    // Détection des touches du clavier
    $(document).on('keydown', function(e) {
        keysPressed[e.which] = true;
        
        if([32, 37, 38, 39, 40].indexOf(e.which) > -1) {
            e.preventDefault();
        }
    });
    
    $(document).on('keyup', function(e) {
        delete keysPressed[e.which];
    });
    
    // Fonction pour démarrer le jeu
    function startGame() {
        if (!gameRunning && !gameOver) {
            gameRunning = true;
            gameStartTime = Date.now();
            
            // Mode chrono
            if (gameMode === "timed") {
                remainingTime = gameTimeInSeconds;
                updateTimer();
                if (timerInterval) clearInterval(timerInterval);
                
                timerInterval = setInterval(function() {
                    if (gameRunning) {
                        remainingTime--;
                        updateTimer();
                        
                        if (remainingTime <= 0) {
                            clearInterval(timerInterval);
                            let winner = scorePlayer1 > scorePlayer2 ? getPlayerName(1) : 
                                          scorePlayer2 > scorePlayer1 ? getPlayerName(2) : 
                                          "Match nul";
                            endGame(winner);
                        }
                    }
                }, 1000);
                
                $timerDisplay.show();
            } else {
                $timerDisplay.hide();
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            }
            
            resetBall();
            gameLoop();
            $startButton.html('<i class="fas fa-pause"></i> PAUSE');
            
            // Obstacles - CORRECTION : Recréer l'intervalle à chaque début de partie
            if (obstaclesEnabled) {
                // Création immédiate d'un obstacle si nécessaire
                if (obstacles.length < maxObstacles) {
                    createObstacle();
                }
                
                // Toujours nettoyer l'intervalle précédent pour éviter les doublons
                if (window.obstacleInterval) {
                    clearInterval(window.obstacleInterval);
                }
                
                // Créer un nouvel intervalle
                window.obstacleInterval = setInterval(function() {
                    if (gameRunning && obstaclesEnabled && obstacles.length < maxObstacles) {
                        createObstacle();
                    }
                }, 5000);
            }
        } else if (gameRunning) {
            gameRunning = false;
            $startButton.html('<i class="fas fa-play"></i> CONTINUER');
            
            // Arrêter l'intervalle des obstacles pendant la pause
            if (window.obstacleInterval) {
                clearInterval(window.obstacleInterval);
                window.obstacleInterval = null;
            }
        }
    }
    
    function updateTimer() {
        $timer.text(remainingTime);
        
        if (remainingTime <= 10) {
            $timer.css('color', '#ff1744');
            
            if (remainingTime <= 5) {
                $timerDisplay.addClass('pulse-warning');
            }
        } else {
            $timer.css('color', '');
            $timerDisplay.removeClass('pulse-warning');
        }
    }
    
    // Obtenir le nom d'un joueur avec fallback
    function getPlayerName(playerNum) {
        if (playerNum === 1) {
            return $player1Name.val() || "Joueur 1";
        } else {
            return $player2Name.val() || "Joueur 2";
        }
    }
    
    // Réinitialiser la balle
    function resetBall() {
        const centerX = Math.floor(gameAreaWidth / 2 - ballSize / 2);
        const centerY = Math.floor(gameAreaHeight / 2 - ballSize / 2);
        
        $ball.css({
            left: centerX,
            top: centerY
        }).removeClass('ball-boost');
        
        setTimeout(function() {
            $paddle1.removeClass('paddle-hit paddle-miss');
            $paddle2.removeClass('paddle-hit paddle-miss');
        }, 500);
        
        ballSpeedX = Math.random() < 0.5 ? -baseSpeed : baseSpeed;
        ballSpeedY = (Math.random() * 2 - 1) * 2;
        resetBoostLevel();
        
        ballsHit = 0;
    }
    
    // Créer une multiballe
    function createMultiball() {
        if (activeBalls.length >= 3) return;
        
        ballCounter++;
        const ballId = 'ball-' + ballCounter;
        
        const $newBall = $('<div id="' + ballId + '" class="ball ball-secondary"><div class="ball-glow"></div></div>');
        
        const centerX = Math.floor(gameAreaWidth / 2 - ballSize / 2);
        const centerY = Math.floor(gameAreaHeight / 2 - ballSize / 2);
        
        $newBall.css({
            left: centerX,
            top: centerY
        });
        
        $gameArea.append($newBall);
        
        const directionX = Math.random() < 0.5 ? -1 : 1;
        const directionY = Math.random() < 0.5 ? -1 : 1;
        
        activeBalls.push({
            id: ballId,
            speedX: directionX * baseSpeed,
            speedY: directionY * (Math.random() * 2 + 1),
            element: $newBall
        });
    }
    
    // Supprimer toutes les multiballes
    function clearMultiballs() {
        for (let i = 0; i < activeBalls.length; i++) {
            if (activeBalls[i] && activeBalls[i].id) {
                $('#' + activeBalls[i].id).remove();
            }
        }
        
        activeBalls = [];
    }
    
    // Créer un obstacle
    function createObstacle() {
        if (obstacles.length >= maxObstacles) return;
        
        const size = Math.floor(Math.random() * 20) + 20;
        
        const x = Math.floor(Math.random() * (gameAreaWidth - 200)) + 100;
        const y = Math.floor(Math.random() * (gameAreaHeight - size));
        
        const obstacleId = 'obstacle-' + Date.now();
        const $obstacle = $('<div id="' + obstacleId + '" class="obstacle"></div>');
        
        $obstacle.css({
            width: size + 'px',
            height: size + 'px',
            left: x + 'px',
            top: y + 'px'
        });
        
        $obstaclesContainer.append($obstacle);
        
        obstacles.push({
            id: obstacleId,
            x: x,
            y: y,
            width: size,
            height: size,
            element: $obstacle
        });
        
        setTimeout(function() {
            removeObstacle(obstacleId);
        }, 8000);
    }
    
    // Supprimer un obstacle
    function removeObstacle(id) {
        for (let i = 0; i < obstacles.length; i++) {
            if (obstacles[i].id === id) {
                $('#' + id).remove();
                
                obstacles.splice(i, 1);
                break;
            }
        }
    }
    
    // Supprimer tous les obstacles
    function clearObstacles() {
        for (let i = 0; i < obstacles.length; i++) {
            if (obstacles[i] && obstacles[i].id) {
                $('#' + obstacles[i].id).remove();
            }
        }
        obstacles = [];
    }
    
    // Mettre à jour l'indicateur de boost
    function updateBoostIndicator() {
        $boostLevel1.removeClass('active-1');
        $boostLevel2.removeClass('active-2');
        $boostLevel3.removeClass('active-3');
        
        if (currentBoostLevel >= 1) {
            $boostLevel1.addClass('active-1');
        }
        if (currentBoostLevel >= 2) {
            $boostLevel2.addClass('active-2');
        }
        if (currentBoostLevel >= 3) {
            $boostLevel3.addClass('active-3');
        }
    }
    
    // Réinitialiser le niveau de boost
    function resetBoostLevel() {
        currentBoostLevel = 0;
        consecutiveMiddleHits = 0;
        updateBoostIndicator();
        
        $ball.removeClass('ball-boost');
    }
    
    // Augmenter le niveau de boost
    function increaseBoostLevel() {
        consecutiveMiddleHits++;
        
        if (consecutiveMiddleHits >= 3) {
            currentBoostLevel = 3;
            let direction = ballSpeedX > 0 ? 1 : -1;
            ballSpeedX = direction * boostSpeed3;
        } else if (consecutiveMiddleHits == 2) {
            currentBoostLevel = 2;
            let direction = ballSpeedX > 0 ? 1 : -1;
            ballSpeedX = direction * boostSpeed2;
        } else if (consecutiveMiddleHits == 1) {
            currentBoostLevel = 1;
            let direction = ballSpeedX > 0 ? 1 : -1;
            ballSpeedX = direction * boostSpeed1;
        }
        
        updateBoostIndicator();
        
        $ball.addClass('ball-boost');
        
        if (currentBoostLevel === 3) {
            $gameArea.addClass('screen-shake');
            setTimeout(function() {
                $gameArea.removeClass('screen-shake');
            }, 300);
        }
    }
    
    // Boucle principale du jeu
    function gameLoop() {
        if (!gameRunning || gameOver) return;
        
        movePaddles();
        moveBall();
        moveMultiballs();
        
        requestAnimationFrame(gameLoop);
    }
    
    // Déplacer les raquettes
    function movePaddles() {
        if (keysPressed[87]) { // W - monter
            let topPos = parseInt($paddle1.css('top'));
            if (topPos > 0) {
                $paddle1.css('top', topPos - paddle1Speed);
            }
        }
        if (keysPressed[83]) { // S - descendre
            let topPos = parseInt($paddle1.css('top'));
            if (topPos < gameAreaHeight - parseInt($paddle1.css('height'))) {
                $paddle1.css('top', topPos + paddle1Speed);
            }
        }
        
        if (keysPressed[38]) { // Flèche haut
            let topPos = parseInt($paddle2.css('top'));
            if (topPos > 0) {
                $paddle2.css('top', topPos - paddle2Speed);
            }
        }
        if (keysPressed[40]) { // Flèche bas
            let topPos = parseInt($paddle2.css('top'));
            if (topPos < gameAreaHeight - parseInt($paddle2.css('height'))) {
                $paddle2.css('top', topPos + paddle2Speed);
            }
        }
    }
    
    // Déplacer la balle principale
    function moveBall() {
        if (gameOver) return;
        
        let ballLeft = parseInt($ball.css('left'));
        let ballTop = parseInt($ball.css('top'));
        
        ballLeft += ballSpeedX;
        ballTop += ballSpeedY;
        
        if (ballTop <= 0 || ballTop >= gameAreaHeight - ballSize) {
            ballSpeedY = -ballSpeedY;
            if (ballTop <= 0) {
                ballTop = 1;
            } else if (ballTop >= gameAreaHeight - ballSize) {
                ballTop = gameAreaHeight - ballSize - 1;
            }
        }
        
        if (obstaclesEnabled) {
            for (let i = 0; i < obstacles.length; i++) {
                const obstacle = obstacles[i];
                if (checkCollision(
                    ballLeft, ballTop, ballSize, ballSize,
                    obstacle.x, obstacle.y, obstacle.width, obstacle.height
                )) {
                    if (Math.abs(ballLeft - obstacle.x) < Math.abs(ballTop - obstacle.y)) {
                        ballSpeedY = -ballSpeedY;
                    } else {
                        ballSpeedX = -ballSpeedX;
                    }
                }
            }
        }
        
        checkPaddleCollisions(ballLeft, ballTop);
        
        if (ballLeft <= paddleWidth) {
            scorePlayer2++;
            updateScore();
            
            resetBoostLevel();
            ballsHit = 0;
            clearMultiballs();
            
            $paddle1.addClass('paddle-miss');
            setTimeout(function() {
                $paddle1.removeClass('paddle-miss');
            }, 500);
            
            gameRunning = false;
            setTimeout(function() {
                resetBall();
                gameRunning = true;
                gameLoop();
            }, 1000);
            
            return;
        } else if (ballLeft >= gameAreaWidth - ballSize - paddleWidth) {
            scorePlayer1++;
            updateScore();
            
            resetBoostLevel();
            ballsHit = 0;
            clearMultiballs();
            
            $paddle2.addClass('paddle-miss');
            setTimeout(function() {
                $paddle2.removeClass('paddle-miss');
            }, 500);
            
            gameRunning = false;
            setTimeout(function() {
                resetBall();
                gameRunning = true;
                gameLoop();
            }, 1000);
            
            return;
        }
        
        $ball.css({
            left: ballLeft,
            top: ballTop
        });
    }
    
    // Déplacer les multiballes
    function moveMultiballs() {
        for (let i = 0; i < activeBalls.length; i++) {
            const ball = activeBalls[i];
            if (!ball || !ball.element) continue;
            
            let ballElement = $('#' + ball.id);
            if (ballElement.length === 0) continue;
            
            let ballLeft = parseInt(ballElement.css('left'));
            let ballTop = parseInt(ballElement.css('top'));
            
            ballLeft += ball.speedX;
            ballTop += ball.speedY;
            
            if (ballTop <= 0 || ballTop >= gameAreaHeight - ballSize) {
                ball.speedY = -ball.speedY;
                if (ballTop <= 0) {
                    ballTop = 1;
                } else if (ballTop >= gameAreaHeight - ballSize) {
                    ballTop = gameAreaHeight - ballSize - 1;
                }
            }
            
            if (obstaclesEnabled) {
                for (let j = 0; j < obstacles.length; j++) {
                    const obstacle = obstacles[j];
                    if (checkCollision(
                        ballLeft, ballTop, ballSize, ballSize,
                        obstacle.x, obstacle.y, obstacle.width, obstacle.height
                    )) {
                        if (Math.abs(ballLeft - obstacle.x) < Math.abs(ballTop - obstacle.y)) {
                            ball.speedY = -ball.speedY;
                        } else {
                            ball.speedX = -ball.speedX;
                        }
                    }
                }
            }
            
            const paddle1Left = parseInt($paddle1.css('left'));
            const paddle1Top = parseInt($paddle1.css('top'));
            const paddle1Height = parseInt($paddle1.css('height'));
            const paddle2Left = parseInt($paddle2.css('left'));
            const paddle2Top = parseInt($paddle2.css('top'));
            const paddle2Height = parseInt($paddle2.css('height'));
            
            if (
                ballLeft <= paddle1Left + paddleWidth &&
                ballLeft >= paddle1Left &&
                ballTop + ballSize >= paddle1Top &&
                ballTop <= paddle1Top + paddle1Height &&
                ball.speedX < 0
            ) {
                ball.speedX = -ball.speedX;
                
                const relativeImpact = ((ballTop + ballSize/2) - (paddle1Top + paddle1Height/2)) / (paddle1Height/2);
                ball.speedY = relativeImpact * 5;
                
                $paddle1.addClass('paddle-hit');
                setTimeout(function() {
                    $paddle1.removeClass('paddle-hit');
                }, 300);
            }
            
            if (
                ballLeft + ballSize >= paddle2Left &&
                ballLeft + ballSize <= paddle2Left + paddleWidth &&
                ballTop + ballSize >= paddle2Top &&
                ballTop <= paddle2Top + paddle2Height &&
                ball.speedX > 0
            ) {
                ball.speedX = -ball.speedX;
                
                const relativeImpact = ((ballTop + ballSize/2) - (paddle2Top + paddle2Height/2)) / (paddle2Height/2);
                ball.speedY = relativeImpact * 5;
                
                $paddle2.addClass('paddle-hit');
                setTimeout(function() {
                    $paddle2.removeClass('paddle-hit');
                }, 300);
            }
            
            if (ballLeft <= paddleWidth) {
                scorePlayer2++;
                updateScore();
                
                ballElement.remove();
                activeBalls.splice(i, 1);
                i--;
            } else if (ballLeft >= gameAreaWidth - ballSize - paddleWidth) {
                scorePlayer1++;
                updateScore();
                
                ballElement.remove();
                activeBalls.splice(i, 1);
                i--;
            } else {
                ballElement.css({
                    left: ballLeft,
                    top: ballTop
                });
            }
        }
    }
    
    // Vérifier les collisions avec les raquettes
    function checkPaddleCollisions(ballLeft, ballTop) {
        const ballCenter = ballTop + ballSize / 2;
        const paddle1Left = parseInt($paddle1.css('left'));
        const paddle1Top = parseInt($paddle1.css('top'));
        const paddle1Height = parseInt($paddle1.css('height'));
        const paddle2Left = parseInt($paddle2.css('left'));
        const paddle2Top = parseInt($paddle2.css('top'));
        const paddle2Height = parseInt($paddle2.css('height'));
        
        let paddle1AccStart = (paddle1Height - accelerationZoneSize) / 2;
        let paddle1AccEnd = paddle1AccStart + accelerationZoneSize;
        let paddle2AccStart = (paddle2Height - accelerationZoneSize) / 2;
        let paddle2AccEnd = paddle2AccStart + accelerationZoneSize;
        
        if (
            ballLeft <= paddle1Left + paddleWidth &&
            ballLeft >= paddle1Left &&
            ballTop + ballSize >= paddle1Top &&
            ballTop <= paddle1Top + paddle1Height &&
            ballSpeedX < 0
        ) {
            ballSpeedX = -ballSpeedX;
            
            const relativeImpact = ((ballTop + ballSize/2) - (paddle1Top + paddle1Height/2)) / (paddle1Height/2);
            ballSpeedY = relativeImpact * 5;
            
            const impactPosition = ballCenter - paddle1Top;
            if (impactPosition >= paddle1AccStart && impactPosition <= paddle1AccEnd) {
                increaseBoostLevel();
            } else {
                resetBoostLevel();
            }
            
            ballsHit++;
            
            if (multiballsEnabled && ballsHit >= ballsNeededForMultiball) {
                createMultiball();
                ballsHit = 0;
            }
            
            $paddle1.addClass('paddle-hit');
            setTimeout(function() {
                $paddle1.removeClass('paddle-hit');
            }, 300);
        }
        
        if (
            ballLeft + ballSize >= paddle2Left &&
            ballLeft + ballSize <= paddle2Left + paddleWidth &&
            ballTop + ballSize >= paddle2Top &&
            ballTop <= paddle2Top + paddle2Height &&
            ballSpeedX > 0
        ) {
            ballSpeedX = -ballSpeedX;
            
            const relativeImpact = ((ballTop + ballSize/2) - (paddle2Top + paddle2Height/2)) / (paddle2Height/2);
            ballSpeedY = relativeImpact * 5;
            
            const impactPosition = ballCenter - paddle2Top;
            if (impactPosition >= paddle2AccStart && impactPosition <= paddle2AccEnd) {
                increaseBoostLevel();
            } else {
                resetBoostLevel();
            }
            
            ballsHit++;
            
            if (multiballsEnabled && ballsHit >= ballsNeededForMultiball) {
                createMultiball();
                ballsHit = 0;
            }
            
            $paddle2.addClass('paddle-hit');
            setTimeout(function() {
                $paddle2.removeClass('paddle-hit');
            }, 300);
        }
    }
    
    // Vérifier la collision entre deux rectangles
    function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
    
    // Mettre à jour le score
    function updateScore() {
        $scorePlayer1.text(scorePlayer1);
        $scorePlayer2.text(scorePlayer2);
        
        if (gameMode === "score5") {
            if (scorePlayer1 >= 5) {
                endGame(getPlayerName(1));
            } else if (scorePlayer2 >= 5) {
                endGame(getPlayerName(2));
            }
        }
    }
    
    // Terminer la partie
    function endGame(winner) {
        gameRunning = false;
        gameOver = true;
        
        ballSpeedX = 0;
        ballSpeedY = 0;
        
        // Calculer le temps écoulé
        const gameEndTime = Date.now();
        let gameDuration = Math.floor((gameEndTime - gameStartTime) / 1000);
        
        // Convertir en format minutes:secondes
        const minutes = Math.floor(gameDuration / 60);
        const seconds = gameDuration % 60;
        const formattedTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        
        $('#winner-message').text(winner + " a gagné!");
        $('#final-score').text(scorePlayer1 + " - " + scorePlayer2);
        $('#final-time').text(formattedTime);
        $gameOver.fadeIn(500);
        
        $startButton.html('<i class="fas fa-play"></i> COMMENCER LA PARTIE');
        
        // Arrêter tous les timers
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (window.obstacleInterval) {
            clearInterval(window.obstacleInterval);
            window.obstacleInterval = null;
        }
    }
    
    // Appliquer les types de raquettes
    function applyPaddleTypes() {
        $paddle1.removeClass('paddle-fast paddle-large');
        $paddle2.removeClass('paddle-fast paddle-large');
        
        switch (paddle1TypeSelected) {
            case "fast":
                $paddle1.addClass('paddle-fast');
                $paddle1.css('height', fastPaddleHeight + 'px');
                paddle1Speed = fastPaddleSpeed;
                break;
            case "large":
                $paddle1.addClass('paddle-large');
                $paddle1.css('height', largePaddleHeight + 'px');
                paddle1Speed = largePaddleSpeed;
                break;
            default:
                $paddle1.css('height', standardPaddleHeight + 'px');
                paddle1Speed = standardPaddleSpeed;
        }
        
        switch (paddle2TypeSelected) {
            case "fast":
                $paddle2.addClass('paddle-fast');
                $paddle2.css('height', fastPaddleHeight + 'px');
                paddle2Speed = fastPaddleSpeed;
                break;
            case "large":
                $paddle2.addClass('paddle-large');
                $paddle2.css('height', largePaddleHeight + 'px');
                paddle2Speed = largePaddleSpeed;
                break;
            default:
                $paddle2.css('height', standardPaddleHeight + 'px');
                paddle2Speed = standardPaddleSpeed;
        }
        
        $paddle1.css('top', (gameAreaHeight - parseInt($paddle1.css('height'))) / 2);
        $paddle2.css('top', (gameAreaHeight - parseInt($paddle2.css('height'))) / 2);
    }
    
    // Initialiser le jeu
    function initGame() {
        applyPaddleTypes();
        
        $paddle1.css({
            'top': (gameAreaHeight - parseInt($paddle1.css('height'))) / 2,
            'left': '30px'
        });
        
        $paddle2.css({
            'top': (gameAreaHeight - parseInt($paddle2.css('height'))) / 2,
            'left': (gameAreaWidth - paddleWidth - 30) + 'px'
        });
        
        scorePlayer1 = 0;
        scorePlayer2 = 0;
        updateScore();
        
        resetBoostLevel();
        
        $gameOver.hide();
        
        updateModeDisplay();
        
        // Initialiser l'heure de début
        gameStartTime = Date.now();
    }
    
    // Mettre à jour l'affichage du mode de jeu
    function updateModeDisplay() {
        switch (gameMode) {
            case "infinite":
                $currentMode.text("Mode Infini");
                break;
            case "score5":
                $currentMode.text("Premier à 5");
                break;
            case "timed":
                $currentMode.text("Mode Chrono");
                break;
            default:
                $currentMode.text("Mode Infini");
        }
    }
    
    // Redémarrer le jeu
    function restartGame() {
        $gameOver.hide();
        
        scorePlayer1 = 0;
        scorePlayer2 = 0;
        updateScore();
        
        gameOver = false;
        
        // CORRECTION : Nettoyer correctement tous les obstacles et multiballes
        clearMultiballs();
        clearObstacles();
        
        // CORRECTION : Réinitialiser les compteurs et variables d'état
        ballsHit = 0;
        
        $paddle1.css('top', (gameAreaHeight - parseInt($paddle1.css('height'))) / 2);
        $paddle2.css('top', (gameAreaHeight - parseInt($paddle2.css('height'))) / 2);
        
        // Réinitialiser l'heure de début
        gameStartTime = Date.now();
        
        // Réinitialiser le timer pour le mode chrono
        if (gameMode === "timed") {
            remainingTime = gameTimeInSeconds;
            updateTimer();
            if (timerInterval) clearInterval(timerInterval);
            
            timerInterval = setInterval(function() {
                if (gameRunning) {
                    remainingTime--;
                    updateTimer();
                    
                    if (remainingTime <= 0) {
                        clearInterval(timerInterval);
                        let winner = scorePlayer1 > scorePlayer2 ? getPlayerName(1) : 
                                     scorePlayer2 > scorePlayer1 ? getPlayerName(2) : 
                                     "Match nul";
                        endGame(winner);
                    }
                }
            }, 1000);
            
            $timerDisplay.show();
        } else {
            $timerDisplay.hide();
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }
        
        // CORRECTION : Nettoyer l'intervalle des obstacles
        if (window.obstacleInterval) {
            clearInterval(window.obstacleInterval);
            window.obstacleInterval = null;
        }
        
        resetBall();
        
        gameRunning = true;
        gameLoop();
        
        // CORRECTION : Réinitialiser les obstacles si activés
        if (obstaclesEnabled) {
            // Créer immédiatement un obstacle
            createObstacle();
            
            // Créer un nouvel intervalle pour les obstacles
            window.obstacleInterval = setInterval(function() {
                if (gameRunning && obstaclesEnabled && obstacles.length < maxObstacles) {
                    createObstacle();
                }
            }, 5000);
        }
    }
    
    // Événements des boutons
    $startButton.on('click', function() {
        startGame();
    });
    
    $restartButton.on('click', function() {
        restartGame();
    });
    
    $settingsButton.on('click', function() {
        if (gameRunning) {
            gameRunning = false;
            $startButton.html('<i class="fas fa-play"></i> CONTINUER');
        }
        
        $settingsPanel.fadeIn(300);
    });
    
    $closeSettingsButton.on('click', function() {
        $settingsPanel.fadeOut(300);
    });
    
    // Changement de mode de jeu
    $gameModeSelect.on('change', function() {
        const newMode = $(this).val();
        if (newMode !== gameMode) {
            gameMode = newMode;
            
            updateModeDisplay();
            
            scorePlayer1 = 0;
            scorePlayer2 = 0;
            updateScore();
            
            // Gérer le timer pour le mode chrono
            if (gameMode === "timed") {
                remainingTime = gameTimeInSeconds;
                updateTimer();
                $timerDisplay.show();
            } else {
                $timerDisplay.hide();
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            }
            
            if (gameOver) {
                gameOver = false;
                $gameOver.hide();
            }
            
            // Réinitialiser l'heure de début
            gameStartTime = Date.now();
        }
    });
    
    // Toggle des obstacles
    $obstaclesToggle.on('change', function() {
        obstaclesEnabled = $(this).is(':checked');
        
        // Si on désactive les obstacles
        if (!obstaclesEnabled) {
            // Nettoyer tous les obstacles existants
            clearObstacles();
            
            // Arrêter l'intervalle
            if (window.obstacleInterval) {
                clearInterval(window.obstacleInterval);
                window.obstacleInterval = null;
            }
        } 
        // Si on active les obstacles et que le jeu est en cours
        else if (gameRunning) {
            // Créer immédiatement un obstacle
            createObstacle();
            
            // Nettoyer l'intervalle existant pour éviter les doublons
            if (window.obstacleInterval) {
                clearInterval(window.obstacleInterval);
            }
            
            // Créer un nouvel intervalle
            window.obstacleInterval = setInterval(function() {
                if (gameRunning && obstaclesEnabled && obstacles.length < maxObstacles) {
                    createObstacle();
                }
            }, 5000);
        }
        
        console.log("Obstacles:", obstaclesEnabled ? "activés" : "désactivés", "Nombre d'obstacles:", obstacles.length);
    });
    
    // Toggle des multiballes
    $multiballsToggle.on('change', function() {
        multiballsEnabled = $(this).is(':checked');
        
        if (!multiballsEnabled) {
            clearMultiballs();
            ballsHit = 0;
        }
    });
    
    // Changement de type de raquette
    $paddle1Type.on('change', function() {
        paddle1TypeSelected = $(this).val();
        applyPaddleTypes();
    });
    
    $paddle2Type.on('change', function() {
        paddle2TypeSelected = $(this).val();
        applyPaddleTypes();
    });
    
    // Initialisation du jeu
    initGame();
});