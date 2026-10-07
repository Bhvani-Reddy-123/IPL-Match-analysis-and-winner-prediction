class IPLChartsManager {
    constructor() {
        this.winProbChart = null;
        this.wormChart = null;
        this.h2hRadarChart = null;
        this.venuePitchChart = null;
    }

    /**
     * Win Probability Doughnut Arc Chart
     */
    renderWinProbability(canvasId, teamA, teamB, probA, probB) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (this.winProbChart) {
            this.winProbChart.destroy();
        }

        this.winProbChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [teamA.shortName, teamB.shortName],
                datasets: [{
                    data: [probA, probB],
                    backgroundColor: [teamA.primaryColor, teamB.primaryColor],
                    borderColor: ['#0f172a', '#0f172a'],
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                rotation: -90,
                circumference: 180,
                cutout: '75%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw}% Win Probability`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Live Match Over-by-Over Worm & Run Tracker Chart
     */
    renderWormChart(canvasId, teamA, teamB, overDataA, overDataB, targetScore) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (this.wormChart) {
            this.wormChart.destroy();
        }

        const labels = Array.from({ length: 20 }, (_, i) => `Over ${i + 1}`);
        const targetLine = Array(20).fill(targetScore);

        this.wormChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `${teamA.shortName} Runs`,
                        data: overDataA,
                        borderColor: teamA.primaryColor,
                        backgroundColor: teamA.primaryColor + '33',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    },
                    {
                        label: `${teamB.shortName} Runs (Chase)`,
                        data: overDataB,
                        borderColor: teamB.primaryColor,
                        backgroundColor: teamB.primaryColor + '33',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Target Score',
                        data: targetLine,
                        borderColor: '#ef4444',
                        borderDash: [6, 6],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8', font: { family: 'Outfit, sans-serif', size: 12 } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Cumulative Runs', color: '#94a3b8' }
                    }
                }
            }
        });
    }

    /**
     * Team Attribute Comparison Radar Chart
     */
    renderH2HRadar(canvasId, teamA, teamB) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (this.h2hRadarChart) {
            this.h2hRadarChart.destroy();
        }

        this.h2hRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Batting Depth', 'Death Bowling', 'Spin Control', 'Powerplay SR', 'Fielding', 'Match Form'],
                datasets: [
                    {
                        label: teamA.name,
                        data: [
                            teamA.battingRating,
                            teamA.paceRating,
                            teamA.spinRating,
                            Math.round(teamA.battingRating * 1.05),
                            teamA.fieldingRating,
                            (teamA.recentForm.reduce((a, b) => a + b, 0) / 5) * 100
                        ],
                        borderColor: teamA.primaryColor,
                        backgroundColor: teamA.primaryColor + '40',
                        borderWidth: 2,
                        pointBackgroundColor: teamA.primaryColor
                    },
                    {
                        label: teamB.name,
                        data: [
                            teamB.battingRating,
                            teamB.paceRating,
                            teamB.spinRating,
                            Math.round(teamB.battingRating * 1.05),
                            teamB.fieldingRating,
                            (teamB.recentForm.reduce((a, b) => a + b, 0) / 5) * 100
                        ],
                        borderColor: teamB.primaryColor,
                        backgroundColor: teamB.primaryColor + '40',
                        borderWidth: 2,
                        pointBackgroundColor: teamB.primaryColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc', font: { family: 'Outfit, sans-serif', size: 13 } }
                    }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#cbd5e1', font: { size: 12, weight: 'bold' } },
                        ticks: { display: false, min: 50, max: 100 }
                    }
                }
            }
        });
    }

    /**
     * Pitch & Venue Spin vs Pace Breakdown
     */
    renderVenueBreakdown(canvasId, venue) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (this.venuePitchChart) {
            this.venuePitchChart.destroy();
        }

        this.venuePitchChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pace Wickets %', 'Spin Wickets %', 'Bat 1st Win %', 'Chase Win %'],
                datasets: [{
                    label: venue.name,
                    data: [venue.paceWicketsPct, venue.spinWicketsPct, venue.batFirstWinPct, venue.chasingWinPct],
                    backgroundColor: [
                        '#3b82f6', // Pace blue
                        '#eab308', // Spin yellow
                        '#10b981', // Bat 1st green
                        '#8b5cf6'  // Chase purple
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', callback: v => v + '%' },
                        max: 100
                    }
                }
            }
        });
    }
}

const chartManager = new IPLChartsManager();
