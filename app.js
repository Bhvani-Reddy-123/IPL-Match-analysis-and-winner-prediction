document.addEventListener('DOMContentLoaded', () => {
    // App State
    let activeTab = 'predictor';
    let selectedTeamA = IPL_DATA.teams.find(t => t.id === 'CSK');
    let selectedTeamB = IPL_DATA.teams.find(t => t.id === 'MI');
    let selectedVenue = IPL_DATA.venues.find(v => v.id === 'wankhede');
    let isLiveMatch = false;

    // Ball-by-Ball Simulation State
    let simInterval = null;
    let isSimRunning = false;
    let simSpeed = 1000;
    let currentOver = 0;
    let currentBall = 0;
    let simCurrentScore = 0;
    let simWickets = 0;
    let simTarget = 185;
    let lastProbA = 50;
    let overDataA = [8, 17, 25, 38, 49, 62, 71, 80, 92, 105, 118, 126, 139, 150, 162, 175, 185];
    let overDataB = [];
    let ballCommentary = [];

    // Initialize UI Elements
    initTabNavigation();
    initTeamSelectors();
    initVenueSelectors();
    initPresetMatches();
    initSimControls();
    initAIAssistant();
    
    // Initial Run
    updatePrediction();
    renderHeadToHeadView();
    renderVenueView();
    renderPlayerMatchupsView();

    /* ==========================================================================
       Navigation & Tabs
       ========================================================================== */
    function initTabNavigation() {
        const tabBtns = document.querySelectorAll('.nav-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                activeTab = btn.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                
                const targetContent = document.getElementById(`tab-${activeTab}`);
                if (targetContent) {
                    targetContent.style.display = 'block';
                }

                if (activeTab === 'head-to-head') renderHeadToHeadView();
                if (activeTab === 'venue-analytics') renderVenueView();
                if (activeTab === 'player-matchups') renderPlayerMatchupsView();
            });
        });
    }

    /* ==========================================================================
       Predictor Controls & Real-Time Calculation
       ========================================================================== */
    function initTeamSelectors() {
        const teamASelect = document.getElementById('select-team-a');
        const teamBSelect = document.getElementById('select-team-b');

        if (!teamASelect || !teamBSelect) return;

        IPL_DATA.teams.forEach(t => {
            teamASelect.add(new Option(t.name, t.id, false, t.id === selectedTeamA.id));
            teamBSelect.add(new Option(t.name, t.id, false, t.id === selectedTeamB.id));
        });

        teamASelect.addEventListener('change', (e) => {
            selectedTeamA = IPL_DATA.teams.find(t => t.id === e.target.value);
            updateMatchupBanner();
            updatePrediction();
        });

        teamBSelect.addEventListener('change', (e) => {
            selectedTeamB = IPL_DATA.teams.find(t => t.id === e.target.value);
            updateMatchupBanner();
            updatePrediction();
        });

        const isLiveCheckbox = document.getElementById('toggle-live-mode');
        const liveControlsBox = document.getElementById('live-controls-box');
        
        if (isLiveCheckbox && liveControlsBox) {
            isLiveCheckbox.addEventListener('change', (e) => {
                isLiveMatch = e.target.checked;
                liveControlsBox.style.display = isLiveMatch ? 'block' : 'none';
                updatePrediction();
            });
        }

        ['input-target', 'input-score', 'input-overs', 'input-wickets'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updatePrediction);
        });
    }

    function initVenueSelectors() {
        const venueSelect = document.getElementById('select-venue');
        if (!venueSelect) return;

        IPL_DATA.venues.forEach(v => {
            venueSelect.add(new Option(`${v.name} (${v.city})`, v.id, false, v.id === selectedVenue.id));
        });

        venueSelect.addEventListener('change', (e) => {
            selectedVenue = IPL_DATA.venues.find(v => v.id === e.target.value);
            updatePrediction();
        });

        const pitchSelect = document.getElementById('select-pitch');
        if (pitchSelect) pitchSelect.addEventListener('change', updatePrediction);

        const tossSelect = document.getElementById('select-toss-winner');
        if (tossSelect) tossSelect.addEventListener('change', updatePrediction);
    }

    function initPresetMatches() {
        const presetContainer = document.getElementById('preset-matches-list');
        if (!presetContainer) return;

        const presets = [
            { name: 'CSK vs MI (El Clásico)', teamA: 'CSK', teamB: 'MI', venue: 'wankhede' },
            { name: 'RCB vs KKR (Rivalry)', teamA: 'RCB', teamB: 'KKR', venue: 'chinnaswamy' },
            { name: 'SRH vs KKR (Final Rematch)', teamA: 'SRH', teamB: 'KKR', venue: 'eden' },
            { name: 'GT vs RR (Battle of Champions)', teamA: 'GT', teamB: 'RR', venue: 'ahmedabad' }
        ];

        presetContainer.innerHTML = presets.map(p => `
            <button class="ticker-item" data-teama="${p.teamA}" data-teamb="${p.teamB}" data-venue="${p.venue}">
                <span class="badge-gold">PRESET</span>
                <strong>${p.name}</strong>
            </button>
        `).join('');

        presetContainer.querySelectorAll('.ticker-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const ta = btn.dataset.teama;
                const tb = btn.dataset.teamb;
                const v = btn.dataset.venue;

                selectedTeamA = IPL_DATA.teams.find(t => t.id === ta);
                selectedTeamB = IPL_DATA.teams.find(t => t.id === tb);
                selectedVenue = IPL_DATA.venues.find(ven => ven.id === v);

                document.getElementById('select-team-a').value = ta;
                document.getElementById('select-team-b').value = tb;
                document.getElementById('select-venue').value = v;

                updateMatchupBanner();
                updatePrediction();
            });
        });
    }

    function updateMatchupBanner() {
        const teamABadge = document.getElementById('badge-team-a');
        const teamBBadge = document.getElementById('badge-team-b');
        const teamAName = document.getElementById('name-team-a');
        const teamBName = document.getElementById('name-team-b');

        if (teamABadge) {
            teamABadge.style.backgroundColor = selectedTeamA.primaryColor;
            teamABadge.textContent = selectedTeamA.shortName;
            teamAName.textContent = selectedTeamA.name;
        }

        if (teamBBadge) {
            teamBBadge.style.backgroundColor = selectedTeamB.primaryColor;
            teamBBadge.textContent = selectedTeamB.shortName;
            teamBName.textContent = selectedTeamB.name;
        }

        const tossSelect = document.getElementById('select-toss-winner');
        if (tossSelect) {
            tossSelect.innerHTML = `
                <option value="${selectedTeamA.id}">${selectedTeamA.name}</option>
                <option value="${selectedTeamB.id}">${selectedTeamB.name}</option>
            `;
        }
    }

    function updatePrediction() {
        const target = parseInt(document.getElementById('input-target')?.value || 185);
        const currentScore = parseInt(document.getElementById('input-score')?.value || 110);
        const overs = parseFloat(document.getElementById('input-overs')?.value || 12.0);
        const wickets = parseInt(document.getElementById('input-wickets')?.value || 3);
        const tossWinner = document.getElementById('select-toss-winner')?.value || selectedTeamA.id;
        const tossChoice = document.getElementById('select-toss-choice')?.value || 'chase';
        const pitchCondition = document.getElementById('select-pitch')?.value || 'normal';

        const pred = mlClient.predictLocal({
            teamA: selectedTeamA,
            teamB: selectedTeamB,
            venue: selectedVenue.id,
            tossWinner,
            tossChoice,
            pitchCondition,
            isLiveMatch,
            target,
            currentScore,
            oversBowled: overs,
            wicketsLost: wickets
        });

        // Update UI Elements
        document.getElementById('prob-team-a-val').textContent = `${pred.teamAProb}%`;
        document.getElementById('prob-team-b-val').textContent = `${pred.teamBProb}%`;
        document.getElementById('val-confidence').textContent = `${pred.confidence}% High Confidence`;
        document.getElementById('val-projected-score').textContent = `${pred.projectedScore} Runs`;
        
        const leverageEl = document.getElementById('val-leverage-index');
        if (leverageEl) leverageEl.textContent = `${pred.leverageIndex} (High Leverage)`;

        chartManager.renderWinProbability('winProbCanvas', selectedTeamA, selectedTeamB, pred.teamAProb, pred.teamBProb);

        const driversList = document.getElementById('key-drivers-list');
        if (driversList && pred.keyDrivers) {
            driversList.innerHTML = pred.keyDrivers.map(d => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px;">
                    <div>
                        <strong style="color: #f8fafc; font-size: 0.9rem;">${d.name}</strong>
                        <div style="color: #94a3b8; font-size: 0.8rem;">${d.impact}</div>
                    </div>
                    <span class="badge-gold">${d.favor}</span>
                </div>
            `).join('');
        }

        const mc = mlClient.runMonteCarloSimulation(selectedTeamA, selectedTeamB, selectedVenue);
        document.getElementById('mc-sim-result').textContent = `${mc.teamAWinPct}% vs ${mc.teamBWinPct}% (Avg Score: ${mc.avgScoreA})`;
    }

    /* ==========================================================================
       Ball-by-Ball Live Simulator Engine & Win Swing Indicators
       ========================================================================== */
    function initSimControls() {
        const playBtn = document.getElementById('btn-sim-play');
        const resetBtn = document.getElementById('btn-sim-reset');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (isSimRunning) {
                    pauseSimulator();
                } else {
                    startSimulator();
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', resetSimulator);
        }
    }

    function startSimulator() {
        isSimRunning = true;
        document.getElementById('btn-sim-play').innerHTML = '⏸️ Pause Simulation';
        lastProbA = 50;

        simInterval = setInterval(() => {
            currentBall++;
            if (currentBall > 6) {
                currentBall = 1;
                currentOver++;
                overDataB.push(simCurrentScore);
            }

            if (currentOver >= 20 || simCurrentScore >= simTarget || simWickets >= 10) {
                pauseSimulator();
                if (typeof confetti === 'function' && simCurrentScore >= simTarget) {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
                return;
            }

            const outcomes = [0, 1, 1, 2, 4, 6, 'W'];
            const rand = outcomes[Math.floor(Math.random() * outcomes.length)];

            if (rand === 'W') {
                simWickets++;
            } else {
                simCurrentScore += rand;
            }

            // Calculate live win probability swing for this ball
            const livePred = mlClient.predictLocal({
                teamA: selectedTeamA,
                teamB: selectedTeamB,
                venue: selectedVenue.id,
                isLiveMatch: true,
                target: simTarget,
                currentScore: simCurrentScore,
                oversBowled: currentOver + (currentBall / 6.0),
                wicketsLost: simWickets
            });

            const swing = mlClient.computeBallSwing(lastProbA, livePred.teamAProb, selectedTeamA.shortName, selectedTeamB.shortName);
            lastProbA = livePred.teamAProb;

            const isBoundary = rand === 4 || rand === 6;
            const eventTag = rand === 'W' ? 'OUT! WICKET' : (isBoundary ? `${rand} RUN BOUNDARY!` : `${rand} Run`);
            
            ballCommentary.unshift({
                text: `Over ${currentOver}.${currentBall}: ${eventTag} | Live Win Prob: ${selectedTeamA.shortName} ${livePred.teamAProb}% vs ${selectedTeamB.shortName} ${livePred.teamBProb}% (${swing.text})`,
                type: rand === 'W' ? 'wicket' : (isBoundary ? 'boundary' : 'normal'),
                swingText: swing.text
            });

            // Update UI Badges
            document.getElementById('sim-current-score').textContent = `${simCurrentScore}/${simWickets}`;
            document.getElementById('sim-current-overs').textContent = `${currentOver}.${currentBall} / 20.0 Overs`;
            
            const rrr = ((simTarget - simCurrentScore) / Math.max(0.1, 20 - (currentOver + currentBall/6))).toFixed(2);
            document.getElementById('sim-rrr').textContent = rrr;
            
            const liveSwingBadge = document.getElementById('sim-win-swing-badge');
            if (liveSwingBadge) {
                liveSwingBadge.textContent = `LIVE PROB: ${selectedTeamA.shortName} ${livePred.teamAProb}% (${swing.text})`;
                liveSwingBadge.style.color = swing.color || '#34d399';
            }

            const commBox = document.getElementById('sim-commentary-list');
            if (commBox) {
                commBox.innerHTML = ballCommentary.slice(0, 10).map(c => `
                    <div class="commentary-item ${c.type}">
                        <div>${c.text}</div>
                    </div>
                `).join('');
            }

            chartManager.renderWormChart('wormChartCanvas', selectedTeamA, selectedTeamB, overDataA, overDataB, simTarget);

        }, simSpeed);
    }

    function pauseSimulator() {
        isSimRunning = false;
        clearInterval(simInterval);
        document.getElementById('btn-sim-play').innerHTML = '▶️ Start Live Simulation';
    }

    function resetSimulator() {
        pauseSimulator();
        currentOver = 0;
        currentBall = 0;
        simCurrentScore = 0;
        simWickets = 0;
        overDataB = [];
        ballCommentary = [];
        lastProbA = 50;

        document.getElementById('sim-current-score').textContent = '0/0';
        document.getElementById('sim-current-overs').textContent = '0.0 / 20.0 Overs';
        document.getElementById('sim-commentary-list').innerHTML = '<div class="commentary-item">Click Start Live Simulation to simulate the chase!</div>';
        chartManager.renderWormChart('wormChartCanvas', selectedTeamA, selectedTeamB, overDataA, overDataB, simTarget);
    }

    /* ==========================================================================
       AI Captain Assistant & Tactical Query Integration
       ========================================================================== */
    function initAIAssistant() {
        const aiAskBtn = document.getElementById('btn-ai-ask');
        const aiInput = document.getElementById('input-ai-query');
        const aiResponseBox = document.getElementById('ai-response-box');

        if (aiAskBtn && aiInput) {
            aiAskBtn.addEventListener('click', async () => {
                const q = aiInput.value.trim();
                if (!q) return;

                aiAskBtn.disabled = true;
                aiAskBtn.textContent = '🤖 AI Reasoning...';

                const response = await mlClient.queryAICaptain(q, selectedTeamA.shortName, selectedTeamB.shortName, selectedVenue.name);
                
                aiResponseBox.innerHTML = `
                    <div style="padding: 14px; background: rgba(6, 182, 212, 0.1); border-left: 4px solid var(--accent-cyan); border-radius: 8px; margin-top: 12px;">
                        <strong style="color: var(--accent-cyan); font-size: 0.9rem;">AI Captain Recommendation:</strong>
                        <div style="color: #f8fafc; margin-top: 6px; font-size: 0.95rem;">${response}</div>
                    </div>
                `;

                aiAskBtn.disabled = false;
                aiAskBtn.textContent = 'Ask AI Captain';
            });
        }
    }

    /* ==========================================================================
       Head-to-Head & Venue & Player Views
       ========================================================================== */
    function renderHeadToHeadView() {
        const h2hKey = `${selectedTeamA.shortName}_${selectedTeamB.shortName}`;
        const h2hData = IPL_DATA.headToHead[h2hKey] || { matches: 20, winA: 10, winB: 10, highestA: 200, highestB: 200 };

        document.getElementById('h2h-matches-count').textContent = `${h2hData.matches} Matches`;
        document.getElementById('h2h-wins-a').textContent = `${selectedTeamA.shortName}: ${h2hData.winA} Wins`;
        document.getElementById('h2h-wins-b').textContent = `${selectedTeamB.shortName}: ${h2hData.winB} Wins`;

        chartManager.renderH2HRadar('h2hRadarCanvas', selectedTeamA, selectedTeamB);
    }

    function renderVenueView() {
        document.getElementById('venue-name-title').textContent = selectedVenue.name;
        document.getElementById('venue-city').textContent = selectedVenue.city;
        document.getElementById('venue-avg-1st').textContent = `${selectedVenue.avgFirstInnings} Runs`;
        document.getElementById('venue-chase-pct').textContent = `${selectedVenue.chasingWinPct}% Win`;
        document.getElementById('venue-pitch-type').textContent = selectedVenue.pitchType;

        chartManager.renderVenueBreakdown('venueBreakdownCanvas', selectedVenue);
    }

    function renderPlayerMatchupsView() {
        const matchupBox = document.getElementById('player-matchups-grid');
        if (!matchupBox) return;

        matchupBox.innerHTML = IPL_DATA.playerMatchups.map(m => `
            <div class="glass-panel" style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span class="badge-gold">${m.batterTeam} vs ${m.bowlerTeam}</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Iconic Rivalry</span>
                </div>
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #fff;">${m.batter} vs ${m.bowler}</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; text-align: center;">
                    <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                        <div style="color: #94a3b8; font-size: 0.75rem;">RUNS</div>
                        <strong style="color: var(--accent-gold); font-size: 1.1rem;">${m.runs}</strong>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                        <div style="color: #94a3b8; font-size: 0.75rem;">BALLS</div>
                        <strong style="color: #fff; font-size: 1.1rem;">${m.balls}</strong>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                        <div style="color: #94a3b8; font-size: 0.75rem;">OUTS</div>
                        <strong style="color: #ef4444; font-size: 1.1rem;">${m.dismissals}</strong>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                        <div style="color: #94a3b8; font-size: 0.75rem;">S/R</div>
                        <strong style="color: var(--accent-cyan); font-size: 1.1rem;">${m.strikeRate}</strong>
                    </div>
                </div>
                <p style="color: #cbd5e1; font-size: 0.9rem; font-style: italic;">"${m.tacticalNote}"</p>
            </div>
        `).join('');
    }
});
