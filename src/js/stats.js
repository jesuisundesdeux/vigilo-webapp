import * as vigilo from './vigilo-api';
import Chart from 'chart.js';

Chart.defaults.global.legend.position = "bottom";
Chart.defaults.global.maintainAspectRatio = false;

export async function init() {
    var data = await vigilo.getIssues();
    makeStats(data);

    $("#stats canvas").on('click touch', (e) => {
        $(e.target).parent()[0].requestFullscreen()
    })
}

const CATAGORIES = {
    "Véhicule ou objet gênant": { stack: "Cohabitation", color: "crimson" },
    "Incivilité récurrente sur la route": { stack: "Cohabitation", color: "lightcoral" },
    "Aménagement mal conçu": { stack: "Infrastructures", color: "seagreen" },
    "Défaut d'entretien": { stack: "Infrastructures", color: "darkgreen" },
    "Absence d'arceaux de stationnement": { stack: "Infrastructures", color: "turquoise" },
    "Signalisation, marquage": { stack: "Infrastructures", color: "olive" },
    "Absence d'aménagement": { stack: "Infrastructures", color: "cyan" },
    "Accident, chute, incident": { stack: "Autre", color: "black" },
    "Autre": { stack: "Autre", color: "grey" },
}

function truncDateToDay(date) {
    truncDateToHour(date)
    date.setHours(0)
}
function truncDateToHour(date) {
    date.setMinutes(0)
    date.setSeconds(0)
    date.setMilliseconds(0)
}

function onChartResize(chart, size) {
    if (size.height < 250) {
        chart.canvas.parentNode.style.height = '350px';
    }
}
async function makeStats(issues) {
    // Prepare data structures
    var dataLast30Days = {};
    var dataByCat = {}

    var today = new Date()
    truncDateToDay(today)

    for (var cat in CATAGORIES) {
        dataLast30Days[cat] = {
            label: cat,
            data: {},
            borderWidth: 2,
            //stack: CATAGORIES[cat].stack,
            backgroundColor: CATAGORIES[cat].color,
        }
        for (var i = 0; i < 31; i++) {
            var time = today.getTime() - i * 24 * 60 * 60 * 1000;
            dataLast30Days[cat].data[time] = 0
        }

        dataByCat[cat] = 0;
    }

    // Compute data
    var totalDataLast30Days = 0;
    var total = issues.length;

    for (var i in issues) {

        var truncated_date = new Date(issues[i].date_obj.getTime())
        truncDateToDay(truncated_date);

        if (dataLast30Days[issues[i].categorie_str].data[truncated_date.getTime()] !== undefined) {
            dataLast30Days[issues[i].categorie_str].data[truncated_date.getTime()]++;
            totalDataLast30Days++;
        }

        dataByCat[issues[i].categorie_str]++;
    }

    // Refactor data
    for (var cat in dataLast30Days) {
        dataLast30Days[cat].data = Object.entries(dataLast30Days[cat].data).map((item) => { return { t: new Date(parseInt(item[0])), y: item[1] } })
    }
    dataLast30Days = Object.values(dataLast30Days)

    // Display data
    $("#stats-last30days h2").empty().append(totalDataLast30Days)
    new Chart($("#stats-last30days canvas")[0].getContext('2d'), {
        type: 'bar',
        data: { datasets: dataLast30Days },
        options: {
            onResize: onChartResize,
            tooltips: {
                mode: 'index',
                intersect: false
            },
            responsive: true,
            scales: {
                xAxes: [{
                    type: 'time',
                    distribution: 'series',
                    time: {
                        minUnit: "day"
                    },
                    ticks: {
                        source: 'data',
                        autoSkip: true
                    },
                    stacked: true
                }],
                yAxes: [{
                    stacked: true
                }]
            }
        }
    });

    $("#stats-bycats h2").empty().append(total)
    new Chart($("#stats-bycats canvas")[0].getContext('2d'), {
        type: 'pie',
        data: {
            datasets: [
                {
                    data: Object.values(dataByCat),
                    backgroundColor: Object.values(CATAGORIES).map((x)=>x.color)
                }
            ],
            labels: Object.keys(dataByCat)
        },
        options: {
            onResize: onChartResize,
            responsive: true,
        }
    });
}