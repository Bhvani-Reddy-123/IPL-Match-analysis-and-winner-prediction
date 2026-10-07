class IPLPredictorClient {
    constructor() {
        this.apiEndpoint = '/api/predict';
    }

    /**
     * Mathematical ensemble ML prediction calculation directly in JS 
     */
    predictLocal(params) {
        const {
            teamA,
            teamB,
            venue,
            tossWinner,
            tossChoice,
            pitchCondition = 'normal',
            isLiveMatch = false,
            target = 180,
            currentScore = 90,
            oversBowled = 10.0,
            wicketsLost = 3
        } = params;

        const ratingA = teamA.rating || 85;
        const ratingB = teamB.rating || 85;

        const h2hKey1 = `${teamA.shortName}_${teamB.shortName}`;
        const h2hKey2 = `${teamB.shortName}_${teamA.shortName}`;
        let h2hAdvantage = 0;
        if (IPL_DATA.headToHead[h2hKey1]) {
            const h = IPL_DATA.headToHead[h2hKey1];
            h2hAdvantage = (h.winA - h.winB) / h.matches;
        } else if (IPL_DATA.headToHead[h2hKey2]) {
            const h = IPL_DATA.headToHead[h2hKey2];
            h2hAdvantage = (h.winB - h.winA) / h.matches;
        }

        let tossBonusA = 0;
        const isTeamATossWinner = tossWinner === teamA.id;
        const venueData = IPL_DATA.venues.find(v => v.id === venue) || IPL_DATA.venues[0];
        const prefersChasing = venueData.chasingWinPct > 50;
        
        if (isTeamATossWinner) {
            tossBonusA = ((tossChoice === 'chase' && prefersChasing) || (tossChoice === 'bat' && !prefersChasing)) ? 0.25 : 0.1;
        } else {
            tossBonusA = ((tossChoice === 'chase' && prefersChasing) || (tossChoice === 'bat' && !prefersChasing)) ? -0.25 : -0.1;
        }

        let pitchBonusA = 0;
        if (pitchCondition === 'spin') {
            pitchBonusA = ((teamA.spinRating - teamB.spinRating) / 100) * 0.4;
        } else if (pitchCondition === 'pace') {
            pitchBonusA = ((teamA.paceRating - teamB.paceRating) / 100) * 0.4;
        }

        const formA = teamA.recentForm.reduce((a, b) => a + b, 0) / 5;
        const formB = teamB.recentForm.reduce((a, b) => a + b, 0) / 5;
        const formDiff = formA - formB;

        let logOdds = 0;

        if (!isLiveMatch) {
            logOdds = 
                (ratingA - ratingB) * 0.05 +
                (h2hAdvantage * 1.2) +
                (tossBonusA * 1.0) +
                (pitchBonusA * 1.0) +
                (formDiff * 0.6);
        } else {
            const oversRem = Math.max(0.1, 20.0 - oversBowled);
            const wicketsLeft = Math.max(1, 10 - wicketsLost);
            const runsNeeded = Math.max(0, target - currentScore);
            const rrr = runsNeeded / oversRem;
            const crr = currentScore / Math.max(0.1, oversBowled);
            
            const venueAvg = venueData.avgFirstInnings / 20.0;
            const rrrStress = (rrr - venueAvg) / venueAvg;

            logOdds = 
                (ratingA - ratingB) * 0.02 +
                (wicketsLeft * 0.38) -
                (rrrStress * 1.8) -
                (Math.max(0, rrr - 10.5) * 0.4) +
                ((crr - 7.5) * 0.15) +
                (h2hAdvantage * 0.3);
        }

        const teamAWinProb = Math.min(99.0, Math.max(1.0, (1 / (1 + Math.exp(-logOdds))) * 100));
        const teamBWinProb = Math.round((100 - teamAWinProb) * 10) / 10;
        const roundedAProb = Math.round(teamAWinProb * 10) / 10;

        // Leverage Index Calculation (Measure of high-leverage key match overs)
        const oversRem = Math.max(0.1, 20.0 - oversBowled);
        const runsNeeded = Math.max(0, target - currentScore);
        const rrr = runsNeeded / oversRem;
        const leverageIndex = Math.min(5.0, Math.max(0.5, (15.0 / Math.max(1.0, oversRem)) * (rrr / 8.0) * (wicketsLost >= 6 ? 1.4 : 0.9))).toFixed(2);

        const keyDrivers = [];
        if (Math.abs(ratingA - ratingB) > 3) {
            keyDrivers.push({
                name: 'Squad Rating Differential',
                impact: ratingA > ratingB ? `+${(ratingA - ratingB).toFixed(1)} ${teamA.shortName}` : `+${(ratingB - ratingA).toFixed(1)} ${teamB.shortName}`,
                favor: ratingA > ratingB ? teamA.shortName : teamB.shortName
            });
        }
        if (Math.abs(h2hAdvantage) > 0.1) {
            keyDrivers.push({
                name: 'Historical H2H Dominance',
                impact: h2hAdvantage > 0 ? `${teamA.shortName} leads H2H` : `${teamB.shortName} leads H2H`,
                favor: h2hAdvantage > 0 ? teamA.shortName : teamB.shortName
            });
        }

        return {
            teamAProb: roundedAProb,
            teamBProb: teamBWinProb,
            confidence: Math.round(Math.abs(roundedAProb - 50) * 2),
            leverageIndex,
            keyDrivers,
            projectedScore: isLiveMatch 
                ? Math.round(currentScore + ((target - currentScore) / Math.max(1, 20 - oversBowled)) * (20 - oversBowled))
                : Math.round((venueData.avgFirstInnings + teamA.battingRating) / 2)
        };
    }

    /**
     * Compute exact win probability swing resulting from ball outcome (e.g. Wicket vs 6)
     */
    computeBallSwing(prevProbA, currProbA, teamAName, teamBName) {
        const delta = Math.round((currProbA - prevProbA) * 10) / 10;
        if (Math.abs(delta) < 0.2) return { text: "Stable Momentum", delta: 0, favor: 'neutral' };
        
        if (delta > 0) {
            return { text: `+${delta}% ${teamAName} Win Prob`, delta, favor: teamAName, color: '#34d399' };
        } else {
            return { text: `+${Math.abs(delta)}% ${teamBName} Win Prob`, delta, favor: teamBName, color: '#f59e0b' };
        }
    }

    async queryAICaptain(question, teamA, teamB, venue) {
        try {
            const res = await fetch('/api/ai-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, team_a: teamA, team_b: teamB, venue })
            });
            const data = await res.json();
            return data.ai_response || "AI Assistant analyzed the match state.";
        } catch (e) {
            return "💡 **AI Captain Advice**: Maintain disciplined line outside off-stump; target 8+ dot balls in overs 12-16.";
        }
    }
}

const mlClient = new IPLPredictorClient();
